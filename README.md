# Aditya's portfolio

A React/Vite portfolio with a volcanic 3D introduction, spatial navigation, an interactive skill graph, a concise Recruiter Quick View, and a private content studio. The public branding is Aditya's name; MONOLITH // INFERNO is an internal design concept only.

## Run locally

Requires Node.js 22.9+ (24 LTS recommended) and npm. PlayCanvas is pinned to 2.23.3; the lockfile records the remaining dependencies.

```sh
npm ci
npm run server
```

In a second terminal:

```sh
npm run dev
```

Open the exact Vite address, normally `http://127.0.0.1:5173`. Vite proxies `/api` to the local API at `127.0.0.1:5174`.

The website source, server, tests, configuration, and runtime assets live directly at the repository root on `v2`. Run these commands from that root; no submodule or nested clone is required.

P6-A received user visual approval at `329a85c` on `v2`.

P6-B connects the opening to the approved MI_02 Command Center. The website loads only the hub's required runtime assets, owns panel hover/focus/return behavior, and keeps navigation and live content in semantic HTML. The eight panel IDs map to About, Projects, Experience, Skills, GitHub, Updates (or LinkedIn), Achievements, and Contact. The opening's handoff event preloads the hub; native scrolling remains reversible. `/quick` remains available throughout.

Chromium checks cover desktop and phone rendering, all eight selections and exact return positions, gateway passage/reassembly, keyboard navigation, reduced-motion links, unavailable-WebGL fallback, and context-loss retry. Automated tests cover cancellation, exact transforms, approved asset integrity, and existing website/server behavior. P6-B awaits user visual approval. Physical touch devices, other browsers, screen-reader output, and sustained GPU performance remain unverified. No P6-C or deployment is included.

P6-B.1 refines that experience into one responsive composition: an enlarged spatial hub, a stable reading area, a command index, and inline display/sound utilities. Canonical signal names and plain-language subtitles live in `shared/signals.js` and are shared by navigation, section headings, Quick View, and runtime captions. The website draws its own caption atlas on cloned label materials; the approved scene, original atlas, meshes and textures remain byte-for-byte intact. The hub introduction and the missing personal punchline are explicitly provisional.

P6-B.2 places the hub inside the opening's sticky stage. Typography, transparent 3D panels and subtle floor light emerge during camera passage on the same reversible progress value; there is no separate gateway boundary section. Panel interaction starts at arrival. Reduced motion and an unavailable opening use ordinary document flow with direct navigation. Approved scene and asset bytes are unchanged. User approved progression at `3009601`; final visual polish is deferred.

Chromium verification covers forward/reverse emergence, exact opening reassembly, all eight panel selections, keyboard selection/Escape, responsive layouts, reduced motion, unavailable WebGL and hub context-loss/retry. Local evidence includes gateway, emergence, arrival and mobile screenshots plus a sampled replay of 18 actual browser frames from one forward/reverse session. This is not a continuous frame-rate or sustained GPU benchmark. The production build still reports a large PlayCanvas chunk.

P6-C.1 connects Forge and Skills to the actual approved MI_03 and MI_04 scenes. Selecting a hub panel retains its existing focus animation; Open lazily prepares its destination, then brings that space forward. The persistent Command Center button returns without reloading the page or restarting the opening. `#space-projects` and `#space-skills` support direct entry and browser history. Only one destination runtime exists at a time; it is disposed on exit, while the retained hub suspends drawing during the visit. Reduced motion resolves the transition immediately. Errors keep return, retry and accessible content available. Runtime scene files retain their original entity identities and bytes; website adapters scope controls and cleanup without editing Editor scenes.

Origin, GitHub and Signal use provisional content shells with access to existing website sections. Chronicle, Vault and Nexus reserve their MI_05 destination contracts for P6-C.2; those scenes are not loaded. No external account data or personal facts are added. Forge retains six project placeholders; Neural Core retains its fifteen demonstration nodes, liquid rig and exact reset. This integration awaits user visual approval. Chromium checks cover both round trips, selection/reset/pulses, history, responsive layouts, synthetic touch, reduced motion, context-loss/retry and six alternating visits with bounded runtime/control counts. These checks do not establish sustained GPU memory or physical-device performance.

The existing content model is ready for the next content pass; provide only reviewed facts. Old content without a punchline still loads, and the optional field is editable in the content studio. Saving remains a draft operation; publication retains its existing explicit action.

| Content | Field |
| --- | --- |
| Introduction | `profile.introduction` |
| Personal punchline (optional, 240 characters) | `profile.punchline` |
| Biography | `profile.about` |
| Project summaries and case studies | `projects[].description`, `contribution`, `challenge`, `outcome`, `credit` |
| Experience | `experience[]` |
| Skills and evidence | `skills[]` |
| Education and achievements | `education`, `achievements[]` |
| Contact and social links | `profile.email`, `github`, `linkedin`, `availability`, `closing` |

