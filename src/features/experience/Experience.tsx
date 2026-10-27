import { cacheLife } from "next/cache";
import { Bento } from "./Bento";
import s from "./Experience.module.css";

/** month index (y*12 + m) of today, so "now" durations stay current without a client clock */
async function thisMonth() {
  "use cache";
  cacheLife("days");
  const d = new Date();
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

export async function Experience() {
  return (
    <section
      id="experience"
      aria-labelledby="experience-title"
      className={s.xp}
    >
      <div className={s.inner}>
        <Bento now={await thisMonth()} />
      </div>
    </section>
  );
}
