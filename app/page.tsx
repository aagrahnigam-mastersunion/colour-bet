'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Colour, AgeBand, Gender, ColourVision, QuestionAnswer } from '@/lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const IMMERSION_DURATION = 12_000;
const QUESTION_TIMEOUT = 15_000;

// Question order and options match the PDF questionnaires exactly
const QUESTIONS = [
  {
    id: 1,
    image: '/stimuli/q3-shepard-tables.jpg',
    prompt: 'Which tabletop is longer?',
    options: ['Left', 'Right'],
  },
  {
    id: 2,
    image: '/stimuli/q-shape-pattern.png',
    prompt: 'What comes next?',
    options: ['a', 'b', 'c', 'd'],
  },
  {
    id: 3,
    image: '/stimuli/q4-puzzle-matrix.png',
    prompt: 'What comes next in the sequence?',
    options: ['A', 'B', 'C', 'D', 'E', 'F'],
  },
  {
    id: 4,
    image: '/stimuli/q-raven-dots.png',
    prompt: 'What comes next in the sequence?',
    options: ['A', 'B', 'C', 'D', 'E'],
  },
  {
    id: 5,
    image: null,
    prompt: 'Imagine you can choose only ONE lottery ticket. Which would you pick?',
    options: [
      'Ticket A: 1% chance of winning ₹10,000',
      'Ticket B: 10% chance of winning ₹1,000',
    ],
  },
];

const BET_OPTIONS = [10, 25, 50, 100] as const;

// Solid background colours matching the 4 PDF questionnaires
const COLOUR_BG: Record<Colour, string> = {
  red: '#C1362B',
  blue: '#0047C8',
  green: '#1D9745',
  yellow: '#F5C318',
};

// Text on the coloured background — white for dark backgrounds, near-black for yellow
const TEXT_ON_BG: Record<Colour, string> = {
  red: '#FFFFFF',
  blue: '#FFFFFF',
  green: '#FFFFFF',
  yellow: '#1C1600',
};

// Text on white cards/buttons — condition colour (darkened for yellow legibility)
const TEXT_ON_WHITE: Record<Colour, string> = {
  red: '#C1362B',
  blue: '#0047C8',
  green: '#1D9745',
  yellow: '#8B6600',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen =
  | 'landing'
  | 'background'
  | 'underage'
  | 'colour_blind'
  | 'assigning'
  | 'immersion'
  | 'instructions'
  | 'question'
  | 'bet'
  | 'submitting'
  | 'reveal'
  | 'full';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

// Returns grid-cols class for compact single-letter option buttons
function compactGridCols(count: number): string {
  if (count === 4) return 'grid-cols-4';
  if (count === 5) return 'grid-cols-5';
  return 'grid-cols-3'; // 6 options → 3×2
}

// ─── Timer Bar (question countdown) ──────────────────────────────────────────

function TimerBar({ duration, onExpire, barColour }: { duration: number; onExpire: () => void; barColour: string }) {
  const [width, setWidth] = useState(100);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
    startRef.current = null;
    setWidth(100);

    function frame(now: number) {
      if (!startRef.current) startRef.current = now;
      const elapsed = now - startRef.current;
      const remaining = Math.max(0, 1 - elapsed / duration);
      setWidth(remaining * 100);
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(frame);
      } else if (!firedRef.current) {
        firedRef.current = true;
        onExpire();
      }
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [duration, onExpire]);

  return (
    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{ width: `${width}%`, backgroundColor: barColour, transition: 'none' }}
      />
    </div>
  );
}

// ─── Screen Components ────────────────────────────────────────────────────────

function LandingScreen({ onStart }: { onStart: () => void }) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6 py-12 experiment-screen">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Decision Making Study</h1>
          <p className="text-sm text-gray-500 uppercase tracking-wide">
            Academic Research · Behavioural Economics
          </p>
        </div>

        <div className="bg-gray-50 rounded-2xl p-6 text-gray-700 text-sm leading-relaxed space-y-3">
          <p>
            Thank you for your interest in this short study. We are measuring your{' '}
            <strong>decision-making skills</strong> through a series of quick tasks.
          </p>
          <p>
            Participation is <strong>voluntary and anonymous</strong>. No identifying information is
            collected. The study takes approximately <strong>2 minutes</strong> to complete. You may
            stop at any time.
          </p>
          <p>This study is part of an academic Behavioural Economics project. You must be 18 or over to participate.</p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <div className="mt-0.5 flex-shrink-0">
            <input type="checkbox" className="sr-only" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${agreed ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'}`}>
              {agreed && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm text-gray-700">I am 18 or over and I consent to take part in this study.</span>
        </label>

        <button
          onClick={onStart}
          disabled={!agreed}
          className="w-full py-4 rounded-2xl text-white font-semibold text-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]"
        >
          Start
        </button>
      </div>
    </div>
  );
}

