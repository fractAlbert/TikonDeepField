# Backlog

Known-imperfect things, deliberately deferred. Each entry says what's wrong,
why it was left, and what a fix would have to respect — so picking one up
doesn't mean re-deriving the constraint that made it awkward in the first
place.

Fixed things don't live here. They go in the doc for the work that fixed
them (`mobile-comments.md`, `mobile-layout-plan.md`).

## Index

Numbers are handles for talking about an item ("let's do 6"), not a
priority order — where one is recommended, the entry says so. Shipped items
are removed and the rest renumbered, so a number only means what this table
says it means today.

Shipped 2026-08-03 and removed from this list: the survey result report and
auto-archive on close (written up in `win-conditions.md`), and the first-run
tutorial (written up in `tutorial-plan.md`, which now records what was built
rather than what was planned).

Shipped 2026-08-04 and removed: maximising the Star Map (5), the menu hub
redesign (6, written up in `mobile-layout-plan.md`) and dimming placed
signatures in the Sweep Scope and Ring Scan (9). Numbers are never reused -
a freed number stays free, so nobody reading an old note lands on a
different item than the one it meant.

Shipped 2026-08-07 and removed: **both Sweep Scope items (13, 14)** - the
reference palette identified signatures by colour alone where every other
surface gives them their glyph, and the sweep's position was derived from
total elapsed time over the *current* period, so moving the speed slider
rescaled the whole history and teleported the line. The record is the commit;
the phase change is simulated numerically in it.

Shipped 2026-08-07 and removed: **re-organising the phone hub's buttons
(11)**, written up in `mobile-layout-plan.md`. It settled as two runs of six
with a sweep between them - by way of a three-column version that was tried,
looked crowded, and is recorded there as the step that found the constraint.

Shipped 2026-08-05 and removed: **rank-conditioned region difficulty (1)**,
written up in `region-difficulty.md`. That doc is now the record of what was
built, why each lever behaves the way it does, and the one measured
follow-up that was deliberately not applied.

| # | item | where |
| --- | --- | --- |
| 2 | No `quasar-type` clues are ever emitted | Gameplay |
| 4 | Star Map 50% wider | Design |
| 7 | Log/Help/Prototypes flick-scroll on a phone, accepted | Design |
| 8 | Star Map hover readout dead on touch, accepted | Interaction |
| 10 | The header overflows horizontally at 320px | Design |
| 12 | Our vertical runs do not match the references | Design |
| 15 | Close the shell frame at the bottom, or leave it a bracket | Design |
| 16 | A hook to stop shell-mangled commit messages | Tooling |
| 17 | Rework the header, against the user's mock-up | Design |

## Design

### 4 - Star Map 50% wider

Raised 2026-08-02. The sidebar is `w-[360px]` and the dial inside it is
capped at `max-w-[260px]`, which is what makes the ring and segment labels
paint at ~10px and left no room for the quadrant labels to grow past 17
user units.

The catch is where the width comes from. `main` is only ~500px at 1344px
wide once the sidebar and both rails have taken their share; another 180px
of sidebar leaves it around 320px, which is narrower than the Log cards and
the Station Info tab row are built for. So this is not a one-number change
— either the rails give up width too, or the panels that live in `main`
have to cope with less.

**Half-answered 2026-08-04.** Maximising shipped (the old item 5), and it
takes most of the pressure off: the map now expands to fill `main` on
demand, drawing the dial at ~460px against the docked 260 with every label
scaling to match, and it does that without touching a single width in the
docked layout. What is left of this item is only the *resting* size - is
260px enough for the map you spend the survey looking at - and the trade
above is unchanged. If the answer is no, the honest fix is still that `main`
or the rails have to give.

### 7 - Log, Help and Prototypes flick-scroll on a phone

They overflow 390x844 by 85px, 41px and 42px and fall back to the
hidden-scrollbar scroll inside `main`. That's allowed by the project rules —
content may scroll inside its own panel — and it was accepted knowingly. The
three are all long prose, so the fix, if wanted, is editorial (shorter copy,
or pagination the way the Survey Log does it) rather than layout.

