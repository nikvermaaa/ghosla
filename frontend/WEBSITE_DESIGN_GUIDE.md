# Ghosla Frontend Design & Aesthetic Guide

This document is the **source of truth for visual and interaction design** across the frontend.  
Any future page or component should follow this guide unless there is a clear product reason to diverge.

---

## 1. Design Direction (What this product should feel like)

### Core vibe
- **Warm premium + data-trustworthy**
- **Human, not corporate**
- **Modern conversational UX**, not dashboard-heavy
- **Luxury rental assistant** with strong clarity

### Visual character
- Warm textured backgrounds (not flat white).
- Gold accents for action and emphasis.
- Soft translucency and depth (glassmorphism in key sections).
- Rounded geometry (rounded-xl/2xl/3xl) with gentle shadows.
- Strong typography hierarchy with expressive display headlines.

### Product personality
- Calm confidence.
- Helpful, not flashy for the sake of flash.
- Every visual element should imply: “we simplify complex housing search.”

---

## 2. Brand Foundations

## 2.1 Name usage
- Brand shown as **Ghosla** in UI.
- Product references can use **Ghosla** in supporting copy when needed.

## 2.2 Fonts (via `next/font`)
Defined in `app/layout.tsx`:
- **Body:** DM Sans (`--font-body`)
- **Display:** Syne 700/800 (`--font-display`)
- **Serif accent:** Cormorant Garamond (`--font-serif`, normal/italic)

Usage rules:
- Headlines and key CTAs: `var(--font-display)`.
- Body copy/UI labels: `var(--font-body)`.
- Editorial accent lines/subhead emphasis: `var(--font-serif)` + italic.

---

## 3. Color System

Primary palette currently used:

| Token | Hex | Usage |
|---|---|---|
| Ink | `#1a1714` | Primary text, dark surfaces |
| Warm muted text | `#5e564d` / `#6b635a` | Secondary text |
| Gold base | `#d6a63f` | Primary accent |
| Gold bright | `#f4cf77` | Gradient highlights |
| Legacy gold (still used in call/results) | `#c4943d` / `#c8a96e` | Existing accents |
| Warm background | `#e2ded7` | Primary app background |
| Soft light background | `#f7f4ef` | Results page background |

### Gold treatment rule
- Prefer gradient: `linear-gradient(120deg, #d6a63f 0%, #f4cf77 100%)`.
- Use gold for:
  - CTA backgrounds
  - Highlight text spans
  - Status accents
  - Decorative glow
- Do not overuse gold in long body copy.

---

## 4. Global Surface & Texture Language

Global in `app/globals.css` and per-page inline styles:
- Use warm radial gradients + subtle dot grid texture.
- Avoid plain monochrome blocks unless intentional contrast section.

Example background composition pattern:
1. Base warm tone.
2. 1–2 radial glow overlays.
3. Dot-grid micro texture.

---

## 5. Layout System

### Containers
- Main content max width: `max-w-6xl`.
- Section horizontal padding: `px-5 md:px-8` (or slightly larger for dense sections).

### Spacing rhythm
- Generous vertical spacing: usually `py-20` to `py-28` for major sections.
- Card/internal spacing: `p-5`, `p-6`, `p-7`.
- Maintain breathing room around headings and CTA groups.

### Corners & borders
- Section containers: `rounded-[2rem]` or `rounded-3xl`.
- Cards: `rounded-2xl`.
- Pills/chips/buttons: `rounded-full`.
- Border tones should be soft (`rgba(..., 0.1~0.45)`), rarely pure hard edges.

---

## 6. Typography Scale & Hierarchy

Current pattern:
- Hero H1: `text-6xl md:text-8xl`, tight tracking and line-height.
- Section H2: `text-4xl md:text-5xl`.
- Card H3: `text-2xl md:text-3xl` on content-heavy pages.
- Body: baseline lifted to `text-[17px] md:text-[18px]`.
- Supporting copy: `text-base` to `text-xl` depending section importance.

Rules:
- Always establish clear contrast between heading and support text.
- Keep body readable against textured backgrounds (don’t go too thin/light).
- Use tracking utilities for uppercase micro-labels (`tracking-[0.12em]+`).

---

## 7. Component Language

## 7.1 Navigation
- Fixed top nav with blur and translucent warm background.
- Brand is clickable.
- Primary CTA on the right in gold gradient.
- Desktop nav chips in rounded capsule.

## 7.2 Hero
- Split layout:
  - Left: value prop + CTA.
  - Right: live profile preview card.
- Include one memorable dynamic element (currently rotating preference examples).

## 7.3 Live Profile Card
- Rotating dataset examples (headline, chips, insight).
- Animated transitions with `AnimatePresence`.
- Progress dots for manual switching.
- Partner sync rows show logo + partner name + synced status.

## 7.4 Partner Section
- Should explain **why partner network matters**, not just show logos.
- Current style: translucent glass card with depth and warm glow orbs.
- Include concise partner-specific value copy.
- Avoid duplicate/redundant logo rows.

