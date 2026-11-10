import { randomBytes, timingSafeEqual } from "node:crypto";
import { publicContent, safeUrl, safeResumeUrl } from "../shared/content.js";

const random = () => randomBytes(32).toString("hex");
const equal = (a, b) =>
  typeof a === "string" &&
  typeof b === "string" &&
  a.length === b.length &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
export function createApp({ store, env, fetcher = fetch }) {
  const origin = env.APP_ORIGIN || "http://127.0.0.1:5173";
  const secure = origin.startsWith("https:");
  if (!secure && !["localhost", "127.0.0.1"].includes(new URL(origin).hostname))
    throw new Error("APP_ORIGIN must use HTTPS outside localhost");
  const sessions = new Map(),
    oauth = new Map();
  let syncFlight,
    loginAttempts = [];
  const configured = Boolean(
    env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.GITHUB_OWNER_ID,
  );
  const cookie = (name, value, maxAge) =>
    `${name}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
  const cookies = (request) =>
    Object.fromEntries(
      (request.headers.get("cookie") || "")
        .split(";")
        .filter((x) => x.includes("="))
        .map((x) => x.trim().split("=")),
    );
  const json = (body, status = 200, headers = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        ...headers,
      },
    });
  const redirect = (to, setCookie) =>
    new Response(null, {
      status: 302,
      headers: {
        Location: to,
        "Set-Cookie": setCookie,
        "Cache-Control": "no-store",
      },
    });
  const external = async (url, options = {}) => {
    const response = await fetcher(url, {
      ...options,
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok)
      throw new Error(
        "GitHub request failed. Check credentials and rate limits.",
      );
    return response.json();
  };
  const prune = (map) => {
    for (const [key, value] of map)
      if (value.expires < Date.now()) map.delete(key);
  };
  async function syncPins() {
    if (syncFlight) return syncFlight;
    syncFlight = (async () => {
      if (!env.GITHUB_TOKEN) {
        await store.sync(null, "GitHub synchronization is not configured.");
        return;
      }
      try {
        const data = await external("https://api.github.com/graphql", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.GITHUB_TOKEN}`,
            "Content-Type": "application/json",
            "User-Agent": "Aditya-Portfolio",
          },
          body: JSON.stringify({
            query:
              "query($login:String!){user(login:$login){pinnedItems(first:6,types:REPOSITORY){nodes{... on Repository{id name description url homepageUrl isPrivate stargazerCount updatedAt primaryLanguage{name} repositoryTopics(first:8){nodes{topic{name}}}}}}}",
            variables: {
              login: env.GITHUB_USERNAME || "Aditya-Pratap-Singh-Jadon",
            },
          }),
        });
        if (data.errors || !Array.isArray(data.data?.user?.pinnedItems?.nodes))
          throw new Error("GitHub did not return a valid pinned collection.");
        const pins = data.data.user.pinnedItems.nodes
          .filter((p) => !p.isPrivate && safeUrl(p.url) && p.url)
          .map((p) => ({
            id: `github-${p.id.replace(/[^a-zA-Z0-9_-]/g, "")}`,
            title: p.name,
            description: p.description || "View this project on GitHub.",
            repo: p.url,
            live: safeUrl(p.homepageUrl) ? p.homepageUrl || "" : "",
            tags: [
              p.primaryLanguage?.name,
              ...p.repositoryTopics.nodes.map((t) => t.topic.name),
            ]
              .filter(Boolean)
              .slice(0, 5),
            category: "GitHub",
            status: "Pinned on GitHub",
            year: p.updatedAt.slice(0, 4),
            image: "",
            contribution: "",
            challenge: "",
            outcome: "",
            credit: "Metadata from GitHub.",
            stars: p.stargazerCount,
          }));
        await store.sync(pins);
      } catch (error) {
        await store.sync(
          null,
          error.message.includes("GitHub")
            ? error.message
            : "GitHub synchronization failed. Last successful data retained.",
        );
      }
    })().finally(() => {
      syncFlight = null;
    });
    return syncFlight;
  }
  async function handle(request) {
    const url = new URL(request.url),
      path = url.pathname,
      jar = cookies(request);
    prune(sessions);
    prune(oauth);
    const session = sessions.get(jar.portfolio_session);
    try {
      if (path === "/api/content" && request.method === "GET") {
        const s = store.readPublished();
        return json({
          content: publicContent(s.published, s.pins),
          updatedAt: s.updatedAt,
          sync: {
            lastSuccess: s.sync.lastSuccess,
            stale: Boolean(s.sync.error),
          },
        });
      }
      if (path === "/api/session" && request.method === "GET")
        return json({
          authenticated: Boolean(session),
          configured,
          csrf: session?.csrf,
        });
      if (path === "/api/resume" && request.method === "GET") {
        const resume = store.readPublished().published.resume;
        if (!resume?.data && resume?.url && safeResumeUrl(resume.url)) return redirect(resume.url);
        if (!resume?.data) return json({ error: "Resume is not available." }, 404);
        const pdf = Buffer.from(resume.data.split(",")[1], "base64");
        return new Response(pdf, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="Aditya_Resume.pdf"',
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
      if (path === "/api/auth/login" && request.method === "GET") {
        if (!configured)
          return json(
            {
              error:
                "Admin sign-in is not configured. Follow README: GitHub OAuth setup.",
            },
            503,
          );
        loginAttempts = loginAttempts.filter((t) => Date.now() - t < 60000);
        if (loginAttempts.length >= 20)
          return json(
            { error: "Too many sign-in attempts. Try again in a minute." },
            429,
          );
        loginAttempts.push(Date.now());
        const state = random();
        oauth.set(state, { expires: Date.now() + 600000 });
        const target = new URL("https://github.com/login/oauth/authorize");
        target.search = new URLSearchParams({
          client_id: env.GITHUB_CLIENT_ID,
          redirect_uri: `${origin}/api/auth/callback`,
          state,
        }).toString();
        return redirect(
          target.toString(),
          cookie("portfolio_oauth", state, 600),
        );
      }
      if (path === "/api/auth/callback" && request.method === "GET") {
        const state = url.searchParams.get("state"),
          code = url.searchParams.get("code");
        if (
          !configured ||
          !code ||
          !equal(state, jar.portfolio_oauth) ||
          !oauth.has(state)
        )
          return json(
            { error: "Invalid or expired sign-in. Start again." },
            403,
          );
        oauth.delete(state);
        const token = await external(
          "https://github.com/login/oauth/access_token",
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              client_id: env.GITHUB_CLIENT_ID,
              client_secret: env.GITHUB_CLIENT_SECRET,
              code,
              redirect_uri: `${origin}/api/auth/callback`,
            }),
          },
        );
        if (!token.access_token)
          return json({ error: "GitHub did not authorize sign-in." }, 403);
        const user = await external("https://api.github.com/user", {
          headers: {
            Authorization: `Bearer ${token.access_token}`,
            "User-Agent": "Aditya-Portfolio",
          },
        });
        if (String(user.id) !== String(env.GITHUB_OWNER_ID))
          return json(
            { error: "This account is not the portfolio owner." },
            403,
          );
        const sid = random();
        sessions.set(sid, {
          csrf: random(),
          expires: Date.now() + 8 * 3600000,
        });
        return redirect("/admin", cookie("portfolio_session", sid, 8 * 3600));
      }
      if (!path.startsWith("/api/admin/") && path !== "/api/logout")
        return json({ error: "Not found" }, 404);
      if (!session)
        return json({ error: "Sign in as the portfolio owner." }, 401);
      if (
        request.method !== "GET" &&
        (request.headers.get("origin") !== origin ||
          !equal(request.headers.get("x-csrf-token"), session.csrf))
      )
        return json(
          { error: "Request verification failed. Reload the editor." },
          403,
        );
      if (path === "/api/admin/content" && request.method === "GET")
        return json(store.read());
      if (path === "/api/logout" && request.method === "POST") {
        sessions.delete(jar.portfolio_session);
        return json({ ok: true }, 200, {
          "Set-Cookie": cookie("portfolio_session", "", 0),
        });
      }
      if (request.method !== "POST")
        return json({ error: "Method not allowed" }, 405);
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        return json({ error: "Expected JSON" }, 415);
      const raw = await request.text();
      if (Buffer.byteLength(raw) > 8 * 1024 * 1024)
        return json(
          { error: "Content exceeds 8 MB. Use smaller images." },
          413,
        );
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }
      if (path === "/api/admin/save")
        return json(await store.save(body.content, body.revision));
      if (path === "/api/admin/publish")
        return json(await store.publish(body.revision));
      if (path === "/api/admin/restore")
        return json(await store.restore(body.id, body.revision));
      if (path === "/api/admin/sync") {
        await syncPins();
        return json(store.read());
      }
      return json({ error: "Not found" }, 404);
    } catch (error) {
      return json(
        {
          error:
            error.status === 409
              ? error.message
              : path.startsWith("/api/auth/")
                ? "Sign-in could not be completed. Please try again."
                : error.code
                  ? "Storage unavailable. Your previous data has been preserved."
                  : error.message,
        },
        error.status || 400,
      );
    }
  }
  handle.syncPins = syncPins;
  return handle;
}
