import { lazy, Suspense, useEffect, useRef, useState } from "react";
const SkillGraph = lazy(() => import("./SkillGraph"));
import { SectionHeading, SceneBoundary } from "./UI";
import { useMedia } from "../hooks/usePreferences";
export default function Skills({ skills, projects, experience, reduced }) {
  const mobile = useMedia("(max-width: 760px)");
  const graph=useRef(null),[nearGraph,setNearGraph]=useState(false);
  useEffect(()=>{
    if(mobile||nearGraph||!graph.current)return;
    const observer=new IntersectionObserver(([entry])=>{
      if(entry.isIntersecting){setNearGraph(true);observer.disconnect();}
    },{rootMargin:'300px'});
    observer.observe(graph.current);return()=>observer.disconnect();
  },[mobile,nearGraph]);
  const [selected, setSelected] = useState(skills[0]?.id),
    [query, setQuery] = useState("");
  const filtered = skills.filter((s) =>
    (s.name + " " + s.technologies).toLowerCase().includes(query.toLowerCase()),
  );
  const current = filtered.find((s) => s.id === selected) || filtered[0];
  return (
    <section id="skills" className="section skills-section">
      <SectionHeading section="skills" />
      <div className="skills-layout">
        {!mobile && (
          <div className="skill-map" ref={graph}>
            {nearGraph&&
            <SceneBoundary>
              <Suspense
                fallback={
                  <p className="graph-loading">
                    Use the skill list while the graph loads.
                  </p>
                }
              >
                <SkillGraph
                  skills={skills}
                  selected={current?.id}
                  onSelect={(id) => {
                    setSelected(id);
                    setQuery("");
                  }}
                  reduced={reduced}
                />
              </Suspense>
            </SceneBoundary>
            }
          </div>
        )}
        <div className="skill-details">
          <label className="search-label">
            Find a skill
            <input
              type="search"
              placeholder="React, databases, core CS…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="skill-tabs" aria-label="Skill categories">
            {filtered.map((s) => (
              <button
                aria-pressed={current?.id === s.id}
                key={s.id}
                onClick={() => setSelected(s.id)}
              >
                {s.name}
              </button>
            ))}
          </div>
          {current ? (
            <div className="skill-evidence" key={current.id}>
              <p className="learning-label">{current.status}</p>
              <h3>{current.name}</h3>
              <p>{current.technologies}</p>
              <p className="evidence-label">Where it connects</p>
              <p>{current.evidence}</p>
              <div className="tags">
                {current.projects
                  .map((id) => projects.find((p) => p.id === id))
                  .filter(Boolean)
                  .map((p) => (
                    <a href="#projects" key={p.id}>
                      {p.title} ↗
                    </a>
                  ))}
              </div>
              {(current.experience || [])
                .map((id) => experience.find((e) => e.id === id))
                .filter(Boolean)
                .map((e) => (
                  <a className="skill-role-link" href="#experience" key={e.id}>
                    {e.role} · {e.organization} ↗
                  </a>
                ))}
            </div>
          ) : (
            <p role="status">No matching skills. Try another term.</p>
          )}
        </div>
      </div>
    </section>
  );
}
