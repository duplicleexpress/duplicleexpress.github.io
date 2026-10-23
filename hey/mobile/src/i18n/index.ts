import { fr } from "./fr";
import { en } from "./en";

export type Strings = typeof fr;
export type Locale = "fr-FR" | "en-US";

const dictionaries: Record<Locale, Strings> = { "fr-FR": fr, "en-US": en };

export const LOCALES: { id: Locale; label: string }[] = [
  { id: "fr-FR", label: "Français" },
  { id: "en-US", label: "English" },
];

export function getStrings(locale: Locale): Strings {
  return dictionaries[locale] ?? fr;
}
