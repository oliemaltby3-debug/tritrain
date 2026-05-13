"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const steps = [
  {
    id: "goal",
    question: "What is your goal race?",
    options: ["Sprint Triathlon", "Olympic Triathlon", "Half Ironman (70.3)", "Full Ironman", "Ultra (marathon, swim or cycle)", "No race — general fitness"],
  },
  {
    id: "timeframe",
    question: "When is your race?",
    options: ["Less than 8 weeks", "8–16 weeks", "16–24 weeks", "More than 24 weeks", "No specific date"],
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
          race_timeframe: newAnswers.timeframe,
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
  const progress = ((current) / steps.length) * 100;

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
            <a href="/" className="text-sm font-semibold">the norwegian project.</a>
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
              <div className="space-y-3">
                {step.options.map((option) => (
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
            </motion.div>
          </AnimatePresence>

          {/* Back button */}
          {current > 0 && (
            <button
              onClick={handleBack}
              className="mt-8 text-sm text-gray-400 hover:text-black transition-colors"
            >
              ← Back
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
