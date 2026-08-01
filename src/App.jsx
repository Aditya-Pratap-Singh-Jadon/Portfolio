import Background3D from './components/Background3D'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import About from './components/About'
import Projects from './components/Projects'
import Experience from './components/Experience'
import Contact from './components/Contact'

export default function App() {
  return (
    <>
      <Background3D />
      <div className="content-wrapper">
        <Navbar />
        <Hero />
        <About />
        <Projects />
        <Experience />
        <Contact />
      </div>
    </>
  )
}
