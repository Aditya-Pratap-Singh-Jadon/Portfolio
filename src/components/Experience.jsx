import { SectionHeading, ExternalLink } from "./UI";
export default function Experience({ experience }) {
  return (
    <section id="experience" className="section">
      <SectionHeading section="experience" />
      <div className="timeline">
        {experience.map((e) => (
          <article key={e.id} className="timeline-entry">
            <div className="timeline-date">
              <span className="status-dot" />
              {e.dates}
            </div>
            <div>
              <h3>{e.role}</h3>
              <p className="organization">{e.organization}</p>
              <p>{e.description}</p>
              <ul>
                {e.details
                  .split("\n")
                  .filter(Boolean)
                  .map((d) => (
                    <li key={d}>{d}</li>
                  ))}
              </ul>
              {e.url && <ExternalLink href={e.url}>Related work</ExternalLink>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
