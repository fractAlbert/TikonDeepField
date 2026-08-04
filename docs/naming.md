# Naming: regions and signatures

Exactly how the two generated names are derived, what the variety actually
measures out at, and where the repetition comes from — because it is not
where it looks like it is.

Every number below is measured by `scripts/analyze-names.ts`, not derived on
paper. Re-run it after changing a list:

```
npx tsx scripts/analyze-names.ts
```

---

## Region names

**Source:** `src/lib/flavor-text.ts`, `generateRegionName()`.

One line, and there is no other rule:

```ts
`${pick(NAME_ADJECTIVES)} ${pick(NAME_NOUNS)}`
```

**18 adjectives** — Thanix, Veridian, Kessik, Ashen, Umbral, Pallid, Coral,
Ferrous, Glacial, Ember, Hollow, Silt, Wraith, Bruma, Nocturne, Cinder,
Fallow, Brindle.

**16 nouns** — Drift, Expanse, Nebula, Reach, Rift, Basin, Corridor, Shoal,
Field, Void, Trench, Span, Fringe, Gulf, Verge, Hollow.

Both picked uniformly and independently. Nothing is remembered between
draws, and nothing about the region — its size, its layout, its
classifications — influences the name.

### What that measures out at

| | |
| --- | --- |
| Distinct names possible | **288** (18 × 16) |
| Regions opened before the first repeat | **21.9** on average |
| Soonest repeat seen in 50,000 simulated careers | **2** |

At three open surveys and a steady pace, a repeat inside a single sitting is
routine rather than unlucky.

**"Hollow" is in both lists**, so `Hollow Hollow` is a name the generator
can produce, at 1 in 288. That is a bug rather than a design choice.

### Where the repetition actually comes from

Not the list size. **The grammar never varies.** Every region in the game is
`<Adjective> <Noun>`, two words, same rhythm, forever. Twelve consecutive
draws:

```
Umbral Rift       Ferrous Void      Fallow Verge      Umbral Nebula
Fallow Shoal      Ashen Void        Cinder Expanse    Pallid Gulf
Nocturne Gulf     Brindle Hollow    Ferrous Corridor  Thanix Hollow
```

Read as a set, those are one name with the nouns swapped. Tripling the word
lists would take the collision point from ~22 regions to ~38 and change
nothing about that paragraph.

### Four things that would help, in order of effect per unit of work

**1. Never repeat a name within a save.** The cheapest fix with the largest
felt effect, because the thing that actually reads as cheap is seeing the
same name twice, not the sameness of the pattern. Remember used names and
reroll on collision. `station.ts` is the natural home — it already outlives
careers, so a name used by your first officer stays used. Needs (2) or (4)
alongside it before the pool of 288 gets tight.

**2. More than one grammar.** This is the one that changes how the names
*read*, and each pattern multiplies the space as well as breaking the
rhythm. Weight them so the familiar `Ashen Drift` stays the common case and
roughly one region in three or four arrives differently. Candidates:

| Pattern | Example | Notes |
| --- | --- | --- |
| `<Adj> <Noun>` | Ashen Drift | today's, kept as the majority case |
| `<Surname>'s <Noun>` | Halloran's Reach | `officer-name.ts` already ships a surname list; implies the field was charted by someone |
| `<Station survey> <n>` | Tikon Deep 41 | grounds a region in the station's own catalog rather than folklore |
| `<Adj> <Noun> <Roman>` | Ember Verge II | implies a field big enough to have been split |
| `<Adj>-<Adj> <Noun>` | Coral-Ashen Drift | cheap multiplier, and reads as a compound catalog entry |

**3. Let the field name itself.** Pick the noun from where the signatures
actually sit and the adjective from the classifications present — mostly
outer rings gives *Fringe*, *Verge*, *Rim*; a tight cluster gives *Shoal*,
*Knot*; a spread one gives *Expanse*, *Gulf*; a field heavy with Dormant
Cores gives *Ashen*, *Fallow*. Costs nothing in list size and is the only
option here that makes a name feel *earned* instead of drawn. It also makes
the name a (very soft) clue, which is worth thinking about before building
it — probably fine, since it describes the shape of the field rather than
any signature's sector.