function BackgroundScreen({
  ageBand, gender, colourVision, name, onChange, onNext,
}: {
  ageBand: AgeBand | '';
  gender: Gender | '';
  colourVision: ColourVision | '';
  name: string;
  onChange: (field: string, value: string) => void;
  onNext: () => void;
}) {
  const canProceed = ageBand !== '' && gender !== '' && colourVision !== '';

  const ageBands = [
    { label: 'Under 18', value: 'under_18' as AgeBand },
    { label: '18–24', value: '18-24' as AgeBand },
    { label: '25–34', value: '25-34' as AgeBand },
    { label: '35+', value: '35+' as AgeBand },
  ];
  const genders = [
    { label: 'Male', value: 'male' as Gender },
    { label: 'Female', value: 'female' as Gender },
    { label: 'Prefer not to say', value: 'prefer_not' as Gender },
  ];
  const cvOptions = [
    { label: 'Yes', value: 'yes' as ColourVision },
    { label: 'No', value: 'no' as ColourVision },
    { label: 'Not sure', value: 'not_sure' as ColourVision },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6 py-12 experiment-screen">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">A few quick questions</h2>
          <p className="mt-1 text-sm text-gray-500">This information is for reporting purposes only.</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Name <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => onChange('name', e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 text-sm placeholder-gray-400 focus:border-indigo-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Age</label>
            <div className="grid grid-cols-2 gap-2">
              {ageBands.map(({ label, value }) => (
                <button key={value} onClick={() => onChange('ageBand', value)}
                  className={`py-3 rounded-xl border-2 text-sm font-medium transition-all ${ageBand === value ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Gender</label>
            <div className="grid grid-cols-2 gap-2">
              {genders.slice(0, 2).map(({ label, value }) => (
                <button key={value} onClick={() => onChange('gender', value)}
                  className={`py-3 rounded-xl border-2 text-sm font-medium transition-all ${gender === value ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={() => onChange('gender', genders[2].value)}
              className={`w-full py-3 rounded-xl border-2 text-sm font-medium transition-all ${gender === genders[2].value ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
              {genders[2].label}
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Do you have any colour-vision deficiency (colour blindness)?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {cvOptions.map(({ label, value }) => (
                <button key={value} onClick={() => onChange('colourVision', value)}
                  className={`py-3 rounded-xl border-2 text-sm font-medium transition-all ${colourVision === value ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={onNext} disabled={!canProceed}
          className="w-full py-4 rounded-2xl text-white font-semibold text-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]">
          Continue
        </button>
      </div>
    </div>
  );
}

function UnderageScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6 experiment-screen">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-5xl">👋</div>
        <h2 className="text-2xl font-bold text-gray-900">Thank you for your interest</h2>
        <p className="text-gray-600">This study requires participants to be 18 or over. We appreciate you stopping by.</p>
      </div>
    </div>
  );
}

function ColourBlindScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6 experiment-screen">
      <div className="max-w-md w-full text-center space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Thank you for your interest</h2>
        <p className="text-gray-600 leading-relaxed">
          This study involves colour perception and requires normal colour vision to participate.
          We&apos;re unable to include participants with colour-vision deficiencies. We appreciate you stopping by.
        </p>
      </div>
    </div>
  );
}

function AssigningScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white experiment-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Getting ready…</p>
      </div>
    </div>
  );
}

function ImmersionScreen({ colour, onComplete }: { colour: Colour; onComplete: () => void }) {
  const completeRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!completeRef.current) { completeRef.current = true; onCompleteRef.current(); }
    }, IMMERSION_DURATION);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden experiment-screen">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/stimuli/colour-${colour}.jpeg`}
        alt=""
        className="w-full h-full object-cover"
        aria-hidden="true"
      />
    </div>
  );
}

