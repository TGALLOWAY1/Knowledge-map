// SM-2-style spaced repetition scheduler.
//
// The UI exposes only Again / Hard / Good / Easy; this module owns all
// scheduling math. Pure functions — unit-testable without a database.

export type Rating = "again" | "hard" | "good" | "easy";
export type CardStatus = "NEW" | "LEARNING" | "REVIEW" | "LAPSED";

export interface SrsState {
  status: CardStatus;
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
}

export interface SrsResult extends SrsState {
  dueAt: Date;
}

const MIN_EASE = 1.3;
const LEARNING_STEPS_DAYS = [10 / (60 * 24), 1]; // 10 minutes, then 1 day
const EASY_BONUS = 1.3;
const HARD_MULTIPLIER = 1.2;
const MAX_INTERVAL_DAYS = 365;

export function schedule(state: SrsState, rating: Rating, now: Date = new Date()): SrsResult {
  let { status, intervalDays, ease, reps, lapses } = state;

  // Ease adjustments (SM-2 quality mapping: again=1, hard=3, good=4, easy=5)
  if (rating === "again") ease = Math.max(MIN_EASE, ease - 0.2);
  else if (rating === "hard") ease = Math.max(MIN_EASE, ease - 0.15);
  else if (rating === "easy") ease = ease + 0.15;

  if (rating === "again") {
    if (status === "REVIEW") lapses += 1;
    status = status === "NEW" ? "LEARNING" : "LAPSED";
    intervalDays = LEARNING_STEPS_DAYS[0];
  } else if (status === "NEW" || status === "LEARNING" || status === "LAPSED") {
    // Graduating path
    if (rating === "hard") {
      status = "LEARNING";
      intervalDays = LEARNING_STEPS_DAYS[0];
    } else if (rating === "good") {
      const stepIndex = status === "NEW" ? 0 : 1;
      if (stepIndex >= LEARNING_STEPS_DAYS.length - 1) {
        status = "REVIEW";
        intervalDays = 1;
      } else {
        status = "LEARNING";
        intervalDays = LEARNING_STEPS_DAYS[stepIndex];
      }
    } else {
      // easy graduates immediately
      status = "REVIEW";
      intervalDays = 4;
    }
  } else {
    // REVIEW cards
    if (rating === "hard") {
      intervalDays = Math.max(intervalDays * HARD_MULTIPLIER, intervalDays + 1);
    } else if (rating === "good") {
      intervalDays = intervalDays * ease;
    } else {
      intervalDays = intervalDays * ease * EASY_BONUS;
    }
    intervalDays = Math.min(intervalDays, MAX_INTERVAL_DAYS);
  }

  reps += 1;
  const dueAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return { status, intervalDays, ease, reps, lapses, dueAt };
}

// Mastery heuristic for a single card in [0, 1].
// New cards score 0; cards climb with successful reps and interval length,
// and are penalized for lapses.
export function cardMastery(state: {
  status: string;
  intervalDays: number;
  reps: number;
  lapses: number;
}): number {
  if (state.status === "NEW" || state.reps === 0) return 0;
  const intervalScore = Math.min(state.intervalDays / 21, 1); // 3 weeks ≈ mastered
  const repScore = Math.min(state.reps / 6, 1);
  const lapsePenalty = Math.min(state.lapses * 0.1, 0.4);
  const base = 0.55 * intervalScore + 0.45 * repScore;
  return Math.max(0, Math.min(1, base - lapsePenalty));
}

export function isWeak(state: {
  status: string;
  intervalDays: number;
  reps: number;
  lapses: number;
}): boolean {
  if (state.reps === 0) return false; // untouched, not weak
  return state.status === "LAPSED" || cardMastery(state) < 0.35;
}
