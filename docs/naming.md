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

**Source:** `src/lib/region-name.ts`, `generateRegionName(field, isTaken)`.
Split out of `flavor-text.ts` on 2026-08-04, when it outgrew one line.

### What it was, and why that was the problem

One rule, `${pick(ADJECTIVES)} ${pick(NOUNS)}`, over 18 × 16 lists. That is
288 names, with the first repeat landing after **21.9 regions** on average
and as early as the second — routine inside a single sitting at three open
surveys.

But list size was the smaller half. **The grammar never varied.** Twelve
consecutive draws from the old generator:

```
Umbral Rift       Ferrous Void      Fallow Verge      Umbral Nebula
Fallow Shoal      Ashen Void        Cinder Expanse    Pallid Gulf
Nocturne Gulf     Brindle Hollow    Ferrous Corridor  Thanix Hollow
```

Read as a set, that is one name with the nouns swapped. Tripling the lists
would have moved the collision point to ~38 and changed nothing about that
paragraph — which is why all four fixes shipped together.

### What it is now

**Four grammars**, weighted so the two-word form stays the house style:

| Grammar | Share | Examples |
| --- | ---: | --- |
| `<Adj> <Noun>` | 55% | Umbral Cluster · Ashen Basin · Ember Shoal |
| `<Charter>'s <Noun>` | 15% | Kemble's Cascade · Vaskir's Marches · Achebe's Rift |
| `<Adj> <Noun> <Roman>` | 15% | Hoary Cluster V · Cobalt Barrens VII |
| `<Adj>-<Adj> <Noun>` | 15% | Brindle-Ember Hollow · Glacial-Cobalt Throat |

A station-survey designation (*Tikon Deep 41*) was considered and dropped:
these are regions of space and should be named like places. The signatures
already carry the catalog register.

**Charter names** are whoever first charted the place — Kemble is Lucian
Kemble, who has a real asterism named after him. The list deliberately
shares nothing with `officer-name.ts`: an overlap would quietly imply the
officer at the console had charted the field they were being handed. Not all
of them are human, for the same reason the crew roster isn't.

**The field names itself.** The noun pool leans on where the signatures
actually sit and how spread they are; the adjective pool leans on the
classifications present. Leaning, not dictating — shape pools are *added* to
the general pool, so no name is ever impossible. Measured on two opposite
fields:

```
outer + tight (Ancient Relic): Cascade 6.8%  Cluster 6.8%  Marches 6.8%  Rim 6.7%
inner + wide  (Pulsar-Class):  Hollow  8.8%  Barrens 6.9%  Gulf    6.7%  Basin 6.7%
```

This makes the name a very soft clue. It describes the *shape* of a field —
how far out, how spread — and never any one signature's sector, so it gives
away nothing the Sweep Scope wouldn't.

**No repeats within a save.** `station.ts` keeps every name ever charted and
`generateRegion` retries up to 40 times against it. On the station record
rather than the career, so a field your first officer surveyed does not get
rediscovered and renamed by your second — and the tutorial's fixed `Ember
Verge` is claimed too, so a generated region can never turn up wearing it.

**Longer lists**: 29 adjectives, 12 general nouns plus four shape pools, 16
charter names.

### Where it lands

| | Before | After |
| --- | --- | --- |
| Distinct names in 200,000 draws | 288 | **12,640** |
| Regions before a repeat, grammar alone | 21.9 | **40.4** |
| Repeats actually possible in a save | yes | **no** |
| `Hollow Hollow` | 1 in 288 | impossible — "Hollow" is a noun and nowhere else |

The grammar-alone figure is lower than the raw name count suggests because
the plain form is 55% of draws over the smallest space. It does not matter
much: the save-level check is what guarantees you never see one twice, and
the other three exist to stop the names *sounding* alike.

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

### The fix is one line, and it was declined

**Draw prefixes without replacement within a region.** There are thirteen
prefixes and at most eight signatures, so every signature on a board can
have a different one, and the repeat rate goes from 86% to zero. Nothing
else about the generator has to change.

**Left as-is on 2026-08-04** — the repetition that actually bothered anyone
was in the region names, and real catalogs do carry several entries from the
same survey in one patch of sky, so two `Mrk`s is more authentic than
thirteen tidy prefixes. Recorded here rather than dropped, because the
argument for it is still good if signatures ever start getting confused for
each other in play: colour and glyph separate them on the dial, but the
*name* is what every panel refers to them by.

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