**The Profile panel joined them too**, found while measuring the title shelf
on 2026-08-06: 264px over at 390x844 and 621px at 320x568, of which the
shelf accounts for 39px (three panels at 13px each) and the rest predates
it. Same fix as the prose panels - it is a long single column of service
record, standing, and career history, and the honest answer is fewer things
on one screen rather than a tighter layout.

**The Star Manifest joined them**, found while measuring the jump bar on
2026-08-05. It overflows by 78px at 390x844 on a six-signature region, of
which 30px predates the bar — it is listed as fitting outright in
`mobile-layout-plan.md` and has not for some time. Different fix from the
other three, because this one is a list rather than prose and it grows with
the region: eight signatures is the technician's profile, so the worst case
is worse than what was measured. Pagination, or a denser row, rather than
shorter copy.

### 12 - Our vertical runs do not match the references

Raised 2026-08-06 by the user on sight of the two new reference images, and
confirmed by cropping them: their vertical runs look better than ours. The
full read-off is in `lcars-style-notes.md` under **Vertical runs, and why
theirs look better than ours**. In short, five differences, of which the
first is a rule and the rest are proportion:

1. **A vertical run never ends in a rounded cap** in any of the three
   references - it ends flat, or it turns a corner into a horizontal arm.
   The half-circle is a horizontal mark.
2. Cell heights vary a lot within one run; ours are uniform.
3. Labels sit **bottom-right inside the cell** with the rest left as empty
   colour; `LcarsButton` is `justify-center`.
4. Colour varies cell to cell down a rail rather than one colour per item.
5. Edge-anchored, hairline gaps rather than `gap-1` with an outer margin.

**Not decided, and not a small change.** (3) is the cheapest and probably
the highest-yield - centring is the most un-LCARS thing about our controls -
but `justify-center` is baked into `LcarsButton`'s `base`, so it touches
every button in the app at once and wants to be a prop with a default rather
than a global flip. (1) invalidates a specimen in `LcarsKitPrototype`, which
is itself an open conversation, so **do these together with that discussion,
not before it**.

`NavRail` is *not* wrong about cap placement: a column of horizontal pills
all capped on the same outer side is precisely what both new references do.
The divergence is proportion and alignment, not grammar.

### 10 - The header overflows horizontally at 320px

Found 2026-08-04 while measuring the menu hub, and confirmed pre-existing by
stashing that work and re-measuring: `#app-shell` reports `scrollWidth` 362
against a 320px viewport either way.

The overflow is the officer badge and the sound toggle. Both sit in a
`shrink-0` group beside a title block that will not give up enough room, so
the header's min-content lands at 338px inside 296px of available width.
Nothing is lost - `#app-shell` is `overflow-hidden`, so it clips rather than
scrolling - but "SOUND: ON" is cut in half, and the project rule is that
nothing scrolls to reveal chrome, which a clipped control fails in spirit.

Only at 320px. At 390x844 the header fits with room to spare, which is why
this went unnoticed: 320 is the floor the layout claims to support rather
than a width anyone tests on.

Worth knowing before fixing it: the sound toggle is a plain `<button>`, not
an `LcarsButton`, so it does not inherit the `size` prop added on
2026-08-04. The cheap fixes are dropping the toggle's label to an icon below
`sm`, or letting the badge collapse to its insignia earlier than `md`.

### 15 - Close the shell frame at the bottom, or leave it a bracket

Raised 2026-08-07, deferred by the user for a weekend decision. Phase 3a of
`lcars-consistency-plan.md` gave the shell a frame along its top and down its
left edge - the header block and the nav rail are one column now, running to
the glass at the bottom. What is not decided is whether to close it.

Three options, with the cost of each:

- **Close it everywhere.** Most faithful. Costs every screen ~20-28px
  including its gap, and on a phone that stacks with the title shelf and the
  jump bar - the scarcest budget in the layout.
- **Desktop only** (recommended). The bar appears at `lg` and up, where
  `main` has 832px of width and full height and the cost is nothing. Phones
  keep their vertical budget.
- **Leave it a bracket.** Top and left only. The references use open-sided
  corner brackets, so two edges is a legitimate LCARS shape rather than an
  unfinished one - this is a real option, not a cop-out.

