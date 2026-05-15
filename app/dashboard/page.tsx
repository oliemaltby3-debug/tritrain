"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  generatePlan,
  type WeekPlan,
  type Session,
  type Intensity,
  type TrainingPhase,
  type SkipReasonId,
  DISCIPLINE_ICONS,
  SKIP_REASONS,
  getWeeksToRace,
  getTrainingPhase,
  PHASE_LABELS,
  PHASE_DESCRIPTIONS,
} from "@/lib/generatePlan";

type Profile = Record<string, string | null>;

// ─── Zone data ────────────────────────────────────────────────────────────────

const ZONE_INFO: Record<Intensity, {
  name: string; hrRange: string; rpe: string;
  adaptation: string; color: string; textDark: boolean;
}> = {
  Z1:        { name: "Z1 — Recovery",      hrRange: "< 65% HRmax",  rpe: "RPE 1–2",  adaptation: "Fat oxidation · active recovery",          color: "#ACC196", textDark: true  },
  Z2:        { name: "Z2 — Aerobic Base",  hrRange: "65–75% HRmax", rpe: "RPE 3–4",  adaptation: "Mitochondrial density · aerobic efficiency", color: "#799496", textDark: false },
  Z3:        { name: "Z3 — Aerobic Power", hrRange: "75–82% HRmax", rpe: "RPE 5–6",  adaptation: "Glycogen efficiency · aerobic power",         color: "#49475B", textDark: false },
  threshold: { name: "Threshold",          hrRange: "82–92% HRmax", rpe: "RPE 7–8",  adaptation: "Lactate clearance · race pace",               color: "#E9EB9E", textDark: true  },
  vo2max:    { name: "VO₂ Max",            hrRange: "> 92% HRmax",  rpe: "RPE 9–10", adaptation: "Cardiac output · VO₂max ceiling",            color: "#14080E", textDark: false },
};

const DISCIPLINE_ACCENT: Record<string, string> = {
  swim: "#799496", bike: "#ACC196", run: "#E9EB9E", brick: "#49475B", rest: "transparent",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMondayISO(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0];
}

