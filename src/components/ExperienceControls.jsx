import { useEffect, useRef, useState } from "react";
import {
  useMedia,
  readPreference,
  savePreference,
} from "../hooks/usePreferences";
export function Cursor({ reduced }) {
  const ref = useRef(null),
    fine = useMedia("(pointer: fine) and (min-width: 761px)");
  useEffect(() => {
    if (!fine) return;
    const el = ref.current;
    document.documentElement.classList.add("has-custom-cursor");
    let target;
    const move = (e) => {
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      el.style.opacity = "1";
      const next = e.target.closest(
        "a,button,summary,[data-scrollable],[data-expandable],input,textarea,select",
      );
      if (target !== next) {
        el.classList.remove("active");
        if (next) {
          void el.offsetWidth;
          el.classList.add("active");
        }
        target = next;
      }
    };
    const hide = () => {
      el.style.opacity = "0";
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerleave", hide);
    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", hide);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, [fine]);
  return fine ? (
    <div
      aria-hidden="true"
      ref={ref}
      className={"custom-cursor " + (reduced ? "static-cursor" : "")}
    >
      <span />
    </div>
  ) : null;
}
export function SoundControl() {
  const [enabled, setEnabled] = useState(false),
    [message, setMessage] = useState("");
  const [remembered, setRemembered] = useState(
    () => readPreference("portfolio-sound") === "on",
  );
  const audio = useRef(null);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) audio.current?.suspend();
      else if (audio.current) audio.current.resume().catch(() => {});
    };
    document.addEventListener("visibilitychange", pause);
    return () => {
      document.removeEventListener("visibilitychange", pause);
      audio.current?.close();
    };
  }, []);
  const toggle = async () => {
    try {
      if (enabled) {
        await audio.current?.close();
        audio.current = null;
        setEnabled(false);
        setRemembered(false);
        savePreference("portfolio-sound", "off");
        return;
      }
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) {
        setMessage("Sound is unavailable in this browser.");
        return;
      }
      const ctx = new Audio();
      audio.current = ctx;
      const gain = ctx.createGain();
      gain.gain.value = 0.025;
      gain.connect(ctx.destination);
      for (const frequency of [55, 82.4]) {
        const oscillator = ctx.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        oscillator.connect(gain);
        oscillator.start();
      }
      await ctx.resume();
      setEnabled(true);
      setRemembered(true);
      savePreference("portfolio-sound", "on");
    } catch {
      setMessage("Sound could not start.");
      audio.current?.close();
      audio.current = null;
      setEnabled(false);
    }
  };
  return (
    <div className="sound-control">
      <button
        onClick={toggle}
        aria-pressed={enabled}
        aria-label={
          enabled ? "Turn ambient sound off" : "Turn ambient sound on"
        }
      >
        <span
          className={enabled ? "sound-bars playing" : "sound-bars"}
          aria-hidden="true"
        >
          <i />
          <i />
          <i />
        </span>
        {enabled ? "Sound on" : remembered ? "Resume sound" : "Sound off"}
      </button>
      {message && <span role="status">{message}</span>}
    </div>
  );
}

export function ExperiencePreferences({ reduced, systemReduced, onToggle }) {
  return (
    <div id="experience-preferences" className="experience-preferences" role="group" aria-label="Display and sound">
      <button className="motion-control" aria-pressed={reduced} disabled={systemReduced} onClick={onToggle}>
        {systemReduced ? 'Reduced motion · system' : reduced ? 'Motion reduced' : 'Reduce motion'}
      </button>
      <SoundControl />
    </div>
  );
}
