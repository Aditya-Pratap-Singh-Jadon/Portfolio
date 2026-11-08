export const portfolio = {
  profile: {
    name: "Aditya Pratap Singh Jadon",
    title: "Aspiring Software Engineer",
    introduction: "I build for the people on the other side of the screen.",
    punchline: "",
    summary:
      "Computer science student at VIT Vellore. Building thoughtful web experiences, strengthening my core CS foundations, and growing toward software engineering.",
    about:
      "I initially chose computer science for its opportunities, but studying and building software has grown into something I enjoy—especially creating seamless experiences for users.\n\nI’m currently strengthening my foundations in Operating Systems, DBMS, Computer Networks, and Software Engineering. When a problem needs an immediate fix, I work pragmatically. When time and context allow, I first try to understand the underlying problem, then improve the solution through testing and iteration. I’m working toward a career in software engineering and intend to explore AI and machine learning alongside that journey.",
    availability:
      "Open to remote frontend and full-stack internships with flexible hours alongside my studies.",
    email: "adityapratap2904@gmail.com",
    github: "https://github.com/Aditya-Pratap-Singh-Jadon",
    linkedin: "https://www.linkedin.com/in/aditya-ps-jadon/",
    closing: "Let’s build something worth using.",
  },
  education: {
    institution: "VIT Vellore",
    degree: "B.Tech in Computer Science Engineering",
    specialization: "Cyber Security",
    graduation: "July 2028",
    grade: "8.96 / 10 · through Semester 4",
  },
  projects: [
    {
      id: "ssxi",
      title: "Startup Street XI",
      category: "Full stack",
      year: "2026",
      status: "Event platform",
      featured: true,
      hidden: false,
      order: 0,
      description:
        "A collaborative CSED platform for a 24-hour ideathon, bringing participants, teams, and submissions into one experience.",
      tags: ["Next.js", "MongoDB", "Google OAuth", "Google Drive API"],
      repo: "",
      live: "https://ssxi.csedvit.com/",
      image: "",
      contribution:
        "My primary contributions covered participant and admin interfaces, backend integration, VIT-restricted Google OAuth and external email-OTP flows, team creation and joining, and pitch-deck submissions to Google Drive. Responsibilities overlapped across the CSED team.",
      challenge:
        "Connecting backend pitch-deck submissions to Google Drive was the most challenging part. I implemented this with AI assistance and am still strengthening my understanding of the integration.",
      outcome:
        "50 teams registered, with approximately 10–15 teams active at a time. A teammate handled the Azure deployment.",
      credit:
        "Built collaboratively with CSED’s technical team. Private club repository.",
    },
    {
      id: "stackvision",
      title: "StackVision",
      category: "Computer science",
      year: "2026",
      status: "Completed · not maintained",
      featured: true,
      hidden: false,
      order: 1,
      description:
        "A team-built Pushdown Automaton visualizer that turns abstract computation into an interactive learning experience.",
      tags: ["JavaScript", "React", "Automata", "Three.js"],
      repo: "https://github.com/Aditya-Pratap-Singh-Jadon/Stack-Vision",
      live: "",
      image: "",
      contribution:
        "I implemented the PDA simulation logic in JavaScript and the frontend interface apart from the 3D portion. My teammate developed the backend, 3D visualization, and overall integration.",
      challenge:
        "Translating Pushdown Automaton behavior into executable simulation logic.",
      outcome:
        "Completed academic project, available on GitHub. No active live demo or ongoing maintenance.",
      credit:
        "Built with a teammate; backend, 3D and integration credited to them.",
    },
    {
      id: "campusconnect",
      title: "CampusConnect",
      category: "Full stack",
      year: "2026",
      status: "In development",
      featured: true,
      hidden: false,
      order: 2,
      description:
        "A collaborative student-networking platform being developed to help students find mentors, project collaborators, and hackathon teammates.",
      tags: ["React", "Express", "MongoDB"],
      repo: "https://github.com/Aditya-Pratap-Singh-Jadon/CampusConnect",
      live: "",
      image: "",
      contribution: "",
      challenge: "",
      outcome: "",
      credit: "Collaborative project. Summary based on the project README.",
    },
    {
      id: "cubex",
      title: "CUBEX",
      category: "AI / ML",
      year: "2026",
      status: "Experimental · in development",
      featured: true,
      hidden: false,
      order: 3,
      description:
        "An experimental carbon-capture verification pipeline combining physics-informed machine learning, digital-twin telemetry, and deterministic carbon-credit calculations.",
      tags: ["Python", "Physics-informed ML", "Digital twin"],
      repo: "https://github.com/Aditya-Pratap-Singh-Jadon/Carbon_Capture_AI_Pipeline",
      live: "",
      image: "",
      contribution: "",
      challenge: "",
      outcome: "",
      credit:
        "Experimental project; not validated for production carbon-credit issuance.",
    },
  ],
  experience: [
    {
      id: "csed",
      organization: "CSED · VIT Vellore",
      role: "Technical Core Member",
      dates: "February 2026 — Present",
      description:
        "Building web experiences with the Center for Social Entrepreneurship and Development’s technical team.",
      details:
        "Contributed to Auction to Action’s third-edition website, which supported 100+ concurrent accounts.\nCollaborated on the Startup Street XI ideathon platform.\nDeveloping the official CSED website in React, with feature planning, code reviews, and Git/GitHub collaboration.",
      url: "https://a2a.csedvit.com/",
    },
  ],
  skills: [
    {
      id: "frontend",
      name: "Frontend",
      status: "Project experience",
      technologies:
        "React, Next.js, JavaScript, TypeScript, HTML, CSS, Material UI, Vite",
      evidence:
        "Participant interfaces, student collaboration tools, and interactive visualizers.",
      experience: ["csed"],
      projects: ["ssxi", "stackvision", "campusconnect"],
    },
    {
      id: "cs",
      name: "Core CS",
      status: "Current focus",
      technologies:
        "Operating Systems, DBMS, Computer Networks, Software Engineering, DSA, OOP, C++",
      evidence:
        "Academic study and JavaScript PDA simulation logic in StackVision.",
      projects: ["stackvision"],
    },
    {
      id: "backend",
      name: "Backend",
      status: "Currently learning",
      technologies:
        "Node.js, Express, MongoDB, REST APIs, Google OAuth, Nodemailer, Google Drive API",
      evidence:
        "Hands-on contributions to authentication, submissions, and backend integration with team and AI assistance.",
      experience: ["csed"],
      projects: ["ssxi", "campusconnect"],
    },
    {
      id: "ai",
      name: "AI & ML",
      status: "Exploring",
      technologies: "Python, machine learning, physics-informed models",
      evidence:
        "CUBEX prototype work; continuing to build understanding as my schedule allows.",
      projects: ["cubex"],
    },
    {
      id: "tools",
      name: "Tools & teamwork",
      status: "Project experience",
      technologies:
        "Git, GitHub, VS Code, Chrome DevTools, Render, AWS (with assistance)",
      evidence:
        "Collaborative CSED development, code reviews, and assisted deployment experience.",
      experience: ["csed"],
      projects: ["ssxi", "campusconnect"],
    },
  ],
  achievements: [
    {
      id: "hackathon",
      title: "Logic Loops 2.0",
      detail:
        "Winner · Yantra Central Hackathon, VIT Vellore · February 2026. Carbon-capture monitoring and optimization prototype.",
      url: "",
    },
    {
      id: "forage",
      title: "Cyber Job Simulation",
      detail:
        "Deloitte Australia through Forage · October 2025. A job simulation, not employment at Deloitte.",
      url: "https://www.theforage.com/completion-certificates/9PBTqmSxAf6zZTseP/E9pA6qsdbeyEkp3ti_9PBTqmSxAf6zZTseP_68f1db3c6b77c69ed374f975_1760763738051_completion_certificate.pdf",
    },
  ],
  posts: [],
  resume: { name: "Aditya_Pratap_Singh_Jadon_Resume.pdf", data: "" },
  sections: {
    about: true,
    projects: true,
    experience: true,
    skills: true,
    updates: true,
    achievements: true,
    contact: true,
  },
  sync: { enabled: true, intervalHours: 6 },
};
