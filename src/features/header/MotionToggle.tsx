"use client";

import { useTranslations } from "next-intl";
import { useMotion } from "@/lib/motion";
import s from "./Header.module.css";

export function MotionToggle() {
  const t = useTranslations("Header");
  const { still, setStill } = useMotion();
  return (
    <button
      type="button"
      className={s.pill}
      aria-pressed={!still}
      onClick={() => setStill(!still)}
    >
      {still ? t("motionOff") : t("motionOn")}
    </button>
  );
}
