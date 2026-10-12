# UI Context — Premium Edition

## Design Philosophy

**Neutral elegance with purposeful hierarchy.** This is research infrastructure, not a playground. The design should communicate: trustworthy, refined, built for professionals. Avoid decoration. Every pixel earns its place through clarity or interaction.

Color is intentional and sparse. Typography carries the visual weight. Whitespace is a first-class material.

---

## Theme

- **Contrast baseline:** Supports both light and dark modes. Dark mode is default; light mode is a toggle in settings.
- **Visual language:** Minimal, geometric, typography-first. No skeuomorphism, no gradients, no illustrations. Pixel-perfect grids.
- **Motion:** Subtle, purposeful. Fade-ins for loading states, 150ms transitions for interactions. No bounce, no playfulness.

---

## Color Palette

### Light Mode (Primary)
| Role                | Token                  | Value    | Usage |
| ------------------- | ---------------------- | -------- | ----- |
| Page background     | `--color-bg-primary`   | `#FFFFFF` | Main canvas |
| Secondary surface   | `--color-bg-secondary` | `#F9FAFB` | Cards, panels, inputs |
| Tertiary surface    | `--color-bg-tertiary`  | `#F3F4F6` | Hover states, subtle dividers |
| Text primary        | `--color-text-primary` | `#111827` | Body text, headings |
| Text secondary      | `--color-text-secondary` | `#6B7280` | Labels, captions, muted info |
| Text tertiary       | `--color-text-tertiary` | `#9CA3AF` | Disabled states, faint text |
| Border              | `--color-border`       | `#E5E7EB` | Input borders, dividers |
| Border subtle       | `--color-border-subtle` | `#F3F4F6` | Soft separators |
| Accent              | `--color-accent`       | `#0066CC` | CTAs, links, active states |
| Accent hover        | `--color-accent-hover` | `#0052A3` | Button hover |
| Success             | `--color-success`      | `#059669` | Confirmations, completion |
| Warning             | `--color-warning`      | `#D97706` | Cautions, in-progress |
| Error               | `--color-error`        | `#DC2626` | Errors, destructive actions |

### Dark Mode
| Role                | Token                  | Value    |
| ------------------- | ---------------------- | -------- |
| Page background     | `--color-bg-primary`   | `#0F1117` |
| Secondary surface   | `--color-bg-secondary` | `#161B22` |
| Tertiary surface    | `--color-bg-tertiary`  | `#21262D` |
| Text primary        | `--color-text-primary` | `#E6EDF3` |
| Text secondary      | `--color-text-secondary` | `#8B949E` |
| Text tertiary       | `--color-text-tertiary` | `#6E7681` |
| Border              | `--color-border`       | `#30363D` |
| Border subtle       | `--color-border-subtle` | `#21262D` |
| Accent              | `--color-accent`       | `#1F6FEB` |
| Accent hover        | `--color-accent-hover` | `#3FB950` |
| Success             | `--color-success`      | `#3FB950` |
| Warning             | `--color-warning`      | `#D29922` |
| Error               | `--color-error`        | `#F85149` |

**Note:** Accent is a clean, professional blue (GitHub-inspired). Works equally well in light and dark modes. No trendy colors.

---

## Typography

| Role                 | Font Family         | Weight | Size  | Line Height | Token/Class       |
| -------------------- | ------------------- | ------ | ----- | ----------- | ----------------- |
| **Display (H1)**     | Inter               | 700    | 32px  | 1.2         | `.text-4xl font-bold` |
| **Heading (H2)**     | Inter               | 600    | 24px  | 1.3         | `.text-2xl font-semibold` |
| **Subheading (H3)**  | Inter               | 600    | 18px  | 1.4         | `.text-lg font-semibold` |
| **Body text**        | Inter               | 400    | 14px  | 1.6         | `.text-base`      |
| **Small text**       | Inter               | 400    | 12px  | 1.5         | `.text-sm`        |
| **Caption**          | Inter               | 400    | 11px  | 1.4         | `.text-xs`        |
| **Code/Mono**        | IBM Plex Mono       | 400    | 13px  | 1.5         | `.font-mono`      |
| **Label (UI)**       | Inter               | 500    | 12px  | 1.4 (uppercase, +0.05em letter-spacing) | `.font-medium uppercase tracking-wider` |
| **Reading (long-form)** | Georgia or Charter | 400    | 16px  | 1.8 | `.text-reading` (for API responses, full answers) |

