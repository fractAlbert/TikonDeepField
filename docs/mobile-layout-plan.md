# Mobile layout

Status: **built** (2026-07-29). Planned earlier the same day; the plan and
the diagnosis that produced it are kept below, followed by the three places
reality differed from it.

## What happens today

Below `lg` (1024px) the star map stops being a permanent sidebar and becomes
a panel like any other, both nav rails collapse into one horizontally
scrollable strip under the header, and the shell itself scrolls vertically.
At `lg` and above nothing changed at all — verified at 1280px, where the
rails, `main` and the sidebar measure exactly what they did before.

Measured at 390px across all nine panels: no horizontal overflow anywhere
(`documentElement.scrollWidth == 390`), vertical scrolling where content
warrants it, and exactly one `StarMap` mounted at any time. The map renders
318px wide instead of 260px, which puts the ring/segment labels at 13.0
painted px instead of 10.6.

## The problem it fixed

`AppShell.tsx` used to lay the app out as one flex row that never stacked:

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

The row demanded 762px inside 342px — overflowing by 420px. `main` was the
only item that could shrink (`flex-1 min-w-0`), so it collapsed to **zero
width**, and the utility rail sat entirely off-screen. `overflow-hidden` on
both `body` and `#app-shell` clipped the excess rather than letting you
scroll to it. The visible result was a header, part of the nav, a clipped
star map, and no content at all.

### Four distinct causes

1. `#starmap-sidebar` was `w-full lg:w-[360px]` **with `shrink-0`**. Below
   `lg`, `w-full` meant "100% of the row" while `shrink-0` forbade giving
   any of it back. The single biggest contributor.
2. The four-column row had no stacked variant.
3. Fixed chrome exceeded a phone before any content: 128 + 48 + 20 + 112 +
   48 = **356px** of rails and gutters on a 390px screen.
4. `overflow-hidden` turned the overflow into invisible content rather than
   scrollable content.

## How it works

- `PanelId` gained `"starmap"`. Below `lg` the sidebar isn't rendered and
  `StarMapPanel` shows inside `main`; at `lg`+ the sidebar renders as before
  and the panel is unreachable.
- `NavStrip.tsx` carries all 5 primary + 3 utility items plus Star Map, as
  one touching run built from the existing `runShape`/`LcarsButton`
  machinery, with the selection indicator bulging *down* toward the content
  instead of sideways. No decorative fillers — there's no empty space to pad
  out horizontally. 952px of buttons scroll inside 366px.
- `main` goes full width and the shell becomes the scroller
  (`overflow-y-auto no-scrollbar` instead of `h-full overflow-hidden`).
  `layout.tsx` was not touched.

### The one load-bearing decision

The breakpoint **is** a real JS media query, not CSS visibility.

`StarMap` owns placement state and persists it to `localStorage` (see
`starmap-storage.ts`). Rendering both a mobile and a desktop copy and hiding
one with CSS would put **two live instances writing the same key** — that
corrupts placements rather than merely wasting work. Exactly one instance
may be mounted at a time, so `useMediaQuery` (`src/lib/use-media-query.ts`)
gates which branch renders.

## Where reality differed from the plan

1. **`useSyncExternalStore` doesn't work for this.** The plan specified it,
   built on `matchMedia` with a `getServerSnapshot` of `false`. It failed in
   the browser: a phone loaded the *desktop* layout and only corrected
   itself after the first resize. `change` fires on transitions only, so a
   query that already matched at load never notified. The hook now reads
   `matchMedia` in an effect body on mount, which is the part that can't be
   skipped.
2. **A phone's first paint is server-rendered desktop**, because the server
   has no viewport to measure — and that layout is the zero-width-`main` one
   described above, so it looks broken rather than merely wrong. The three
   desktop-only columns therefore also carry `max-lg:hidden`, which only
   ever applies to that pre-hydration frame (once hydrated they aren't
   rendered below `lg` at all). It renders as header + full-width content
   until the strip appears.
   - This is why `BELOW_LG` is spelled `not all and (min-width: 64rem)`
     rather than the usual `max-width: 63.99rem`: it has to be *exactly*
     what Tailwind compiles `max-lg:` to. A width where CSS says "phone" and
     the hook says "desktop" would hide the rails with no strip to replace
     them.
3. **No redirect effect.** The plan called for redirecting away from the
   `starmap` panel when the window grows past `lg`. Doing that in an effect
   trips `react-hooks/set-state-in-effect`, so the panel is derived instead:
   state holds `requestedPanel`, and `panel` resolves `starmap` to
   `briefing` while wide. Nicer behavior too — it's reversible, so narrowing
   the window puts you back on the map.

## Decisions taken up front

- **Star map got *bigger*, not smaller.** Its `max-w-[260px]` existed only
  because it lived in a narrow sidebar; below `lg` it's capped at 420px
  instead and lands at 318px on a 390px screen. `LABEL_SIZE` needed no
  change: the whole viewBox scales together, so a wider map buys bigger
  labels without crowding the dial. The amber gutter and panel padding also
  shrink below `md` — 64px of a 390px screen the map would rather have.
- **The hover readout is not a problem.** It uses `onMouseEnter`, which
  never fires on touch, so it sits at `--` on a phone. Accepted as-is —
  tapping a cell places a signature, which is the real interaction.

## Not verified

Crossing the breakpoint *at runtime* (rotating a phone, dragging a desktop
window across 1024px) was never exercised. Chrome was minimized for this
work, and a minimized window dispatches no `resize` or `matchMedia` `change`
events at all — iframe resizes registered zero events. Both cold-load paths
were verified directly. The panel resolution is pure (derived, not an
effect), so it's correct by construction once a render happens, but the
transition itself is untested.
