"use client";

import { useEffect, useRef } from "react";
import { useStill } from "@/lib/motion";
import { padRoles } from "./roles";
import s from "./Hero.module.css";

export function RoleRoller({ roles }: { roles: string[] }) {
  const padded = padRoles(roles);
  const cells = useRef<(HTMLSpanElement | null)[]>([]);
  const live = useRef<HTMLSpanElement>(null);
  const still = useStill();

  useEffect(() => {
    let k = 0;
    const id = setInterval(() => {
      const prev = padded[k];
      k = (k + 1) % padded.length;
      const next = padded[k];
      if (live.current) live.current.textContent = roles[k];
      cells.current.forEach((el, i) => {
        if (!el) return;
        if (still) {
          el.textContent = next[i];
          return;
        }
        if (prev[i] === next[i] && next[i] === " ") return;
        el.animate(
          [{ transform: "translateY(0)" }, { transform: "translateY(-115%)" }],
          {
            duration: 200,
            delay: i * 25,
            easing: "cubic-bezier(.5,0,.75,0)",
            fill: "forwards",
          },
        ).onfinish = () => {
          el.textContent = next[i];
          el.animate(
            [{ transform: "translateY(115%)" }, { transform: "translateY(0)" }],
            {
              duration: 260,
              easing: "cubic-bezier(.2,.8,.2,1)",
              fill: "forwards",
            },
          );
        };
      });
    }, 2000);
    return () => clearInterval(id);
    // roles come from static messages; restarting on `still` keeps the closure fresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still]);

  return (
    <>
      <span ref={live} className="sr-only">
        {roles[0]}
      </span>
      <span className={s.roll} aria-hidden="true">
        {[...padded[0]].map((ch, i) => (
          <span key={i} className={s.c}>
            <span ref={(el) => void (cells.current[i] = el)}>{ch}</span>
          </span>
        ))}
      </span>
    </>
  );
}
