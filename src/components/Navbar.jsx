import { useState } from "react";
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
          {["Projects", "Experience", "Skills", "Contact"]
            .filter((label) => visibility[label.toLowerCase()])
            .map((label) => (
              <a
                key={label}
                href={(quick ? "/quick" : "/") + "#" + label.toLowerCase()}
                onClick={() => setOpen(false)}
              >
                {label}
              </a>
            ))}
          <a className="nav-quick" href={quick ? "/" : "/quick"}>
            {quick ? "Immersive view" : "Quick view"} ↗
          </a>
        </div>
      </nav>
    </header>
  );
}
