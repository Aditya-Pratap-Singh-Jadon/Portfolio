import { useState } from "react";
import { SectionHeading, ExternalLink, Dialog } from "./UI";
export default function Projects({ projects, sync }) {
  const [filter, setFilter] = useState("All"),
    [selected, setSelected] = useState(null);
  const categories = ["All", ...new Set(projects.map((p) => p.category))];
  const visible = projects.filter(
    (p) => filter === "All" || p.category === filter,
  );
  return (
    <section id="projects" className="section projects-section">
      <SectionHeading title="Projects" subtitle="The Forge" />
      <div className="section-intro">
        <p>
          Ideas made tangible.
          <br />
          Built, tested, and still evolving.
        </p>
        <div className="filter-bar" aria-label="Filter projects">
          {categories.map((c) => (
            <button
              key={c}
              aria-pressed={filter === c}
              onClick={() => setFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="project-list">
        {visible.map((p) => (
          <article key={p.id} className={"project-row project-" + p.id}>
            <div
              className="project-art"
              aria-label={p.title + ", project identity artwork"}
            >
              {p.image ? (
                <img
                  src={p.image}
                  alt={p.title + " project screenshot"}
                  loading="lazy"
                />
              ) : (
                <>
                  <div className="project-orbit" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="project-art-title">
                    {p.id === "ssxi" ? (
                      <>
                        STARTUP
                        <br />
                        <strong>STREET XI</strong>
                      </>
                    ) : p.id === "stackvision" ? (
                      <>
                        STACK
                        <br />
                        <strong>VISION</strong>
                      </>
                    ) : (
                      p.title
                    )}
                  </span>
                  <span className="project-art-note">
                    {p.category} / {p.year}
                  </span>
                </>
              )}
            </div>
            <div className="project-copy">
              <div className="project-meta">
                <span>{p.status}</span>
                <span>{p.year}</span>
              </div>
              <h3>{p.title}</h3>
              <p>{p.description}</p>
              <div className="tags">
                {p.tags.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <div className="project-actions">
                {p.contribution && (
                  <button
                    className="text-button"
                    onClick={() => setSelected(p)}
                  >
                    Inside the project ↗
                  </button>
                )}
                {p.live && <ExternalLink href={p.live}>Live site</ExternalLink>}
                {p.repo && <ExternalLink href={p.repo}>GitHub</ExternalLink>}
              </div>
              <p className="project-credit">{p.credit}</p>
            </div>
          </article>
        ))}
      </div>
      {!visible.length && <p>No projects in this category yet.</p>}
      <p className="sync-note">
        {sync?.lastSuccess
          ? "GitHub pins refreshed " +
            new Date(sync.lastSuccess).toLocaleDateString() +
            (sync.stale ? " · Showing last successful refresh." : "")
          : "Curated projects · GitHub pin synchronization not connected yet."}
      </p>
      {selected && (
        <Dialog title={selected.title} onClose={() => setSelected(null)}>
          <p className="section-subtitle">{selected.category}</p>
          <h2>{selected.title}</h2>
          <p>{selected.description}</p>
          {[
            ["My contribution", selected.contribution],
            ["The challenge", selected.challenge],
            ["Outcome & status", selected.outcome],
          ].map(
            ([title, text]) =>
              text && (
                <div key={title}>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ),
          )}
          <p className="project-credit">{selected.credit}</p>
          <div className="project-actions">
            {selected.repo && (
              <ExternalLink href={selected.repo}>Repository</ExternalLink>
            )}
            {selected.live && (
              <ExternalLink href={selected.live}>Visit live site</ExternalLink>
            )}
          </div>
        </Dialog>
      )}
    </section>
  );
}
