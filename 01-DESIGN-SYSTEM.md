# 01 · Design System

Light-only theme (`color-scheme: light`). Tailwind CSS **v4.3** with CSS variables on `:root`.
Personality: trustworthy fintech. Deep navy + electric sky blue, soft white cards on a pale blue-grey page,
traffic-light status colors, dense 13px ops UI, friendly 14–15px mobile UI.

## 1. Color tokens (exact)

```css
:root {
  --navy:      #002e6e;   /* brand, headings, primary text on light, theme-color meta */
  --navy-2:    #0b3f8a;   /* secondary navy, links, gradient end */
  --sky:       #00baf2;   /* accent / primary action (Paytm-style cyan) */
  --sky-soft:  #e5f7fd;   /* tinted accent backgrounds, chips */
  --page:      #f3f6fa;   /* app background */
  --card:      #ffffff;   /* surfaces */
  --ink:       #101828;   /* primary text */
  --ink-2:     #475467;   /* secondary text */
  --ink-3:     #98a2b3;   /* tertiary / meta / disabled text */
  --line:      #e4e9f0;   /* borders, dividers, track backgrounds */
  --ok:        #12b76a;   /* success / resolved / confidence meter */
  --ok-soft:   #e7f8ef;
  --warn:      #f79009;   /* pending approval */
  --warn-soft: #fef4e6;
  --bad:       #e5484d;   /* failure / critical */
  --bad-soft:  #fdecec;
  color-scheme: light;
}
```

### Extra hard-coded colors used in components

| Use | Value |
|-----|-------|
| Danger text (on soft red) | `#b42318` (also `#ae282e` in some chips) |
| Warning text (on soft amber) | `#b54708` |
| Success text / gradient start | `#067647` |
| Phone shell / dynamic island | `#0b1220` |
| Phone side buttons / bezel ring | `#2a3445` |
| Primary button hover | `#00a6d9` |
| Success button hover | `#0e9f5c` |
| Page background gradient | `radial-gradient(ellipse at top left, #eaf6fd, transparent 55%)`, `radial-gradient(ellipse at bottom right, #e8eefb, transparent 50%)` |
| Desktop phone-only backdrop (inferred) | `radial-gradient(ellipse at top, #e5f7fd, #f3f6fa 60%)` |
| Bank brand chips (bg / text) | HDFC `#e8f0fb` / `#004c8f`; others: `#e6f4fb`/`#1a73b8`, `#eef0ff`/`#4338ca`, `#fdeee9`/`#ae282e`, `#fdf0f7`/`#c11574` |

### Semantic mapping

| Meaning | Text | Background | Border / ring | Accent bar |
|---------|------|-----------|---------------|-----------|
| Neutral / info | `navy` | `sky-soft` | `sky/30` | `sky` |
| Critical | `#b42318` | `bad-soft` (often `/40`) | `bad/40` | `bad` |
| Pending / needs human | `#b54708` | `warn-soft` | `warn/50–60` | `warn` |
| Healthy / resolved | `#067647` | `ok-soft` | `ok/30` | `ok` |

## 2. Typography

Fonts (via `next/font/google`):

| Role | Family | Weights | CSS variable |
|------|--------|---------|--------------|
| Sans (UI) | **Noto Sans** | 400, 500, 600, 700, 800 | `--font-noto` |
| Devanagari fallback (Hindi copy) | **Noto Sans Devanagari** | 400–700 | `--font-noto-deva` |
| Mono (IDs, timers) | **JetBrains Mono** | 400, 500 | `--font-jetbrains` |

```css
--font-sans: var(--font-noto), var(--font-noto-deva), system-ui, sans-serif;
--default-mono-font-family: var(--font-jetbrains), ui-monospace, monospace;
```

Body: `antialiased`, `font-family: var(--font-sans)`, color `--ink`, background `--page`.
Numbers use `.tabular { font-variant-numeric: tabular-nums; }` everywhere (KPIs, timers, money).

### Type scale in use

| Token | Size | Where |
|-------|------|-------|
| `text-[9.5px]` | 9.5 | Bank chip label |
| `text-[10px]` | 10 | Count badges, "Failed" pill (uppercase, tracking-wide, bold) |
| `text-[11px]` | 11 | Meta/timestamps, KPI sub-label, section micro-labels (uppercase, tracking-wider, semibold) |
| `text-[11.5px]` | 11.5 | Phone icon labels |
| `text-xs` | 12 | Tabs, stepper labels, buttons small |
| `text-[12px]` | 12 | Phone links / chips |
| `text-[13px]` | 13 | **Ops console base**, body copy, buttons |
| `text-[14px]` | 14 | Phone list titles |
| `text-[15px]` | 15 | Phone section headings (bold navy), amounts |
| `text-[20px]` | 20 | Phone balance (extrabold) |
| `text-lg` | 18 | Stat values (bold navy) |
| `text-2xl` | 24 | KPI numbers (extrabold, tracking-tight, leading-8) |