## 7.5 Process Section
- 3-step narrative with large numeric markers.
- Each card is independent and skimmable.

## 7.6 Final CTA
- High contrast section (dark backdrop).
- Strong display headline + gold accent phrase.
- Single primary action.

---

## 8. Motion System

Library: **Framer Motion**

### Standard easing
- Use: `[0.22, 1, 0.36, 1]` for reveal transitions.

### Typical durations
- Section/card reveals: `0.55 – 0.75s`
- Hero entrance: `0.8 – 0.9s`
- Small content swaps: around `0.45s`

### Motion principles
- Motion should guide hierarchy, not distract.
- Use stagger and subtle translateY for reveal.
- Keep loops purposeful (spinner, pulse, small ambient cues).

### Accessibility
- Respect `useReducedMotion()` for page-level animation alternatives.
- Cursor effects disabled on reduced motion / coarse pointers.

---

## 9. Cursor & Micro-interaction Identity

Global cursor:
- Custom home cursor via `public/cursor-home.svg` (🏠 emoji).
- Applied in `globals.css` through `--cursor-home`.

Trail effect:
- Implemented in `app/CursorTrail.tsx`.
- Current glyphs: `✨`, `⭐`, `✦`.
- Throttled and capped for performance.
- Always `pointer-events: none`.

If adding new cursor effects:
- Keep them lightweight.
- Preserve usability in forms and dense UIs.
- Keep reduced-motion and touch safeguards.

---

## 10. Route-Specific Visual Notes

## 10.1 Home (`app/page.tsx`)
- Premium storytelling page.
- Bigger typography and stronger hero emphasis.
- Glassmorphism partner section.
- Rotating preference examples.

## 10.2 Call (`app/call/VoiceCall.tsx`)
- Same warm background DNA.
- Stage-based flow: idle → recording → analyzing.
- Strong functional UI with clear progress states.
- Error states surfaced in-panel (never silent).

## 10.3 Results (`app/results/page.tsx`)
- Utility-first but still on brand (warm neutral palette).
- Card grid with expand/collapse locality intel.
- Platform tags and match quality labels for trust/scannability.

---

## 11. Copywriting Rules

Tone:
- Clear, direct, reassuring.
- Benefit-first.
- Avoid vague “AI magic” claims.

Prefer:
- “We search platforms in real time and rank results.”

Avoid:
- Generic filler (“best-in-class”, “revolutionary”, “next-level”, etc.)

Section heading formula:
- 1 emotional line + 1 practical line.

---

## 12. Accessibility & UX Requirements

- Maintain strong contrast for text over translucent surfaces.
- Do not rely on color alone for state meaning.
- Keep interactive targets comfortably sized.
- Preserve keyboard and screen-reader behavior for controls.
- Avoid heavy motion for critical content.

---

## 13. Performance & Next.js Conventions

- For `next/image` with `fill`, always provide `sizes`.
- Keep smooth scroll warning fixed with `data-scroll-behavior="smooth"` on `<html>`.
- Prefer static arrays/configs for content blocks to keep rendering predictable.
- Avoid unnecessary client-side logic in non-interactive sections.

---

## 14. Implementation Checklist for New Pages

When creating a new page, verify:

1. **Typography**
   - Uses display/body/serif roles correctly.
   - Matches existing scale rhythm.

2. **Color**
   - Uses warm neutral base + gold accents.
   - Keeps contrast safe for readability.

3. **Surfaces**
   - Includes subtle texture/depth (not flat default).
   - Rounded corners and soft borders consistent.

4. **Motion**
   - Uses the standard easing/duration system.
   - Handles reduced motion.

5. **Components**
   - CTA style matches gold gradient treatment.
   - Nav and cards feel part of same family.

6. **Interaction**
   - Cursor and trail continue to work without blocking UX.
   - Error and loading states are explicit.

7. **Technical**
   - `Image fill` includes `sizes`.
   - No Next warnings in browser console.

---

## 15. Do / Don’t Summary

### Do
- Build warm, premium, legible, conversational interfaces.
- Use gold as intentional emphasis.
- Keep cards and sections tactile with depth.
- Keep copy grounded in product behavior.

### Don’t
- Introduce cold/clinical palette shifts.
- Overload with neon or mismatched gradients.
- Add generic template-like sections with no product meaning.
- Revert to tiny text or low-contrast muted blocks.

---

## 16. Reference Files (Current Implementation)

- `app/layout.tsx` – fonts, global shell, cursor trail mount.
- `app/globals.css` – base styles, custom cursor, sparkle trail styles.
- `app/page.tsx` – home page visual system and section patterns.
- `app/call/page.tsx` + `app/call/VoiceCall.tsx` – call flow UI language.
- `app/results/page.tsx` – results cards and data presentation style.
- `public/cursor-home.svg` – custom cursor glyph.

---

If you are a future agent: **treat this file as the canonical design contract** for creating any new page in this repository.
