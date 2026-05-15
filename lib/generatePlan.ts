// Norwegian Method / Polarised Training Plan Generator
// Approx 80% Zone 1-2 (easy aerobic), 20% Zone 3+ (threshold/VO2max)

export type Discipline = "swim" | "bike" | "run" | "rest" | "brick";
export type Intensity = "Z1" | "Z2" | "Z3" | "threshold" | "vo2max";
export type TrainingPhase = "base" | "build" | "peak" | "taper";

// ─── Phase helpers ────────────────────────────────────────────────────────────

export function getWeeksToRace(raceTimeframe: string | null | undefined): number | null {
  if (!raceTimeframe) return null;
  // ISO date string e.g. "2026-09-14"
  if (/^\d{4}-\d{2}-\d{2}$/.test(raceTimeframe)) {
    const raceDate = new Date(raceTimeframe);
    const now = new Date();
    const diffMs = raceDate.getTime() - now.getTime();
    return Math.max(0, Math.round(diffMs / (7 * 24 * 60 * 60 * 1000)));
  }
  // Legacy text format
  if (raceTimeframe.includes("Less than 8")) return 6;
  if (raceTimeframe.includes("8")) return 12;
  if (raceTimeframe.includes("16")) return 20;
  if (raceTimeframe.includes("24")) return 28;
  return null;
}

export function getTrainingPhase(weeksToRace: number | null): TrainingPhase {
  if (weeksToRace === null) return "base";
  if (weeksToRace <= 2) return "taper";
  if (weeksToRace <= 5) return "peak";
  if (weeksToRace <= 14) return "build";
  return "base";
}

export const PHASE_LABELS: Record<TrainingPhase, string> = {
  base:   "Base Phase",
  build:  "Build Phase",
  peak:   "Peak Phase",
  taper:  "Taper",
};

export const PHASE_DESCRIPTIONS: Record<TrainingPhase, string> = {
  base:  "Building your aerobic engine. High easy volume, minimal intensity.",
  build: "Converting base fitness into race-specific speed and endurance.",
  peak:  "Final sharpening. Race-specific sessions, volume near its highest.",
  taper: "Arriving fresh. Volume drops 40–50% — intensity stays. Trust the process.",
};

export type SessionStatus = "pending" | "done" | "skipped";

export const SKIP_REASONS = [
  { id: "no_pool", label: "No pool access", emoji: "🏊" },
  { id: "travelling", label: "Travelling", emoji: "✈️" },
  { id: "tired", label: "Feeling tired", emoji: "😴" },
  { id: "injury", label: "Injury / soreness", emoji: "🤕" },
  { id: "busy", label: "Too busy", emoji: "⏰" },
  { id: "other", label: "Just skipping", emoji: "👋" },
] as const;

export type SkipReasonId = typeof SKIP_REASONS[number]["id"];

export interface Session {
  discipline: Discipline;
  intensity: Intensity;
  durationMin: number;
  label: string;
  description: string;
  status?: SessionStatus;
  skipReason?: SkipReasonId;
}

export interface DayPlan {
  day: string;
  sessions: Session[];
}

export type WeekPlan = DayPlan[];

