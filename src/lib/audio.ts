/**
 * Environmental audio engine.
 *
 * Layers: wind, birds, distant traffic, construction. All layers are
 * synthesised with WebAudio so the site ships no audio binary files. Audio
 * starts only after an explicit user gesture and respects `localStorage`.
 */

type SceneMix = {
  wind: number
  birds: number
  traffic: number
  construction: number
}

export type AudioLayer = 'wind' | 'birds' | 'traffic' | 'construction'

const KEY = 'rudra.audio.muted'

export function getStoredMuted(): boolean {
  if (typeof window === 'undefined') return true
  return window.localStorage.getItem(KEY) === '1'
}

function storeMuted(value: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, value ? '1' : '0')
}

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private gains: Record<AudioLayer, GainNode> = {
    wind: null as unknown as GainNode,
    birds: null as unknown as GainNode,
    traffic: null as unknown as GainNode,
    construction: null as unknown as GainNode,
  }
  private noise: AudioBuffer | null = null
  private mix: SceneMix = { wind: 0.5, birds: 0.12, traffic: 0.1, construction: 0.1 }
  private muted = true
  private birdsTimer = 0
  private constructionTimer = 0

  hasStarted(): boolean {
    return Boolean(this.ctx)
  }

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
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(value ? 0 : 1, this.ctx.currentTime, 0.08)
    }
  }

  start() {
    if (this.ctx) return
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    this.ctx = new Ctor()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 1
    this.master.connect(this.ctx.destination)

    this.noise = this.createNoiseBuffer()

    this.gains.wind = this.createFilteredNoise(420, 160, 0.45)
    this.gains.traffic = this.createFilteredNoise(180, 80, 0.25)
    this.gains.birds = this.createGain(0.001)
    this.gains.construction = this.createGain(0.001)
    this.setMix(this.mix)
  }

  private createGain(value: number): GainNode {
    if (!this.ctx || !this.master) return null as unknown as GainNode
    const gain = this.ctx.createGain()
    gain.gain.value = value
    gain.connect(this.master)
    return gain
  }

  private createFilteredNoise(frequency: number, q: number, volume: number): GainNode {
    if (!this.ctx || !this.master || !this.noise) return null as unknown as GainNode
    const source = this.ctx.createBufferSource()
    source.buffer = this.noise
    source.loop = true
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = frequency
    filter.Q.value = q
    const gain = this.ctx.createGain()
    gain.gain.value = volume
    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.master)
    source.start()
    return gain
  }

  private createNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null
    const seconds = 2
    const rate = this.ctx.sampleRate
    const buffer = this.ctx.createBuffer(1, rate * seconds, rate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      last = (last + 0.03 * white) / 1.03
      data[i] = last * 3.6
    }
    return buffer
  }

  setMix(next: SceneMix) {
    this.mix = next
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.gains.wind.gain.setTargetAtTime(this.mix.wind, t, 0.6)
    this.gains.traffic.gain.setTargetAtTime(this.mix.traffic, t, 0.8)
    this.gains.birds.gain.setTargetAtTime(this.mix.birds, t, 0.7)
    this.gains.construction.gain.setTargetAtTime(this.mix.construction, t, 0.7)

    if (!this.birdsTimer) this.runBirds()
    if (!this.constructionTimer) this.runConstruction()
  }

  private runBirds() {
    if (!this.ctx) return
    const delay = (1.5 + Math.random() * 4) * 1000
    this.birdsTimer = window.setTimeout(() => {
      if (this.mix.birds > 0.02 && this.gains.birds) {
        const now = this.ctx!.currentTime
        const count = 1 + Math.floor(Math.random() * 3)
        for (let i = 0; i < count; i++) {
          const osc = this.ctx!.createOscillator()
          const gain = this.ctx!.createGain()
          const freq = 2400 + Math.random() * 1600
          const start = now + 0.08 * i
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, start)
          osc.frequency.exponentialRampToValueAtTime(freq * 0.72, start + 0.13)
          gain.gain.setValueAtTime(0.0001, start)
          gain.gain.exponentialRampToValueAtTime(0.006 * this.mix.birds, start + 0.02)
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12)
          osc.connect(gain)
          gain.connect(this.gains.birds)
          osc.start(start)
          osc.stop(start + 0.14)
        }
      }
      this.birdsTimer = 0
      this.runBirds()
    }, delay)
  }

  private runConstruction() {
    if (!this.ctx) return
    const delay = 600 + Math.random() * 2200
    this.constructionTimer = window.setTimeout(() => {
      if (this.mix.construction > 0.2 && this.gains.construction) {
        const now = this.ctx!.currentTime
        const count = 2 + Math.floor(Math.random() * 3)
        for (let i = 0; i < count; i++) {
          const osc = this.ctx!.createOscillator()
          const gain = this.ctx!.createGain()
          const freq = 70 + Math.random() * 170
          const start = now + 0.05 * i
          osc.type = 'sawtooth'
          osc.frequency.setValueAtTime(freq, start)
          gain.gain.setValueAtTime(0.0001, start)
          gain.gain.exponentialRampToValueAtTime(0.008 * this.mix.construction, start + 0.01)
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.09)
          osc.connect(gain)
          gain.connect(this.gains.construction)
          osc.start(start)
          osc.stop(start + 0.1)
        }
      }
      this.constructionTimer = 0
      this.runConstruction()
    }, delay)
  }

  dispose() {
    if (this.ctx) {
      void this.ctx.close()
      this.ctx = null
    }
    this.master = null
    this.birdsTimer = 0
    this.constructionTimer = 0
  }
}

export const audioEngine = new AudioEngine()
