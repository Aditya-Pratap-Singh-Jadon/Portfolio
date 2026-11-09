import { SectionHeading } from "./UI";
export default function About({ profile, education, embedded=false }) {
  return (
    <section id={embedded?undefined:'about'} className="section about-section">
      {!embedded&&<SectionHeading section="about" />}
      <div className="about-layout">
        <div>
          <p className="about-lead">{profile.punchline || 'The perspective behind the work.'}</p>
          {!profile.punchline && <p className="content-note">Provisional punchline</p>}
        </div>
        <div className="about-body">
          {profile.about.split("\n\n").map((p) => (
            <p key={p}>{p}</p>
          ))}
          <div className="education-inline">
            <span>{education.institution}</span>
            <span>
              {education.degree}
              <br />
              Specialization in {education.specialization}
            </span>
            <span>Graduating {education.graduation}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
