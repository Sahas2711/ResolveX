# ResolveX — Canonical Theme

**Version:** 1.0  
**Author:** Chief Design Officer  
**Status:** Immutable Foundation

---

## SECTION 1 — Emotional Palette

ResolveX is not a tool — it is a **living membrane** between an organization and its customers.  
Every colour, every glow, every shadow must evoke a precise emotional state.

| State             | Feeling                                                                 |
|-------------------|-------------------------------------------------------------------------|
| **Calm**          | Still, submerged, trusting. The system is breathing; you are safe.      |
| **Alert**         | A distant pulse accelerates. Something small has changed. You feel curiosity, not fear. |
| **Critical**      | A sudden temperature drop. The atmosphere thickens. You feel a visceral pull to act. |
| **Resolution**    | Warm release. A quiet, golden exhale as a complaint dissolves.          |
| **Investigation** | Focus sharpens; ambient noise recedes. You feel like a deep‑sea diver examining a specimen. |

---

## SECTION 2 — Atmospheric Palette

All colours are drawn from the deepest oceans, the ionised edges of the atmosphere, and the interior of cooling stars.  
**No SaaS blue. No corporate grey. No generic dark mode.**

| Name             | HEX       | Meaning                                           | Usage                                                         |
|------------------|-----------|---------------------------------------------------|---------------------------------------------------------------|
| **Abyss**        | `#0A0E14` | The deep ocean floor where light barely reaches.  | Primary canvas background, infinite plane.                    |
| **Hadal**        | `#131A24` | The pressure zone just above the abyss.           | Secondary backgrounds, cluster interiors, fog base.           |
| **Phosphor**     | `#C8E6C9` | Soft bioluminescent glow of deep‑sea organisms.   | Complaint discs, ambient halos, filament threads.             |
| **Bathyal**      | `#2E4A4A` | A cool, mineral‑rich mid‑water tone.              | Team halos, contour lines, depth mid‑plane.                   |
| **Thermocline**  | `#3A5A5A` | The transition layer where warmth meets cold.     | Interactive elements, borders of orbital rings.               |
| **Magma**        | `#FF6F3C` | Volcanic mineral, rare and violent.               | Escalation spikes, breach flares, critical status.            |
| **Aurora**       | `#A7F3D0` | Ethereal, shifting curtains of ionised gas.       | Resolution state glow, system health pulse, forecast halos.   |
| **Cosmic Dust**  | `#E2C498` | Warm, ancient particulate light.                  | Presence trails, notification particles, temporal dust.       |
| **Obsidian**     | `#1A1F28` | Cooled lava, dense and opaque.                    | Deepest fog, SLA risk pressure zones.                         |
| **Solvent**      | `#F0F4F8` | Pure, crisp near‑surface light.                   | Focus plane foreground, active command palette text.          |

---

## SECTION 3 — Signal Colors

Every entity emits its own **signal** — a unique combination of colour, glow radius, and behaviour.

| Signal               | Base Color | Glow Intensity (0–1) | Behaviour                                                                 |
|----------------------|------------|----------------------|---------------------------------------------------------------------------|
| **Complaint**        | Phosphor   | 0.3 → 0.8            | Breathes sinusoidally (4s cycle). Glow brightens with SLA urgency.       |
| **Team**             | Bathyal    | 0.2                  | Stable, large diffuse halo. Slightly brightens on new assignment.        |
| **Product**          | Hadal + Phosphor ring | 0.4 | Acts as a gravitational anchor. A subtle Phosphor ring indicates active complaints. |
| **Escalation**       | Magma      | 0.8 → 1.0           | Spike tip pulses with high frequency (3Hz). Entire spike oscillates.     |
| **SLA Status**       | Phosphor → Magma | gradient | At 100% compliance: full Phosphor. As breach approaches, color transitions smoothly to Magma. |
| **Notification**     | Cosmic Dust | 0.5                  | Tiny particle that orbits user’s focal point, then fades after 2s.       |
| **System Health**    | Aurora     | 0.6                  | Central pulse ring expands and contracts; brightness proportional to resolution velocity. |
| **Presence**         | Cosmic Dust | 0.3                  | Faint wandering point; trail length indicates recent activity.           |
| **Forecast**         | Aurora + Magma overlay | 0.5 | Translucent fog overlay over future terrain. Magma blends in where breaches are predicted. |
| **Relationship**     | Phosphor (thread) | 0.2    | Hairline filament between connected complaints; opacifies on hover.      |

