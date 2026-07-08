import { NextResponse } from "next/server";
import { AiNotConfiguredError } from "@/lib/ai/client";

export function jsonError(err: unknown): NextResponse {
  if (err instanceof AiNotConfiguredError) {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }
  const message = err instanceof Error ? err.message : "Unexpected error";
  console.error("[api]", err);
  return NextResponse.json({ error: message }, { status: 500 });
}