Structural hub microcopy is separate from personal facts in `hubCopy` and `signals` in `shared/signals.js`. Resume publication remains unavailable until explicitly authorized.

- `/`: immersive public portfolio.
- `/quick`: one-page recruiter view; the only view containing a resume download button.
- `/admin`: owner-only content studio.
- `/api/resume`: the currently published resume, downloadable by anyone who has the link.

For a production-build review on your computer:

```sh
npm run build
npm run server
```

Open `http://127.0.0.1:5174`. If configuring OAuth on that origin, set `APP_ORIGIN` accordingly and register its callback URL. The Node server serves `dist` and the API together. `npm run preview` previews static files only and requires a matching API proxy; use `npm run server` to review the complete application.

## GitHub OAuth setup

The site works publicly without credentials. Admin editing stays disabled until owner sign-in is configured; there is no development authentication bypass.

1. Copy `.env.example` to `.env`. Never commit `.env`, put credentials in a `VITE_` variable, or paste secrets into chat.
2. In GitHub **Settings → Developer settings → OAuth Apps**, register an OAuth application.
3. For normal development, use homepage `http://127.0.0.1:5173` and callback `http://127.0.0.1:5173/api/auth/callback`.
4. Put the app's client ID and secret in `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.
5. Get your numeric account ID from `https://api.github.com/users/Aditya-Pratap-Singh-Jadon` and put the `id` value in `GITHUB_OWNER_ID`. Do not use your username in this field. Sign-in rejects every other account, even if its username looks similar.
6. Set `APP_ORIGIN` to the exact origin you open (scheme, hostname and port). `localhost` and `127.0.0.1` are different origins. Restart the API after changing `.env`.

OAuth requests basic public identity only. Owner sessions last eight hours and are lost when the local server restarts. Cookies are HttpOnly and SameSite=Lax; HTTPS origins also use Secure cookies. OAuth uses expiring, single-use state. All mutations require the correct Origin and the session's CSRF token.

## Where to change content

Sign in at `/admin` and choose the relevant sidebar item:

- **Identity & About:** name, title, introduction, biography, availability, email, social URLs and closing copy.
- **Education:** VIT details, graduation and CGPA wording.
- **Projects:** descriptions, contribution/challenge/outcome, team credits, links, categories, screenshots, featured ordering and visibility. Use lower order numbers first. Keep each entry's ID stable because skill evidence refers to it.
- **Experience / Skills / Achievements:** add and edit entries. Skill project IDs refer to the IDs shown in Projects. Use words such as Currently learning rather than numerical proficiency scores.
- **LinkedIn posts:** follow the workflow below.
- **Resume:** upload an approved PDF up to 4 MB. It remains a draft until published. Until then Quick View shows an unavailable state and `/api/resume` returns 404. The local original is never served or bundled; no personal PDF is committed.
- **Section visibility:** hidden sections are omitted from public responses, Quick View and navigation. Hiding a section is not a way to retract an already downloaded resume or information somebody has previously saved.
- **GitHub synchronization:** enable periodic refresh, choose an interval from 1 to 168 hours, inspect status, or refresh now.
- **Revisions & backup:** export the current draft, import a JSON backup, or restore a previous published revision to the draft.

Workflow: **Edit → Save draft → Preview both views → Publish approved content**. Saves do not publish. The Publish button requires the current draft to be saved. Unsaved navigation warns before leaving; simultaneous editor sessions get a conflict rather than silently overwriting each other.

The initial approved public content is in `src/data/portfolio.js`. It seeds a new content store only. After you start using the editor, changes there do not overwrite stored content. Use the editor or import a backup for subsequent updates.

## Add a LinkedIn post

1. Open **Admin → LinkedIn posts → Add LinkedIn post**.
2. Enter a title, original post text, original LinkedIn URL and original publication date.
3. Write or paste your short public summary.
4. Select **Approve this post for publication** when satisfied.
5. Save, preview, then publish.

The source text is kept private; visitors see the approved summary, date and source link. Duplicate source links are rejected. No AI or scraping is used. There is no Fetch from LinkedIn button: personal-post reading requires restricted LinkedIn application approval, which has not been granted or configured. The manually entered workflow is the approved launch behavior.

## GitHub pinned projects

Set `GITHUB_USERNAME` and a server-only `GITHUB_TOKEN` that can query public GitHub GraphQL data. Use the minimum permissions available for public profile/repository reading; do not grant access to private repositories for this portfolio. The OAuth login token is not reused for background synchronization.

