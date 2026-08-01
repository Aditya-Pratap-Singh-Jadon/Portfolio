import useScrollReveal from '../hooks/useScrollReveal'
import './Projects.css'

// EDIT: Replace with your actual projects
const PROJECTS = [
  {
    id: 1,
    title: 'Carbon Capture Monitoring System',
    image: 'Project Image 1',
    description:
      'Developed an AI-powered carbon capture verification pipeline that validates industrial sensor data, optimizes CO₂ capture using reinforcement learning, and tokenizes verified carbon credits on an Ethereum-based blockchain. Winner of a Yantra Central Hack 2026.',
    tags: ['Python', 'Machine Learning', 'scikit-learn', 'Data Analysis'],
  },
  {
    id: 2,
    title: 'Campus Connect',
    image: 'Project Image 2',
    description:
      'CampusConnect is a full-stack campus collaboration platform built with React, Express.js, and MongoDB. I was responsible for the frontend, where I developed responsive, component-based interfaces in React (JSX), styled them with CSS, and integrated the UI with backend APIs to provide a seamless user experience.',
    tags: ['React.js', 'Frontend Development', 'Responsive Web Design', 'REST API Integration'],
  },
  {
    id: 3,
    title: 'StackVision',
    image: 'Project Image 3',
    description:
      "Stack-Vision is an interactive web application that visualizes the execution of Pushdown Automata through animated state transitions, 3D stack operations, and step-by-step simulation. Built with React, Three.js, and modern frontend technologies, it transforms theoretical automata concepts into an intuitive, browser-based learning experience.",
    tags: ['React.js','3D Web Graphics', 'Interactive Data Visualization'],
  },
]

function ProjectCard({ project }) {
  const revealRef = useScrollReveal()

  return (
    <div className="project-card reveal-on-scroll" ref={revealRef}>
      <div className="project-image">
        {/* EDIT: Replace with an actual image, e.g. <img src="/project1.jpg" alt={project.title} /> */}
        {project.image}
        <br />
        (400x250px)
      </div>
      <div className="project-content">
        <h3>{project.title}</h3>
        <p>{project.description}</p>
        <div className="project-tags">
          {project.tags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Projects() {
  return (
    <section id="projects">
      <div style={{ width: '100%' }}>
        <h2 className="section-header">Featured Projects</h2>
        <div className="projects-grid">
          {PROJECTS.map((project) => (
            <ProjectCard project={project} key={project.id} />
          ))}
        </div>
      </div>
    </section>
  )
}
