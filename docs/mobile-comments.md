# Mobile issues I see

All resolved. Measured at 390x844 unless noted.

[x] The header is too big for mobile.  Needs to be made smaller somehow.  Probably reduce the main font.
    → 108px to 51px. Both the title and the subtitle were wrapping to two
      lines; smaller type on mobile puts each on one line. Desktop unchanged
      at 92px.

[x] In horizontal mode, the tab buttons are scrollable.  One of the rules we have fo lcards is no scrolling.  If not in our style guide, then let's add it.
    → The strip is gone entirely (see the hub below). The rule *was* in the
      style guide but only as an implementation note, so it's been promoted
      to an explicit "Project rules" section covering navigation, content and
      wrapped runs.

[x] The Star Map currently requires scrolling
    → Fits now with 0px to spare needed. It was over by only ~19px; dropping
      the strip and shrinking the header gave back ~100px.

[x] Tikon Logo has the title covering the grey text.  Pleny of space for that grey text to be lower.
    → The hint is positioned out of flow on purpose (so a long hint can't
      shift the emblem), which meant nothing stopped the centred group from
      growing over it once the container got short. The centring box now
      reserves the hint's strip. 141px of clearance, and the emblem grew into
      the freed space.

[x] Size & Crew, Why It Matters & Survey Process tabs require scrolling
    → All three fit on one screen now, no scrolling at all — better than the
      flick-scroll we agreed to settle for. Removing the duplicated station
      header block was what did it. Survey Process, the longest, has room to
      spare.

[x] The Research Station information pages have a BACk button.  With that button, the main buttons are not needed.
    → Right, and it went further: on mobile the panel bar supplies Back, so
      the panel's own header block (emblem + name + Back) was showing the
      same title twice and two Backs pointing different places. Hidden on
      mobile; worth 84px.

[x] Maybe back buttons is the solution for the scrolling menu.  If each tab (in mobile mode) has a back button, then there could be a main page with just all the buttons.
    → Built as described. `MobileMenu` is the landing view (all 9
      destinations as one touching vertical run); `MobilePanelBar` gives every
      panel a title and a Back. This is what made the other items solvable.

[x] With the horizontal menu buttons, the marker showing the current tab is under the tab name.  The first and last tab have curves on the bottom.  It looks incorret.
    → Moot: `NavStrip.tsx` is deleted. Nothing on mobile needs a
      current-tab marker now, since you're only ever on one panel with its
      name in the bar.

## Also found while in there

- Station Info's section tabs were scrolling **on desktop too**, not just on
  mobile — one `flex-nowrap` run with `overflow-x-auto` and a visible
  scrollbar, against a `main` that's only ~452px at 1280px wide. Now wrapped
  into rows of three at every width, which is a visible desktop change.

## Still needing a real device

Log, Help and Prototypes still overflow (85px, 41px, 42px) and fall back to
the agreed hidden-scrollbar flick-scroll. The page itself never scrolls
anywhere, and nothing overflows horizontally on any panel.
