import './Hero.css'

export default function Hero() {
  return (
    <section id="home" className="hero">
      <div className="hero-content">
        <h1>
          Frontend Developer
          <br />Crafting Interactive Experiences
        </h1>

        <p className="tagline">
          I love building modern, responsive, and user-friendly web experiences that make software simpler and more enjoyable to use. I'm passionate about creating useful products, constantly improving my frontend skills, and currently exploring the world of 3D web development with Three.js and React Three Fiber. 
        </p>
        <a href="#contact" className="cta-button">
          Get In Touch
        </a>
      </div>
      <div className="scroll-indicator" />
    </section>
  )
}
