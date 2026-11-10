import { ExternalLink } from "./UI";
import { sectionById } from "../../shared/signals.js";
export default function QuickView({ content }) {
  const {
    profile: p,
    education: e,
    projects,
    experience,
    skills,
    achievements,
    sections: s,
  } = content;
  return (
    <main id="main" className="quick-view">
      <div className="quick-intro">
        <div>
          <p className="learning-label">Recruiter quick view</p>
          <h1>{p.name}</h1>
          <h2>{p.title}</h2>
          <p>{p.summary}</p>
          <p>{p.availability}</p>
        </div>
        {content.resumeAvailable ? <a className="button primary" href={content.resumeUrl || '/api/resume'} download={content.resumeUrl ? undefined : true} target={content.resumeUrl ? '_blank' : undefined} rel={content.resumeUrl ? 'noopener noreferrer' : undefined}>
          {content.resumeUrl ? 'View résumé ↗' : 'Download résumé ↓'}
        </a> : <p>Résumé unavailable.</p>}
      </div>
      <div className="quick-grid">
        {s.projects && (
          <section id="projects">
            <h2>{sectionById.projects.title}</h2>
            <p className="section-subtitle">{sectionById.projects.subtitle}</p>
            {projects.map((project) => (
              <article key={project.id}>
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                <small>{project.tags.join(" · ")}</small>
                <p className="project-credit">{project.credit}</p>
                <div className="project-actions">
                  {project.repo && (
                    <ExternalLink href={project.repo}>GitHub</ExternalLink>
                  )}
                  {project.live && (
                    <ExternalLink href={project.live}>Live site</ExternalLink>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}
        <div>
          {s.experience && (
            <section id="experience">
              <h2>{sectionById.experience.title}</h2>
              <p className="section-subtitle">{sectionById.experience.subtitle}</p>
              {experience.map((x) => (
                <article key={x.id}>
                  <h3>{x.role}</h3>
                  <p>
                    {x.organization} · {x.dates}
                  </p>
                  <p>{x.description}</p>
                  <ul>
                    {x.details.split("\n").map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </section>
          )}
          {s.skills && (
            <section id="skills">
              <h2>{sectionById.skills.title}</h2>
              <p className="section-subtitle">{sectionById.skills.subtitle}</p>
              {skills.map((skill) => (
                <p key={skill.id}>
                  <strong>{skill.name}</strong> · {skill.status}
                  <br />
                  {skill.technologies}
                </p>
              ))}
            </section>
          )}
          {s.achievements && (
            <section>
              <h2>{sectionById.achievements.title}</h2>
              <p className="section-subtitle">{sectionById.achievements.subtitle}</p>
              <p>
                <strong>{e.institution}</strong>
                <br />
                {e.degree} · {e.specialization}
                <br />
                Graduating {e.graduation}
                <br />
                CGPA {e.grade}
              </p>
              {achievements.map((a) => (
                <p key={a.id}>
                  <strong>{a.title}</strong>
                  <br />
                  {a.detail}
                </p>
              ))}
            </section>
          )}
        </div>
      </div>
      {s.contact && (
        <section id="contact" className="quick-contact">
          <h2>{sectionById.contact.title}</h2>
          <p className="section-subtitle">{sectionById.contact.subtitle}</p>
          <a href={"mailto:" + p.email}>{p.email} ↗</a>
          <ExternalLink href={p.github}>GitHub</ExternalLink>
          <ExternalLink href={p.linkedin}>LinkedIn</ExternalLink>
        </section>
      )}
    </main>
  );
}