**4. Longer lists.** Real, but the weakest per unit of work. 18 × 16 = 288;
28 × 26 = 728, which moves the first repeat from ~22 regions to ~35. Worth
doing *with* the others, not instead of them.

---

## Signature designations

**Source:** `src/lib/name-generator.ts`, `generateQuasarNames(count)`.

Thirteen generator functions, modelled on real catalog conventions (3C 273,
PKS 2126-158, Markarian 231, Ton 618). One is picked **uniformly at random**
per signature, then a number is drawn from that generator's own range.
Uniqueness is enforced on the finished string via a `Set`, with a 2,000-try
guard.

| Prefix | Number range | Distinct names | Share of the space | How often it is drawn |
| --- | --- | ---: | ---: | ---: |
| `3C` | 10–999 | 990 | 2.1% | 7.7% |
| `4C` | 1–89 . 00–99 | 8,900 | 18.9% | 7.7% |
| `PKS` | 100–2359 | 2,260 | 4.8% | 7.7% |
| `PG` | 1000–2359 | 1,360 | 2.9% | 7.7% |
| `CTA` | 10–199 | 190 | 0.4% | 7.7% |
| `OJ` | 100–999 | 900 | 1.9% | 7.7% |
| `HE` | 100–2359 | 2,260 | 4.8% | 7.7% |
| `Ton` | 10–999 | 990 | 2.1% | 7.7% |
| `Mrk` | 1–999 | 999 | 2.1% | 7.7% |
| `APM` | 1000–9999 | 9,000 | 19.1% | 7.7% |
| `RX J` | 1000–2359 | 1,360 | 2.9% | 7.7% |
| `SDSS` | 1000–9999 | 9,000 | 19.1% | 7.7% |
| `Q` | 1000–9999 | 9,000 | 19.1% | 7.7% |

**47,209 distinct designations.** Across a whole career the pool is
effectively bottomless, which is why designations never feel repetitive
*between* regions.

### Within one region, they do

Because the prefix is drawn uniformly and independently per signature, and a
region only holds six to eight of them:

| Region size | Distinct prefixes on average | Regions with at least one repeated prefix |
| --- | --- | --- |
| 6 signatures | 4.96 of 6 | **74.6%** |
| 7 signatures | 5.58 of 7 | **86.0%** |
| 8 signatures | 6.15 of 8 | **93.6%** |

So the *typical* board carries two `Mrk`s or a pair of `Q`s, and the worst
seen in 60,000 sampled regions was five signatures sharing one prefix. The
uniqueness check does not catch it, because `Mrk 12` and `Mrk 847` are
different strings.

This matters more than it looks. Colour and glyph are the two identity
channels on the dial, but the *name* is what the briefing, the Sweep Scope,
the Ring Scan and the walk-through all refer to a signature by — and two
names sharing a prefix are the two you misread.

### The fix is one line

**Draw prefixes without replacement within a region.** There are thirteen
prefixes and at most eight signatures, so every signature on a board can
have a different one, and the repeat rate goes from 86% to zero. Nothing
else about the generator has to change.

Two smaller things worth considering at the same time:

- **Weight the prefix by the space behind it**, or drop the ranges that are
  too small to carry their share — `CTA` holds 0.4% of the space and is
  drawn 7.7% of the time, so `CTA` numbers recur across a career far more
  than any other prefix.
- **Coordinate suffixes.** Real designations of this kind encode position
  (`PKS 2126-158`). Adding a `-nnn` tail to the coordinate-style prefixes
  would read as more authentic — but check it does not imply a sky position
  the puzzle then contradicts.

---

## Officer names

Out of scope here, but for completeness: `src/lib/officer-name.ts`, drawn
per career and rerollable from the Officer panel. Untouched by anything
above, and the surname list is the one that option 2 above would borrow for
`Halloran's Reach`.
