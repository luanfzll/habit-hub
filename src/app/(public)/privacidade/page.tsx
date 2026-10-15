import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { Fragment, type ReactNode } from "react";

export const metadata: Metadata = { title: "Privacidade · HabitHub" };

const CONTACT = "habithub.mail@gmail.com";

interface Section {
  title: string;
  paragraphs?: string[];
  items?: string[];
  /** Closing sentence, after the list. */
  note?: string;
}

/** Turns the contact address inside a sentence into a mailto link. */
function withContactLink(text: string): ReactNode {
  const parts = text.split(CONTACT);
  return parts.map((part, i) => (
    <Fragment key={i}>
      {part}
      {i < parts.length - 1 && (
        <a href={`mailto:${CONTACT}`} className="text-foreground underline underline-offset-4">
          {CONTACT}
        </a>
      )}
    </Fragment>
  ));
}

/** Privacy policy (LGPD), in plain Portuguese. The text lives in the messages file. */
export default function PrivacyPage() {
  const t = useTranslations("privacy");
  const sections = t.raw("sections") as Section[];
  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("updated")}</p>
        <p className="text-lg text-pretty text-muted-foreground">{t("intro")}</p>
      </header>
      {sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{section.title}</h2>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph} className="leading-relaxed text-pretty text-muted-foreground">
              {withContactLink(paragraph)}
            </p>
          ))}
          {section.items && (
            <ul className="flex list-disc flex-col gap-2 pl-5 leading-relaxed text-muted-foreground marker:text-muted-foreground/60">
              {section.items.map((item) => (
                <li key={item}>{withContactLink(item)}</li>
              ))}
            </ul>
          )}
          {section.note && <p className="leading-relaxed text-pretty text-muted-foreground">{section.note}</p>}
        </section>
      ))}
    </article>
  );
}
