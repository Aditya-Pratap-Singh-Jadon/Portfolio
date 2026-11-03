import { SectionHeading } from "./UI";
export default function About({ profile, education }) {
  return (
    <section id="about" className="section about-section">
      <SectionHeading title="About" subtitle="The Origin" />
      <div className="about-layout">
        <p className="about-lead">
          Understand the problem.
          <br />
          Build. Test.
          <br />
          <span>Make it better.</span>
        </p>
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
