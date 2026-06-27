# TaskForge AI — Premium UI: libraries, effects, mobile

## 1. Already installed & in use (no action needed)
- **Three.js** + react-three-fiber/drei → premium WebGL background (`design-system/background/`)
- **GSAP** → landing load animations, dashboard header reveals, background blobs
- **Framer Motion** → transitions, modals, cards, the new effects module
- **Recharts** → all dashboards + the chart kit (`Components/charts/`)

## 2. New: Aceternity / Magic-UI-style effects (zero new deps)
File: `src/design-system/effects.jsx` — built on Framer Motion, light-theme friendly.

| Component | Use |
|---|---|
| `Spotlight` | mouse-follow glow wrapper (now on the landing hero) |
| `ShimmerButton` | animated-sheen CTA (now the landing "Get Started Free") |
| `AnimatedGradientBorder` | rotating gradient ring around any card |
| `Marquee` | infinite logo/tag scroller |
| `TextGenerate` | word-by-word fade-in heading |
| `NumberTicker` | count-up stat when scrolled into view |

Example:
```jsx
import { AnimatedGradientBorder, NumberTicker } from '../design-system/effects'

<AnimatedGradientBorder>
  <div className="p-6"><NumberTicker value={1280} suffix="+" /></div>
</AnimatedGradientBorder>
```

## 3. shadcn/ui — needs installation on your machine
The npm registry is blocked in this environment, so run these locally:

```bash
cd frontend
npm i class-variance-authority clsx tailwind-merge lucide-react
npm i @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs @radix-ui/react-tooltip
```

Then create `src/lib/utils.js`:
```js
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
export const cn = (...i) => twMerge(clsx(i))
```

Note: shadcn assumes Tailwind config tokens like `--background`, `--foreground`, `--primary`.
We already have a token system in `index.css` (`--color-brand`, `--color-ink`, etc.).
When wiring shadcn components, map their `bg-primary`/`text-foreground` to our tokens
(or add the shadcn token aliases to the `@theme` block) so both stay consistent.
Recommend doing this with the dev server running so each component is visually verified.

## 4. Mobile / responsive status
- **Fixed:** Header had no mobile nav (`hidden lg:flex`); added a hamburger + role-aware
  mobile drawer in `Components/Header.jsx`.
- Pages already use responsive grids heavily (`sm:`/`md:`/`lg:`), charts use
  `ResponsiveContainer`, tables use `overflow-x-auto`.
- **Remaining:** full breakpoint QA (320 / 375 / 768 / 1024 / 1440) should be done with the
  app running — checking for horizontal overflow, tap-target sizes, modal width on small
  screens, and large `px-6`/`gap` values that may need `px-4` on mobile.

## 5. Known blocker
`src/Pages/AdminSettingsPage.jsx` does **not compile** (pre-existing — fails in the
original repo too). It has corrupted/mis-nested JSX. One defect fixed (Invite tab panel
`<div>`); one adjacency near line 1690 remains. Fastest fix is with the dev server's exact
error — run `npm run dev` and share the error, or connect the Claude-in-Chrome extension.
