import { useEffect, useState } from "react";
import { getNextRecommendationRefreshDelay } from "@/lib/recommendations";

export function useRecommendationClock(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setTimeout(
      () => setNow(new Date()),
      getNextRecommendationRefreshDelay(now),
    );
    return () => window.clearTimeout(timer);
  }, [now]);

  return now;
}
