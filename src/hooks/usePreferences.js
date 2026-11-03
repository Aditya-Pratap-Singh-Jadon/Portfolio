import { useEffect, useState } from "react";
export function useMedia(query) {
  const [matches, setMatches] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const m = matchMedia(query);
    const update = () => setMatches(m.matches);
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, [query]);
  return matches;
}
export function readPreference(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function savePreference(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Optional storage. */
  }
}
