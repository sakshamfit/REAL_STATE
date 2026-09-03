# Daylight QA

> §35 of the brief: prove the world is exposed as daylight by measurement,
> not by a plausible-looking lighting configuration.

```
npm run qa:daylight      # the rig, computed end to end
npm run qa:shots -- <beat>   # LUMA=1 for per-shot frame statistics
```

## Why this file exists

"The site looks dark" is a rendering claim, and rendering claims need numbers.
There is no browser in the authoring environment, so the pipeline is modelled
arithmetically instead: the same constants the site loads are pushed through the
same BRDF and the same tone-mapping curve, and the resulting pixel values are
checked against daylight ranges.

```
radiance  = albedo/π · ( sun·N·I_sun + ambient + hemisphere )
          + albedo/π · E_sky            ← integrated from the real sky map
pixel     = sRGB( ACES( radiance · exposure ) )
```

`E_sky` is not a guess: `scripts/qa/sky-irradiance.mjs` integrates the actual
`buildSkyTexture` output over a cosine-weighted hemisphere, so brightening the
sky brightens the fill in the probe exactly as it does in the browser. The
tone-mapping port includes three's ACES prescale of `1/0.6`, which is why the
same exposure reads brighter under ACES than under Neutral.

## The rig

All of it lives in one file, `src/lib/daylight.ts`, and the probe imports that
file directly — the report cannot drift from the site.

| Quantity | Value | Before V7 |
| --- | ---: | ---: |
| Sun elevation | **52.0°** (late morning) | 33.9° |
| Sun intensity | **5.2** | 3.15 |
| Exposure | **1.22** | 1.00 |
| Tone mapping | ACES filmic | ACES filmic |
| Hemisphere fill | 0.95 | 0.85 |
| Ambient | 0.14 | 0.16 |
| Environment (IBL) | **1.15** | 1.00 (implicit) |
| Background | 1.05 | 1.00 |
| Fog | `#e2eae6`, d 0.0016 | `#cfd8d6`, d 0.0016 |
| SSAO intensity | **0.82 / 0.66** | 1.15 / 1.00 |
| SSAO colour | `#332e26` | `#17140f` |
| CSS vignette | **0.10 radial / 0.13 bottom** | 0.30 radial / 0.34 top / 0.40 bottom |

## What was actually wrong

Five separate things were holding the world down. Only the last two would have
been fixed by "turn the exposure up".

### 1. The sky map contained a row of NaN — the environment map was dead

`buildSkyTexture` evaluated `Math.pow(Math.min(1, dir.y), 0.42)` on a branch
that admits `dir.y` down to −0.02. A negative base with a fractional exponent is
NaN, so **one entire row of the equirect map at the horizon was NaN**: 256 of
32,768 texels at 256 px, 1,024 of 131,072 at 512 px.

That texture is the scene background *and* the source fed to `PMREMGenerator`
for `scene.environment`. NaN propagates through the irradiance convolution, so
the image-based lighting — the thing that makes PBR read as daylight rather than
as plastic — was not contributing what it should have been. This is the single
largest cause of the dark look, and no amount of exposure would have fixed it
because the failure was in the data, not the exposure.

Fixed at the source (`Math.max(0, ...)`, never clamp-after), and `qa:daylight`
now aborts with exit code 2 if a NaN texel ever reappears.

### 2. A full-screen dark sheet over a correct render

`.vignette` was `radial-gradient(... rgba(16,19,18,0.3) 100%)` plus a vertical
gradient at `0.34` top and `0.40` bottom. That is a 30–40 % darkening of the
top and bottom of every frame — the sky and the foreground, the two places the
brief says must stay bright. Now 0.10 radial starting at 74 % and 0.13 at the
very bottom: enough to seat type at the frame edge, not enough to tint anything.

`qa:daylight` parses `app/globals.css` and fails if the darkest stop exceeds
0.15, so this cannot silently regress.

### 3. A low sun

At 33.9° the sun delivered 0.56 of its beam to every horizontal surface — the
carriageway, the yard, the roofs, the top of every leaf. At 52° it delivers
0.79. That is why the road read as a dark plane and the trees read as
silhouettes while the facades were fine.

### 4. Glass that threw away its own reflection

Alpha blending scales everything a transparent material produces, including the
specular sky reflection. At `opacity: 0.32` a bright sky bouncing off a facade
arrived at a third of its value. Real architectural glazing is mostly
reflection, so opacity is now 0.56–0.68 across the six glazing call sites
(including the hero tower), with roughness left low so the reflection is a sky
rather than a haze.

### 5. Exposure was set in three places

`Experience` set 1.12, `Lighting` set 1.00, and `Post` re-applied ACES inside
the composer. Whichever mounted last won. There is now one constant,
`DAYLIGHT_EXPOSURE` in `src/lib/daylight.ts`, and every path reads it. (Three
uploads `toneMappingExposure` to every program that declares it, including the
composer's effect material, so the low tier — which has no composer — is exposed
identically to the high and mid tiers.)

## Measured output

`npm run qa:daylight`, current values:

```
sun elevation 52.0°   exposure 1.22   tone mapping aces
sun intensity 5.2     ambient / hemi 0.14 / 0.95   env 1.15

surface                       sRGB   hex      0-1
sky zenith                    186    9bbfdf   0.73
sky horizon                   221    d7dee4   0.87
concrete, sunlit              223    e0dfdb   0.87
concrete, shadowed            157    90a0ac   0.62
render/plaster, sunlit        237    eeede9   0.93
render/plaster, shadowed      192    b6c2c9   0.75
asphalt road, sunlit          120    73797f   0.47
asphalt road, shadowed         59    2c3d53   0.23
soil, sunlit                  169    bca785   0.66
foliage, sunlit               153    82a55f   0.60
foliage, interior              80    2e5c34   0.31
grass, sunlit                 172    9db577   0.67
bark/trunk, shaded             53    403424   0.21
steel, sunlit                 215    d6d8d7   0.84
```

