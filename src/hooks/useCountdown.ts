"use client";

import { useEffect, useState } from "react";

export function useCountdown(targetEpochSeconds: number | null) {
  const [remaining, setRemaining] = useState<number>(() =>
    targetEpochSeconds ? Math.max(0, targetEpochSeconds - Math.floor(Date.now() / 1000)) : 0
  );

  useEffect(() => {
    if (!targetEpochSeconds) return;
    const tick = () => {
      setRemaining(Math.max(0, targetEpochSeconds - Math.floor(Date.now() / 1000)));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [targetEpochSeconds]);

  return remaining;
}