---

## SECTION 4 — Light System

ResolveX is illuminated **from within**. There is no external light source; every element is self‑emissive.

| Light Type       | Behaviour                                                                 |
|------------------|---------------------------------------------------------------------------|
| **Ambient Light** | Constant, diffuse, extremely low level. Provides just enough depth to perceive the canvas. Base level: 5% luminance. |
| **Signal Light**  | Local emission from entities. Falloff follows inverse‑square law with soft clipping. Creates natural depth. |
| **Focus Light**   | The entity in primary focus emits a sharp, cold ring of light (like a microscope lamp) that enhances its detail without casting shadows. |
| **Escalation Light** | A vertical, upward‑pointing cone of Magma‑tinted light from the spike base, piercing the fog. Dissipates over 5 seconds. |
| **Breach Light**  | An instantaneous, high‑intensity flare of Magma that overdrives the local region before settling to a flickering afterglow. |

**Immutable Rule:** Light never creates drop shadows. Depth is only produced through atmospheric scattering and self‑illumination falloff.

---

## SECTION 5 — Material Appearance

The world of ResolveX is made of **Luminous Plasma**.

- **Luminous Plasma (resting):** A smooth, viscous fluid that gently undulates. It feels cool and slightly yielding. It transmits light internally, so deeper layers glow through.
- **Atmospheric Fog (risk):** When SLA pressure mounts, the plasma condenses into a heavy, swirling mist. It does not obscure; it **absorbs** ambient light, making the area darker. Fog density is a direct readout of collective SLA risk.
- **Spikes (escalation):** A sharp, crystalline protrusion of pure, semi‑solid plasma. It is the only element that has a semi‑hard edge. It casts a faint, upward‑only illumination that cuts through fog.
- **Contour Fields (clusters):** Smooth, organic lines of minimally luminous plasma that wrap around density centres. They have no fill; only the edge glows softly in Bathyal.
- **Orbital Rings (detail):** Thin, broken arcs that orbit the focused complaint. They are made of the same plasma but are precisely constrained into geometric paths. They emit a faint, pulsing light.

---

## SECTION 6 — Depth Palette

Depth in ResolveX is a **fog gradient**, not a z‑index.

| Plane            | Color Token      | Blur (relative) | Luminance | Purpose |
|------------------|------------------|-----------------|-----------|---------|
| **Foreground**   | Solvent + Phosphor | 0 px            | 100%      | Command palette, active spike, immediate interaction layer. |
| **Focus Plane**  | Abyss + sharp Phosphor signal | 0 px | 100% | The complaint, team, or product in focus. |
| **Mid Plane**    | Hadal with Bathyal contours | 4 px | 60% | Surrounding clusters, non‑focused but active elements. |
| **Deep Plane**   | Obsidian fog     | 12 px           | 25%       | Dormant complaints, inactive teams, historical context. |
| **Infinite Plane**| Abyss with subtle Cosmic Dust | 20 px | 10% | Canvas edge, spatial void, past‑timeline ghost images. |

All planes are rendered simultaneously with continuous blending. The user perceives infinite depth without hard separators.

---

## SECTION 7 — Typography

ResolveX rejects Inter for its ubiquitous blandness. The chosen typefaces carry emotional weight and optical precision.

### Primary: **Switzer**
- A neutral, geometric grotesk with subtle humanist warmth.
- Used for all UI text, command palette, annotations, and cluster labels.
- Weight: Regular 400 for most, Medium 500 for emphasis.
- Why: It feels like a scientific instrument — calm, precise, never distracting. It disappears so the data can speak.

### Secondary: **Instrument Serif**
- A refined, high‑contrast serif for direct customer quotes, complaint descriptions, and resolution notes.
- Weight: Regular, Italic for emphasis.
- Why: The human voice inside the machine. When you read a customer’s words, you feel the person. This creates empathy that sans‑serif cannot.

