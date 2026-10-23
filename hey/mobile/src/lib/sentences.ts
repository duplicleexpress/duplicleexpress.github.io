/**
 * Découpe le texte qui arrive en flux en phrases prêtes à être lues à voix haute.
 * Permet à HEY de commencer à parler dès la première phrase, sans attendre la fin de la réponse.
 */
export class SentenceChunker {
  private buffer = "";

  constructor(private minLength = 12) {}

  /** Ajoute du texte ; renvoie les phrases complètes détectées. */
  push(text: string): string[] {
    this.buffer += text;
    const out: string[] = [];
    // Fin de phrase : . ! ? … ou : suivis d'un espace, ou un retour à la ligne
    const re = /[.!?…:;]+["»)]?\s+|\n+/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(this.buffer)) !== null) {
      const end = m.index + m[0].length;
      const candidate = this.buffer.slice(last, end);
      // Évite de couper sur "M. Dupont", "2.5", ou des fragments trop courts
      if (candidate.trim().length < this.minLength && !/\n/.test(m[0])) continue;
      if (/\b(M|Mme|Dr|St|etc|ex|cf|n°)\.\s+$/i.test(candidate)) continue;
      const s = clean(candidate);
      if (s) out.push(s);
      last = end;
    }
    this.buffer = this.buffer.slice(last);
    return out;
  }

  /** Renvoie le reste du texte à la fin de la réponse. */
  flush(): string[] {
    const s = clean(this.buffer);
    this.buffer = "";
    return s ? [s] : [];
  }
}

/** Retire la mise en forme Markdown qui ne doit pas être lue à voix haute. */
export function clean(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`#>]+/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
