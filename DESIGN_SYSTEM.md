# InsightStore AI — Design System

> **Last updated:** February 26, 2026  
> **Stack:** React 18 · Tailwind CSS v3 · CSS Custom Properties  
> **Theme:** Dark-only (light mode deferred to v1.1)

---

## Design Philosophy

InsightStore AI is an **intelligence-first SaaS** for developers and founders. The visual language must be:

- **Intelligent & data-driven** — not a generic dashboard. Density is a feature, not a problem.
- **Premium but approachable** — indie builders shouldn't feel priced out by the aesthetics.
- **Clear and scannable** — AI-generated reports contain dense information; hierarchy and whitespace are critical.
- **Trustworthy** — users make product decisions here. The UI must feel stable, precise, and purposeful.

---

## 1. Color Palette

All colors are available as both **Tailwind utility classes** and **CSS custom properties**.

### Background Surfaces

| Token | CSS Variable | Hex | Tailwind Class | Use |
|---|---|---|---|---|
| Base | `--bg-base` | `#0A0A0F` | `bg-bg-base` | Page background |
| Surface | `--bg-surface` | `#111118` | `bg-bg-surface` | Cards, panels |
| Elevated | `--bg-elevated` | `#1A1A24` | `bg-bg-elevated` | Modals, dropdowns, inputs |
| Border | `--bg-border` | `#2A2A38` | `bg-bg-border` | Dividers, input borders, chart grid |

### Brand — Violet-Indigo

| Token | CSS Variable | Hex | Tailwind Class | Use |
|---|---|---|---|---|
| Primary | `--brand-primary` | `#7C5CFC` | `bg-brand-primary` | Primary CTAs, active states, focus rings |
| Hover | `--brand-hover` | `#9B82FD` | `bg-brand-hover` | Hover state of brand elements |
| Muted | `--brand-muted` | `#7C5CFC1A` | `bg-brand-muted` | Subtle brand tint (10% opacity) |
| Glow | `--brand-glow` | `#7C5CFC33` | — | Card hover glow, focus box-shadow |

> ⚠️ **Rule:** Use brand violet **only** for CTAs, active states, focus rings, and key interactive elements. Do not use it for decorative backgrounds or text.

### Severity / Semantic Colors

> ⚠️ **Rule:** These colors are **reserved exclusively** for pain point severity data. Do not reuse for general UI decoration.

| Token | CSS Variable | Hex | Use |
|---|---|---|---|
| High | `--severity-high` | `#F75555` | High severity pain points |
| Medium | `--severity-med` | `#F5A623` | Medium severity pain points |
| Low | `--severity-low` | `#4ADE80` | Low severity pain points |
| Info | `--severity-info` | `#38BDF8` | Info / competitive insights |

**Badge pattern** (always use the tinted bg + border, never solid fill):
```css
/* High severity */
background:   rgba(247, 85, 85, 0.12);
color:        #F75555;
border-color: rgba(247, 85, 85, 0.25);
```

### Text

| Token | CSS Variable | Hex | Tailwind Class | Use |
|---|---|---|---|---|
| Primary | `--text-primary` | `#F0F0FF` | `text-text-primary` | Headings, key data, labels |
| Secondary | `--text-secondary` | `#A0A0C0` | `text-text-secondary` | Body copy, descriptions |
| Muted | `--text-muted` | `#60607A` | `text-text-muted` | Placeholders, captions, timestamps |

---

## 2. Typography

### Font Stack

| Role | Font | Weights | Tailwind Class | Use |
|---|---|---|---|---|
| Headings | Plus Jakarta Sans | 600, 700 | `font-heading` | All `h1`–`h4`, report titles, section headers |
| Body/UI | Inter | 400, 500 | `font-body` | Body copy, labels, buttons, captions |
| Mono | JetBrains Mono | 400 | `font-mono` | Package IDs, JSON snippets, code values |

Fonts are loaded via Google Fonts in `globals.css`. No local font files required.

### Type Scale

| Token | Size | Tailwind | Typical Use |
|---|---|---|---|
| `--text-xs` | 12px / 0.75rem | `text-xs` | Badges, labels, timestamps |
| `--text-sm` | 14px / 0.875rem | `text-sm` | Body text, table cells, captions |
| `--text-base` | 16px / 1rem | `text-base` | Default body |
| `--text-lg` | 18px / 1.125rem | `text-lg` | Card titles, section leads |
| `--text-xl` | 20px / 1.25rem | `text-xl` | Sub-headings |
| `--text-2xl` | 24px / 1.5rem | `text-2xl` | Page section titles |
| `--text-3xl` | 30px / 1.875rem | `text-3xl` | Report title, page hero |
| `--text-4xl` | 36px / 2.25rem | `text-4xl` | Marketing hero (landing page only) |

### Line Height & Letter Spacing

| Context | Line Height | Letter Spacing |
|---|---|---|
| Headings | 1.2 | `-0.02em` |
| Body | 1.6 | `0` |
| UI Labels / Caps | 1.4 | `+0.05em` |

---

## 3. Spacing Scale

Base unit: **4px**. All spacing is a multiple of 4.

