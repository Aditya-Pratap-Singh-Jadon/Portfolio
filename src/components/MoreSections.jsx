import { SectionHeading, ExternalLink } from "./UI";
export function Updates({ posts, profile }) {
  return (
    <section id="updates" className="section">
      <SectionHeading title="Updates" subtitle="The Signal" />
      {posts.length ? (
        <div className="updates-list">
          {posts.map((p) => (
            <article key={p.id}>
              <time dateTime={p.date}>
                {new Date(p.date + "T12:00:00").toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
              <h3>{p.title}</h3>
              <p>{p.summary}</p>
              <ExternalLink href={p.url}>
                Read the original on LinkedIn
              </ExternalLink>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-signal">
          <p>
            More to build.
            <br />
            More to share.
          </p>
          <div>
            <p>Notes from projects and things I’m learning will appear here.</p>
            <ExternalLink href={profile.linkedin}>
              Find me on LinkedIn
            </ExternalLink>
          </div>
        </div>
      )}
    </section>
  );
}
export function Achievements({ education, achievements }) {
  return (
    <section id="achievements" className="section">
      <SectionHeading title="Achievements" subtitle="The Vault" />
      <div className="vault-layout">
        <article className="education-card">
          <h3>{education.institution}</h3>
          <p>{education.degree}</p>
          <p>Specialization in {education.specialization}</p>
          <strong>{education.grade}</strong>
          <p>Expected graduation · {education.graduation}</p>
        </article>
        <div className="achievements-list">
          {achievements.map((a) => (
            <article key={a.id}>
              <h3>{a.title}</h3>
              <p>{a.detail}</p>
              {a.url && (
                <ExternalLink href={a.url}>View credential</ExternalLink>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
