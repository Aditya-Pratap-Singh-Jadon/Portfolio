import { lazy, Suspense, useEffect, useState } from "react";
import {
  useMedia,
  readPreference,
  savePreference,
} from "./hooks/usePreferences";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import Projects from "./components/Projects";
import Experience from "./components/Experience";
import Contact from "./components/Contact";
import Skills from "./components/Skills";
import CommandCenter from "./components/CommandCenter";
import { Updates, Achievements } from "./components/MoreSections";
import QuickView from "./components/QuickView";
import { Cursor, SoundControl } from "./components/ExperienceControls";
const Admin = lazy(() => import("./components/Admin"));

export function PortfolioView({
  content,
  sync,
  preview = false,
  quick = false,
}) {
  const systemReduced = useMedia("(prefers-reduced-motion: reduce)");
  const [manualReduced, setManualReduced] = useState(
    () => readPreference("portfolio-motion") === "reduced",
  );
  const reduced = systemReduced || manualReduced;
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduced);
    return () => document.documentElement.classList.remove("reduce-motion");
  }, [reduced]);
  const s = content.sections;
  useEffect(() => {
    if (!location.hash || quick) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [quick]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {!preview && (
        <Navbar quick={quick} name={content.profile.name} visibility={s} />
      )}
      {quick ? (
        <QuickView content={content} />
      ) : (
        <main id="main">
          <Hero profile={content.profile} reduced={reduced} />
          <CommandCenter visibility={s} profile={content.profile} reduced={reduced} />
          {s.about && (
            <About profile={content.profile} education={content.education} />
          )}
          {s.projects && <Projects projects={content.projects} sync={sync} />}
          {s.experience && <Experience experience={content.experience} />}
          {s.skills && (
            <Skills
              skills={content.skills}
              projects={content.projects}
              experience={content.experience}
              reduced={reduced}
            />
          )}
          {s.updates && (
            <Updates posts={content.posts} profile={content.profile} />
          )}
          {s.achievements && (
            <Achievements
              education={content.education}
              achievements={content.achievements}
            />
          )}
          {s.contact && <Contact profile={content.profile} />}
        </main>
      )}
      <footer className="site-footer">
        <span>
          © {new Date().getFullYear()} {content.profile.name}
        </span>
        <span>Thoughtfully built. Always learning.</span>
        <a href="#main">Back to top ↑</a>
      </footer>
      {!quick && !preview && (
        <>
          <SoundControl />
          <button
            className="motion-control"
            aria-pressed={reduced}
            disabled={systemReduced}
            onClick={() => {
              savePreference(
                "portfolio-motion",
                manualReduced ? "full" : "reduced",
              );
              setManualReduced(!manualReduced);
            }}
          >
            {systemReduced
              ? "Reduced motion · system"
              : reduced
                ? "Motion reduced"
                : "Reduce motion"}
          </button>
          <Cursor reduced={reduced} />
        </>
      )}
    </>
  );
}
export default function App() {
  const [data, setData] = useState(null),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0);
  const admin = location.pathname === "/admin";
  useEffect(() => {
    if (admin) return;
    const abort = new AbortController();
    setError(false);
    fetch("/api/content", { signal: abort.signal })
      .then((r) => {
        if (!r.ok) throw new Error("Unavailable");
        return r.json();
      })
      .then((value) => {
        if (!value.content?.profile) throw new Error("Unavailable");
        setData(value);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(true);
      });
    return () => abort.abort();
  }, [attempt, admin]);
  if (admin)
    return (
      <Suspense
        fallback={<p className="loading-page">Opening content studio…</p>}
      >
        <Admin />
      </Suspense>
    );
  if (!data)
    return (
      <main className="loading-page">
        <h1>{error ? "A brief pause." : "Loading portfolio…"}</h1>
        {error && (
          <>
            <p>The portfolio is temporarily unavailable. Please try again.</p>
            <button
              className="button primary"
              onClick={() => setAttempt((n) => n + 1)}
            >
              Try again
            </button>
          </>
        )}
      </main>
    );
  return (
    <PortfolioView
      content={data.content}
      sync={data.sync}
      quick={location.pathname === "/quick"}
    />
  );
}
