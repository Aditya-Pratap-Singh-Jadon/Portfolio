import { phase, DURATION } from "./approved/mi-awakening-motion.mjs";

export const clampProgress = (value) =>
  Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
export function sampleOpening(value, reduced = false) {
  const progress = clampProgress(value);
  const awakeningTime =
    progress <= 0.72
      ? 6.4 * phase(progress, 0.28, 0.72)
      : 6.4 + (DURATION - 6.4) * phase(progress, 0.72, 1);
  return {
    progress,
    environmentTime: reduced
      ? DURATION
      : DURATION * phase(progress, 0.025, 0.29),
    awakeningTime: reduced ? 0 : awakeningTime,
    handoff: progress === 1,
    phase:
      progress === 1
        ? "handoff"
        : reduced
          ? "still"
          : progress < 0.04
            ? "void"
            : progress < 0.29
              ? "reveal"
              : awakeningTime < 4.6
                ? "awakening"
                : awakeningTime <= 6.4
                  ? "separation"
                  : "passage",
  };
}

export class ProgressSpring {
  constructor() {
    this.value = 0;
    this.velocity = 0;
    this.target = 0;
  }
  update(dt, reduced = false) {
    if (!Number.isFinite(dt) || dt < 0)
      throw new RangeError("Invalid scroll delta time");
    this.target = clampProgress(this.target);
    if (reduced) {
      this.value = this.target;
      this.velocity = 0;
      return;
    }
    const omega = 18,
      error = this.value - this.target,
      c = this.velocity + omega * error,
      decay = Math.exp(-omega * dt);
    this.value = this.target + (error + c * dt) * decay;
    this.velocity = (this.velocity - omega * c * dt) * decay;
    if (
      Math.abs(this.value - this.target) < 1e-6 &&
      Math.abs(this.velocity) < 1e-5
    ) {
      this.value = this.target;
      this.velocity = 0;
    }
  }
  reset() {
    this.value = this.target = this.velocity = 0;
  }
}
