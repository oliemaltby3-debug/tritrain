"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  generatePlan,
  type WeekPlan,
  type Session,
  INTENSITY_COLORS,
  INTENSITY_LABELS,
  DISCIPLINE_ICONS,
} from "@/lib/generatePlan";

type Profile = Record<string, string | null>;

// ─── Intensity badge ──────────────────────────────────────────────────────────

function IntensityBadge({ session }: { session: Session }) {
  if (session.discipline === "rest") return null;
  const color = INTENSITY_COLORS[session.intensity];
  const label = INTENSITY_LABELS[session.intensity];
  const isDark = session.intensity === "vo2max";
  return (
    <span
      className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
      style={{
        backgroundColor: color,
        color: isDark ? "#E9EB9E" : "#14080E",
      }}
    >
      {label}
    </span>
  );
}

// ─── Day card ─────────────────────────────────────────────────────────────────

function DayCard({ day, sessions, index }: { day: string; sessions: Session[]; index: number }) {
  const session = sessions[0];
  const isRest = session.discipline === "rest";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 + index * 0.06 }}
      className="border border-gray-100 rounded-2xl p-5 flex flex-col gap-3"
      style={{ backgroundColor: isRest ? "#fafafa" : "#fff" }}
    >
      <p className="text-xs uppercase tracking-widest text-gray-400">{day}</p>

      {isRest ? (
        <div className="flex items-center gap-2 text-gray-300">
          <span className="text-xl">{DISCIPLINE_ICONS.rest}</span>
          <span className="text-sm font-medium">Rest</span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="text-xl">{DISCIPLINE_ICONS[session.discipline]}</span>
            <p className="text-sm font-semibold leading-tight">{session.label}</p>
          </div>
          <IntensityBadge session={session} />
          <p className="text-xs text-gray-400 leading-relaxed">{session.description}</p>
          <p className="text-xs font-medium" style={{ color: "#799496" }}>
            {session.durationMin} min
          </p>
        </>
      )}
    </motion.div>
  );
}

// ─── Week summary strip ───────────────────────────────────────────────────────

function WeekSummary({ plan }: { plan: WeekPlan }) {
  const trainingSessions = plan.flatMap(d => d.sessions).filter(s => s.discipline !== "rest");
  const totalMin = trainingSessions.reduce((acc, s) => acc + s.durationMin, 0);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;

  const disciplines = ["swim", "bike", "run"] as const;
  const counts = disciplines.map(d => ({
    label: d,
    count: trainingSessions.filter(s => s.discipline === d || s.discipline === "brick").length,
    icon: DISCIPLINE_ICONS[d],
  }));

  const qualitySessions = trainingSessions.filter(
    s => s.intensity === "threshold" || s.intensity === "vo2max" || s.intensity === "Z3"
  ).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
      {[
        { label: "Weekly volume", value: `${hours}h ${mins > 0 ? `${mins}m` : ""}`.trim() },
        ...counts.map(c => ({ label: `${c.icon} ${c.label} sessions`, value: String(c.count) })),
        { label: "Quality sessions", value: String(qualitySessions) },
      ].map(item => (
        <div key={item.label} className="border border-gray-100 rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">{item.label}</p>
          <p className="text-2xl font-bold">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data as Profile);
        setPlan(generatePlan(data as Profile));
      }

      setLoading(false);
    };

    load();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#fff" }}>
        <p className="text-gray-400 text-sm">Loading your plan...</p>
      </main>
    );
  }

  const firstName = (profile?.full_name ?? "").split(" ")[0] || null;

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#fff" }}>
      {/* Nav */}
      <nav
        className="flex items-center justify-between px-6 py-5 md:px-12 border-b border-gray-100"
      >
        <span className="text-lg font-semibold tracking-tight">the norwegian effect.</span>
        <div className="flex items-center gap-6 text-sm">
          <a href="/dashboard" className="text-black font-medium">
            My Plan
          </a>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-black transition-colors"
          >
            Log out
          </button>
        </div>
      </nav>

      <div className="px-6 md:px-12 py-14 max-w-5xl">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="mb-12"
        >
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#799496" }}>
            Your plan
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: "#14080E" }}>
            {firstName ? <>Here&apos;s this week, {firstName}.</> : "Your weekly training plan."}
          </h1>
          <p className="text-base font-light" style={{ color: "#49475B" }}>
            Built on the Norwegian Method — 80% easy aerobic work, 20% quality. Adapt to how you
            feel and never skip the easy days.
          </p>
        </motion.div>

        {/* Week summary */}
        {plan && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
          >
            <p className="text-xs uppercase tracking-widest mb-5" style={{ color: "#799496" }}>
              Week at a glance
            </p>
            <WeekSummary plan={plan} />
          </motion.div>
        )}

        {/* Day-by-day grid */}
        {plan ? (
          <div>
            <p className="text-xs uppercase tracking-widest mb-5" style={{ color: "#799496" }}>
              Day by day
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {plan.map(({ day, sessions }, i) => (
                <DayCard key={day} day={day} sessions={sessions} index={i} />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            Complete your profile to see your plan.
          </p>
        )}

        {/* Profile stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.5 }}
          className="mt-14"
        >
          <p className="text-xs uppercase tracking-widest mb-5" style={{ color: "#799496" }}>
            Your profile
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "Goal race", value: profile?.goal_race },
              { label: "Weekly hours", value: profile?.weekly_hours },
              { label: "Fitness level", value: profile?.fitness_level },
              { label: "Swim", value: profile?.swim_level },
              { label: "Bike", value: profile?.bike_level },
              { label: "Run", value: profile?.run_level },
            ].map(item => (
              <div key={item.label} className="border border-gray-100 rounded-2xl p-5">
                <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">
                  {item.label}
                </p>
                <p className="text-sm font-semibold" style={{ color: "#14080E" }}>
                  {item.value ?? "—"}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
