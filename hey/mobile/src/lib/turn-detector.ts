/**
 * Détection de fin de prise de parole.
 *
 * La reconnaissance vocale envoie des résultats intermédiaires pendant que la personne parle.
 * Quand plus rien de nouveau n'arrive pendant `silenceMs`, on considère que la phrase est finie
 * et on l'envoie à HEY. Les phrases très courtes ("euh") sont ignorées.
 */
export interface TurnDetectorOptions {
  silenceMs: number;
  /** Silence plus long si la phrase semble inachevée (ex. se termine par "et", "mais"). */
  hesitationMs: number;
  onSpeechStart: () => void;
  onTurn: (text: string) => void;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

const HESITATION_ENDINGS =
  /\b(et|mais|ou|donc|alors|parce que|que|qui|euh|hum|le|la|les|un|une|de|des|du|avec|pour|sur|dans|and|but|so|the|a|to|of)\s*$/i;

const FILLERS = /^(euh+|hum+|hm+|ah+|oh+|bah|ben|mmh+)$/i;

export class TurnDetector {
  private transcript = "";
  private timer: unknown = null;
  private speaking = false;
  private opts: Required<TurnDetectorOptions>;

  constructor(opts: TurnDetectorOptions) {
    this.opts = {
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
      ...opts,
    };
  }

  get current() {
    return this.transcript;
  }

  /** Résultat (intermédiaire ou final) de la reconnaissance vocale pour l'énoncé en cours. */
  onResult(text: string) {
    const t = text.trim();
    if (!t || t === this.transcript) return;
    this.transcript = t;
    if (!this.speaking) {
      this.speaking = true;
      this.opts.onSpeechStart();
    }
    this.arm();
  }

  /** Force la fin de l'énoncé (ex. bouton, ou fin de session de reconnaissance). */
  flush() {
    this.cancelTimer();
    const t = this.transcript.trim();
    this.reset();
    if (isMeaningful(t)) this.opts.onTurn(t);
  }

  reset() {
    this.cancelTimer();
    this.transcript = "";
    this.speaking = false;
  }

  private arm() {
    this.cancelTimer();
    const ms = HESITATION_ENDINGS.test(this.transcript) ? this.opts.hesitationMs : this.opts.silenceMs;
    this.timer = this.opts.setTimer(() => {
      this.timer = null;
      this.flush();
    }, ms);
  }

  private cancelTimer() {
    if (this.timer !== null) {
      this.opts.clearTimer(this.timer);
      this.timer = null;
    }
  }
}

export function isMeaningful(text: string): boolean {
  const t = text.trim();
  if (t.length < 2) return false;
  const words = t.split(/\s+/);
  return !(words.length === 1 && FILLERS.test(words[0]!.replace(/[.,!?]/g, "")));
}
