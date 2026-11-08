import { useState } from "react";
import { sectionById } from "../../shared/signals.js";
export default function Navbar({ quick = false, name, visibility }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <a className="wordmark" href="/" aria-label={name + ", home"}>
        <span className="brand-mark" aria-hidden="true" />
        Aditya<span className="wordmark-dot">.</span>
      </a>
      <nav aria-label="Main navigation">
        <button
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="nav-links"
          onClick={() => setOpen(!open)}
        >
          {open ? "Close −" : "Menu +"}
        </button>
        <div
          id="nav-links"
          className={"nav-links " + (open ? "open" : "")}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          {["projects", "experience", "skills", "contact"]
            .filter((id) => visibility[id])
            .map((id) => (
              <a
                key={id}
                href={(quick ? "/quick" : "/") + "#" + id}
                title={sectionById[id].subtitle}
                onClick={() => setOpen(false)}
              >
                {sectionById[id].title}
              </a>
            ))}
          <a className="nav-quick" href={quick ? "/" : "/quick"}>
            {quick ? "Immersive view" : "Quick view"} ↗
          </a>
          {!quick && <a href="#experience-preferences" onClick={() => setOpen(false)}>Display & sound</a>}
        </div>
      </nav>
    </header>
  );
}
