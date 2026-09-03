/**
 * Environmental audio engine.
 *
 * Everything is synthesised with WebAudio, so the site ships no audio binary.
 * The intent is a room tone you stop noticing: no loops you can identify, no
 * whooshes, no level that competes with the picture.
 *
 * Signal flow
 *   sources ──▶ layer gain ──▶ (master volume) ──▶ master ──▶ destination
 *
 * Rules that keep it subtle:
 *  · master sits at MASTER_LEVEL, so a layer at 1.0 is still quiet;
 *  · every layer is low-passed noise with a gentle Q — never a resonant peak;
 *  · wind is a slowly wandering amplitude, not a periodic sweep;
 *  · bird and construction events are scheduled at randomised intervals, so
 *    the pattern never repeats at a period you can hear;
 *  · the noise buffer is 11 s long, so a loop point is not identifiable.
 *
 * Audio never starts on its own: `start()` only runs from a user gesture, and
 * the muted preference is persisted.
 */

export type AudioLayer = 'wind' | 'birds' | 'traffic' | 'construction'

type SceneMix = Record<AudioLayer, number>

const KEY = 'rudra.audio.muted'
const KEY_LEVEL = 'rudra.audio.level'

/** Ceiling for the whole mix — ambience, not a soundtrack. */
const MASTER_LEVEL = 0.34
/** Per-layer ceiling relative to the master. */
const LAYER_CEILING: Record<AudioLayer, number> = {
  wind: 0.55,
  traffic: 0.5,
  birds: 0.4,
  construction: 0.35,
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

export function getStoredMuted(): boolean {
  if (typeof window === 'undefined') return true
  return window.localStorage.getItem(KEY) === '1'
}

export function getStoredLevel(): number {
  if (typeof window === 'undefined') return 0.8
  const raw = window.localStorage.getItem(KEY_LEVEL)
  const value = raw === null ? 0.8 : Number(raw)
  return Number.isFinite(value) ? clamp01(value) : 0.8
}

function storeMuted(value: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, value ? '1' : '0')
}

