import './Contact.css'

const CONTACT_ITEMS = [
  { icon: '✉', label: 'adityapratap2904@gmail.com', href: 'mailto:your.email@example.com' },
  { icon: 'P.', label: '+91 8319594605', href: 'tel:+918319594605' },
]

const SOCIAL_LINKS = [
  { label: 'GitHub', symbol: '𝗚', href: 'https://github.com/Aditya-Pratap-Singh-Jadon' },
  { label: 'LinkedIn', symbol: '𝗟', href: 'https://www.linkedin.com/in/aditya-pratap-singh-jadon-80559b321/' },
//   { label: 'Twitter', symbol: '𝗧', href: 'https://twitter.com/yourusername' },
//   { label: 'Dribbble', symbol: '𝗗', href: 'https://dribbble.com/yourusername' },
  ]

export default function Contact() {
  return (
    <section id="contact">
      <div className="contact-content">
        <h2 className="section-header">Let's Connect</h2>
        <p className="contact-message">
          I'm always open to discussing new projects, creative ideas, or opportunities to be part
          of your vision. Feel free to reach out!
        </p>

        <div className="contact-info">
          {CONTACT_ITEMS.map((item) => (
            <div className="contact-item" key={item.label}>
              <div className="contact-icon">{item.icon}</div>
              <a href={item.href}>{item.label}</a>
            </div>
          ))}
          <div className="contact-item">
            <div className="contact-icon">📍</div>
            <span className="location-text">VIT Vellore, TN, India</span>
          </div>
        </div>

        <div className="social-links">
          {SOCIAL_LINKS.map((link) => (
            <a
              href={link.href}
              className="social-link"
              target="_blank"
              rel="noreferrer"
              key={link.label}
              aria-label={link.label}
            >
              {link.symbol}
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
