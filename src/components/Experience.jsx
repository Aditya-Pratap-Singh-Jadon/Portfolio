import useScrollReveal from '../hooks/useScrollReveal'
import './Experience.css'


const EXPERIENCE = [
  {
    id: 1,
    company: 'Center for Social Entrepreneurship and Development',
    role: 'Front-End Development, Technical Solution Development',
    date: 'Feb 2026 - Present',
    description:
      'Contributing in the development of innovative web experiences for the Club.',
  },
  //{experience description n},
]

function TimelineItem({ item }) {
  const revealRef = useScrollReveal()

  return (
    <div className="timeline-item reveal-on-scroll" ref={revealRef}>
      <h3>{item.company}</h3>
      <div className="role">{item.role}</div>
      <div className="date">{item.date}</div>
      <p>{item.description}</p>
    </div>
  )
}

export default function Experience() {
  return (
    <section id="experience">
      <div className="experience-content">
        <h2 className="section-header">Experience</h2>
        <div className="timeline">
          {EXPERIENCE.map((item) => (
            <TimelineItem item={item} key={item.id} />
          ))}
        </div>
      </div>
    </section>
  )
}