The API queries GitHub's official GraphQL `pinnedItems(first:6, types:REPOSITORY)`, caches results locally, and refreshes on the saved interval while the server is running. It checks due work once a minute. It also provides an authenticated manual refresh.

- GitHub pin order is retained unless a manual project order overrides it.
- An editorial entry with a matching repository URL overrides imported title, description, images and case-study data.
- Hide projects in the editor to keep them out of both public views.
- Select **Keep featured independently of GitHub pins** to retain a project even after unpinning it. The four approved projects start with this selected.
- Unpinning never deletes the editorial entry.
- Failed requests retain the last successful snapshot and report the error in admin. Visitors see the last success date and a stale indicator.
- Private repositories are excluded even if a token could read them.

To edit a newly imported pin, add a project with the same HTTPS repository URL. Give it a stable local ID, then add your editorial description and optional order. No automatic pin webhook is assumed.

## Persistence and backups

Local data lives in `.data/content.json`, or `DATA_DIR` if configured. This includes drafts, published content, the pin cache, uploaded media and the last 20 published revisions. It is intentionally excluded from Git. Writes are serialized and replaced atomically; an invalid existing file is never overwritten by the seed. Short Windows file-sharing conflicts are retried.

Run **one API process per data directory**. The queue protects concurrent requests within that process, not multiple independent processes. This local file adapter is for development/review; hosting needs a durable store with equivalent atomicity and conflict checks before public deployment.

Use **Revisions & backup → Export draft JSON** regularly and keep the file private. It includes draft post source text and uploaded files. To make a complete server backup, stop the API and copy the whole data directory. Restore a copy to a separate directory first, start the server with that `DATA_DIR`, and review it before replacing the active data. Revisions restore to draft and require a separate publish.

## Presentation and accessibility

- Plain section headings with thematic subtitles; no portrait or contact phone in the UI.
- Published resumes are public downloads. Review their contents before publishing; Quick View is not an authorization boundary.
- Direct links, native keyboard controls, visible focus, dialog Escape dismissal and touch layouts.
- System reduced motion plus a remembered **Reduce motion** control. Reduced mode skips the opening, stabilizes panels and renders static scenes.
- Ambient sound starts off. After opting in, subsequent visits offer **Resume sound**; browsers still require a gesture. Sound suspends when the tab is hidden.
- Fine-pointer dot cursor; one ring animation per entry to a link, button, expandable control or marked scroll region. Reduced motion uses a static ring. Native touch navigation is unchanged.
- WebGL is optional: renderer failures retain the CSS monolith fallback and readable content. Quick View never creates a WebGL canvas. Mobile uses fewer embers, a lower pixel ratio, stacked navigation, and the skill list instead of a second 3D canvas.
- Project identity artwork is decorative typography, not fabricated application screenshots. Upload real screenshots through the editor when available.

Material response rates are in `src/motion.js`; layout/material styling is in `src/index.css`. Three.js is lazy-loaded separately from the core UI. Scenes stop drawing offscreen or in hidden tabs and dispose GPU resources on unmount.

## Verification

```sh
npm test
npm run build
```

Node tests cover link/import validation, visibility, pin/editorial preservation, private post text, revision persistence, stale writes, anonymous access, owner/non-owner OAuth responses, state replay, CSRF, publish/logout, draft resume privacy and failed synchronization.

Browser review covers project filters/dialogs, skill search, mobile menu, reduced motion, Quick View and missing-admin-configuration behavior. Live GitHub OAuth and token-backed synchronization still need your own credentials; fixture tests do not prove those external accounts are configured.

## Deployment and zero-cost constraint

Nothing has been publicly deployed. No provider or paid service has been enabled. No analytics, AI assistant, AI summarizer, contact-form service or paid asset is used.

Hosting remains your decision. The public build is ordinary static output, but the content studio, OAuth, synchronization and editable content require a backend. A free static host alone does not run those features. Before deployment we must select the free backend/persistence option, port the local adapter if necessary, confirm current quotas and hard limits, configure HTTPS and secrets, and verify live authentication. Do not place `.data`, `.env`, server sources or private backups in a public static directory. Dynamic-service limits should stop service rather than trigger paid upgrades.

There is no honest guarantee that another company's free terms will remain unchanged forever. This application creates no subscription or automatic overage billing; keep accounts on free plans and review terms if providers change them.

Deployment handover checklist: choose the provider; configure owner identity and callback for the final free subdomain; migrate the published store and media; set GitHub secrets server-side; configure persistent/scheduled execution; test backups and rollback; set canonical/social URLs for the final origin; run the test suite/build, keyboard/touch/reduced-motion/performance review; obtain authorization before publishing.
