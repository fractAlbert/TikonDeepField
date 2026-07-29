# Mobile layout plan

Status: **agreed, not yet built.** Written 2026-07-29 after diagnosing why
the game is unusable on a phone. Nothing in here has been implemented.

## What happens today

`AppShell.tsx` lays the app out as one flex row that never stacks:

```
NavRail (primary) | main | star map sidebar | NavRail (utility)
```

Measured in Chrome at a 501px viewport, and again by emulating 390px:

| column | width at 390px | offset from left |
| --- | --- | --- |
| primary nav | 160px | 0 |
| **main content** | **0px** | 232 |
| star map | 342px | 252 |
| utility nav | 144px | 642 |

The row demands 762px inside 342px — overflowing by 420px. `main` is the
only item that can shrink (`flex-1 min-w-0`), so it collapses to **zero
width**, and the utility rail sits entirely off-screen. `overflow-hidden`
on both `body` and `#app-shell` clips the excess rather than letting you
scroll to it. The visible result is a header, part of the nav, a clipped
star map, and no content at all.

### Four distinct causes

1. `#starmap-sidebar` is `w-full lg:w-[360px]` **with `shrink-0`**. Below
   `lg`, `w-full` means "100% of the row" while `shrink-0` forbids giving
   any of it back. This is the single biggest contributor.
2. The four-column row has no stacked variant.
3. Fixed chrome exceeds a phone before any content: 128 + 48 + 20 + 112 +
   48 = **356px** of rails and gutters on a 390px screen.
4. `overflow-hidden` turns the overflow into invisible content rather than
   scrollable content.

## The design

Below `lg`, the star map stops being a persistent sidebar and becomes a
panel like any other. At `lg` and above, nothing changes from today.

- Add `"starmap"` to `PanelId`. Below `lg` the sidebar is not rendered and
  `StarMapPanel` is shown inside `main`; at `lg`+ the sidebar renders as it
  does now and the panel is unreachable.
- Merge both rails into one horizontally-scrollable LCARS strip beneath the
  header — 5 primary + 3 utility items, plus Star Map on mobile. Drop the
  decorative filler segments. `LcarsButton` already accepts
  `orientation="horizontal"`, so the visual language survives.
- `main` goes full width; the shell switches to `overflow-y-auto` with
  `min-h-full` instead of `h-full overflow-hidden`.

### The one load-bearing decision

The breakpoint **must** be a real JS media query, not CSS visibility.

`StarMap` owns placement state and persists it to `localStorage` (see
`starmap-storage.ts`). Rendering both a mobile and a desktop copy and
hiding one with CSS would put **two live instances writing the same key** —
that corrupts placements rather than merely wasting work. Exactly one
instance may be mounted at a time.

Plan: a ~12-line `useMediaQuery` built on `useSyncExternalStore`, matching
the pattern already used for the survey log in `AppShell.tsx`.

## Decisions taken

- **Star map gets *bigger* on mobile, not smaller.** Its
  `max-w-[260px]` exists only because it lived in a narrow sidebar. As a
  full-width panel it should grow, and the ring/segment labels must stay
  readable at whatever size it lands on. Note the labels are sized in SVG
  user units against a 440-unit viewBox, so painted size is
  `LABEL_SIZE * renderedWidth / 440` — a wider map raises effective label
  size for free and `LABEL_SIZE` may want lowering to compensate. See the
  Label Size Trial in the Prototypes panel.
- **The hover readout is not a problem.** The hovered-sector readout uses
  `onMouseEnter`, which never fires on touch, so it would sit at `--` on a
  phone. Accepted as-is — tapping a cell places a signature, which is the
  real interaction. No touch equivalent needed.

## Effort

Roughly 150 lines across four files (`AppShell.tsx`, a new
`useMediaQuery`, a horizontal nav variant, `StarMapPanel` sizing). No new
dependencies. **No changes to game logic, the solver, clue generation,
storage, or any panel's internals** — which is what keeps this cheap: the
app is already panel-switched, so most of the work is routing the star map
through machinery that already exists.

## Left to check when building

- Sweep Scope should survive unchanged — its axis is percentage-based — but
  the five tick labels will be tight at 390px and may want smaller text.
- Resizing across the breakpoint while sitting on the `starmap` panel needs
  a redirect, or the panel becomes unreachable-but-selected on desktop.
