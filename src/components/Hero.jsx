import { useEffect, useRef, useState } from "react";
import { useOpeningScroll } from "../hooks/useOpeningScroll";
import "./awakening.css";
const labels = {
  void: "The ashen void",
  reveal: "The environment emerges",
  awakening: "The crucible awakens",
  separation: "The monolith opens",
  passage: "Through the gateway",
  handoff: "The gateway is open",
  still: "Reduced motion · still view",
};
export default function Hero({ profile, reduced }) {
  const section = useRef(null),
    canvas = useRef(null),
    runtime = useRef(null),
    meter = useRef(null),
    copy = useRef(null),
    returnControl = useRef(null),
    reducedRef = useRef(reduced);
  const [attempt, retry] = useState(0),
    [load, setLoad] = useState({ state: "loading", progress: 0 }),
    [phase, setPhase] = useState("void");
  reducedRef.current = reduced;
  const updateCopy = p => {
    if (!copy.current) return;
    const visible = reducedRef.current || load.state === 'error' || p < .50;
    if (!visible && copy.current.contains(document.activeElement)) returnControl.current?.focus({ preventScroll: true });
    copy.current.style.visibility = visible ? 'visible' : 'hidden';
  };
  const { latest, scrollTo } = useOpeningScroll(
    section,
    (p) => {
      runtime.current?.setProgress(p);
      if (meter.current) meter.current.value = p;
      updateCopy(p);
    },
    reduced,
  );
  useEffect(() => { updateCopy(latest.current); }, [reduced, load.state]);
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false,
      instance;
    setLoad({ state: "loading", progress: 0 });
    const fail = () => {
      if (!cancelled) setLoad({ state: "error", progress: 0 });
    };
    const timeout = setTimeout(() => {
      fail();
      controller.abort();
      instance?.dispose();
    }, 25000);
    import("../playcanvas/openingRuntime")
      .then(({ createOpeningRuntime }) =>
        createOpeningRuntime(canvas.current, {
          signal: controller.signal,
          reduced: reducedRef.current,
          onLoad: (progress) => {
            if (!cancelled) setLoad({ state: "loading", progress });
          },
          onState: (s) => {
            if (!cancelled) setPhase(s.phase);
          },
          onError: fail,
        }),
      )
      .then((value) => {
        instance = value;
        if (cancelled || controller.signal.aborted) {
          value.dispose();
          return;
        }
        clearTimeout(timeout);
        runtime.current = value;
        value.setProgress(latest.current);
        value.setReduced(reducedRef.current);
        if (import.meta.env.DEV) window.__MI_OPENING__ = value;
        setLoad({ state: "ready", progress: 1 });
      })
      .catch((error) => {
        clearTimeout(timeout);
        if (!cancelled) {
          console.error("Opening runtime:", error);
          fail();
        }
      });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
      instance?.dispose();
      if (runtime.current === instance) runtime.current = null;
      if (window.__MI_OPENING__ === instance) delete window.__MI_OPENING__;
    };
  }, [attempt]);
  useEffect(() => {
    runtime.current?.setReduced(reduced);
  }, [reduced]);
  const skip = () =>
    document
      .getElementById("awakening-boundary")
      ?.scrollIntoView({ behavior: "instant" });
  return (
    <>
      <section
        id="home"
        ref={section}
        className={`awakening-shell ${reduced ? "is-reduced" : ""} ${load.state === "error" ? "has-error" : ""}`}
        aria-label="Monolith awakening"
      >
        <div className="awakening-stage">
          <div
            className={`awakening-world ${load.state === "ready" ? "is-ready" : ""}`}
            aria-hidden="true"
          >
            <canvas key={attempt} ref={canvas} />
          </div>
          <div className="awakening-shade" />
          <div className="awakening-copy" ref={copy}>
            <p className="awakening-wordmark">
              MONOLITH <span>//</span> INFERNO
            </p>
            <h1>
              {profile?.name === "Aditya Pratap Singh Jadon" ? (
                <>
                  Aditya Pratap
                  <br />
                  Singh Jadon
                </>
              ) : (
                profile?.name || "[Your name]"
              )}
              <span className="orange">.</span>
            </h1>
            <p className="awakening-intro">Professional introduction</p>
            <p className="awakening-placeholder">
              Temporary content · Introduction, headline and supporting
              statement await approval.
            </p>
            <div className="awakening-actions">
              <button
                className="button primary"
                onClick={
                  reduced || load.state === "error" ? skip : () => scrollTo(0.5)
                }
              >
                {reduced || load.state === "error"
                  ? "Continue to portfolio"
                  : "Begin the awakening"}{" "}
                <span aria-hidden="true">↘</span>
              </button>
              <a href="/quick" className="text-link">
                Quick view ↗
              </a>
            </div>
          </div>
          {load.state !== "ready" && (
            <div className="awakening-loading" role="status">
              {load.state === "error" ? (
                <>
                  <p>
                    The 3D opening is unavailable. Continue to the portfolio
                    below.
                  </p>
                  <button onClick={() => retry((n) => n + 1)}>
                    Retry 3D view
                  </button>
                </>
              ) : (
                <>
                  Preparing the gateway{" "}
                  <progress
                    max="1"
                    value={load.progress}
                    aria-label="Opening assets loaded"
                  />
                </>
              )}
            </div>
          )}
          <div className="awakening-footer">
            <div>
              <span aria-live="polite">{labels[phase] || labels.void}</span>
              <progress
                ref={meter}
                max="1"
                aria-label="Opening progress"
              />
            </div>
            <nav aria-label="Opening controls">
              <button
                ref={returnControl}
                onClick={() => scrollTo(0)}
              >
                Return to start
              </button>
              <a href="#awakening-boundary">Skip opening ↓</a>
            </nav>
          </div>
          <span className="awakening-cue" aria-hidden="true">
            SCROLL TO AWAKEN ↓
          </span>
        </div>
      </section>
      <section
        id="awakening-boundary"
        className="awakening-boundary"
        aria-label="Opening complete"
      >
        <div>
          <p className="awakening-wordmark">THE GATEWAY</p>
          <h2>The way is open.</h2>
        </div>
        <a className="text-link" href="#explore">
          Continue to the portfolio ↓
        </a>
      </section>
    </>
  );
}
