import { Suspense } from "react";
import { ReviewSession } from "@/components/review-session";

export const dynamic = "force-dynamic";

export default function ReviewSessionPage() {
  return (
    <Suspense>
      <ReviewSession />
    </Suspense>
  );
}