// Instructions screen — solid condition colour background, matching PDF slide 4
function InstructionsScreen({ colour, onStart }: { colour: Colour; onStart: () => void }) {
  const bg = COLOUR_BG[colour];
  const textOnBg = TEXT_ON_BG[colour];
  const textOnWhite = TEXT_ON_WHITE[colour];

  return (
    <div className="min-h-screen flex flex-col px-6 py-10 experiment-screen overflow-y-auto" style={{ backgroundColor: bg }}>
      <h1 className="text-2xl font-black tracking-[0.2em] mb-6" style={{ color: textOnBg }}>
        INSTRUCTIONS
      </h1>

      <div className="space-y-5 flex-1 text-sm font-medium leading-relaxed" style={{ color: textOnBg }}>
        <p>Throughout the challenge, we&apos;re observing three things:</p>
        <ul className="space-y-2 pl-4">
          <li className="flex gap-2"><span>•</span><span>How accurate people are.</span></li>
          <li className="flex gap-2"><span>•</span><span>How confident they are in their answers.</span></li>
          <li className="flex gap-2"><span>•</span><span>And how much risk they&apos;re willing to take when they&apos;re uncertain.</span></li>
        </ul>

        <p className="pt-2 font-bold">For each question:</p>
        <ul className="space-y-2 pl-4">
          <li className="flex gap-2"><span>•</span><span>Choose your answer within 15 seconds.</span></li>
          <li className="flex gap-2 items-start">
            <span>•</span>
            <span>
              Commit to it by selecting your confidence level:
              <span className="block mt-2 space-y-1 pl-3">
                <span className="block"><strong>10</strong> = Not very confident</span>
                <span className="block"><strong>25</strong> = Slightly confident</span>
                <span className="block"><strong>50</strong> = Fairly confident</span>
                <span className="block"><strong>100</strong> = Extremely confident</span>
              </span>
            </span>
          </li>
        </ul>

        <p className="pt-2 italic">
          There are no right or wrong confidence levels—only your own judgment.
        </p>
        <p>If you are not able to answer, you will get 0 points.</p>
      </div>

      <button
        onClick={onStart}
        className="mt-8 w-full py-4 bg-white rounded-2xl font-bold text-xl active:scale-[0.98] transition-transform"
        style={{ color: textOnWhite }}
      >
        I&apos;m Ready
      </button>
    </div>
  );
}

