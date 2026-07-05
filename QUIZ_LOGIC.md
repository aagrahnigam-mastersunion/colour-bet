# Colour Bet — Quiz Logic

This document describes the experiment design and quiz flow for a future Claude reading `CLAUDE.md`. It covers only the *what and why* of the experiment logic, not the implementation.

---

## Purpose

This is a **behavioural economics experiment** studying whether ambient colour priming (seeing a saturated colour for 12 seconds before a task) affects:

1. **Accuracy** — which answers participants choose
2. **Confidence** — how many points they bet on each answer
3. **Risk appetite** — whether they bet conservatively or aggressively under uncertainty

The **primary dependent variable (DV)** is **total points bet** across all 5 questions (max 500). Higher total = more confident/risk-seeking. The colour condition is the independent variable.

---

## Participant Flow (Screen Order)

```
Landing (consent)
  ↓
Background questions (name, age, gender, colour vision)
  ↓ if under 18 → Underage exit
  ↓ if colour blind (yes) → Colour Blind exit
  ↓
Assigning (API picks colour condition)
  ↓
Immersion (12 seconds, full-screen colour damask image, no UI)
  ↓
Instructions (explains the point system and confidence betting)
  ↓
Q1 → Bet → Q2 → Bet → Q3 → Bet → Q4 → Bet → Q5 → Bet
  ↓
Submitting (data sent to Supabase)
  ↓
Reveal (participant sees total score)
```

---

## Colour Conditions

There are **4 conditions**, one assigned per participant:

| Condition | Colour | Background hex |
|-----------|--------|----------------|
| C (Crimson) | Red | `#C1362B` |
| B (Blue) | Blue | `#0047C8` |
| G (Green) | Green | `#1D9745` |
| Y (Yellow) | Yellow | `#F5C318` |

Assignment is **count-balanced**: new participants are directed to whichever colour has the fewest completed responses (cap: 50 per colour, 200 total before the study closes). If Supabase is unreachable, assignment falls back to uniform random.

The assigned colour is used for:
- The immersion image (damask pattern in that colour)
- The solid background on all question, bet, and instruction screens

---

## Immersion Phase

- Duration: **12 seconds**
- Shown: full-screen damask pattern image in the assigned colour (`colour-red.jpeg` etc.)
- No overlay, no timer, no text — pure uninterrupted colour exposure
- Auto-advances to the Instructions screen after 12 s

---

## The 5 Questions

Questions are presented in a **fixed order** (same for all conditions). Each has a **15-second timer**; if it expires the answer is recorded as `no_response` and the participant is forced to bet 0 on that question.

### Q1 — Shepard Tables (Optical Illusion)
- **Stimulus**: Two parallelogram table-tops that appear to differ in length but are physically identical
- **Prompt**: "Which tabletop is longer?"
- **Options**: Left | Right (side-by-side buttons)
- **Purpose**: Classic perceptual illusion with no objectively correct answer; captures systematic bias

### Q2 — Shape Pattern (Abstract Reasoning)
- **Stimulus**: A sequence of shapes (triangle → triangles → squares → ?)
- **Prompt**: "What comes next?"
- **Options**: a | b | c | d (four compact tile buttons)
- **Purpose**: Pattern completion task; tests inductive reasoning

### Q3 — Polygon Matrix (Abstract Reasoning)
- **Stimulus**: A 3×3 matrix of polygons with decreasing sides across columns (octagon → pentagon → triangle, etc.)
- **Prompt**: "What comes next in the sequence?"
- **Options**: A | B | C | D | E | F (six compact tile buttons, grid-cols-3)
- **Purpose**: Raven's-style matrix; tests rule-induction

### Q4 — Raven's Dots (Abstract Reasoning)
- **Stimulus**: A 2×2 matrix where each cell contains a triangle and a number of dots (1, 2, 3, ?)
- **Prompt**: "What comes next in the sequence?"
- **Options**: A | B | C | D | E (five compact tile buttons, grid-cols-5)
- **Purpose**: Progressive matrices task measuring fluid intelligence

### Q5 — Lottery Choice (Risk Preference)
- **Stimulus**: None (text only)
- **Prompt**: "Imagine you can choose only ONE lottery ticket. Which would you pick?"
- **Options**:
  - Ticket A: 1% chance of winning ₹10,000 (EV = ₹100)
  - Ticket B: 10% chance of winning ₹1,000 (EV = ₹100)
- **Purpose**: Equal-EV lottery framing from Kahneman–Tversky; reveals whether the participant is risk-seeking (A) or risk-averse (B)

---

## Bet Round (After Every Question)

After each answer (including `no_response`), the participant sees a **bet screen**:

- **Prompt on screen**: "Place a bet on your choice:"
- **Options**: 10 | 25 | 50 | 100 points (2×2 grid of large white cards)
- **Mapping**:
  - 10 = Not very confident
  - 25 = Slightly confident
  - 50 = Fairly confident
  - 100 = Extremely confident
- If the timer expired (`no_response`), the participant sees a "Time's up" card and presses Continue; **bet is forced to 0** for that question.
- There is no "correct" bet — only the participant's own judgment.

---

## Scoring

```
Total Score = sum of bets placed on all 5 questions
```

- Minimum: 0 (all timeouts)
- Maximum: 500 (bet 100 on every question)
- Revealed to the participant at the end as a simple number ("Your score: 350 points")
- No right/wrong feedback is given — the score purely reflects confidence/risk-taking

---

## Data Stored (Supabase: `responses` table)

| Column | Description |
|--------|-------------|
| `participant_id` | UUID, unique per session |
| `created_at` | ISO timestamp from client |
| `colour` | Assigned condition: red / yellow / green / blue |
| `name` | Optional free-text |
| `age_band` | under_18 / 18-24 / 25-34 / 35+ |
| `gender` | male / female / prefer_not |
| `colour_vision` | yes / no / not_sure |
| `device_type` | mobile / tablet / desktop |
| `screen_width_px` | Viewport width in pixels |
| `q1_choice … q5_choice` | Selected option label, or `no_response` |
| `q1_bet … q5_bet` | Points bet (0, 10, 25, 50, or 100) |
| `q1_rt_ms … q5_rt_ms` | Reaction time in milliseconds |
| `total_time_ms` | Total experiment duration |
| `completed` | true once submitted |
| `raw` | Full payload as JSONB |

---

## Exclusion Criteria

Participants are excluded **before** colour assignment if:
- `age_band === 'under_18'` → shown Underage exit screen
- `colour_vision === 'yes'` (confirmed colour blind) → shown Colour Blind exit screen

`colour_vision === 'not_sure'` is **allowed** to proceed.

---

## Key Design Decisions

- **No debrief or answer reveal**: Participants only see their total score at the end. This prevents learning effects if participants share results.
- **Fixed question order**: All participants see the same Q1→Q5 sequence to enable direct cross-condition comparison.
- **Colour on every question/bet screen**: The assigned colour fills the background throughout the quiz (not just immersion) to maintain the priming effect.
- **Equal-EV lottery (Q5)**: Both tickets have identical expected value (₹100). Any systematic preference difference across colour groups reflects affect-driven risk preference, not rational calculation.
- **Reaction time captured**: RT is stored even though it is not the primary DV, allowing secondary analysis of response hesitation under different colour conditions.
