import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import type { Colour } from '@/lib/types';

const COLOURS: Colour[] = ['red', 'yellow', 'green', 'blue'];
const TARGET_PER_COLOUR = 50;
const MAX_PER_COLOUR = 60; // buffer for dropouts

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function POST() {
  try {
    // Query completed counts per colour
    const { data, error } = await getSupabase()
      .from('responses')
      .select('colour')
      .eq('completed', true);

    if (error) throw error;

    const counts: Record<Colour, number> = { red: 0, yellow: 0, green: 0, blue: 0 };
    for (const row of data ?? []) {
      if (row.colour in counts) counts[row.colour as Colour]++;
    }

    const totalCompleted = Object.values(counts).reduce((a, b) => a + b, 0);

    // Study full — all slots taken
    if (totalCompleted >= TARGET_PER_COLOUR * COLOURS.length) {
      return NextResponse.json({ colour: null, full: true });
    }

    // Eligible colours are those below MAX_PER_COLOUR
    const eligible = COLOURS.filter(c => counts[c] < MAX_PER_COLOUR);

    if (eligible.length === 0) {
      return NextResponse.json({ colour: pickRandom(COLOURS), full: false });
    }

    // Find minimum count among eligible colours
    const minCount = Math.min(...eligible.map(c => counts[c]));
    const leastFilled = eligible.filter(c => counts[c] === minCount);

    const colour = pickRandom(leastFilled);
    return NextResponse.json({ colour, full: false });
  } catch {
    // Fallback to uniform random if Supabase unreachable — never block participant
    return NextResponse.json({ colour: pickRandom(COLOURS), full: false });
  }
}
