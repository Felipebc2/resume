import { getTranslations } from "next-intl/server";

export async function ExperiencePlaceholder() {
  const t = await getTranslations("Experience");
  return (
    <section
      id="experience"
      aria-labelledby="experience-title"
      className="grid min-h-[80vh] snap-start place-items-center border-t border-line pt-30 pr-(--gut-r) pb-35 pl-(--gut-l)"
    >
      <div className="grid min-h-[44vh] w-[min(1120px,100%)] place-items-center gap-1.5 rounded-[20px] border border-dashed border-line-2 p-6 text-center text-dim">
        <span className="font-mono text-[13px]">{t("kicker")}</span>
        <h2
          id="experience-title"
          className="m-0 font-serif text-[clamp(36px,5vw,64px)] font-normal text-fg"
        >
          {t("title")}
        </h2>
        <span>{t("body")}</span>
      </div>
    </section>
  );
}
