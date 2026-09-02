export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v))

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export const smoothstep = (t: number) => {
  const x = clamp(t)
  return x * x * (3 - 2 * x)
}

export const smootherstep = (t: number) => {
  const x = clamp(t)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

/**
 * Frame-rate independent exponential smoothing.
 * `lambda` = how fast the value catches up (higher = snappier).
 */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * Math.min(dt, 0.1)))

/**
 * Segment easing used between camera keyframes: never fully stops, never
 * accelerates violently. Keeps the camera feeling heavy and continuous.
 */
export const flowEase = (u: number, amount = 0.38) => {
  const t = clamp(u)
  return t - (amount * Math.sin(2 * Math.PI * t)) / (2 * Math.PI)
}

export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/** Project a 0..1 value into a window inside a 0..1 range, with soft edges. */
export function window01(value: number, start: number, end: number, feather = 0.06) {
  if (feather <= 0) return clamp((value - start) / (end - start)) > 0 && value < end ? 1 : 0
  return smoothstep((value - start) / feather) * smoothstep((end - value) / feather)
}

export const mapRange = (value: number, inMin: number, inMax: number, outMin: number, outMax: number) =>
  outMin + ((clamp((value - inMin) / (inMax - inMin)) * (outMax - outMin)) as number)
