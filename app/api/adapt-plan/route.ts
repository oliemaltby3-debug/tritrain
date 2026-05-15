import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { SKIP_REASONS } from "@/lib/generatePlan";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const ADAPT_SYSTEM_PROMPT = `You are an elite triathlon coach. An athlete has just had to skip or miss a training session and you need to adapt the rest of their week to keep their training on track.

Your adaptation principles:

**When no pool access:**
- Replace any remaining swim sessions with equivalent aerobic work in run or bike
- Do not add more swim later in the week — assume the constraint persists
- Maintain overall training stress by redistributing volume

**When travelling:**
- Replace sessions requiring equipment (pool, bike) with running or bodyweight work
- Keep sessions short and practical — travellers are time-pressed
- Maintain frequency but reduce duration

**When tired or fatigued:**
- Reduce intensity on all remaining sessions this week — move threshold → Z2, Z2 → Z1
- Consider adding a rest day if the athlete is significantly fatigued
- Prioritise recovery over training load

**When injured:**
- Identify the affected discipline from context and remove it for the rest of the week
- Replace with non-impact alternatives if appropriate (e.g. cycling instead of running for a leg injury)
- Do not push through — protecting health is the priority

**When too busy or just skipping:**
- Redistribute the missed training load across remaining sessions if realistic
- Or simply note that the week's volume is slightly reduced — don't overload remaining days

**General rules:**
- Never modify sessions already marked "done" or "skipped" — leave them exactly as they are
- Only adapt sessions with status "pending"
- Maintain the 80/20 polarised principle — don't add excessive intensity to compensate
- Return the full 7-day plan in the same JSON format
- Keep descriptions specific and actionable with effort cues

Return ONLY the raw JSON array (7 days). No markdown, no explanation. Start with [ and end with ].`;

export async function POST(request: NextRequest) {
  try {
    const { plan, profile, skippedDay, skipReasonId } = await request.json();

    const skipReasonLabel =
      SKIP_REASONS.find((r) => r.id === skipReasonId)?.label ?? skipReasonId;

    const pendingCount = plan.filter(
      (d: { sessions: Array<{ status?: string }> }) =>
        d.sessions[0]?.status === "pending" || !d.sessions[0]?.status
    ).length;

    if (pendingCount <= 1) {
      // Nothing meaningful left to adapt
      return NextResponse.json({ plan });
    }

    const userPrompt = `Athlete profile:
- Goal race: ${profile.goal_race ?? "General fitness"}
- Weekly hours: ${profile.weekly_hours ?? "5–8 hours"}
- Fitness level: ${profile.fitness_level ?? "Intermediate"}
- Swim: ${profile.swim_level ?? "Comfortable"} | Bike: ${profile.bike_level ?? "Regular"} | Run: ${profile.run_level ?? "Regular"}

The athlete has skipped their ${skippedDay} session. Reason: "${skipReasonLabel}".

Current week plan (with session statuses — "done", "skipped", or "pending"):
${JSON.stringify(plan, null, 2)}

Please adapt the remaining PENDING sessions to account for this. Sessions already marked "done" or "skipped" must remain exactly as they are.`;

    const stream = await client.messages.stream({
      model: "claude-opus-4-7",
      max_tokens: 2000,
      thinking: { type: "adaptive" },
      system: ADAPT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const message = await stream.finalMessage();

    const textBlock = message.content.find(
      (b: Anthropic.Messages.ContentBlock) => b.type === "text"
    );
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text content in Claude response");
    }

    const adaptedPlan = JSON.parse(textBlock.text.trim());

    if (!Array.isArray(adaptedPlan) || adaptedPlan.length !== 7) {
      throw new Error("Invalid adapted plan structure");
    }

    return NextResponse.json({ plan: adaptedPlan });
  } catch (err) {
    console.error("adapt-plan error:", err);
    return NextResponse.json(
      { error: "Failed to adapt plan" },
      { status: 500 }
    );
  }
}
