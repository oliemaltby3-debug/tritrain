"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

type Step =
  | { id: string; question: string; type?: "options"; options: string[] }
  | { id: string; question: string; type: "date"; subtitle: string };

const steps: Step[] = [
  {
    id: "goal",
    question: "What is your goal race?",
    options: [
      "Sprint Triathlon",
      "Olympic Triathlon",
      "Half Ironman (70.3)",
      "Full Ironman",
      "Ultra (marathon, swim or cycle)",
      "No race — general fitness",
    ],
  },
  {
    id: "timeframe",
    type: "date",
    question: "When is your race?",
    subtitle: "We'll build your plan around this date — including a proper taper.",
  },
  {
    id: "hours",
    question: "How many hours per week can you train?",
    options: ["Less than 5 hours", "5–8 hours", "8–12 hours", "12–16 hours", "16+ hours"],
  },
  {
    id: "level",
    question: "How would you describe your current fitness?",
    options: ["Complete beginner", "Some experience", "Intermediate", "Advanced", "Competitive"],
  },
  {
    id: "swim",
    question: "How confident are you in the water?",
    options: ["Can't swim", "Basic swimmer", "Comfortable", "Strong swimmer", "Ex-swimmer / very strong"],
  },
  {
    id: "bike",
    question: "How would you rate your cycling?",
    options: ["Never cycle", "Casual cyclist", "Regular cyclist", "Strong cyclist", "Racer / very strong"],
  },
  {
    id: "run",
    question: "How would you rate your running?",
    options: ["Rarely run", "Occasional runner", "Regular runner", "Strong runner", "Competitive runner"],
  },
];

// ─── Date step component ──────────────────────────────────────────────────────

function DateStep({
  subtitle,
  onConfirm,
}: {
  subtitle: string;
  onConfirm: (date: string) => void;
}) {
  const [date, setDate] = useState("");
  const today = new Date().toISOString().split("T")[0];

  // Calculate weeks away for preview
  const weeksAway = date
    ? Math.max(0, Math.round((new Date(date).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)))
    : null;

  const phase =
    weeksAway === null ? null
    : weeksAway <= 2 ? "Taper"
    : weeksAway <= 5 ? "Peak Phase"
    : weeksAway <= 14 ? "Build Phase"
    : "Base Phase";

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-400">{subtitle}</p>

      <input
        type="date"
        value={date}
        min={today}
        onChange={e => setDate(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-black transition-colors"
        style={{ colorScheme: "light" }}
      />

      {date && weeksAway !== null && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl px-5 py-4 border border-gray-100"
          style={{ backgroundColor: "#f9f8f6" }}
        >
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Race day preview</p>
          <p className="text-sm font-semibold" style={{ color: "#14080E" }}>
            {weeksAway === 0
              ? "Race day is this week!"
              : `${weeksAway} week${weeksAway !== 1 ? "s" : ""} to go`}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            You&apos;re currently in your{" "}
            <span className="font-semibold" style={{ color: "#799496" }}>{phase}</span>
            {weeksAway > 2 && " — we'll guide you through each phase to race day."}
            {weeksAway <= 2 && " — volume drops, intensity stays. You&apos;re almost there."}
          </p>
        </motion.div>
      )}

      <div className="flex gap-3">
        <motion.button
          onClick={() => date && onConfirm(date)}
          disabled={!date}
          className="flex-1 bg-black text-white py-4 rounded-full text-sm font-medium disabled:opacity-30 transition-opacity"
          whileHover={{ scale: date ? 1.02 : 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {date ? "Confirm race date →" : "Pick a date above"}
        </motion.button>
        <motion.button
          onClick={() => onConfirm("no_date")}
          className="px-5 py-4 rounded-full text-sm text-gray-400 border border-gray-200 hover:border-gray-400 transition-colors"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          No date yet
        </motion.button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [direction, setDirection] = useState(1);
  const router = useRouter();

  const handleAnswer = async (answer: string) => {
    const newAnswers = { ...answers, [steps[current].id]: answer };
    setAnswers(newAnswers);

    if (current < steps.length - 1) {
      setDirection(1);
      setCurrent(current + 1);
    } else {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("profiles").insert({
          id: user.id,
          full_name: user.user_metadata?.full_name,
          goal_race: newAnswers.goal,
          race_timeframe: newAnswers.timeframe === "no_date" ? null : newAnswers.timeframe,
          weekly_hours: newAnswers.hours,
          fitness_level: newAnswers.level,
          swim_level: newAnswers.swim,
          bike_level: newAnswers.bike,
          run_level: newAnswers.run,
        });
      }

      router.push("/dashboard");
    }
  };

  const handleBack = () => {
    if (current > 0) {
      setDirection(-1);
      setCurrent(current - 1);
    }
  };

  const variants = {
    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -60 : 60 }),
  };

  const step = steps[current];
  const progress = (current / steps.length) * 100;

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Progress bar */}
      <div className="w-full h-1 bg-gray-100">
        <motion.div
          className="h-1 bg-black"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-12">
            <Link href="/" className="text-sm font-semibold">the norwegian effect.</Link>
            <p className="text-sm text-gray-400">{current + 1} of {steps.length}</p>
          </div>

          {/* Question */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <h2 className="text-2xl md:text-3xl font-bold mb-8">{step.question}</h2>

              {step.type === "date" ? (
                <DateStep subtitle={step.subtitle} onConfirm={handleAnswer} />
              ) : (
                <div className="space-y-3">
                  {(step as { options: string[] }).options.map((option) => (
                    <motion.button
                      key={option}
                      onClick={() => handleAnswer(option)}
                      className="w-full text-left border border-gray-200 rounded-xl px-5 py-4 text-sm hover:border-black transition-colors"
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      {option}
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Back */}
          {current > 0 && step.type !== "date" && (
            <button
              onClick={handleBack}
              className="mt-8 text-sm text-gray-400 hover:text-black transition-colors"
            >
              ← Back
            </button>
          )}
          {current > 0 && step.type === "date" && (
            <button
              onClick={handleBack}
              className="mt-6 text-sm text-gray-400 hover:text-black transition-colors"
            >
              ← Back
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