function QuestionScreen({
  qIndex,
  colour,
  onAnswer,
}: {
  qIndex: number;
  colour: Colour;
  onAnswer: (choice: string, rtMs: number) => void;
}) {
  const q = QUESTIONS[qIndex];
  const startTime = useRef(Date.now());
  const answeredRef = useRef(false);
  const onAnswerRef = useRef(onAnswer);
  onAnswerRef.current = onAnswer;

  const bg = COLOUR_BG[colour];
  const textOnBg = TEXT_ON_BG[colour];
  const textOnWhite = TEXT_ON_WHITE[colour];
  const allSingleChar = q.options.every(o => o.length === 1);
  const twoShortOptions = q.options.length === 2 && q.options.every(o => o.length <= 12);

  useEffect(() => {
    answeredRef.current = false;
    startTime.current = Date.now();
  }, [qIndex]);

  const handleAnswer = useCallback((choice: string) => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    onAnswerRef.current(choice, Date.now() - startTime.current);
  }, []);

  const handleExpire = useCallback(() => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    onAnswerRef.current('no_response', QUESTION_TIMEOUT);
  }, []);

  return (
    <div className="min-h-screen flex flex-col experiment-screen">
      {/* White sticky header: progress + timer + question prompt */}
      <div className="sticky top-0 z-20 bg-white px-5 pt-4 pb-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 font-medium tracking-wide">Q {qIndex + 1} / 5</span>
          <div className="flex gap-1.5">
            {QUESTIONS.map((_, i) => (
              <div
                key={i}
                className="h-1.5 w-5 rounded-full"
                style={{ backgroundColor: i <= qIndex ? bg : '#E5E7EB' }}
              />
            ))}
          </div>
        </div>
        <TimerBar key={qIndex} duration={QUESTION_TIMEOUT} onExpire={handleExpire} barColour={bg} />
        <h2 className="text-base font-bold mt-2 leading-snug" style={{ color: textOnWhite }}>
          {q.prompt}
        </h2>
      </div>

      {/* Solid colour body: image card + answer buttons */}
      <div
        className="flex-1 flex flex-col px-4 py-4 gap-4"
        style={{ backgroundColor: bg }}
      >
        {q.image && (
          <div className="bg-white rounded-2xl p-3 flex justify-center shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={q.image}
              alt={`Question ${q.id} stimulus`}
              draggable={false}
              className="rounded-lg block"
              style={{ maxWidth: '100%', maxHeight: '42vh', width: 'auto', height: 'auto', objectFit: 'contain' }}
            />
          </div>
        )}

        {/* Answer buttons — layout adapts to option type and count */}
        <div className="mt-auto pb-3">
          {allSingleChar ? (
            /* Single-letter options: responsive CSS grid, buttons fill available width */
            <div className={`grid ${compactGridCols(q.options.length)} gap-2`}>
              {q.options.map(option => (
                <button
                  key={option}
                  onClick={() => handleAnswer(option)}
                  className="aspect-square bg-white rounded-2xl font-black text-xl flex items-center justify-center active:scale-[0.94] transition-transform shadow-sm"
                  style={{ color: textOnWhite }}
                  aria-label={`Option ${option}`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : twoShortOptions ? (
            /* Two short options (Left/Right): side by side */
            <div className="grid grid-cols-2 gap-3">
              {q.options.map(option => (
                <button
                  key={option}
                  onClick={() => handleAnswer(option)}
                  className="py-5 bg-white rounded-2xl font-bold text-base flex items-center justify-center active:scale-[0.97] transition-transform shadow-sm"
                  style={{ color: textOnWhite }}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            /* Long-text options (Ticket A / Ticket B): stacked full-width */
            <div className="space-y-3">
              {q.options.map(option => (
                <button
                  key={option}
                  onClick={() => handleAnswer(option)}
                  className="w-full py-4 px-5 bg-white rounded-2xl font-bold text-sm text-left active:scale-[0.98] transition-transform shadow-sm leading-snug"
                  style={{ color: textOnWhite }}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BetScreen({
  qIndex,
  colour,
  choice,
  onBet,
}: {
  qIndex: number;
  colour: Colour;
  choice: string;
  onBet: (bet: number) => void;
}) {
  const wasTimeout = choice === 'no_response';
  const bg = COLOUR_BG[colour];
  const textOnBg = TEXT_ON_BG[colour];
  const textOnWhite = TEXT_ON_WHITE[colour];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-8 experiment-screen"
      style={{ backgroundColor: bg }}
    >
      <div className="w-full max-w-sm space-y-6">
        {wasTimeout ? (
          <>
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
              <p className="text-lg font-semibold text-gray-700">Time&apos;s up!</p>
              <p className="text-sm text-gray-500 mt-1">No answer was recorded for this question.</p>
            </div>
            <div className="text-center">
              <button
                onClick={() => onBet(0)}
                className="py-4 px-10 bg-white rounded-2xl font-bold text-lg active:scale-[0.98] transition-transform shadow-sm"
                style={{ color: textOnWhite }}
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xl font-bold text-center" style={{ color: textOnBg }}>
              Place a bet on your choice:
            </p>

            <div className="grid grid-cols-2 gap-3">
              {BET_OPTIONS.map(bet => (
                <button
                  key={bet}
                  onClick={() => onBet(bet)}
                  className="py-6 bg-white rounded-2xl font-black text-4xl flex flex-col items-center justify-center active:scale-[0.96] transition-transform shadow-sm"
                  style={{ color: textOnWhite }}
                >
                  {bet}
                  <span className="text-xs font-semibold mt-1 opacity-60">pts</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SubmittingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white experiment-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Saving your responses…</p>
      </div>
    </div>
  );
}

function RevealScreen({ totalBet }: { totalBet: number }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6 py-12 experiment-screen">
      <div className="max-w-sm w-full text-center space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">All done!</h2>
        <div className="bg-indigo-50 rounded-3xl px-8 py-10">
          <p className="text-sm text-indigo-500 uppercase tracking-widest font-medium mb-3">Your score</p>
          <p className="text-7xl font-bold text-indigo-700 tabular-nums">{totalBet}</p>
          <p className="text-indigo-400 mt-3 font-medium">points</p>
        </div>
        <p className="text-sm text-gray-400">Thank you for participating.</p>
      </div>
    </div>
  );
}

function StudyFullScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6 experiment-screen">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-5xl">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900">Study Complete</h2>
        <p className="text-gray-600 leading-relaxed">
          We have collected all the responses we need for this study. Thank you for your interest — participation is now closed.
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExperimentPage() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [participantId] = useState(() => uuidv4());
  const [startTime, setStartTime] = useState(0);
  const [colour, setColour] = useState<Colour | null>(null);
  const [name, setName] = useState('');
  const [ageBand, setAgeBand] = useState<AgeBand | ''>('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [colourVision, setColourVision] = useState<ColourVision | ''>('');
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<QuestionAnswer[]>([]);
  const [currentChoice, setCurrentChoice] = useState<string>('no_response');
  const [currentRtMs, setCurrentRtMs] = useState(0);
  const [totalBet, setTotalBet] = useState(0);

  function handleBgChange(field: string, value: string) {
    if (field === 'name') setName(value);
    if (field === 'ageBand') setAgeBand(value as AgeBand);
    if (field === 'gender') setGender(value as Gender);
    if (field === 'colourVision') setColourVision(value as ColourVision);
  }

  async function handleBgNext() {
    if (ageBand === 'under_18') { setScreen('underage'); return; }
    if (colourVision === 'yes') { setScreen('colour_blind'); return; }
    setScreen('assigning');

    let assigned: Colour = 'red';
    let full = false;
    try {
      const res = await fetch('/api/assign', { method: 'POST' });
      const data = await res.json();
      if (data.full) { full = true; } else { assigned = data.colour; }
    } catch {
      const colours: Colour[] = ['red', 'yellow', 'green', 'blue'];
      assigned = colours[Math.floor(Math.random() * 4)];
    }

    if (full) { setScreen('full'); return; }
    setColour(assigned);
    setStartTime(Date.now());
    setScreen('immersion');
  }

  function handleImmersionComplete() {
    setScreen('instructions');
  }

  function handleInstructionsStart() {
    setScreen('question');
    setQIndex(0);
  }

  function handleAnswer(choice: string, rtMs: number) {
    setCurrentChoice(choice);
    setCurrentRtMs(rtMs);
    setScreen('bet');
  }

  function handleBet(bet: number) {
    const answer: QuestionAnswer = { q: qIndex + 1, choice: currentChoice, bet, rt_ms: currentRtMs };
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (qIndex < QUESTIONS.length - 1) {
      setQIndex(qi => qi + 1);
      setScreen('question');
    } else {
      const total = newAnswers.reduce((s, a) => s + a.bet, 0);
      setTotalBet(total);
      setScreen('submitting');
      submitData(newAnswers);
    }
  }

  async function submitData(finalAnswers: QuestionAnswer[]) {
    const payload = {
      participant_id: participantId,
      created_at_client: new Date().toISOString(),
      colour: colour!,
      name: name.trim() || undefined,
      age_band: ageBand,
      gender,
      colour_vision: colourVision,
      device_type: getDeviceType(),
      screen_width_px: window.innerWidth,
      user_agent: navigator.userAgent,
      total_time_ms: Date.now() - startTime,
      questions: finalAnswers,
    };

    try {
      await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // best-effort; don't block reveal
    }

    setScreen('reveal');
  }

  if (screen === 'landing') return <LandingScreen onStart={() => setScreen('background')} />;
  if (screen === 'background')
    return <BackgroundScreen ageBand={ageBand} gender={gender} colourVision={colourVision} name={name} onChange={handleBgChange} onNext={handleBgNext} />;
  if (screen === 'underage') return <UnderageScreen />;
  if (screen === 'colour_blind') return <ColourBlindScreen />;
  if (screen === 'assigning') return <AssigningScreen />;
  if (screen === 'immersion') return <ImmersionScreen colour={colour!} onComplete={handleImmersionComplete} />;
  if (screen === 'instructions') return <InstructionsScreen colour={colour!} onStart={handleInstructionsStart} />;
  if (screen === 'question')
    return <QuestionScreen key={qIndex} qIndex={qIndex} colour={colour!} onAnswer={handleAnswer} />;
  if (screen === 'bet')
    return <BetScreen qIndex={qIndex} colour={colour!} choice={currentChoice} onBet={handleBet} />;
  if (screen === 'submitting') return <SubmittingScreen />;
  if (screen === 'reveal') return <RevealScreen totalBet={totalBet} />;
  if (screen === 'full') return <StudyFullScreen />;

  return null;
}
