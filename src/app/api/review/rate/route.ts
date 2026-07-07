import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { schedule, type Rating } from "@/lib/srs";
import { jsonError } from "@/lib/api";

const RATINGS: Rating[] = ["again", "hard", "good", "easy"];

// Apply an Again/Hard/Good/Easy rating to a card. Quick hits and concepts
// both flow through here, so quick hits count toward progress.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { reviewStateId, rating } = await req.json();
    if (!RATINGS.includes(rating)) {
      return NextResponse.json({ error: "invalid rating" }, { status: 400 });
    }

    const state = await prisma.reviewState.findUniqueOrThrow({
      where: { id: reviewStateId },
    });
    if (state.userId !== user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const now = new Date();
    const next = schedule(
      {
        status: state.status,
        intervalDays: state.intervalDays,
        ease: state.ease,
        reps: state.reps,
        lapses: state.lapses,
      },
      rating,
      now,
    );

    const history = [
      ...((state.history as { at: string; rating: string }[]) ?? []),
      { at: now.toISOString(), rating },
    ].slice(-100);

    const updated = await prisma.reviewState.update({
      where: { id: state.id },
      data: {
        status: next.status,
        intervalDays: next.intervalDays,
        ease: next.ease,
        reps: next.reps,
        lapses: next.lapses,
        dueAt: next.dueAt,
        lastReviewedAt: now,
        history,
      },
    });
    return NextResponse.json({ state: updated });
  } catch (err) {
    return jsonError(err);
  }
}
