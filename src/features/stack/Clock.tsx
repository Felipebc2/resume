"use client";

import { useEffect, useRef } from "react";

export function Clock({ timeZone }: { timeZone: string }) {
  const ref = useRef<HTMLTimeElement>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
    });
    const tick = () => {
      if (ref.current) ref.current.textContent = fmt.format(new Date());
    };
    tick();
    const id = setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, [timeZone]);
  return <time ref={ref}>--:--</time>;
}