Sun-to-shade contrast on concrete is **2.4:1 in linear light** — enough to read
as a sunny day while the shadow side keeps 0.62 sRGB of detail. Nothing
clips: the brightest surface (sunlit render) sits at 0.93, below the 0.97
ceiling. The sky keeps a 0.08 blue-over-red margin, so it is a sky, not a white
wash.

All 16 checks pass.

## Per-shot frame statistics

`LUMA=1 npm run qa:shots -- <beat>` renders the real scene with the real rig and
measures the tone-mapped frame. The offline renderer is a Lambert approximation
(no IBL, no specular except on metal and glass), so treat these as relative —
but they answer the composition questions a screenshot would.

| Beat | Mean | Crushed (<0.18) | Clipped (>0.97) | Sky | Foreground |
| --- | ---: | ---: | ---: | ---: | ---: |
| ground (opening) | 0.740 | 0.0 % | 0.0 % | 44.2 % | 0.596 |
| build | 0.792 | 0.0 % | 0.0 % | 51.4 % | 0.751 |
| company | 0.770 | 0.0 % | 0.0 % | 54.4 % | 0.738 |
| services-intro | 0.775 | 0.0 % | 0.0 % | 50.0 % | 0.676 |
| service-civil | 0.782 | 0.0 % | 0.0 % | 49.4 % | 0.687 |
| service-residential | 0.782 | 0.0 % | 0.0 % | 29.3 % | 0.756 |
| service-infrastructure | 0.764 | 0.0 % | 0.0 % | 26.0 % | 0.751 |
| service-solar | 0.768 | 0.0 % | 0.0 % | 11.1 % | 0.809 |
| service-renovation | 0.792 | 0.0 % | 0.0 % | 46.7 % | 0.725 |
| service-materials | 0.795 | 0.0 % | 0.0 % | 39.9 % | 0.785 |
| material-world | 0.795 | 0.0 % | 0.0 % | 47.3 % | 0.745 |

Sky occupies 11–54 % of every covered frame; no beat has crushed shadows or
clipped highlights; the foreground (bottom third) sits between 0.60 and 0.81.

**Not covered offline:** trust, corridor, india, future, contact and the five
process beats. Their geometry lives in React chapter components that the offline
scene graph does not build, so the renderer reports an empty frame. The probe
labels these `NOT COVERED OFFLINE` rather than scoring them as failures — they
must be checked on the live site.

## Acceptance checklist (§41)

| Requirement | Status | Evidence |
| --- | --- | --- |
| Opening frame is clearly daytime | ✅ | ground mean 0.740, 44 % sky, 0 % crushed |
| Blue sky visible | ✅ | zenith `#9bbfdf`, B − R = 0.08 |
| Natural sunlight visible | ✅ | sun 52°, sun/shade contrast 2.4:1 linear |
| Hero building brightly illuminated | ✅ | concrete sunlit 0.87, render 0.93 |
| Hero building not silhouetted | ✅ | facade normal faces the sun (dot 0.90) |
| Road clearly visible | ✅ | asphalt sunlit 0.47, shadowed 0.23 |
| Trees / vegetation visible | ✅ | foliage sunlit 0.60, interior 0.31 |
| Ground clearly visible | ✅ | soil 0.66, grass 0.67 |
| Construction site visible | ✅ | steel 0.84 |
| Crane visible | ✅ | present in the opening label map |
| Shadows present and not black | ✅ | shadowed concrete 0.62, asphalt 0.23 |
| Ambient daylight fills shadows | ✅ | E_sky 1.51 (up) at env intensity 1.15 |
| Glass responds to sky | ✅ | opacity 0.56–0.68, roughness ≤ 0.09 |
| Asphalt / soil / concrete read correctly | ✅ | 0.47 / 0.66 / 0.87 |
| No dark full-screen overlay | ✅ | vignette max alpha 0.13 |
| No excessive vignette | ✅ | 0.10 radial from 74 % |
| No dark LUT | ✅ | no LUT in the pipeline; ACES only |
| No black/gold lighting | ✅ | sun `#fff6e3`, no emissive in the world |
| No neon | ✅ | none in the 3D world |
| No night atmosphere | ✅ | fog `#e2eae6`, sun elevation 52° |
| Service scenes daylight | ✅ | all measured beats ≥ 0.764 mean |
| India map daylight | ⚠️ | React component — live check required |
| Renovation daylight | ✅ | 0.792 mean |
| Audio unchanged | ✅ | master 0.34, no layer raised |
| Mobile readable | ✅ | low tier shares the rig; only AO and textures drop |
| `assets:build` / `typecheck` / `build` | ✅ | all pass |

## Debug mode (§34)

Append `?daylight=1` to any URL to show a panel with sun elevation and bearing,
sun intensity, exposure, hemisphere and ambient fill, environment intensity,
fog, shadow map size and extent, SSAO state and vignette strength
(`src/components/ui/DaylightDebug.tsx`).

It renders only when that query parameter is present, so it is invisible in a
normal session. Delete the component and its one import in `app/page.tsx` to
remove it entirely.

## Known limitation

Everything above is arithmetic on the real constants, plus a Lambert
approximation of the frame. It cannot tell you whether the picture *looks*
right. The live site is the final authority, and the two things most likely to
need a nudge after seeing it are `DAYLIGHT_EXPOSURE` (if the sky is hotter than
the architecture) and the SSAO intensity in `Post.tsx` (if contact edges read as
dirt).
