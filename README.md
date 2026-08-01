# Creative Portfolio (React + Vite)

A React conversion of the original static HTML portfolio, using Three.js for the animated 3D background.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL (usually http://localhost:5173).

## Build for production

```bash
npm run build
npm run preview
```

## Project structure

```
src/
  components/
    Background3D.jsx / .css   # Three.js particle + wireframe background
    Navbar.jsx / .css
    Hero.jsx / .css
    About.jsx / .css
    Projects.jsx / .css
    Experience.jsx / .css
    Contact.jsx / .css
  hooks/
    useScrollReveal.js        # IntersectionObserver-based scroll-in animation
  App.jsx                     # Assembles all sections
  index.css                   # CSS variables, resets, shared section styles
```

## Where to edit your content

Every section component has `// EDIT:` comments marking the spots to personalize:

- `Navbar.jsx` — your name/logo
- `Hero.jsx` — headline and tagline
- `About.jsx` — bio text, skills list, profile image
- `Projects.jsx` — the `PROJECTS` array (title, description, tags, image)
- `Experience.jsx` — the `EXPERIENCE` array (company, role, dates, description)
- `Contact.jsx` — email, phone, location, and the `SOCIAL_LINKS` array

## Notes

- No Tailwind — all styling is plain CSS files, one per component, colocated with its component (e.g. `Hero.jsx` + `Hero.css`).
- Three.js is a real dependency (`three` in `package.json`), loaded via ES module import rather than a CDN `<script>` tag.
- Fonts (Playfair Display, DM Sans) are loaded via Google Fonts `<link>` in `index.html`.