| Token | Value | Tailwind | Use |
|---|---|---|---|
| `--space-1` | 4px | `p-1`, `m-1` | Micro gaps (icon + label) |
| `--space-2` | 8px | `p-2`, `m-2` | Badge padding, tight elements |
| `--space-3` | 12px | `p-3`, `m-3` | Input padding sides |
| `--space-4` | 16px | `p-4`, `m-4` | Standard inner padding |
| `--space-6` | 24px | `p-6`, `m-6` | **Card padding (standard)** |
| `--space-8` | 32px | `p-8`, `m-8` | Section gaps |
| `--space-10` | 40px | `p-10`, `m-10` | Large vertical spacing |
| `--space-12` | 48px | `p-12`, `m-12` | Between major sections |
| `--space-16` | 64px | `p-16`, `m-16` | Page section top/bottom |
| `--space-20` | 80px | `p-20`, `m-20` | Hero vertical padding |

**Layout constants:**
- Page max-width: `1280px` (`max-w-page`)
- Content column (reports): `960px` (`max-w-content`)
- Horizontal page padding: `24px`

---

## 4. Border Radius

| Token | Value | Tailwind | Use |
|---|---|---|---|
| `--radius-sm` | 6px | `rounded-sm` | Badges, tags, input fields |
| `--radius-md` | 10px | `rounded-md` | Buttons, small cards |
| `--radius-lg` | 14px | `rounded-lg` | Cards, large panels |
| `--radius-full` | 9999px | `rounded-full` | Pill badges, avatars, progress bars |

---

## 5. Shadows

| Token | Value | Tailwind | Use |
|---|---|---|---|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.4)` | `shadow-sm` | Subtle depth for small elements |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.5)` | `shadow-md` | Card lift, modal |
| `--shadow-glow` | `0 0 20px rgba(124,92,252,0.15)` | `shadow-glow` | Card hover glow, focus indicator |

---

## 6. Component Patterns

### Card
```css
background:    var(--bg-surface);
border:        1px solid var(--bg-border);
border-radius: var(--radius-lg);
padding:       var(--space-6);          /* 24px */

/* On hover */
border-color: rgba(124, 92, 252, 0.40);
box-shadow:   var(--shadow-glow);
transition:   border-color 150ms, box-shadow 150ms;
```
Use the `.card` class from `globals.css`, or Tailwind equivalents.

### Buttons

| Variant | CSS Class | Use |
|---|---|---|
| Primary | `.btn .btn-primary` | Main CTA — Analyse, Submit |
| Secondary | `.btn .btn-secondary` | Secondary actions — Cancel, Back |
| Ghost | `.btn .btn-ghost` | Tertiary actions — View, Dismiss |

### Input Fields
```css
background:    var(--bg-elevated);
border:        1px solid var(--bg-border);
border-radius: var(--radius-sm);
/* On focus */
border-color: var(--brand-primary);
box-shadow:   0 0 0 3px var(--brand-glow);
```
Use the `.input` class.

### Severity Badges

```html
<!-- Severity classes: badge-high | badge-medium | badge-low | badge-info -->
<span class="badge badge-high">High</span>
<span class="badge badge-medium">Medium</span>
<span class="badge badge-low">Low</span>
```

### Skeleton / Shimmer Loader
```html
<div class="skeleton h-4 w-32"></div>
```
Uses an animated gradient shimmer on `--bg-elevated`.

### Progress Bar
```html
<div class="progress-track">
  <div class="progress-fill" style="width: 65%"></div>
</div>
```

---

## 7. Visual Language Rules

| # | Rule |
|---|---|
| 1 | **Dark mode only** for MVP. No light mode toggle. |
| 2 | **Generous whitespace** — never crowd data elements. Density ≠ clutter. |
| 3 | **Brand violet** used only for CTAs, active states, focus rings, and key interactive elements. |
| 4 | **Severity colors** (red/amber/green/blue) are reserved for pain point data. Do not reuse decoratively. |
| 5 | **Card hover glow** (`--shadow-glow`) rewards interactivity without being distracting. |
| 6 | **Micro-interactions** at `150ms ease` on color, border, shadow. Nothing longer for hover states. |
| 7 | **No gradients** on functional UI. Gradients only on the marketing hero section. |
| 8 | **Recharts config**: use `--brand-primary` as primary data color; severity colors for histogram bars; `--bg-border` for grid lines; transparent background. |

---

## 8. Animations

| Class | Duration | Use |
|---|---|---|
| `.animate-fade-in` | 200ms | Page/section entry, modals appearing |
| `.animate-scale-in` | 150ms | Dropdown, tooltip appear |
| `.skeleton` | 1.8s loop | Loading states |

---

## 9. File Map

```
insightstore-ai/
├── DESIGN_SYSTEM.md          ← This file
├── tailwind.config.js        ← All Tailwind design tokens
├── src/
│   └── styles/
│       └── globals.css       ← CSS custom props, reset, @layer components
```

All three files must stay in sync. When adding a new token, add it to **all three** locations.

---

*InsightStore AI Design System v1.0 · February 2026*
