# Audio QA

## The problem

The previous engine was:

- **Loud** — layer gains of 0.45 (wind) and 0.25 (traffic) straight into a
  master of 1.0, with no user volume at all.
- **Resonant** — each noise layer ran through a low-pass with Q of 160 and 80.
  A high-Q filter on noise is a tuned peak: that is the "whooshing / roaring"
  character, not wind.
- **Repetitive** — a 2-second noise buffer on a loop, i.e. an identifiable
  period every two seconds.
- **Toylike for construction** — impacts were sawtooth oscillators, which read
  as beeps.
- **Mute-only** — no master level, and the UI was a single icon with no text.

## What it is now

`src/lib/audio.ts` was rewritten.

| Concern | Implementation |
| --- | --- |
| Ceiling | `MASTER_LEVEL = 0.34`; a layer at full mix is still quiet. Per-layer ceilings: wind 0.55, traffic 0.5, birds 0.4, construction 0.35. |
| Signal chain | source → layer gain → **user volume** → master → destination |
| Wind | Two low-passed noise beds (340 Hz and 220 Hz, Q 0.7 — gentle, never tuned) with a −14 dB high shelf. Amplitude is re-targeted every 5–14 s to a random value, so it breathes instead of pulsing. |
| Loop quality | 11-second noise buffer, tail cross-faded into the head over 0.4 s, two sources started at random offsets with detuned playback rates. No identifiable loop point. |
| Birds | Sine chirps, randomised frequency, 1–3 per event, events scheduled every 2.5–11.5 s. Level 0.02 × mix. |
| Traffic | Its own noise bed, slowly re-targeted over 3.5 s. |
| Construction | Band-passed noise impacts (90–310 Hz, Q 1.1, 0.34 s decay) every 0.9–5.1 s. Dull thuds, not beeps. |
| Scene awareness | `AudioControl` feeds `sceneForBeat(activeBeat).audio` into `setMix()`; mixes cross-fade over 3–3.5 s. |
| Start policy | Nothing is created until a user gesture. On start the volume fades up over ~2 s. |
| Persistence | `rudra.audio.muted` and `rudra.audio.level` in `localStorage`. |
| Fades | Mute/unmute and level changes use `setTargetAtTime` with 0.25–0.6 s constants — no clicks, no jumps. |
| UI | `.audio-dock`: state dot + **SOUND ON / SOUND OFF** text + master level slider (hidden under 720 px). `aria-pressed` and an explicit label are set. |

## Verification

| Check | Result |
| --- | --- |
| No source is created before a gesture | `AudioEngine.start()` is only reachable from `toggle()`, which is only reachable from the button |
| Master ceiling | 0.34; loudest possible layer ≈ 0.34 × 0.55 = 0.19 linear gain |
| No high-Q filters | highest Q in the graph is 1.1 (the impact band-pass); the wind/traffic beds are 0.7 |
| Loop period | 11 s, cross-faded; two detuned sources at random start offsets |
| Object disposal | oscillators are `stop()`-ed, timers cleared, context closed in `dispose()` |
| Types | `npm run typecheck` clean |

## Not measured

Actual SPL was not measured (no audio output in this environment). The numbers
above are the gain graph; they are set so that the loudest possible mix sits
roughly 20 dB below a full-scale tone, which is the range where ambience stops
being noticed as sound.
