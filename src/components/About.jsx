import "./About.css";

const SKILLS = [
  "Frontend Development",
  "HTML5 & CSS3",
  "React.js",
  "JavaScript (ES6+)",
  "UI/UX Design",
  "3D WebGL",
  "Log Analysis",
  "Web Security Fundamentals",
  "Git & GitHub",
  "Problem Solving",
];

export default function About() {
  return (
    <section id="about">
      <div className="about-content">
        <div className="about-text">
          <h2 className="section-header">About Me</h2>
          
          <p>
            <p>
              I'm Aditya, a third-year B.Tech. undergraduate and a frontend developer passionate about crafting seamless digital experiences that make software simple, intuitive, and enjoyable to use. I enjoy transforming ideas into responsive, visually engaging, and accessible web applications while paying close attention to both design and functionality.
            </p>
          </p>
          <p>
            My current focus is mastering modern frontend technologies and exploring the exciting world of 3D web development with Three.js and
            React Three Fiber. I love building projects that challenge me, push my creativity, and deliver meaningful value to users through thoughtful design and clean implementation.
            </p>

          <h3>Skills &amp; Expertise</h3>
          <div className="skills-grid">
            {SKILLS.map((skill) => (
              <div className="skill-item" key={skill}>
                {skill}
              </div>
            ))}
          </div>
        </div>

        <div className="about-image">
          <div className="profile-frame">
            <img
              src="/ProfilePic.jpg"
              alt="Aditya Pratap Singh Jadon"
              className="profile-image"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
