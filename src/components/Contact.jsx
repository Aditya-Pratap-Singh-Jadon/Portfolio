import { ExternalLink, SectionHeading } from "./UI";
export default function Contact({ profile }) {
  return (
    <section id="contact" className="section contact-section">
      <SectionHeading section="contact" />
      <div className="contact-layout">
        <div>
          <p className="contact-statement">{profile.closing}</p>
          <p>{profile.availability}</p>
          <a className="email-link" href={"mailto:" + profile.email}>
            {profile.email} ↗
          </a>
          <div className="social-links">
            <ExternalLink href={profile.github}>GitHub</ExternalLink>
            <ExternalLink href={profile.linkedin}>LinkedIn</ExternalLink>
          </div>
        </div>
        <div className="mini-monolith" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </section>
  );
}
