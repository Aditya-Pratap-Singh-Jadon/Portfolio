import { useEffect, useRef, useState } from "react";
import { PortfolioView } from "../App";
import { publicContent, validateContent } from "../../shared/content";

const names = {
  profile: "Identity & About",
  education: "Education",
  projects: "Projects",
  experience: "Experience",
  skills: "Skills",
  achievements: "Achievements",
  posts: "LinkedIn posts",
  resume: "Résumé",
  sections: "Section visibility",
  sync: "GitHub synchronization",
};
const label = (key) =>
  ({
    repo: "GitHub repository URL",
    live: "Live website URL",
    order: "Featured order (lower first)",
    featured: "Keep featured independently of GitHub pins",
    hidden: "Hide from visitors",
    published: "Approve this post for publication",
    image: "Project screenshot",
    text: "Original post text (private source)",
    summary: "Public summary",
    punchline: "Punchline (optional, up to 240 characters)",
    url: "Source URL",
    intervalHours: "Refresh interval in hours",
  })[key] ||
  key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
const newRows = {
  projects: {
    title: "New project",
    category: "Full stack",
    year: "2026",
    status: "In development",
    description: "",
    tags: [],
    repo: "",
    live: "",
    image: "",
    contribution: "",
    challenge: "",
    outcome: "",
    credit: "",
    featured: true,
    hidden: false,
    order: 10,
  },
  experience: {
    organization: "",
    role: "",
    dates: "",
    description: "",
    details: "",
    url: "",
  },
  skills: {
    name: "",
    status: "Currently learning",
    technologies: "",
    evidence: "",
    projects: [],
    experience: [],
  },
  achievements: { title: "", detail: "", url: "" },
  posts: {
    title: "",
    text: "",
    summary: "",
    date: new Date().toISOString().slice(0, 10),
    url: "",
    published: false,
  },
};
export default function Admin() {
  const [session, setSession] = useState(null),
    [state, setState] = useState(null),
    [draft, setDraft] = useState(null);
  const [tab, setTab] = useState("profile"),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [preview, setPreview] = useState(false);
  const [previewQuick, setPreviewQuick] = useState(false);
  const upload = useRef(null);
  const api = async (path, body) => {
    const r = await fetch(
      "/api/" + path,
      body === undefined
        ? {}
        : {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": session?.csrf || "",
            },
            body: JSON.stringify(body),
          },
    );
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Request failed");
    return data;
  };
  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then(async (s) => {
        setSession(s);
        if (s.authenticated) {
          const r = await fetch("/api/admin/content");
          if (!r.ok) throw new Error("Could not load content");
          const data = await r.json();
          setState(data);
          setDraft(data.draft);
        }
      })
      .catch(() =>
        setNotice(
          "The content server is unavailable. Start it with npm run server.",
        ),
      );
  }, []);
  useEffect(() => {
    const warn = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const change = (key, value, index) => {
    setDraft((d) => {
      const next = structuredClone(d);
      if (index !== undefined) next[tab][index][key] = value;
      else next[tab][key] = value;
      return next;
    });
    setDirty(true);
  };
  const action = async (name, body = {}) => {
    setBusy(true);
    setNotice("");
    try {
      if (name === "save") validateContent(draft);
      const next = await api("admin/" + name, {
        ...body,
        revision: state.revision,
        ...(name === "save" ? { content: draft } : {}),
      });
      setState(next);
      if (name !== "sync") {
        setDraft(next.draft);
        setDirty(false);
      }
      setNotice(
        name === "publish"
          ? "Published. Both public views now use this content."
          : name === "sync"
            ? next.sync.error || "GitHub pins refreshed."
            : name === "restore"
              ? "Revision restored to draft. Preview before publishing."
              : "Draft saved. Visitors still see the published version.",
      );
    } catch (e) {
      setNotice(e.message);
    } finally {
      setBusy(false);
    }
  };
  const field = (key, value, index) => {
    if (Array.isArray(value))
      return (
        <label className="admin-field" key={key}>
          {label(key)} (comma separated)
          <input
            value={value.join(",")}
            onChange={(e) => change(key, e.target.value.split(","), index)}
            onBlur={(e) =>
              change(
                key,
                e.target.value
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean),
                index,
              )
            }
          />
        </label>
      );
    if (key === "id")
      return (
        <p className="field-id" key={key}>
          Entry ID: {value}
        </p>
      );
    if (key === "image")
      return (
        <label className="admin-field" key={key}>
          Project screenshot (PNG/JPEG/WebP, up to 2 MB)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;
              if (file.size > 2 * 1024 * 1024) {
                setNotice("Choose an image smaller than 2 MB.");
                return;
              }
              setBusy(true);
              const reader = new FileReader();
              reader.onload = () => {
                change(key, reader.result, index);
                setBusy(false);
              };
              reader.onerror = () => {
                setNotice("Could not read image.");
                setBusy(false);
              };
              reader.readAsDataURL(file);
            }}
          />
          {value && (
            <>
              <img
                className="admin-thumbnail"
                src={value}
                alt="Uploaded project preview"
              />
              <button type="button" onClick={() => change(key, "", index)}>
                Remove image
              </button>
            </>
          )}
        </label>
      );
    if (typeof value === "boolean")
      return (
        <label className="admin-checkbox" key={key}>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => change(key, e.target.checked, index)}
          />
          {label(key)}
        </label>
      );
    const multiline = [
      "about",
      "summary",
      "description",
      "contribution",
      "challenge",
      "outcome",
      "credit",
      "details",
      "evidence",
      "text",
      "detail",
    ].includes(key);
    return (
      <label className="admin-field" key={key}>
        {label(key)}
        {Array.isArray(value) && " (comma separated)"}
        {multiline ? (
          <textarea
            rows={key === "about" ? 7 : 3}
            value={value}
            onChange={(e) => change(key, e.target.value, index)}
          />
        ) : (
          <input
            type={
              typeof value === "number"
                ? "number"
                : key === "date"
                  ? "date"
                  : "text"
            }
            value={Array.isArray(value) ? value.join(", ") : value}
            onChange={(e) =>
              change(
                key,
                Array.isArray(value)
                  ? e.target.value
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean)
                  : typeof value === "number"
                    ? Number(e.target.value)
                    : e.target.value,
                index,
              )
            }
          />
        )}
      </label>
    );
  };
  if (!session?.authenticated)
    return (
      <main className="admin-login">
        <a className="wordmark" href="/">
          Aditya.
        </a>
        <h1>Content studio</h1>
        <p>Your work, in your words.</p>
        <p>Owner-only editing, drafts, revisions, and publishing.</p>
        {session?.configured ? (
          <a className="button primary" href="/api/auth/login">
            Sign in with GitHub ↗
          </a>
        ) : (
          <div className="admin-notice">
            GitHub sign-in is not configured yet. Add your OAuth app credentials
            and owner account ID using the README setup instructions. No editing
            is available until sign-in is configured.
          </div>
        )}
        {notice && <p role="status">{notice}</p>}
        <a href="/">Return to portfolio</a>
      </main>
    );
  if (!draft)
    return <p className="loading-page">{notice || "Loading your content…"}</p>;
  if (preview)
    return (
      <>
        <div className="preview-bar">
          <strong>Private draft preview — not published</strong>
          <button onClick={() => setPreviewQuick(!previewQuick)}>
            {previewQuick ? "Preview immersive view" : "Preview Quick View"}
          </button>
          <button onClick={() => setPreview(false)}>Return to editor</button>
        </div>
        <PortfolioView
          content={publicContent(draft, state.pins)}
          preview
          quick={previewQuick}
        />
      </>
    );
  const entries = Array.isArray(draft[tab]) ? draft[tab] : null;
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <a href="/" className="wordmark">
          Aditya.
        </a>
        <h1>Content studio</h1>
        <button
          disabled={busy}
          onClick={async () => {
            if (dirty && !confirm("Discard unsaved changes and sign out?"))
              return;
            await api("logout", {});
            location.href = "/";
          }}
        >
          Sign out
        </button>
      </header>
      <aside className="admin-sidebar">
        {Object.entries(names).map(([key, name]) => (
          <button
            key={key}
            aria-current={tab === key ? "page" : undefined}
            onClick={() => setTab(key)}
          >
            {name}
          </button>
        ))}
        <button onClick={() => setTab("history")}>Revisions & backup</button>
      </aside>
      <main className="admin-main">
        <fieldset className="editor-fields" disabled={busy}>
          <div className="admin-toolbar">
            <span>
              {dirty ? "Unsaved changes" : "Draft saved"} · Revision{" "}
              {state.revision}
            </span>
            <button disabled={busy} onClick={() => action("save")}>
              Save draft
            </button>
            <button
              onClick={() => {
                try {
                  validateContent(draft);
                  setPreview(true);
                } catch (e) {
                  setNotice(e.message);
                }
              }}
            >
              Preview
            </button>
            <button
              className="button primary"
              disabled={busy || dirty}
              onClick={() => action("publish")}
            >
              Publish approved content
            </button>
          </div>
          {notice && (
            <p className="admin-notice" role="status">
              {notice}
            </p>
          )}
          <h2>{names[tab] || "Revisions & backup"}</h2>
          {tab === "posts" && (
            <p>
              Paste your LinkedIn post text, original link and date. Write a
              short summary, select “Approve this post,” save, preview, then
              publish. Nothing is fetched or AI-generated.
            </p>
          )}
          {tab === "sync" && (
            <>
              <p>Last successful sync: {state.sync.lastSuccess || "Never"}</p>
              <p>
                {state.sync.error ||
                  "Manual descriptions and hidden projects are preserved."}
              </p>
              <button disabled={busy} onClick={() => action("sync")}>
                Refresh GitHub pins
              </button>
              <p>
                Imported repositories can be edited by adding them to Projects
                with the same repository URL.
              </p>
            </>
          )}
          {tab === "resume" ? (
            <div>
              <p>
                A résumé is available only after publication.
                Uploaded résumés follow the same Save → Preview →
                Publish workflow. Their contents are public after publication.
              </p>
              <p>Current draft: {draft.resume?.data ? draft.resume.name : "No PDF uploaded"}</p>
              <label className="admin-field">
                Upload replacement PDF (up to 4 MB)
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > 4 * 1024 * 1024) {
                      setNotice("Choose a PDF smaller than 4 MB.");
                      return;
                    }
                    setBusy(true);
                    const reader = new FileReader();
                    reader.onload = () => {
                      try {
                        const next = {
                          ...draft,
                          resume: { name: file.name, data: reader.result },
                        };
                        validateContent(next);
                        setDraft(next);
                        setDirty(true);
                        setNotice(
                          "Résumé added to draft. Save and publish to replace the public download.",
                        );
                      } catch (error) {
                        setNotice(error.message);
                      } finally {
                        setBusy(false);
                      }
                    };
                    reader.onerror = () => {
                      setNotice("Could not read PDF.");
                      setBusy(false);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>
          ) : tab === "history" ? (
            <div>
              <p>
                Download a private backup before major edits. Restoring a
                revision only changes the draft.
              </p>
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(draft, null, 2)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "portfolio-content.json";
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                Export draft JSON
              </button>
              <button onClick={() => upload.current.click()}>
                Import content JSON
              </button>
              <input
                ref={upload}
                type="file"
                accept=".json"
                hidden
                onChange={async (e) => {
                  const f = e.target.files[0];
                  if (!f) return;
                  setBusy(true);
                  try {
                    if (f.size > 8 * 1024 * 1024)
                      throw new Error("Import exceeds 8 MB");
                    const value = validateContent(JSON.parse(await f.text()));
                    setDraft(value);
                    setDirty(true);
                    setNotice(
                      "Imported into editor. Save and preview before publishing.",
                    );
                  } catch (error) {
                    setNotice(error.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
              {state.history.map((h) => (
                <div className="revision-row" key={h.id}>
                  <span>
                    Revision {h.id} · {new Date(h.date).toLocaleString()}
                  </span>
                  <button
                    disabled={busy || dirty}
                    onClick={() => action("restore", { id: h.id })}
                  >
                    Restore to draft
                  </button>
                </div>
              ))}
            </div>
          ) : entries ? (
            <>
              {entries.map((entry, index) => (
                <fieldset className="admin-entry" key={entry.id}>
                  <legend>
                    {entry.title || entry.name || entry.role || "New entry"}
                  </legend>
                  {Object.entries(entry).map(([key, value]) =>
                    field(key, value, index),
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setDraft((d) => ({
                        ...d,
                        [tab]: d[tab].filter((_, i) => i !== index),
                      }));
                      setDirty(true);
                    }}
                  >
                    Remove from draft
                  </button>
                </fieldset>
              ))}
              <button
                onClick={() => {
                  setDraft((d) => ({
                    ...d,
                    [tab]: [
                      ...d[tab],
                      {
                        id: "entry-" + Date.now(),
                        ...structuredClone(newRows[tab]),
                      },
                    ],
                  }));
                  setDirty(true);
                }}
              >
                Add {tab === "posts" ? "LinkedIn post" : "entry"} +
              </button>
            </>
          ) : (
            Object.entries(draft[tab]).map(([key, value]) => field(key, value))
          )}
        </fieldset>
      </main>
    </div>
  );
}
