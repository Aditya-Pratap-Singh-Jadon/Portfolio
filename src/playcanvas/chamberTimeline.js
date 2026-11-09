import { phase } from './approved/mi-awakening-motion.mjs';
import { clampProgress } from './openingTimeline.js';

export function sampleChamber(value, still = false) {
  const progress=still?1:clampProgress(value);
  const reveal=phase(progress,.78,.98);
  return {
    progress,reveal,openingOpacity:1-reveal,
    depth:1-phase(progress,.80,1),
    text:phase(progress,.79,.96),
    controls:phase(progress,.94,1),
    interactive:progress===1,
  };
}