### 17 - Rework the header, against the user's mock-up

Raised 2026-08-07. The user has made a mock-up of the header and wants to
talk it through before anything is built. **Do not design the header from
these notes - ask for the mock-up first.** It is the specification;
everything below is only what is already known about the area.

What the mock-up will have to live with:

- **Item 10 is in this same component.** The header's min-content is 362px
  against 296px of available width at 320, so "SOUND: ON" is clipped. If the
  mock-up changes the header at all, that is the moment to fix the overflow
  rather than a separate job.
- **The left block is the head of the frame's left run.** As of phase 3a it
  matches the nav rail's width at `lg` and squares off at the bottom so the
  two read as one column; below `lg` it keeps its bottom cap and shrinks to
  a stub. Anything that changes its width or its corners has to keep that
  relationship or the frame stops reading as one object.
- **It has no `shrink-0`, deliberately.** Adding one cost 40px of
  min-content width and broke 390, which had been fitting. Measured, and
  reverted the same day.
- **The sound toggle is a plain `<button>`**, not an `LcarsButton`, so it
  does not inherit the `size` prop.

## Tooling

### 16 - A hook to stop shell-mangled commit messages

Raised 2026-08-07 after a commit message shipped with five identifiers
missing. The cause is narrow and worth naming: **inside double quotes, bash
performs command substitution**, so a message written with `git commit -m`
containing backticks had those words executed and replaced with their
(empty) output. Git never saw the text, which is why nothing downstream could
have caught it - a `commit-msg` hook inspects what git receives, and what git
received was already prose with holes in it.

Two layers, and the first is free:

- **Technique.** A quoted heredoc, `git commit -F - <<'MSG' ... MSG`,
  disables all expansion. Adopted immediately and used for every commit
  since. It is also better than the temp-file form it replaced: one call, no
  scratchpad to manage.
- **Enforcement.** A `PreToolUse` hook on Bash in `.claude/settings.json`
  that blocks a `git commit` carrying both `-m` and a backtick, `$(` or `$`.
  It fires on exactly the dangerous shape and leaves short `-m "fix typo"`
  commits alone. This is the part that does not depend on anyone
  remembering, which is the whole point - the note that said "always use
  `-F`" existed and was not followed.

Not built. It travels with the repo like the `lcars-design` skill does, so
it applies to any session rather than to one machine's memory.

Worth being honest about the limit: a hook stops *this* failure, not "commit
messages come out wrong" in general. If a broader guard is wanted, the more
valuable one is a `commit-msg` git hook checking things git can actually see
- subject length, `Co-Authored-By` present, body not empty on a multi-file
change.

## Gameplay

### 2 - No `quasar-type` clues are ever emitted

Lives in **`win-conditions.md`** - the clue vocabulary design. Generation
emits only `quasar-sector` and `quasar-quadrant`, so a player never learns
any signature's classification until the region closes and the report
reveals it. That is why the Quadrant Survey's per-type breakdown was never
usable, and why `analyze-solvability.ts` deliberately leaves it out.

**Note it would make regions *easier*.** A type clue is another constraint,
and the difficulty work (item 1, shipped 2026-08-05) measured what that
does: more information means fewer regions that stall. If this ships, the
per-rank profiles in `region-difficulty.md` need re-measuring rather than
assuming they still hold.

**What item 1 settled, for the record.** The filing budget scales with rank
(4 4 3 2 2) and the *regions* now do too - signature count, anchor
separation and quadrant clue count, per rung. A careful player used to reach
Chief of Survey 100% of the time under every threshold tested; they now
reach it 91%, and the average player dropped from 54% to 5%. The full
argument is in `region-difficulty.md`.

## Interaction

### 8 - The star map hover readout is dead on touch

`StarMap`'s readout uses `onMouseEnter`, which never fires on a touch device,
so it sits at `--` on a phone for the whole session. Accepted as-is: tapping
a cell places a signature, which is the actual interaction, and the readout
is a convenience on top. Only worth revisiting if the readout starts carrying
information you can't get any other way.
