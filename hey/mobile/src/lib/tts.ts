import * as Speech from "expo-speech";

/**
 * Voix de HEY : lit les phrases une par une, au fur et à mesure qu'elles arrivent.
 * Peut être interrompue instantanément.
 */
export class Speaker {
  private queue: string[] = [];
  private speaking = false;
  private voiceId: string | undefined;
  private recent: string[] = [];
  private generation = 0;

  constructor(
    private locale: string,
    private rate: number,
    /** onIdle : HEY a fini de parler naturellement (pas après stop()) */
    private events: { onStart: () => void; onIdle: () => void },
  ) {
    void this.pickVoice();
  }

  /** Ce que HEY a dit récemment (pour l'anti-écho). */
  get recentlySpoken() {
    return this.recent.join(" ");
  }

  get isActive() {
    return this.speaking || this.queue.length > 0;
  }

  setRate(rate: number) {
    this.rate = rate;
  }

  enqueue(sentence: string) {
    if (!sentence.trim()) return;
    this.queue.push(sentence);
    if (!this.speaking) this.next();
  }

  /** Coupe immédiatement la parole et vide la file (sans déclencher onIdle). */
  stop() {
    this.generation++;
    this.queue = [];
    this.speaking = false;
    void Speech.stop();
  }

  private next() {
    const sentence = this.queue.shift();
    if (!sentence) {
      if (this.speaking) {
        this.speaking = false;
        this.events.onIdle();
      }
      return;
    }
    const gen = this.generation;
    if (!this.speaking) {
      this.speaking = true;
      this.events.onStart();
    }
    this.recent.push(sentence);
    if (this.recent.length > 3) this.recent.shift();
    const done = () => {
      if (gen === this.generation) this.next();
    };
    Speech.speak(sentence, {
      language: this.locale,
      voice: this.voiceId,
      rate: this.rate,
      onDone: done,
      onError: done,
    });
  }

  /** Choisit la meilleure voix installée pour la langue (voix "améliorée" si disponible). */
  private async pickVoice() {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const lang = this.locale.toLowerCase();
      const prefix = lang.split("-")[0]!;
      const candidates = voices.filter((v) => v.language.toLowerCase().replace("_", "-").startsWith(prefix));
      const score = (v: Speech.Voice) =>
        (v.quality === Speech.VoiceQuality.Enhanced ? 10 : 0) +
        (v.language.toLowerCase().replace("_", "-") === lang ? 5 : 0) +
        (/premium/i.test(v.identifier) ? 20 : 0);
      candidates.sort((a, b) => score(b) - score(a));
      this.voiceId = candidates[0]?.identifier;
    } catch {
      this.voiceId = undefined;
    }
  }
}