function storeLevel(value: number) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY_LEVEL, String(clamp01(value)))
}

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  /** user volume, applied under the master */
  private volume: GainNode | null = null
  private gains: Partial<Record<AudioLayer, GainNode>> = {}
  private sources: AudioBufferSourceNode[] = []
  private noise: AudioBuffer | null = null
  private mix: SceneMix = { wind: 0.5, birds: 0.12, traffic: 0.1, construction: 0.1 }
  private muted = true
  private level = 0.8
  private timers: number[] = []
  private running = false

  hasStarted(): boolean {
    return Boolean(this.ctx)
  }

  isMuted(): boolean {
    return this.muted
  }

  getLevel(): number {
    return this.level
  }

  setLevel(value: number) {
    this.level = clamp01(value)
    storeLevel(this.level)
    if (!this.ctx || !this.volume) return
    this.volume.gain.setTargetAtTime(this.muted ? 0 : this.level, this.ctx.currentTime, 0.25)
  }

  /** Returns the muted state after the call. */
  toggle(): boolean {
    if (!this.ctx) {
      this.start()
      this.setMuted(false)
      return false
    }
    this.setMuted(!this.muted)
    return this.muted
  }

  setMuted(value: boolean) {
    this.muted = value
    storeMuted(value)
    if (!this.ctx || !this.volume) return
    // long, gentle fade — never a click, never a jump
    this.volume.gain.setTargetAtTime(value ? 0 : this.level, this.ctx.currentTime, 0.6)
  }

  start() {
    if (this.ctx) return
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return

    this.level = getStoredLevel()
    this.muted = getStoredMuted()

    const ctx = new Ctor()
    this.ctx = ctx

    this.master = ctx.createGain()
    this.master.gain.value = MASTER_LEVEL
    this.master.connect(ctx.destination)

    this.volume = ctx.createGain()
    // fade in from silence over ~2 s so enabling audio is never a jolt
    this.volume.gain.value = 0
    this.volume.gain.setTargetAtTime(this.muted ? 0 : this.level, ctx.currentTime, 0.7)
    this.volume.connect(this.master)

    this.noise = this.createNoiseBuffer(ctx, 11)

    this.gains.wind = this.createNoiseLayer(340, 0.7, 0)
    this.gains.traffic = this.createNoiseLayer(220, 0.7, 0)
    this.gains.birds = this.createGain(0)
    this.gains.construction = this.createGain(0)

    this.running = true
    this.setMix(this.mix)
    this.scheduleWind()
    this.scheduleBirds()
    this.scheduleConstruction()
  }

  /** Brown-ish noise, long enough that no loop point is identifiable. */
  private createNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const rate = ctx.sampleRate
    const buffer = ctx.createBuffer(1, Math.floor(rate * seconds), rate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      last = (last + 0.028 * white) / 1.028
      data[i] = last * 3.2
    }
    // cross-fade the tail into the head so the loop seam is inaudible
    const fade = Math.floor(rate * 0.4)
    for (let i = 0; i < fade; i++) {
      const t = i / fade
      const head = data[i]
      const tail = data[data.length - fade + i]
      data[i] = head * t + tail * (1 - t)
    }
    return buffer
  }

  private createGain(value: number): GainNode {
    const ctx = this.ctx!
    const gain = ctx.createGain()
    gain.gain.value = value
    gain.connect(this.volume!)
    return gain
  }

  /** Gentle low-passed noise — the base of wind and traffic. */
  private createNoiseLayer(frequency: number, q: number, volume: number): GainNode {
    const ctx = this.ctx!
    const source = ctx.createBufferSource()
    source.buffer = this.noise
    source.loop = true
    // slightly detuned playback keeps two layers from phase-locking
    source.playbackRate.value = 0.92 + Math.random() * 0.16

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = frequency
    filter.Q.value = q

    const shelf = ctx.createBiquadFilter()
    shelf.type = 'highshelf'
    shelf.frequency.value = 1400
    shelf.gain.value = -14

    const gain = ctx.createGain()
    gain.gain.value = volume

    source.connect(filter)
    filter.connect(shelf)
    shelf.connect(gain)
    gain.connect(this.volume!)
    source.start(ctx.currentTime + Math.random() * 4)
    this.sources.push(source)
    return gain
  }

  /** Wind breathes: slow, irregular swells instead of a repeating sweep. */
  private scheduleWind() {
    if (!this.ctx || !this.gains.wind) return
    const gain = this.gains.wind
    const duration = 5 + Math.random() * 9
    const target = this.mix.wind * LAYER_CEILING.wind * (0.35 + Math.random() * 0.65)
    const now = this.ctx.currentTime
    gain.gain.cancelScheduledValues(now)
    gain.gain.setTargetAtTime(target, now, duration * 0.55)
    this.timers.push(
      window.setTimeout(() => this.scheduleWind(), duration * 1000),
    )
  }

  private scheduleBirds() {
    if (!this.ctx || !this.gains.birds) return
    const delay = (2.5 + Math.random() * 9) * 1000
    this.timers.push(
      window.setTimeout(() => {
        if (this.mix.birds > 0.02 && this.ctx && this.gains.birds) {
          const now = this.ctx.currentTime
          const count = 1 + Math.floor(Math.random() * 3)
          for (let i = 0; i < count; i++) {
            const osc = this.ctx.createOscillator()
            const gain = this.ctx.createGain()
            const freq = 2200 + Math.random() * 1800
            const start = now + 0.09 * i + Math.random() * 0.05
            osc.type = 'sine'
            osc.frequency.setValueAtTime(freq, start)
            osc.frequency.exponentialRampToValueAtTime(freq * (0.7 + Math.random() * 0.2), start + 0.12)
            gain.gain.setValueAtTime(0.0001, start)
            gain.gain.exponentialRampToValueAtTime(0.02 * this.mix.birds * LAYER_CEILING.birds, start + 0.025)
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.13)
            osc.connect(gain)
            gain.connect(this.gains.birds)
            osc.start(start)
            osc.stop(start + 0.16)
          }
        }
        this.scheduleBirds()
      }, delay),
    )
  }

  /** Distant work: dull impacts and the odd rumble, never a beep. */
  private scheduleConstruction() {
    if (!this.ctx || !this.gains.construction) return
    const delay = 900 + Math.random() * 4200
    this.timers.push(
      window.setTimeout(() => {
        const ctx = this.ctx
        if (ctx && this.gains.construction && this.mix.construction > 0.05) {
          const loud = this.mix.construction
          const now = ctx.currentTime
          const impacts = 1 + Math.floor(Math.random() * 2)
          for (let i = 0; i < impacts; i++) {
            const start = now + 0.07 * i
            const source = ctx.createBufferSource()
            source.buffer = this.noise
            source.loop = true
            const band = ctx.createBiquadFilter()
            band.type = 'bandpass'
            band.frequency.value = 90 + Math.random() * 220
            band.Q.value = 1.1
            const gain = ctx.createGain()
            gain.gain.setValueAtTime(0.0001, start)
            gain.gain.exponentialRampToValueAtTime(0.5 * loud * LAYER_CEILING.construction, start + 0.012)
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34)
            source.connect(band)
            band.connect(gain)
            gain.connect(this.gains.construction)
            source.start(start)
            source.stop(start + 0.4)
          }
        }
        this.scheduleConstruction()
      }, delay),
    )
  }

  setMix(next: SceneMix) {
    this.mix = next
    if (!this.ctx) return
    const t = this.ctx.currentTime
    if (this.gains.traffic) {
      this.gains.traffic.gain.setTargetAtTime(next.traffic * LAYER_CEILING.traffic * 0.55, t, 3.5)
    }
    if (this.gains.birds) {
      this.gains.birds.gain.setTargetAtTime(next.birds * LAYER_CEILING.birds, t, 3)
    }
    if (this.gains.construction) {
      this.gains.construction.gain.setTargetAtTime(next.construction * LAYER_CEILING.construction, t, 3)
    }
    // wind is driven by scheduleWind() so it keeps breathing
  }

  dispose() {
    this.running = false
    this.timers.forEach((id) => window.clearTimeout(id))
    this.timers = []
    this.sources.forEach((source) => {
      try {
        source.stop()
      } catch {
        /* already stopped */
      }
    })
    this.sources = []
    if (this.ctx) {
      void this.ctx.close()
      this.ctx = null
    }
    this.master = null
    this.volume = null
    this.gains = {}
  }
}

export const audioEngine = new AudioEngine()
