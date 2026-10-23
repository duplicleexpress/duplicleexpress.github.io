/**
 * Anti-écho : quand HEY parle dans le haut-parleur, le micro peut entendre sa propre voix.
 * On compare ce que le micro a reconnu avec ce que HEY est en train de dire pour ne pas
 * prendre la voix de HEY pour une interruption de l'utilisateur.
 */
export function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/** Proportion des mots entendus qui figurent dans ce que HEY vient de dire (0 à 1). */
export function echoRatio(heard: string, spoken: string): number {
  const h = normalizeWords(heard);
  if (h.length === 0) return 1;
  const s = new Set(normalizeWords(spoken));
  if (s.size === 0) return 0;
  return h.filter((w) => s.has(w)).length / h.length;
}

/**
 * Décide si ce que le micro entend pendant que HEY parle est une vraie interruption.
 * - au moins `minWords` mots
 * - et pas majoritairement l'écho de la voix de HEY
 */
export function isBargeIn(heard: string, spokenRecently: string, minWords = 2): boolean {
  const words = normalizeWords(heard);
  if (words.length < minWords) return false;
  return echoRatio(heard, spokenRecently) < 0.6;
}