**Font import:**
```css
@import url('https://rsms.me/inter/inter.css');
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Charter:wght@400&display=swap');
```

**Why Inter:** Industry standard, extremely legible at small sizes, neutral. No personality, all professionalism.

**Why Charter for long-form:** Georgia is system-only and unreliable. Charter is a modern serif designed for screens, pairs beautifully with Inter.

---

## Spacing & Grid

- **Base unit:** 4px (Tailwind default)
- **Horizontal padding:** Cards/panels use `px-6` (24px), content uses `px-8` (32px)
- **Vertical padding:** Cards use `py-5` (20px), sections use `py-8` (32px), major sections use `py-12` (48px)
- **Gaps:** `gap-4` (16px) for related items, `gap-6` (24px) for grouped sections
- **Max content width:** 1280px (matches Tailwind's `max-w-6xl`)

---

## Component Specifications

### Buttons

**Primary CTA**
```
bg: --color-accent
text: white, font-medium, 14px
padding: px-6 py-2.5
border-radius: 6px
border: none
hover: bg --color-accent-hover, shadow-sm
active: opacity-90
disabled: opacity-50, cursor-not-allowed
```

**Secondary (Ghost)**
```
bg: transparent
text: --color-text-primary, font-medium
border: 1px solid --color-border
padding: px-6 py-2.5
border-radius: 6px
hover: bg --color-bg-tertiary
```

**Tertiary (Text-only)**
```
bg: transparent
text: --color-accent, font-medium
hover: text --color-accent-hover
underline: none
```

**Destructive**
```
bg: --color-error
text: white
same padding/radius as primary
hover: opacity-90
```

### Inputs & Forms

**Text Input / Textarea**
```
bg: --color-bg-secondary
border: 1px solid --color-border
border-radius: 6px
padding: px-4 py-2.5
font: Inter, 14px, --color-text-primary
placeholder: --color-text-tertiary
focus: border --color-accent, ring-2 ring-offset-0 ring-color-accent/20
error state: border --color-error, ring --color-error/20
```

**Label**
```
font: Inter, 12px, font-medium, --color-text-secondary
margin-bottom: 8px
uppercase letter-spacing
```

**Checkbox / Radio**
```
size: 18x18px
border: 2px solid --color-border
border-radius: 4px (checkbox) or 50% (radio)
background: --color-bg-secondary
checked: bg --color-accent, border --color-accent
```

### Surfaces & Cards

**Card**
```
bg: --color-bg-secondary
border: 1px solid --color-border
border-radius: 8px
padding: py-5 px-6
shadow: 0 1px 3px rgba(0,0,0,0.1) [light mode], none [dark mode]
```

**Panel (raised)**
```
same as card but shadow: 0 4px 6px rgba(0,0,0,0.15)
```

**Divider**
```
1px solid --color-border-subtle
margin: my-6 or my-8 depending on context
```

### Modals & Overlays

**Backdrop**
```
bg: rgba(0,0,0,0.5)
backdrop-filter: blur(4px)
```

**Modal Container**
```
bg: --color-bg-primary
border-radius: 12px
max-width: 500px
box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1)
padding: p-8
```

---

## Layout Patterns

### Two-Column (Form + Response)
- **Left:** Fixed 420px on desktop (`lg:`), sticky top (`top-24` below header). Single column below `lg`.
- **Right:** Flexible, fills remaining width. Min-height 320px for empty state.
- **Gap:** `gap-8` between columns
- **Responsive:** Stack vertically on mobile, side-by-side on desktop.

### Header
```
height: 64px (h-16)
background: --color-bg-secondary
border-bottom: 1px solid --color-border
padding: px-8 py-4
sticky: top-0 z-50
display: flex, justify-between, items-center

logo: text-lg font-semibold, --color-text-primary
nav: flex gap-6, font-medium, text-sm
user-menu: dropdown, right-aligned
```

### Navigation/Breadcrumb
```
font: Inter, 12px, --color-text-secondary
separator: " / " or " → "
current page: font-semibold, --color-text-primary
links: cursor-pointer, hover underline
```

### Sidebar (if used in future)
```
width: 240px or 280px
bg: --color-bg-secondary
border-right: 1px solid --color-border
padding: px-6 py-8
sticky: top-16
max-height: calc(100vh - 64px)
overflow-y: auto
```

### Empty States
```
height: min-h-[320px]
display: flex, flex-col, items-center, justify-center
gap: gap-4
icon: 48x48px, --color-text-tertiary, opacity-40
text: text-base, --color-text-secondary
action: secondary button
```

---

## Interaction & Micro-interactions

- **Loading skeleton:** `bg-gradient-to-r from-[--color-bg-tertiary] via-[--color-bg-secondary] to-[--color-bg-tertiary]` with subtle 2s animation
- **Transitions:** All color/opacity changes use `transition-colors duration-150`
- **Focus state:** `ring-2 ring-offset-2 ring-[--color-accent]` for keyboard navigation
- **Disabled state:** `opacity-50 cursor-not-allowed`
- **Hover feedback:** Subtle `shadow-sm` on cards, color shift on buttons
- **Success feedback:** Brief flash of `bg-[--color-success]/10`, 2s fade-out

---

## Typography Hierarchy Example

```
H1 (Display):  "Ask a Document"  — 32px, bold, --color-text-primary
H2 (Heading):  "Your Answers"    — 24px, semibold, --color-text-primary
H3 (Label):    "SELECT DOCUMENT" — 12px, medium, uppercase, --color-text-secondary
Body:          "A long, readable response..." — 14px, regular, 1.6 line-height, --color-text-primary
Caption:       "Valid for 15 minutes"        — 11px, regular, --color-text-tertiary
```

---

## Accessibility

- **Contrast:** WCAG AA minimum (4.5:1 for text, 3:1 for UI)
- **Focus states:** Always visible, keyboard-navigable
- **Color alone:** Never used to convey meaning; pair with icons or text
- **Motion:** Respects `prefers-reduced-motion`
- **Font size:** Minimum 12px for body, never smaller than 11px for captions
- **Line height:** 1.4+ for all text

---

## Dark Mode Toggle

Implement via CSS custom properties and a root-level `[data-theme="dark"]` attribute. Default to system preference; allow user override in settings.

```javascript
// Pseudo-code
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.dataset.theme = localStorage.getItem('theme') || (prefersDark ? 'dark' : 'light');
```

---

## Do's & Don'ts

✅ **Do:**
- Use neutral colors as the default
- Leverage whitespace aggressively
- Let typography do the heavy lifting
- Keep interactions subtle and purposeful
- Test contrast in both light and dark modes

❌ **Don't:**
- Use more than one accent color
- Add decorative elements or gradients
- Use multiple font families (Inter + Charter only, used distinctly)
- Animate for animation's sake
- Use custom shadows that don't follow the spec

---

## Implementation

All values are available as Tailwind utilities + custom CSS variables. Build using Tailwind v3+ with the following tailwind.config.js overrides:

```javascript
module.exports = {
  theme: {
    colors: {
      bg: {
        primary: 'var(--color-bg-primary)',
        secondary: 'var(--color-bg-secondary)',
        tertiary: 'var(--color-bg-tertiary)',
      },
      text: {
        primary: 'var(--color-text-primary)',
        secondary: 'var(--color-text-secondary)',
        tertiary: 'var(--color-text-tertiary)',
      },
      border: 'var(--color-border)',
      accent: 'var(--color-accent)',
    },
  },
};