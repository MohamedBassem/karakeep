import { describe, expect, it, vi } from "vitest";

import {
  prepareSpeechText,
  ReaderSpeechController,
  ReaderSpeechState,
  SpeechEngine,
} from "./readerSpeech";

function setup(
  text = "First word. Second sentence.",
  maxSpeechInputLength = 3000,
) {
  const utterances: {
    text: string;
    options: Parameters<SpeechEngine["speak"]>[1];
  }[] = [];
  const states: ReaderSpeechState[] = [];
  const engine: SpeechEngine = {
    maxSpeechInputLength,
    stop: vi.fn<SpeechEngine["stop"]>().mockResolvedValue(undefined),
    speak: vi.fn((text, options) => {
      utterances.push({ text, options });
    }),
  };
  const player = new ReaderSpeechController(engine, (state) =>
    states.push(state),
  );
  player.setText(text);
  return { player, engine, utterances, states };
}

describe("reader speech", () => {
  it("ends unpunctuated headings and list items with a period", () => {
    expect(
      prepareSpeechText(
        "  A heading\n\n\nFirst\t paragraph.  \n\nSecond paragraph!\nFirst item\nSecond item",
      ),
    ).toBe(
      "A heading.\n\nFirst paragraph.\n\nSecond paragraph!\nFirst item.\nSecond item",
    );
  });

  it("reads a long article in chunks that fit the engine limit", () => {
    const text =
      "An article sentence. Another sentence with more words. ".repeat(150);
    const { player, utterances, states } = setup(text, 100);
    player.play();
    let spoken = "";
    for (const utterance of utterances) {
      expect(utterance.text.length).toBeLessThanOrEqual(100);
      spoken += utterance.text;
      utterance.options.onDone();
    }
    expect(spoken).toBe(text.trim());
    expect(states.at(-1)).toMatchObject({ status: "finished", progress: 1 });
  });

  it("resumes from the current word when native pause is unavailable", () => {
    const { player, utterances, states } = setup();
    player.play();
    utterances[0].options.onStart();
    utterances[0].options.onBoundary({ charIndex: 12 });
    player.pause();
    expect(states.at(-1)?.status).toBe("paused");
    player.play();
    expect(utterances[1].text).toBe("Second sentence.");
  });

  it("uses native pause and resume when available", () => {
    const { player, engine, utterances, states } = setup();
    engine.pause = vi.fn().mockResolvedValue(undefined);
    engine.resume = vi.fn().mockResolvedValue(undefined);
    player.play();
    utterances[0].options.onStart();
    player.pause();
    player.play();
    expect(engine.pause).toHaveBeenCalledOnce();
    expect(engine.resume).toHaveBeenCalledOnce();
    expect(utterances).toHaveLength(1);
    expect(states.at(-1)?.status).toBe("playing");
  });

  it("restarts from the current word when the speed changes", () => {
    const { player, utterances, states } = setup();
    player.play();
    utterances[0].options.onStart();
    utterances[0].options.onBoundary({ charIndex: 12 });
    player.setRate(1.5);
    expect(utterances[1]).toMatchObject({
      text: "Second sentence.",
      options: { rate: 1.5 },
    });
    expect(states.at(-1)?.status).toBe("loading");
  });

  it("ignores callbacks from a cancelled utterance", () => {
    const { player, utterances, states } = setup();
    player.play();
    player.stop();
    const stateCount = states.length;
    utterances[0].options.onStart();
    utterances[0].options.onBoundary({ charIndex: 12 });
    utterances[0].options.onDone();
    utterances[0].options.onStopped();
    expect(states).toHaveLength(stateCount);
    expect(utterances).toHaveLength(1);
  });

  it("reports synthesis errors and can retry", () => {
    const { player, utterances, states } = setup();
    player.play();
    utterances[0].options.onError(new Error("synthesis failed"));
    expect(states.at(-1)).toMatchObject({ status: "paused" });
    expect(states.at(-1)?.error).toBeTruthy();
    player.play();
    expect(utterances).toHaveLength(2);
    expect(states.at(-1)).toMatchObject({ status: "loading", error: null });
  });
});