function getWeekDateRange(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

// ─── Session detail generator ─────────────────────────────────────────────────

function getSessionDetail(session: Session, phase: TrainingPhase) {
  const { discipline, intensity, durationMin } = session;
  const mainMin = Math.round(durationMin * 0.6);

  // Why this session
  const phaseContext: Record<TrainingPhase, string> = {
    base:  "You're in your **base phase** — the foundation of everything that follows. Research by Stephen Seiler shows that 80% of training volume at genuinely low intensity produces superior long-term adaptation compared to moderate-intensity approaches. This session builds your aerobic engine.",
    build: "You're in your **build phase** — converting aerobic base into race-specific fitness. Your mitochondrial density is growing; now it's time to add targeted stress at lactate threshold to push your sustainable pace higher.",
    peak:  "You're in your **peak phase** — {weeksToRace} weeks from race day. Sessions are deliberate and race-specific. This is where final fitness gains are made before you back off into taper.",
    taper: "You're **tapering**. Volume drops 40–50% but intensity is maintained — this is critical. Your body is completing its supercompensation cycle. The work is done; this session keeps you sharp without adding fatigue.",
  };

  const zoneRationale: Record<Intensity, string> = {
    Z1:        "Easy sessions at Z1 feel almost too slow — that's correct. The adaptation happens at the cellular level regardless of pace. You're building mitochondrial density and training fat oxidation without taxing your central nervous system.",
    Z2:        "Zone 2 is the backbone of endurance performance. At 65–75% of max heart rate, you maximise mitochondrial adaptations. Elite Norwegian athletes perform the majority of their volume here — it's not a warm-up zone, it's the training zone.",
    Z3:        "Zone 3 is used sparingly in the Norwegian model — it's fatiguing without the high-end benefit of threshold work. This session is included deliberately to build aerobic power.",
    threshold: "Threshold work targets the precise intensity where lactate production and clearance are in balance. The Norwegian double-threshold model trains this zone at slightly below true maximum lactate steady state, allowing higher-quality sessions with faster recovery.",
    vo2max:    "VO₂ max intervals increase your ceiling — the maximum rate at which your body can consume oxygen. Short, very hard intervals followed by equal recovery. This is where you raise the roof on what's possible.",
  };

  // Benefits
  const benefits: Record<Intensity, string[]> = {
    Z1:        ["Active recovery — increases blood flow without adding training stress", "Teaches fat oxidation — the primary fuel source for long-distance racing", "Protects CNS recovery between harder sessions"],
    Z2:        ["Increases mitochondrial density — #1 predictor of endurance performance", "Improves aerobic efficiency and movement economy", "Builds the aerobic base your race-day pace runs on"],
    Z3:        ["Bridges aerobic base and threshold intensity", "Improves sustained aerobic power output", "Increases lactate clearance at moderate intensities"],
    threshold: ["Raises your lactate threshold — the fastest pace you can sustain", "Teaches the body to buffer and clear lactic acid more efficiently", "Improves your ability to hold race pace for prolonged periods"],
    vo2max:    ["Elevates your VO₂max ceiling", "Improves cardiac output and stroke volume", "Makes threshold pace feel comparatively easier"],
  };

  // Session structure
  type Structure = { warmup: string; mainSet: string; cooldown: string };
  const structures: Partial<Record<string, Structure>> = {
    "swim-Z1":        { warmup: "200m easy freestyle — focus on long strokes and bilateral breathing.", mainSet: `${mainMin} min continuous swimming at truly easy effort. Aim for consistent stroke rate and full extension on each pull.`, cooldown: "100–200m easy backstroke or gentle kick." },
    "swim-Z2":        { warmup: "300m easy + 4×25m catch-up drill with 15s rest.", mainSet: `CSS sets: ${mainMin} min at steady aerobic pace — breathing every 3 strokes, controlled turnover. Splits should be consistent throughout.`, cooldown: "200m easy pull with buoy." },
    "swim-Z3":        { warmup: "400m easy + 4×50m build to effort.", mainSet: "4×100m at moderate-hard effort, 20s rest. Pace should feel like you could hold it for 10–15 min but no more.", cooldown: "200m easy." },
    "swim-threshold": { warmup: "400m easy + 6×25m build, 15s rest.", mainSet: "6×200m at critical swim speed (CSS) — the pace you'd hold for a 1500m time trial. 20s rest between. Maintain even splits; slow down if needed rather than blow up.", cooldown: "300m easy pull." },
    "swim-vo2max":    { warmup: "400m easy + 4×50m build.", mainSet: "10×50m near-maximal effort, 20s rest. Each rep should feel very hard. Maintain stroke quality even at max effort.", cooldown: "200m easy." },
    "bike-Z1":        { warmup: "5 min easy spin, flat resistance.", mainSet: `${mainMin} min at very easy effort, cadence 85–95 rpm. Heart rate below 65% max. Flat route or low resistance.`, cooldown: "5 min easy spin." },
    "bike-Z2":        { warmup: "10 min easy spin + 3×1 min at 80% with 1 min easy.", mainSet: `${mainMin} min at aerobic effort — cadence 90+ rpm, heart rate 65–75% max. You should be able to hold a conversation throughout.`, cooldown: "10 min easy spin." },
    "bike-Z3":        { warmup: "15 min easy + 3×1 min at 85% with 1 min easy.", mainSet: `2×${Math.round(mainMin / 2)} min at moderately hard effort. RPE 5–6 — breathing hard but sustainable.`, cooldown: "10 min easy spin." },
    "bike-threshold": { warmup: "15 min easy + 3×1 min hard with 1 min easy.", mainSet: "2×15 min at 10km TT effort (RPE 7–8), 5 min easy between. Even power output throughout — don't start too hard.", cooldown: "10 min easy spin." },
    "bike-vo2max":    { warmup: "20 min easy + 5×30s hard with 30s easy.", mainSet: "5×3 min near-maximal effort (RPE 9), 3 min easy between. You should be breathing very hard but maintaining form.", cooldown: "15 min easy." },
    "run-Z1":         { warmup: "3 min walk to ease in.", mainSet: `${mainMin} min at genuinely easy pace. If wearing a HR monitor, stay below 65% max. You should be able to speak in full sentences — slower than you think.`, cooldown: "3 min walk + stretching." },
    "run-Z2":         { warmup: "5 min easy jog.", mainSet: `${mainMin} min at aerobic pace — heart rate 65–75% max, conversational but purposeful. This pace feels almost too easy. That's correct.`, cooldown: "5 min easy jog + hip flexor stretch." },
    "run-Z3":         { warmup: "10 min easy + 4×20s strides.", mainSet: `3×${Math.round(mainMin / 3)} min at half-marathon effort, 2 min jog recovery. Comfortably uncomfortable.`, cooldown: "5 min easy + stretching." },
    "run-threshold":  { warmup: "10 min easy jog + 4×20s strides with 40s walk.", mainSet: "3×10 min at 10km race pace (RPE 7–8), 3 min jog recovery between. Consistent splits — if you go too hard on rep 1, reps 2 and 3 will suffer.", cooldown: "5–10 min easy jog." },
    "run-vo2max":     { warmup: "15 min easy + 4×20s strides.", mainSet: "6×3 min near-maximal effort (RPE 9), 3 min easy jog recovery. Breathing very hard — you should not be able to speak. Maintain good form.", cooldown: "10 min easy jog." },
    "brick-Z2":       { warmup: "5 min easy bike spin.", mainSet: `${Math.round(durationMin * 0.75)} min aerobic bike at Z2 effort, then immediately transition to a ${Math.round(durationMin * 0.25)} min run. Begin running the moment your shoes are on — don't stop. The first 3–5 min will feel awful; push through. This is what the race will feel like.`, cooldown: "5 min walk." },
  };

  const key = `${discipline}-${intensity}`;
  const defaultStructure: Structure = {
    warmup:  "5–10 min easy to warm up the body.",
    mainSet: session.description,
    cooldown: "5 min easy + stretching.",
  };

  return {
    why: phaseContext[phase],
    zoneRationale: zoneRationale[intensity],
    benefits: benefits[intensity],
    structure: structures[key] ?? defaultStructure,
  };
}

// ─── Session modal ─────────────────────────────────────────────────────────────

function SessionModal({
  day,
  session,
  phase,
  onClose,
  onMarkDone,
  onSkip,
}: {
  day: string;
  session: Session;
  phase: TrainingPhase;
  onClose: () => void;
  onMarkDone: () => void;
  onSkip: (reason: SkipReasonId) => void;
}) {
  const [showReasons, setShowReasons] = useState(false);
  const accent = DISCIPLINE_ACCENT[session.discipline] ?? "#e5e7eb";
  const zoneInfo = ZONE_INFO[session.intensity];
  const detail = getSessionDetail(session, phase);
  const status = session.status ?? "pending";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
      style={{ backgroundColor: "rgba(20,8,14,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full md:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-3xl"
        style={{ backgroundColor: "#fff" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Colour strip */}
        <div style={{ height: 4, backgroundColor: accent, borderRadius: "1.5rem 1.5rem 0 0" }} />

        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: "#9ca3af" }}>
                {day}
              </p>
              <div className="flex items-center gap-3">
                <span
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${accent}22` }}
                >
                  {DISCIPLINE_ICONS[session.discipline]}
                </span>
                <h2 className="text-xl font-bold" style={{ color: "#14080E" }}>{session.label}</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-gray-500 transition-colors text-xl leading-none mt-1"
            >
              ✕
            </button>
          </div>

          {/* Zone + RPE badges */}
          <div className="flex flex-wrap gap-2 mb-5">
            <span
              className="text-xs px-3 py-1 rounded-full font-mono font-semibold"
              style={{ backgroundColor: zoneInfo.color, color: zoneInfo.textDark ? "#14080E" : "#f9f8f6" }}
            >
              {zoneInfo.name}
            </span>
            <span className="text-xs px-3 py-1 rounded-full font-mono bg-gray-100 text-gray-500">
              {zoneInfo.rpe}
            </span>
            <span className="text-xs px-3 py-1 rounded-full font-mono bg-gray-100 text-gray-500">
              {zoneInfo.hrRange}
            </span>
            <span className="text-xs px-3 py-1 rounded-full font-mono bg-gray-100 text-gray-500">
              {session.durationMin} min
            </span>
          </div>

          <div className="space-y-5">
            {/* Why this session */}
            <section>
              <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: "#9ca3af" }}>
                Why this session
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "#49475B" }}>
                {detail.why.replace(/\*\*(.*?)\*\*/g, "$1")}
              </p>
            </section>

            {/* Zone rationale */}
            <section>
              <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: "#9ca3af" }}>
                {zoneInfo.name} — what it does
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "#49475B" }}>
                {detail.zoneRationale}
              </p>
            </section>

            {/* Benefits */}
            <section>
              <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: "#9ca3af" }}>
                Key adaptations
              </p>
              <ul className="space-y-2">
                {detail.benefits.map((b, i) => (
                  <li key={i} className="flex gap-2.5 text-sm" style={{ color: "#49475B" }}>
                    <span style={{ color: accent, flexShrink: 0 }}>→</span>
                    {b}
                  </li>
                ))}
              </ul>
            </section>

            {/* Session structure */}
            <section>
              <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>
                Session structure
              </p>
              <div className="space-y-3">
                {[
                  { label: "Warm-up", text: detail.structure.warmup, dot: "#ACC196" },
                  { label: "Main set", text: detail.structure.mainSet, dot: accent },
                  { label: "Cool-down", text: detail.structure.cooldown, dot: "#799496" },
                ].map(({ label, text, dot }) => (
                  <div key={label} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: dot }} />
                      <div className="w-px flex-1 mt-1" style={{ backgroundColor: "#f0f0ee" }} />
                    </div>
                    <div className="pb-3">
                      <p className="text-xs font-mono font-semibold mb-0.5" style={{ color: "#14080E" }}>{label}</p>
                      <p className="text-xs leading-relaxed" style={{ color: "#6b7280" }}>{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Physiological focus */}
            <div
              className="rounded-xl px-4 py-3 text-xs font-mono italic"
              style={{ backgroundColor: "#f9f8f6", color: "#799496" }}
            >
              ↑ Primary adaptation: {zoneInfo.adaptation}
            </div>
          </div>

          {/* Action buttons */}
          {status === "pending" && (
            <div className="mt-6 pt-5 border-t border-gray-100">
              {!showReasons ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => { onMarkDone(); onClose(); }}
                    className="flex-1 py-3 rounded-2xl font-mono font-semibold text-sm transition-all hover:opacity-90"
                    style={{ backgroundColor: "#ACC196", color: "#14080E" }}
                  >
                    ✓ Log session
                  </button>
                  <button
                    onClick={() => setShowReasons(true)}
                    className="flex-1 py-3 rounded-2xl font-mono text-sm border transition-all hover:border-gray-400"
                    style={{ borderColor: "#e5e7eb", color: "#9ca3af" }}
                  >
                    Skip
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-mono mb-2" style={{ color: "#9ca3af" }}>Reason for skipping:</p>
                  {SKIP_REASONS.map(r => (
                    <button
                      key={r.id}
                      onClick={() => { onSkip(r.id); onClose(); }}
                      className="w-full text-left text-sm py-2.5 px-4 rounded-xl border font-mono transition-all hover:border-gray-300 hover:bg-gray-50"
                      style={{ borderColor: "#f3f4f6", color: "#6b7280" }}
                    >
                      {r.emoji} {r.label}
                    </button>
                  ))}
                  <button onClick={() => setShowReasons(false)} className="text-xs font-mono text-gray-300 mt-1">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {status === "done" && (
            <div
              className="mt-6 py-3 rounded-2xl text-center font-mono text-sm font-semibold"
              style={{ backgroundColor: "#ACC196", color: "#14080E" }}
            >
              ✓ Session logged
            </div>
          )}

          {status === "skipped" && (
            <div className="mt-6 py-3 rounded-2xl text-center font-mono text-sm bg-gray-100 text-gray-400">
              Session skipped — {SKIP_REASONS.find(r => r.id === session.skipReason)?.label ?? "skipped"}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Minimal day card ─────────────────────────────────────────────────────────

function DayCard({
  day,
  sessions,
  index,
  onClick,
}: {
  day: string;
  sessions: Session[];
  index: number;
  onClick: () => void;
}) {
  const session = sessions[0];
  const isRest = session.discipline === "rest";
  const status = session.status ?? "pending";
  const accent = DISCIPLINE_ACCENT[session.discipline] ?? "transparent";
  const zoneInfo = isRest ? null : ZONE_INFO[session.intensity];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: status === "skipped" ? 0.45 : 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.04 * index }}
      onClick={isRest ? undefined : onClick}
      className={`rounded-2xl overflow-hidden flex flex-col ${!isRest ? "cursor-pointer group" : ""}`}
      style={{
        backgroundColor: "#fff",
        boxShadow: "0 1px 3px rgba(20,8,14,0.06), 0 4px 12px rgba(20,8,14,0.04)",
      }}
      whileHover={!isRest ? { y: -2, boxShadow: "0 4px 12px rgba(20,8,14,0.1), 0 12px 28px rgba(20,8,14,0.08)" } : undefined}
    >
      {/* Top strip */}
      {!isRest && <div style={{ height: 3, backgroundColor: accent }} />}

      <div className="p-4 flex flex-col gap-2.5 flex-1">
        {/* Day + status */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "#9ca3af" }}>{day}</p>
          {status === "done" && (
            <span className="text-xs font-mono px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#ACC196", color: "#14080E" }}>✓</span>
          )}
          {status === "skipped" && (
            <span className="text-xs font-mono px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">—</span>
          )}
        </div>

        {isRest ? (
          <div className="flex-1 flex items-center gap-2 py-2">
            <span className="text-lg">😴</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#d1d5db" }}>Rest Day</p>
              <p className="text-xs font-mono" style={{ color: "#e5e7eb" }}>Supercompensation</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-lg">{DISCIPLINE_ICONS[session.discipline]}</span>
              <p
                className={`text-sm font-semibold leading-snug ${status === "skipped" ? "line-through text-gray-300" : ""}`}
                style={{ color: status === "skipped" ? undefined : "#14080E" }}
              >
                {session.label}
              </p>
            </div>

            {zoneInfo && status !== "skipped" && (
              <span
                className="self-start text-xs px-2 py-0.5 rounded-md font-mono"
                style={{ backgroundColor: zoneInfo.color, color: zoneInfo.textDark ? "#14080E" : "#f9f8f6" }}
              >
                {zoneInfo.name}
              </span>
            )}

            <div className="flex items-center justify-between mt-auto pt-1">
              <p className="text-xs font-mono" style={{ color: "#9ca3af" }}>
                {session.durationMin} min
              </p>
              {status === "pending" && (
                <p className="text-xs font-mono text-gray-300 group-hover:text-gray-400 transition-colors">
                  tap to open →
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroBanner({ firstName, plan, phase, weeksToRace }: {
  firstName: string | null;
  plan: WeekPlan | null;
  phase: TrainingPhase;
  weeksToRace: number | null;
}) {
  if (!plan) return null;
  const trainingSessions = plan.flatMap(d => d.sessions).filter(s => s.discipline !== "rest");
  const totalMin = trainingSessions.reduce((a, s) => a + s.durationMin, 0);
  const doneCount = trainingSessions.filter(s => s.status === "done").length;
  const totalCount = trainingSessions.length;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl p-8 mb-8 relative overflow-hidden"
      style={{ backgroundColor: "#14080E" }}
    >
      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #ACC196 0%, transparent 60%), radial-gradient(circle at 10% 80%, #799496 0%, transparent 50%)" }} />
      <div className="relative z-10">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: "#49475B" }}>
              {getWeekDateRange()}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {firstName ? `Week plan — ${firstName}.` : "Weekly training plan."}
            </h1>
          </div>
          {/* Phase chip */}
          <div className="rounded-2xl px-4 py-2 text-right" style={{ backgroundColor: "#1e1219" }}>
            <p className="text-xs font-mono uppercase tracking-widest mb-0.5" style={{ color: "#49475B" }}>Current phase</p>
            <p className="text-sm font-bold" style={{ color: "#ACC196" }}>{PHASE_LABELS[phase]}</p>
            {weeksToRace !== null && (
              <p className="text-xs font-mono mt-0.5" style={{ color: "#49475B" }}>
                {weeksToRace === 0 ? "Race week!" : `${weeksToRace}w to race`}
              </p>
            )}
          </div>
        </div>

        {/* Phase description */}
        <p className="text-sm mb-5" style={{ color: "#49475B" }}>{PHASE_DESCRIPTIONS[phase]}</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            { label: "Volume", value: `${hours}h ${mins > 0 ? `${mins}m` : ""}`.trim() },
            { label: "Sessions", value: String(totalCount) },
            { label: "Completed", value: String(doneCount) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs font-mono uppercase tracking-wide mb-1" style={{ color: "#49475B" }}>{label}</p>
              <p className="text-xl font-bold text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between mb-1.5">
            <p className="text-xs font-mono" style={{ color: "#49475B" }}>week completion</p>
            <p className="text-xs font-mono font-bold" style={{ color: "#ACC196" }}>{pct}%</p>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "#1e1219" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="h-full rounded-full"
              style={{ backgroundColor: "#ACC196" }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Intensity distribution ───────────────────────────────────────────────────

function IntensityBar({ plan }: { plan: WeekPlan }) {
  const sessions = plan.flatMap(d => d.sessions).filter(s => s.discipline !== "rest");
  const totalMin = sessions.reduce((a, s) => a + s.durationMin, 0);
  if (totalMin === 0) return null;
  const easyMin = sessions.filter(s => s.intensity === "Z1" || s.intensity === "Z2").reduce((a, s) => a + s.durationMin, 0);
  const hardMin = sessions.filter(s => s.intensity === "threshold" || s.intensity === "vo2max").reduce((a, s) => a + s.durationMin, 0);
  const modMin = totalMin - easyMin - hardMin;
  const easyPct = Math.round((easyMin / totalMin) * 100);
  const modPct = Math.round((modMin / totalMin) * 100);
  const hardPct = Math.round((hardMin / totalMin) * 100);

  return (
    <div className="mb-6 rounded-2xl p-5" style={{ backgroundColor: "#fff", boxShadow: "0 1px 3px rgba(20,8,14,0.05)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "#9ca3af" }}>Intensity distribution</p>
        <p className="text-xs font-mono font-bold" style={{ color: "#ACC196" }}>{easyPct}% easy · {hardPct}% quality</p>
      </div>
      <div className="flex rounded-full overflow-hidden h-2 gap-0.5 mb-3">
        {easyPct > 0  && <div style={{ width: `${easyPct}%`,  backgroundColor: "#ACC196" }} />}
        {modPct > 0   && <div style={{ width: `${modPct}%`,   backgroundColor: "#49475B" }} />}
        {hardPct > 0  && <div style={{ width: `${hardPct}%`,  backgroundColor: "#E9EB9E" }} />}
      </div>
      <div className="flex gap-4">
        {[["#ACC196","Easy (Z1–Z2)"],["#49475B","Moderate (Z3)"],["#E9EB9E","Quality (T/V₂)"]].map(([c,l]) => (
          <div key={l} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
            <p className="text-xs font-mono" style={{ color: "#9ca3af" }}>{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Profile field options ────────────────────────────────────────────────────

const FIELD_CONFIG: Record<string, { label: string; options?: string[]; type?: "date" }> = {
  goal_race:    { label: "Goal race",   options: ["Sprint Triathlon","Olympic Triathlon","Half Ironman (70.3)","Full Ironman","Ultra (marathon, swim or cycle)","No race — general fitness"] },
  race_timeframe: { label: "Race date", type: "date" },
  weekly_hours: { label: "Weekly hours", options: ["Less than 5 hours","5–8 hours","8–12 hours","12–16 hours","16+ hours"] },
  fitness_level:{ label: "Fitness",    options: ["Complete beginner","Some experience","Intermediate","Advanced","Competitive"] },
  swim_level:   { label: "Swim",       options: ["Can't swim","Basic swimmer","Comfortable","Strong swimmer","Ex-swimmer / very strong"] },
  bike_level:   { label: "Bike",       options: ["Never cycle","Casual cyclist","Regular cyclist","Strong cyclist","Racer / very strong"] },
  run_level:    { label: "Run",        options: ["Rarely run","Occasional runner","Regular runner","Strong runner","Competitive runner"] },
};

// ─── Profile edit modal ───────────────────────────────────────────────────────

function ProfileEditModal({
  fieldKey,
  currentValue,
  onSave,
  onClose,
}: {
  fieldKey: string;
  currentValue: string | null;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const config = FIELD_CONFIG[fieldKey];
  const [dateValue, setDateValue] = useState(
    config.type === "date" && currentValue?.match(/^\d{4}-\d{2}-\d{2}$/) ? currentValue : ""
  );
  const today = new Date().toISOString().split("T")[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
      style={{ backgroundColor: "rgba(20,8,14,0.5)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full md:max-w-sm rounded-t-3xl md:rounded-3xl overflow-hidden"
        style={{ backgroundColor: "#fff" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <p className="text-base font-bold" style={{ color: "#14080E" }}>Edit {config.label}</p>
            <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors text-xl">✕</button>
          </div>

          {config.type === "date" ? (
            <div className="space-y-4">
              <input
                type="date"
                value={dateValue}
                min={today}
                onChange={e => setDateValue(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors"
                style={{ colorScheme: "light" }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => dateValue && onSave(dateValue)}
                  disabled={!dateValue}
                  className="flex-1 py-3 rounded-2xl text-sm font-mono font-semibold disabled:opacity-30 transition-opacity"
                  style={{ backgroundColor: "#14080E", color: "#fff" }}
                >
                  Save date
                </button>
                <button
                  onClick={() => onSave("no_date")}
                  className="px-4 py-3 rounded-2xl text-sm font-mono border border-gray-200 text-gray-400 hover:border-gray-400 transition-colors"
                >
                  No date
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {config.options?.map(opt => (
                <button
                  key={opt}
                  onClick={() => onSave(opt)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-mono border transition-all hover:border-black ${currentValue === opt ? "border-black bg-gray-50 font-semibold" : "border-gray-100"}`}
                  style={{ color: "#14080E" }}
                >
                  {currentValue === opt && <span className="mr-2" style={{ color: "#ACC196" }}>✓</span>}
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ day: string; session: Session } | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const router = useRouter();

  const phase: TrainingPhase = profile
    ? getTrainingPhase(getWeeksToRace(profile.race_timeframe))
    : "base";
  const weeksToRace = profile ? getWeeksToRace(profile.race_timeframe) : null;

  const savePlan = useCallback(async (weekPlan: WeekPlan, userId: string) => {
    const supabase = createClient();
    await supabase.from("week_plans").upsert(
      { user_id: userId, week_start: getMondayISO(), plan: weekPlan, updated_at: new Date().toISOString() },
      { onConflict: "user_id,week_start" }
    );
  }, []);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!profileData) { setLoading(false); return; }
      setProfile(profileData as Profile);

      const { data: existing } = await supabase
        .from("week_plans").select("plan")
        .eq("user_id", user.id).eq("week_start", getMondayISO()).single();

      if (existing?.plan) { setPlan(existing.plan as WeekPlan); setLoading(false); return; }

      const newPlan: WeekPlan = generatePlan(profileData as Profile).map(day => ({
        ...day,
        sessions: day.sessions.map(s => ({ ...s, status: s.status ?? "pending" as const })),
      }));
      setPlan(newPlan);
      setLoading(false);
      await savePlan(newPlan, user.id);
    };
    load();
  }, [router, savePlan]);

  const handleMarkDone = useCallback(async (dayIndex: number) => {
    if (!plan) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const updated = plan.map((d, i) =>
      i === dayIndex ? { ...d, sessions: d.sessions.map(s => ({ ...s, status: "done" as const })) } : d
    );
    setPlan(updated);
    await savePlan(updated, user.id);
  }, [plan, savePlan]);

  const handleSkip = useCallback(async (dayIndex: number, reason: SkipReasonId) => {
    if (!plan || !profile) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const updated = plan.map((d, i) =>
      i === dayIndex ? { ...d, sessions: d.sessions.map(s => ({ ...s, status: "skipped" as const, skipReason: reason })) } : d
    );
    setPlan(updated);
    await savePlan(updated, user.id);
  }, [plan, profile, savePlan]);

  const handleProfileUpdate = useCallback(async (fieldKey: string, value: string) => {
    if (!profile) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const savedValue = value === "no_date" ? null : value;
    const updatedProfile = { ...profile, [fieldKey]: savedValue };
    setProfile(updatedProfile);
    setEditingField(null);
    setRegenerating(true);

    // Save profile to Supabase
    await supabase.from("profiles").update({ [fieldKey]: savedValue }).eq("id", user.id);

    // Regenerate plan with new profile
    const newPlan: WeekPlan = generatePlan(updatedProfile as Profile).map(day => ({
      ...day,
      sessions: day.sessions.map(s => ({ ...s, status: "pending" as const })),
    }));
    setPlan(newPlan);
    await savePlan(newPlan, user.id);
    setRegenerating(false);
  }, [profile, savePlan]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f9f8f6" }}>
        <p className="text-sm font-mono" style={{ color: "#9ca3af" }}>loading plan...</p>
      </main>
    );
  }

  const firstName = (profile?.full_name ?? "").split(" ")[0] || null;
  const selectedIndex = plan?.findIndex(d => d.day === selectedDay?.day) ?? -1;

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#f9f8f6" }}>
      <nav className="flex items-center justify-between px-6 py-4 md:px-12" style={{ backgroundColor: "#f9f8f6", borderBottom: "1px solid rgba(20,8,14,0.06)" }}>
        <span className="text-base font-semibold tracking-tight" style={{ color: "#14080E" }}>the norwegian effect.</span>
        <div className="flex items-center gap-6 text-sm">
          <a href="/dashboard" className="font-medium font-mono" style={{ color: "#14080E" }}>my plan</a>
          <button onClick={handleLogout} className="font-mono transition-colors" style={{ color: "#9ca3af" }}
            onMouseOver={e => (e.currentTarget.style.color = "#14080E")}
            onMouseOut={e => (e.currentTarget.style.color = "#9ca3af")}>
            log out
          </button>
        </div>
      </nav>

      <div className="px-6 md:px-12 py-10 max-w-5xl mx-auto">
        <HeroBanner firstName={firstName} plan={plan} phase={phase} weeksToRace={weeksToRace} />

        {plan && <IntensityBar plan={plan} />}

        {plan ? (
          <div>
            <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: "#9ca3af" }}>
              Session breakdown · tap any session for full detail
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {plan.map(({ day, sessions }, i) => (
                <DayCard
                  key={day}
                  day={day}
                  sessions={sessions}
                  index={i}
                  onClick={() => setSelectedDay({ day, session: sessions[0] })}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm font-mono" style={{ color: "#9ca3af" }}>Complete your profile to generate a plan.</p>
        )}

        {/* Athlete profile */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "#9ca3af" }}>Athlete profile</p>
            <AnimatePresence>
              {regenerating && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-mono animate-pulse"
                  style={{ color: "#ACC196" }}
                >
                  ↻ updating plan…
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {([
              { key: "goal_race",     label: "Goal race",   value: profile?.goal_race },
              { key: "race_timeframe",label: "Race date",   value: profile?.race_timeframe ? (profile.race_timeframe === "no_date" ? "No date set" : (profile.race_timeframe?.match(/^\d{4}-\d{2}-\d{2}$/) ? new Date(profile.race_timeframe).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : profile.race_timeframe)) : "—" },
              { key: "weekly_hours",  label: "Weekly hrs",  value: profile?.weekly_hours },
              { key: "fitness_level", label: "Fitness",     value: profile?.fitness_level },
              { key: "swim_level",    label: "Swim",        value: profile?.swim_level },
              { key: "bike_level",    label: "Bike",        value: profile?.bike_level },
              { key: "run_level",     label: "Run",         value: profile?.run_level },
            ] as { key: string; label: string; value: string | null | undefined }[]).map(item => (
              <button
                key={item.key}
                onClick={() => setEditingField(item.key)}
                className="rounded-2xl p-4 text-left group relative transition-all hover:ring-1 hover:ring-gray-200"
                style={{ backgroundColor: "#fff", boxShadow: "0 1px 3px rgba(20,8,14,0.04)" }}
              >
                <p className="text-xs font-mono uppercase tracking-widest mb-1.5" style={{ color: "#9ca3af" }}>{item.label}</p>
                <p className="text-sm font-semibold" style={{ color: "#14080E" }}>{item.value ?? "—"}</p>
                <span className="absolute top-3 right-3 text-xs font-mono text-gray-200 group-hover:text-gray-400 transition-colors">
                  edit
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs font-mono mt-3" style={{ color: "#d1d5db" }}>
            Tap any field to edit — your plan regenerates instantly.
          </p>
        </motion.div>

        {/* Footnote */}
        <div className="mt-10 pt-6 border-t" style={{ borderColor: "rgba(20,8,14,0.06)" }}>
          <p className="text-xs font-mono leading-relaxed" style={{ color: "#9ca3af" }}>
            <span className="font-bold" style={{ color: "#49475B" }}>Methodology:</span>{" "}
            Plans follow Stephen Seiler&apos;s polarised training model (80/20 intensity distribution), the Norwegian double-threshold system, and Joe Friel&apos;s Training Bible periodisation. Phases adapt automatically to your race date — base → build → peak → taper.
          </p>
        </div>
      </div>

      {/* Profile edit modal */}
      <AnimatePresence>
        {editingField && (
          <ProfileEditModal
            fieldKey={editingField}
            currentValue={profile?.[editingField] ?? null}
            onSave={(value) => handleProfileUpdate(editingField, value)}
            onClose={() => setEditingField(null)}
          />
        )}
      </AnimatePresence>

      {/* Session modal */}
      <AnimatePresence>
        {selectedDay && (
          <SessionModal
            day={selectedDay.day}
            session={selectedDay.session}
            phase={phase}
            onClose={() => setSelectedDay(null)}
            onMarkDone={() => { if (selectedIndex >= 0) handleMarkDone(selectedIndex); }}
            onSkip={(reason) => { if (selectedIndex >= 0) handleSkip(selectedIndex, reason); }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
