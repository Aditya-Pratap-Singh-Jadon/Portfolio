import { useEffect, useRef, useCallback } from "react";
export function useOpeningScroll(section, onProgress, reduced) {
  const latest = useRef(0),
    callback = useRef(onProgress);
  callback.current = onProgress;
  useEffect(() => {
    let frame;
    const measure = () => {
      frame = undefined;
      const el = section.current;
      if (!el) return;
      latest.current = Math.max(
        0,
        Math.min(
          1,
          -el.getBoundingClientRect().top /
            Math.max(1, el.offsetHeight - (el.querySelector('.awakening-stage')?.offsetHeight || innerHeight)),
        ),
      );
      el.style.setProperty("--opening-progress", latest.current);
      callback.current(latest.current);
    };
    const schedule = () => {
      if (frame === undefined) frame = requestAnimationFrame(measure);
    };
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(section.current);
    measure();
    return () => {
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [section]);
  const scrollTo = useCallback(
    (p) => {
      const el = section.current;
      window.scrollTo({
        top:
          scrollY +
          el.getBoundingClientRect().top +
          (el.offsetHeight - (el.querySelector('.awakening-stage')?.offsetHeight || innerHeight)) * p,
        behavior: reduced ? "instant" : "smooth",
      });
    },
    [section, reduced],
  );
  return { latest, scrollTo };
}