interface Profile {
  goal_race?: string | null;
  race_timeframe?: string | null; // ISO date string "YYYY-MM-DD" or legacy text
  weekly_hours?: string | null;
  fitness_level?: string | null;
  swim_level?: string | null;
  bike_level?: string | null;
  run_level?: string | null;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseWeeklyMinutes(weekly_hours: string | null | undefined): number {
  if (!weekly_hours) return 300;
  if (weekly_hours.includes("Less than 5")) return 240;
  if (weekly_hours.includes("5–8") || weekly_hours.includes("5-8")) return 390;
  if (weekly_hours.includes("8–12") || weekly_hours.includes("8-12")) return 570;
  if (weekly_hours.includes("12–16") || weekly_hours.includes("12-16")) return 810;
  if (weekly_hours.includes("16+")) return 1080;
  return 300;
}

function skillScore(level: string | null | undefined): number {
  // 0 = beginner, 4 = expert
  if (!level) return 1;
  const l = level.toLowerCase();
  if (l.includes("can't") || l.includes("never") || l.includes("rarely")) return 0;
  if (l.includes("basic") || l.includes("casual") || l.includes("occasional")) return 1;
  if (l.includes("comfortable") || l.includes("regular")) return 2;
  if (l.includes("strong")) return 3;
  if (l.includes("ex-") || l.includes("competitive") || l.includes("racer") || l.includes("very")) return 4;
  return 1;
}

function fitnessScore(fitness_level: string | null | undefined): number {
  if (!fitness_level) return 1;
  const l = fitness_level.toLowerCase();
  if (l.includes("beginner")) return 0;
  if (l.includes("some")) return 1;
  if (l.includes("intermediate")) return 2;
  if (l.includes("advanced")) return 3;
  if (l.includes("competitive")) return 4;
  return 1;
}

function intensityForScore(score: number, isHighDay: boolean): Intensity {
  if (!isHighDay) return score <= 1 ? "Z1" : "Z2";
  if (score <= 1) return "Z2";
  if (score <= 2) return "Z3";
  return "threshold";
}

function sessionLabel(discipline: Discipline, intensity: Intensity): string {
  const intensityLabels: Record<Intensity, string> = {
    Z1: "Easy",
    Z2: "Steady",
    Z3: "Moderate",
    threshold: "Threshold",
    vo2max: "VO2 Max",
  };
  const disciplineLabels: Record<Discipline, string> = {
    swim: "Swim",
    bike: "Bike",
    run: "Run",
    rest: "Rest",
    brick: "Brick",
  };
  if (discipline === "rest") return "Rest Day";
  return `${intensityLabels[intensity]} ${disciplineLabels[discipline]}`;
}

function sessionDescription(discipline: Discipline, intensity: Intensity, durationMin: number): string {
  const dur = `${durationMin} min`;
  if (discipline === "rest") return "Full recovery — sleep, stretch, and eat well.";
  if (discipline === "brick") {
    return `${dur} bike followed immediately by a 15-min run. Focus on the leg transition.`;
  }
  const descriptions: Record<Intensity, Record<Discipline, string>> = {
    Z1: {
      swim: `${dur} easy swim at conversational pace. Focus on technique and long strokes.`,
      bike: `${dur} easy spin, flat roads or low resistance. Heart rate below 70% max.`,
      run: `${dur} easy jog — you should be able to hold a conversation throughout.`,
      rest: "",
      brick: "",
    },
    Z2: {
      swim: `${dur} steady swim. Breathing controlled, pace sustainable for the full session.`,
      bike: `${dur} aerobic ride. Maintain a comfortable effort, cadence 85–95 rpm.`,
      run: `${dur} aerobic run. Comfortable but purposeful pace, nose-breathing if possible.`,
      rest: "",
      brick: "",
    },
    Z3: {
      swim: `${dur} moderate swim — slightly harder than comfortable. Include 4×100m at tempo pace.`,
      bike: `${dur} moderate ride. Include 2×10 min at a pace you could hold for 1 hour.`,
      run: `${dur} run with 3×8 min at half-marathon effort. Jog recovery between reps.`,
      rest: "",
      brick: "",
    },
    threshold: {
      swim: `${dur} threshold swim — 6×200m at hard but sustainable pace, 30 s rest.`,
      bike: `${dur} threshold ride — 2×15 min at 10 km TT effort, 5 min easy between.`,
      run: `${dur} threshold run — 3×10 min at 10 km race pace, 3 min jog recovery.`,
      rest: "",
      brick: "",
    },
    vo2max: {
      swim: `${dur} VO2 max swim — 10×50m at near-max effort, 20 s rest.`,
      bike: `${dur} VO2 max bike — 5×3 min all-out, 3 min easy between.`,
      run: `${dur} VO2 max run — 6×1 min hard, 1 min easy. Finish with easy jog.`,
      rest: "",
      brick: "",
    },
  };
  return descriptions[intensity][discipline] || `${dur} ${discipline} at ${intensity} intensity.`;
}

// ─── plan builder ─────────────────────────────────────────────────────────────

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function generatePlan(profile: Profile): WeekPlan {
  const weeksToRace = getWeeksToRace(profile.race_timeframe);
  const phase = getTrainingPhase(weeksToRace);

  // Phase-based volume multiplier
  const volumeMultiplier: Record<TrainingPhase, number> = {
    base: 0.85, build: 1.0, peak: 1.0, taper: 0.5,
  };

  const totalMin = Math.round(parseWeeklyMinutes(profile.weekly_hours) * volumeMultiplier[phase]);
  const fitness = fitnessScore(profile.fitness_level);
  const swimScore = skillScore(profile.swim_level);
  const bikeScore = skillScore(profile.bike_level);
  const runScore = skillScore(profile.run_level);

  const goalRace = (profile.goal_race ?? "").toLowerCase();
  const isSwimFocused = goalRace.includes("ironman") || goalRace.includes("70.3") || goalRace.includes("swim");
  const isBikeFocused = goalRace.includes("ironman") || goalRace.includes("70.3") || goalRace.includes("cycle");
  const isGeneralFitness = goalRace.includes("general") || goalRace === "";

  // Polarised split: ~80% easy, ~20% quality
  // Typical Norwegian method week: 2 quality sessions, rest easy
  // We build a 7-slot schedule and assign sessions

  // Session time budget — roughly split by discipline priority
  const swimShare = isSwimFocused ? 0.28 : 0.22;
  const bikeShare = isBikeFocused ? 0.42 : 0.38;
  const runShare = 1 - swimShare - bikeShare;

  const swimMin = Math.round(totalMin * swimShare);
  const bikeMin = Math.round(totalMin * bikeShare);
  const runMin = Math.round(totalMin * runShare);

  // For lower volume (<5h) use 5 sessions; for higher use 6
  const sessionCount = totalMin <= 300 ? 5 : totalMin <= 570 ? 6 : 7;
  const restCount = 7 - sessionCount;

  // Build session list
  type RawSession = { discipline: Discipline; durationMin: number; isHighDay: boolean };
  const raw: RawSession[] = [];

  if (isGeneralFitness) {
    // Balanced 3-sport approach
    raw.push({ discipline: "swim", durationMin: Math.min(swimMin, 60), isHighDay: false });
    raw.push({ discipline: "bike", durationMin: Math.min(bikeMin, 90), isHighDay: false });
    raw.push({ discipline: "run", durationMin: Math.min(runMin, 60), isHighDay: false });
    if (sessionCount >= 5) raw.push({ discipline: "swim", durationMin: Math.min(swimMin, 45), isHighDay: true });
    if (sessionCount >= 6) raw.push({ discipline: "run", durationMin: Math.min(runMin, 45), isHighDay: true });
    if (sessionCount >= 7) raw.push({ discipline: "bike", durationMin: Math.min(bikeMin, 75), isHighDay: true });
  } else {
    // Race-specific — one quality swim, two quality bike/run, rest easy
    raw.push({ discipline: "swim", durationMin: Math.round(swimMin * 0.55), isHighDay: false });
    raw.push({ discipline: "swim", durationMin: Math.round(swimMin * 0.45), isHighDay: true });
    raw.push({ discipline: "bike", durationMin: Math.round(bikeMin * 0.55), isHighDay: false });
    raw.push({ discipline: "bike", durationMin: Math.round(bikeMin * 0.45), isHighDay: true });
    raw.push({ discipline: "run", durationMin: Math.round(runMin * 0.5), isHighDay: false });
    if (sessionCount >= 6) raw.push({ discipline: "run", durationMin: Math.round(runMin * 0.3), isHighDay: true });
    if (sessionCount >= 7) raw.push({ discipline: "brick", durationMin: Math.round(bikeMin * 0.25) + 15, isHighDay: false });
  }

  // Pad / trim to sessionCount
  while (raw.length > sessionCount) raw.pop();
  while (raw.length < sessionCount) {
    raw.push({ discipline: "run", durationMin: 30, isHighDay: false });
  }

  // Build full sessions
  const sessions: Session[] = raw.map(({ discipline, durationMin, isHighDay }, idx) => {
    if (discipline === "rest") {
      return { discipline: "rest", intensity: "Z1", durationMin: 0, label: "Rest Day", description: "Full recovery — sleep, stretch, and eat well." };
    }
    const score = discipline === "swim" ? swimScore : discipline === "bike" ? bikeScore : discipline === "run" || discipline === "brick" ? runScore : fitness;
    let intensity = intensityForScore(score, isHighDay);
    // Bump beginners to Z1 on easy days
    if (fitness === 0 && !isHighDay) intensity = "Z1";

    // Phase modifiers
    if (phase === "taper") {
      // Keep one quality session, rest easy
      const qualityCount = sessions.filter(s => s.intensity === "threshold" || s.intensity === "vo2max").length;
      if ((intensity === "threshold" || intensity === "vo2max") && qualityCount >= 1) intensity = "Z2";
    }
    if (phase === "base") {
      // No vo2max in base — cap at threshold
      if (intensity === "vo2max") intensity = "threshold";
    }
    if (phase === "build" && idx === 0) {
      // Make first quality session in build phase threshold if score allows
      if (score >= 2 && intensity === "Z3") intensity = "threshold";
    }

    const finalIntensity: Intensity = intensity;
    const dur = Math.max(20, durationMin);
    return {
      discipline,
      intensity: finalIntensity,
      durationMin: dur,
      label: sessionLabel(discipline, finalIntensity),
      description: sessionDescription(discipline, finalIntensity, dur),
    };
  });

  // Build rest day slots
  const restSession: Session = {
    discipline: "rest",
    intensity: "Z1",
    durationMin: 0,
    label: "Rest Day",
    description: "Full recovery — sleep, stretch, and eat well.",
  };

  // Distribute: place hard sessions (threshold/Z3) on non-adjacent days
  // Simple fixed template based on session count
  const templates: Record<number, number[]> = {
    5: [0, 2, 3, 4, 6],    // Mon, Wed, Thu, Fri, Sun
    6: [0, 1, 3, 4, 5, 6], // Mon, Tue, Thu, Fri, Sat, Sun
    7: [0, 1, 2, 3, 4, 5, 6],
  };
  const trainingDayIndices = templates[Math.min(sessionCount, 7)] ?? templates[5];

  const week: WeekPlan = DAYS.map((day, i) => {
    if (!trainingDayIndices.includes(i)) {
      return { day, sessions: [restSession] };
    }
    const sessionIdx = trainingDayIndices.indexOf(i);
    return {
      day,
      sessions: [sessions[sessionIdx] ?? restSession],
    };
  });

  // Ensure at least restCount rest days
  let currentRest = week.filter(d => d.sessions[0].discipline === "rest").length;
  if (currentRest < restCount) {
    // Find easy days to convert to rest (prefer middle of week)
    for (let i = 0; i < week.length && currentRest < restCount; i++) {
      const d = week[i];
      if (d.sessions[0].intensity === "Z1" && d.sessions[0].discipline !== "rest") {
        week[i] = { day: d.day, sessions: [restSession] };
        currentRest++;
      }
    }
  }

  return week;
}

export const INTENSITY_COLORS: Record<Intensity, string> = {
  Z1: "#ACC196",   // soft green — easy
  Z2: "#799496",   // slate — steady
  Z3: "#49475B",   // dark slate — moderate
  threshold: "#E9EB9E", // yellow — hard
  vo2max: "#14080E",    // near black — max
};

export const INTENSITY_LABELS: Record<Intensity, string> = {
  Z1: "Easy",
  Z2: "Steady",
  Z3: "Moderate",
  threshold: "Threshold",
  vo2max: "VO2 Max",
};

export const DISCIPLINE_ICONS: Record<Discipline, string> = {
  swim: "🏊",
  bike: "🚴",
  run: "🏃",
  rest: "😴",
  brick: "🔁",
};
