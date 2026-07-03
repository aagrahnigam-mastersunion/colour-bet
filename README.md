# Colour Bet — Behavioural Economics Experiment

A ~2-minute web experiment measuring decision-making confidence under ambient colour priming.
Participants are randomly assigned one of four background colours, complete 5 timed decision tasks,
and bet points after each decision. The primary DV is total points bet (a proxy for confidence).

---

## Stimuli

Place these images in `public/stimuli/` before deploying:

| File | Description |
|------|-------------|
| `colour-red.jpeg` | Red/maroon damask — immersion colour |
| `colour-yellow.jpeg` | Yellow damask — immersion colour |
| `colour-green.jpeg` | Dark green damask — immersion colour |
| `colour-blue.jpeg` | Navy damask — immersion colour |
| `q1-ebbinghaus.png` | Ebbinghaus illusion stimulus |
| `q2-muller-lyer.jpeg` | Müller-Lyer illusion stimulus |
| `q3-shepard-tables.jpg` | Shepard Tables illusion stimulus |
| `q4-puzzle-matrix.webp` | "Complete the Matrix" pattern puzzle |

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values:

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-only, never exposed to client
SHEETS_WEBAPP_URL=https://script.google.com/macros/s/YOUR_ID/exec
```

Set the same variables in Vercel → Project Settings → Environment Variables.

---

## Supabase Table DDL

Run this in the Supabase SQL editor:

```sql
CREATE TABLE responses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id   text UNIQUE NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  colour           text CHECK (colour IN ('red', 'yellow', 'green', 'blue')),
  age_band         text,
  gender           text,
  colour_vision    text CHECK (colour_vision IN ('yes', 'no', 'not_sure')),
  device_type      text,
  screen_width_px  int,
  user_agent       text,
  total_time_ms    int,
  q1_choice text, q1_bet int, q1_rt_ms int,
  q2_choice text, q2_bet int, q2_rt_ms int,
  q3_choice text, q3_bet int, q3_rt_ms int,
  q4_choice text, q4_bet int, q4_rt_ms int,
  q5_choice text, q5_bet int, q5_rt_ms int,
  completed        boolean NOT NULL DEFAULT false,
  overflow         boolean NOT NULL DEFAULT false,
  raw              jsonb,
  honeypot         text
);

-- All access is server-side via service role key; no public read/write
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
```

---

## Google Apps Script (Sheets export)

1. Open your Google Sheet and go to **Extensions → Apps Script**.
2. Replace the default code with:

```javascript
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'participant_id','created_at','colour','age_band','gender','colour_vision',
      'device_type','screen_width_px','user_agent','total_time_ms',
      'q1_choice','q1_bet','q1_rt_ms',
      'q2_choice','q2_bet','q2_rt_ms',
      'q3_choice','q3_bet','q3_rt_ms',
      'q4_choice','q4_bet','q4_rt_ms',
      'q5_choice','q5_bet','q5_rt_ms',
    ]);
  }

  sheet.appendRow([
    data.participant_id, data.created_at, data.colour,
    data.age_band, data.gender, data.colour_vision,
    data.device_type, data.screen_width_px, data.user_agent, data.total_time_ms,
    data.q1_choice, data.q1_bet, data.q1_rt_ms,
    data.q2_choice, data.q2_bet, data.q2_rt_ms,
    data.q3_choice, data.q3_bet, data.q3_rt_ms,
    data.q4_choice, data.q4_bet, data.q4_rt_ms,
    data.q5_choice, data.q5_bet, data.q5_rt_ms,
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Click **Deploy → New deployment → Web app**.
4. Set: Execute as = *Me*, Who has access = *Anyone*.
5. Copy the `/exec` URL into `SHEETS_WEBAPP_URL`.

---

## 40-Participant Soft Cap

- Target: 10 completed participants per colour (40 total).
- `/api/assign` counts `completed = true` rows per colour and assigns to the least-filled colour (ties broken randomly).
- A buffer of up to 12 per colour is allowed to cover incomplete sessions.
- Once completed count reaches 40, `/api/assign` returns `{ full: true }` and participants see a polite "study full" screen.
- Supabase fallback: if unreachable at assignment time, falls back to uniform random — participant is never blocked.

---

## Local Development

```bash
npm install
cp .env.local.example .env.local
# fill in .env.local with your Supabase and Sheets credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Vercel Deploy

```bash
npm i -g vercel
vercel --prod
```

Set the three environment variables in the Vercel dashboard before the first production deploy.