Weights: 500 labels · 600 buttons/headings · 700 values · 800 hero numbers.
Line heights: `leading-snug` (1.375) for list rows, `leading-relaxed` (1.625) for paragraphs.
Tracking: `tracking-tight` on big numbers; `tracking-wider`/`widest` on uppercase micro-labels.

## 3. Spacing, radius, borders

- Base unit `--spacing: .25rem` (Tailwind default 4px).
- Page paddings: dashboard `p-3`; landing `p-4 lg:p-5`; phone content `p-3 pb-6`; cards `px-3 py-2` (KPI), `p-5` (incident).
- Gaps: `gap-2` / `gap-3` between cards; `gap-px` with `bg-line` to draw 1px grid dividers.
- Radius: `rounded-lg` 8 (buttons/inputs) · `rounded-xl` 12 (KPI, tabs) · `rounded-2xl` 16 (cards) · `rounded-3xl` 24 (sheets) · `rounded-full` (pills, avatars) · phone: `58px` outer, `47px` screen, `18px` app-icon squircle.
- Borders: `1px solid var(--line)` (often `border-line/80`). KPI cards add a **3px left accent** (`border-l-[3px]`).

## 4. Elevation (shadows)

| Name | Value | Use |
|------|-------|-----|
| subtle | `0 1px 2px rgba(16,24,40,.04)` | KPI cards, control bar, input |
| subtle-2 | `0 1px 2px rgba(16,24,40,.05)` | Phone cards, tab bar |
| card | `0 1px 2px rgba(16,24,40,.04), 0 10px 28px -18px rgba(0,46,110,.28)` | Main dashboard cards |
| warn halo | `0 0 0 3px var(--warn-soft)` | Proposed-action cards awaiting approval |
| sky halo | `0 0 0 4px var(--sky-soft)` | Focus/selected emphasis |
| primary btn | `0 4px 12px -4px rgba(0,186,242,.7)` | Sky buttons |
| success btn | `0 4px 12px -4px rgba(18,183,106,.7)` | Green buttons |
| app icon | `0 4px 10px -4px rgba(0,186,242,.8)` | Phone quick-action tiles |
| phone | `inset 0 0 0 2px #2a3445, 0 40px 90px -25px rgba(0,0,0,.6)` | Device frame |
| stage | `shadow-2xl` (`0 25px 50px -12px rgb(0 0 0 / .25)`) | Dashboard panel on navy |

## 5. Motion

- Default transition: `150ms cubic-bezier(.4,0,.2,1)` (`transition-colors`, `transition`).
- Meter fill: `transition-[width] duration-700`.
- New activity row: `transition-all duration-500` with `@starting-style`: `-translate-y-1`, `bg-sky-soft`, `opacity-0` (slides in and fades from a sky flash).
- Live dot: `animate-pulse` (2s). Press feedback on phone tiles: `active:scale-[.97]`.
- Respect reduced motion:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, :after, :before { transition-duration: .01ms !important; animation-duration: .01ms !important; }
  }
  ```
- Scrollbars hidden globally: `* { scrollbar-width: none } ::-webkit-scrollbar { display: none }`.

## 6. Drop-in `globals.css` (Tailwind v4)

```css
@import "tailwindcss";

@theme inline {
  --color-navy: var(--navy);
  --color-navy-2: var(--navy-2);
  --color-sky: var(--sky);
  --color-sky-soft: var(--sky-soft);
  --color-page: var(--page);
  --color-card: var(--card);
  --color-ink: var(--ink);
  --color-ink-2: var(--ink-2);
  --color-ink-3: var(--ink-3);
  --color-line: var(--line);
  --color-ok: var(--ok);
  --color-ok-soft: var(--ok-soft);
  --color-warn: var(--warn);
  --color-warn-soft: var(--warn-soft);
  --color-bad: var(--bad);
  --color-bad-soft: var(--bad-soft);
  --font-sans: var(--font-noto), var(--font-noto-deva), system-ui, sans-serif;
  --font-mono: var(--font-jetbrains), ui-monospace, monospace;
}

:root {
  --navy:#002e6e; --navy-2:#0b3f8a; --sky:#00baf2; --sky-soft:#e5f7fd;
  --page:#f3f6fa; --card:#fff; --ink:#101828; --ink-2:#475467; --ink-3:#98a2b3;
  --line:#e4e9f0; --ok:#12b76a; --ok-soft:#e7f8ef; --warn:#f79009; --warn-soft:#fef4e6;
  --bad:#e5484d; --bad-soft:#fdecec;
  color-scheme: light;
}

body { background: var(--page); color: var(--ink); font-family: var(--font-sans); -webkit-font-smoothing: antialiased; }
.tabular { font-variant-numeric: tabular-nums; }
* { scrollbar-width: none; }
::-webkit-scrollbar { display: none; }

@media (prefers-reduced-motion: reduce) {
  *, :after, :before { transition-duration: .01ms !important; animation-duration: .01ms !important; }
}
```

> Tailwind v4 note: class names such as `bg-navy`, `text-ink-3`, `border-line/80`, `bg-sky-soft`, `ring-warn/30`
> work because of the `@theme inline` color mapping above.
