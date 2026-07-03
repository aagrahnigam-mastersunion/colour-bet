import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import type { SubmitPayload } from '@/lib/types';

function flattenQuestions(questions: SubmitPayload['questions']) {
  const flat: Record<string, string | number> = {};
  for (const q of questions) {
    flat[`q${q.q}_choice`] = q.choice;
    flat[`q${q.q}_bet`] = q.bet;
    flat[`q${q.q}_rt_ms`] = q.rt_ms;
  }
  return flat;
}

export async function POST(req: NextRequest) {
  let payload: SubmitPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  // Silently discard honeypot submissions
  if (payload.honeypot) {
    return NextResponse.json({ ok: true });
  }

  const flat = flattenQuestions(payload.questions);
  const row = {
    participant_id: payload.participant_id,
    created_at: payload.created_at_client,
    colour: payload.colour,
    name: payload.name ?? null,
    age_band: payload.age_band,
    gender: payload.gender,
    colour_vision: payload.colour_vision,
    device_type: payload.device_type,
    screen_width_px: payload.screen_width_px,
    user_agent: payload.user_agent,
    total_time_ms: payload.total_time_ms,
    ...flat,
    completed: true,
    raw: payload,
  };

  try {
    const { error } = await getSupabase()
      .from('responses')
      .upsert(row, { onConflict: 'participant_id' });
    if (error) {
      console.error('[submit] supabase error:', error);
    }
  } catch (err) {
    console.error('[submit] supabase unreachable:', err);
  }

  return NextResponse.json({ ok: true });
}