### Monospace: **JetBrains Mono**
- For ticket numbers, SLA timestamps, and technical metadata.
- Weight: Regular, with ligatures enabled.
- Why: Code‑like clarity for machine‑friendly data. It signals “this is raw, trustworthy information.”

---

## SECTION 8 — Motion Identity

ResolveX moves like an **intelligent fluid**. It has mass, inertia, and a gentle will to return to equilibrium.

- **Speed:** Deliberate but responsive. Nothing teleports; everything travels along arcs.
- **Acceleration:** Ease‑out‑cubic is the default. Urgent motions (breaches, escalations) use a sharp, overshooting spring.
- **Momentum:** The canvas has friction. After a pan gesture, the view continues briefly and decelerates as if moving through a viscous medium.
- **Mass:** A complaint disc feels light (you can flick it to reassign). A team halo feels heavy — it resists drag. The command palette feels weightless, appearing instantly.

**Emotional Physics:** The system feels alive, not mechanical. Transitions are breaths, not loading states. The user navigates by pushing gently through a fluid, not by clicking buttons.

---

## SECTION 9 — Visual Signature

In a single screenshot, ResolveX is unmistakable because of these 12 traits:

1.  **No rectangles, no hard borders** — only soft discs, halos, and arcs.
2.  **A living canvas** — the background is a deep, breathing gradient, never flat.
3.  **Luminous complaints as soft orbs** — not rows of text.
4.  **Organic contour lines** wrapping clusters, like a topographical map of emotion.
5.  **Sharp, upward‑pointing spikes** — the only “sharp” element, reserved for escalation.
6.  **Concentric, broken orbital rings** around the focused entity.
7.  **A permanent, thin depletion ring** on every complaint, showing SLA life.
8.  **Depth created by atmospheric fog and self‑illumination falloff**, never drop shadows.
9.  **A central, breathing pulse ring** (in Pulse View) that is the system’s heartbeat.
10. **Filament threads** connecting related complaints, forming a visible web of systemic issues.
11. **Complete absence of text labels in charts** — data is read through visual mass and luminosity.
12. **A solitary, perfect circular command palette** — the only text‑forward element, floating in the foreground.

---

## SECTION 10 — Theme Principles (20 Immutable Rules)

Any future design must adhere to every rule below. Violating one means it is no longer ResolveX.

1.  No rectangles. Use soft discs, halos, and organic contours exclusively.
2.  No drop shadows. Depth comes from light falloff and atmospheric fog.
3.  No flat background colours. The canvas is a living, breathing gradient.
4.  No box‑based layouts. Information is arranged spatially, not in grids.
5.  No full‑opacity containers. All backgrounds are at most 80% opaque and heavily blurred.
6.  No progress bars. Use depleting rings or changing luminosity.
7.  No red/green status dots. Use saturation and glow to indicate state.
8.  No static icons. All indicators are either abstract dot patterns or luminous rings.
9.  No “cards” with titles and body text. If you need a container, use a halo.
10. No modal dialogs. All interactions are inline or via translucent overlay panels.
11. No labels on data points in visualisations. Let shape, size, and glow speak.
12. No hard dividers or separator lines. Use a change in fog density.
13. The font must never be Inter. It is Switzer for UI, Instrument Serif for human text, JetBrains Mono for code.
14. Motion must always feel fluid, never mechanical. Use cubic‑bezier easing and spring dynamics.
15. Colour must never be purely decorative. Every colour encodes a signal (SLA risk, team load, system health).
16. No literal icons (no envelope, no gear). Abstraction only.
17. The cursor is always a soft, luminous disc, not an arrow.
18. No “empty states” with illustrations. Show a calm, breathing canvas.
19. The command palette is the sole rectangle‑free text interface; it is circular, centred, and ephemeral.
20. Screenshots must be impossible to confuse with Jira, Zendesk, Notion, or any other enterprise tool. If it looks familiar, redesign it.

---

*This Theme.md is the irreducible core of ResolveX. It is not a style guide; it is a binding contract with the vision. All future design, engineering, and product decisions must honour it.*