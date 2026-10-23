import { describe, expect, it, vi } from "vitest";
import { SseParser } from "../src/lib/sse";
import { SentenceChunker, clean } from "../src/lib/sentences";
import { echoRatio, isBargeIn } from "../src/lib/echo";
import { TurnDetector, isMeaningful } from "../src/lib/turn-detector";

describe("SseParser", () => {
  it("reconstitue les événements coupés en plusieurs morceaux", () => {
    const p = new SseParser();
    expect(p.push('event: delta\ndata: {"text":"Bon')).toEqual([]);
    expect(p.push('jour"}\n\n: ping\n\nevent: done\ndata: {}\n\n')).toEqual([
      { event: "delta", data: '{"text":"Bonjour"}' },
      { event: "done", data: "{}" },
    ]);
  });
});

describe("SentenceChunker", () => {
  it("rend chaque phrase dès qu'elle est complète", () => {
    const c = new SentenceChunker();
    expect(c.push("D'accord. Avant de toucher au raccord, ferme ")).toEqual([]);
    expect(c.push("l'arrivée d'eau. Ensuite")).toEqual(["D'accord. Avant de toucher au raccord, ferme l'arrivée d'eau."]);
    expect(c.flush()).toEqual(["Ensuite"]);
  });
  it("ne coupe pas sur les abréviations ni les décimales", () => {
    const c = new SentenceChunker();
    expect(c.push("Appelle M. Dupont pour le tuyau de 2.5 cm aujourd'hui. Oui")).toEqual([
      "Appelle M. Dupont pour le tuyau de 2.5 cm aujourd'hui.",
    ]);
  });
  it("retire le Markdown", () => {
    expect(clean("**Étape 1** : coupe l'`eau`")).toBe("Étape 1 : coupe l'eau");
    expect(clean("- ferme\n- ouvre")).toBe("ferme ouvre");
  });
});

describe("anti-écho", () => {
  const spoken = "Ferme d'abord l'arrivée d'eau sous l'évier.";
  it("reconnaît l'écho de la voix de HEY", () => {
    expect(echoRatio("ferme d'abord l'arrivée", spoken)).toBeGreaterThan(0.6);
    expect(isBargeIn("ferme d'abord l'arrivée d'eau", spoken)).toBe(false);
  });
  it("détecte une vraie interruption", () => {
    expect(isBargeIn("attends attends c'est pas ça", spoken)).toBe(true);
    expect(isBargeIn("stop", spoken)).toBe(false); // un seul mot : trop court
  });
});

describe("TurnDetector", () => {
  it("envoie la phrase après un silence et attend plus longtemps en cas d'hésitation", () => {
    vi.useFakeTimers();
    const turns: string[] = [];
    const starts = vi.fn();
    const d = new TurnDetector({ silenceMs: 1000, hesitationMs: 2500, onSpeechStart: starts, onTurn: (t) => turns.push(t) });
    d.onResult("Mon robinet fuit et");
    expect(starts).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1500);
    expect(turns).toEqual([]); // phrase inachevée : on attend
    d.onResult("Mon robinet fuit et ça coule partout");
    vi.advanceTimersByTime(999);
    expect(turns).toEqual([]);
    vi.advanceTimersByTime(2);
    expect(turns).toEqual(["Mon robinet fuit et ça coule partout"]);
    vi.useRealTimers();
  });
  it("ignore les hésitations seules", () => {
    expect(isMeaningful("euh")).toBe(false);
    expect(isMeaningful("Hum.")).toBe(false);
    expect(isMeaningful("oui")).toBe(true);
  });
});
