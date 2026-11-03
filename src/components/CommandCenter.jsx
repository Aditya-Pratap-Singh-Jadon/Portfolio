import { sections } from "../data/portfolio";
import { useEffect, useRef, useState } from "react";
import { motion } from "../motion";
export default function CommandCenter({ visibility, reduced }) {
  const ref = useRef(null),
    timer = useRef(null);
  const [selected, setSelected] = useState(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const select = (event, section) => {
    if (
      reduced ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    clearTimeout(timer.current);
    setSelected(section.id);
    timer.current = setTimeout(() => {
      const target = document.getElementById(section.id);
      history.pushState(null, "", "#" + section.id);
      target?.scrollIntoView({ behavior: "smooth" });
      const heading = target?.querySelector("h2");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus({ preventScroll: true });
      setSelected(null);
    }, motion.glassTransitionMs);
  };
  const move = (e) => {
    if (reduced || e.pointerType === "touch") return;
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty(
      "--orbit-x",
      ((e.clientX - r.left - r.width / 2) / r.width) * 5 + "deg",
    );
    ref.current.style.setProperty(
      "--orbit-y",
      (-(e.clientY - r.top - r.height / 2) / r.height) * 4 + "deg",
    );
  };
  return (
    <section id="explore" className="section command-section">
      <div className="section-heading">
        <div>
          <h2 id="explore-title" tabIndex="-1">
            Find your way in.
          </h2>
          <p className="section-subtitle">
            A closer look at my work and what drives it.
          </p>
        </div>
        <a className="text-link" href="/quick">
          Prefer the essentials? <span>Quick view ↗</span>
        </a>
      </div>
      <div
        className={"command-stage " + (selected ? "has-selection" : "")}
        style={{
          "--panel-duration": motion.glassTransitionMs + "ms",
          "--glass-follow": motion.glassFollowMs + "ms",
        }}
        ref={ref}
        onPointerMove={move}
        onPointerLeave={() => {
          ref.current?.style.setProperty("--orbit-x", "0deg");
          ref.current?.style.setProperty("--orbit-y", "0deg");
        }}
      >
        <div className="command-core" aria-hidden="true">
          <span />
        </div>
        <div className="command-panels">
          {sections
            .filter((s) => visibility[s.id])
            .map((s, i) => (
              <a
                className={
                  "hologram hologram-" +
                  i +
                  (selected === s.id ? " selected-panel" : "")
                }
                key={s.id}
                href={"#" + s.id}
                onClick={(event) => select(event, s)}
              >
                <span className="hologram-title">
                  {s.title}
                  <span aria-hidden="true">↗</span>
                </span>
                <span>{s.subtitle}</span>
              </a>
            ))}
          <a className="hologram hologram-7" href="/quick">
            <span className="hologram-title">
              Quick view <span aria-hidden="true">↗</span>
            </span>
            <span>Résumé & essentials</span>
          </a>
        </div>
      </div>
      <p className="command-footnote">
        Choose a panel to explore. Every section is also available below.
      </p>
    </section>
  );
}
