export type ReaderSpeechStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "finished";

export interface ReaderSpeechState {
  status: ReaderSpeechStatus;
  progress: number;
  rate: number;
  error: string | null;
}

export interface SpeechEngine {
  maxSpeechInputLength: number;
  stop: () => Promise<void>;
  // Only available on iOS. Elsewhere, pausing stops the utterance.
  pause?: () => Promise<void>;
  resume?: () => Promise<void>;
  speak: (
    text: string,
    options: {
      rate: number;
      useApplicationAudioSession: boolean;
      onStart: () => void;
      onBoundary: (event: { charIndex: number }) => void;
      onDone: () => void;
      onStopped: () => void;
      onError: (error: Error) => void;
    },
  ) => void;
}

// Collapse whitespace but keep line breaks, and end unpunctuated lines
// (headings, list items) with a period so the voice pauses after them.
export function prepareSpeechText(text: string) {
  return text
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .replace(/([^.!?:;…。！？\n])(?=\n)/g, "$1.");
}

// Android caps the utterance length, so split long text at the last
// paragraph, sentence, or word break that fits.
export function getSpeechChunk(text: string, start: number, maxLength: number) {
  let end = Math.min(text.length, start + maxLength);
  if (end < text.length) {
    const candidate = text.slice(start, end);
    const lastBreak = [/\n/g, /[.!?。！？]\s*/g, /\s/g]
      .map((pattern) => [...candidate.matchAll(pattern)].at(-1))
      .find((match) => match !== undefined);
    if (lastBreak) end = start + lastBreak.index + lastBreak[0].length;
  }
  return { text: text.slice(start, end), end };
}

export function initialSpeechState(rate: number): ReaderSpeechState {
  return { status: "idle", progress: 0, rate, error: null };
}

export class ReaderSpeechController {
  private text = "";
  private position = 0;
  // Bumped whenever playback is cancelled so callbacks from the old utterance
  // are ignored. Native speech calls run in order, so a stop never cuts off a
  // later speak.
  private generation = 0;
  private nativePaused = false;
  private state: ReaderSpeechState;

  constructor(
    private engine: SpeechEngine,
    private onChange: (state: ReaderSpeechState) => void,
    rate = 1,
  ) {
    this.state = initialSpeechState(rate);
  }

  private update(changes: Partial<ReaderSpeechState>) {
    this.state = { ...this.state, ...changes };
    this.onChange(this.state);
  }

  private isSpeaking() {
    return this.state.status === "playing" || this.state.status === "loading";
  }

  private cancel(status: ReaderSpeechStatus, error: string | null = null) {
    this.generation++;
    this.nativePaused = false;
    this.update({ status, error });
    this.engine.stop().catch(() => {
      // The utterance is already orphaned by the generation bump.
    });
  }

  private fail(generation: number) {
    if (generation === this.generation)
      this.cancel("paused", "Unable to read aloud. Please try again.");
  }

  private speakNext(generation: number) {
    if (this.position >= this.text.length) {
      this.update({ status: "finished", progress: 1 });
      return;
    }
    const start = this.position;
    const chunk = getSpeechChunk(
      this.text,
      start,
      this.engine.maxSpeechInputLength,
    );
    const isCurrent = () => generation === this.generation;
    this.engine.speak(chunk.text, {
      rate: this.state.rate,
      useApplicationAudioSession: false,
      onStart: () => {
        if (isCurrent() && this.state.status === "loading")
          this.update({ status: "playing" });
      },
      onBoundary: ({ charIndex }) => {
        if (!isCurrent()) return;
        this.position = start + charIndex;
        this.update({ progress: this.position / this.text.length });
      },
      onDone: () => {
        if (!isCurrent()) return;
        this.position = chunk.end;
        this.nativePaused = false;
        this.update({ progress: this.position / this.text.length });
        // The chunk can finish just as the user pauses.
        if (this.state.status !== "paused") this.speakNext(generation);
      },
      // The system stopped speech, e.g. another app took the audio session.
      onStopped: () => {
        if (isCurrent()) this.cancel("paused");
      },
      onError: () => this.fail(generation),
    });
  }

  setText(text: string) {
    const normalized = prepareSpeechText(text);
    if (normalized === this.text) return;
    this.text = normalized;
    this.stop();
  }

  play() {
    if (!this.text || this.isSpeaking()) return;
    const generation = this.generation;
    if (this.nativePaused) {
      this.nativePaused = false;
      this.update({ status: "playing", error: null });
      this.engine.resume?.().catch(() => this.fail(generation));
      return;
    }
    if (this.state.status === "finished") this.position = 0;
    this.cancel("loading");
    this.update({ progress: this.position / this.text.length });
    this.speakNext(this.generation);
  }

  pause() {
    if (!this.isSpeaking()) return;
    const generation = this.generation;
    if (this.state.status === "playing" && this.engine.pause) {
      this.nativePaused = true;
      this.update({ status: "paused" });
      this.engine.pause().catch(() => this.fail(generation));
      return;
    }
    // Without native pause, play() starts a new utterance at the last word.
    this.cancel("paused");
  }

  stop() {
    this.position = 0;
    this.update({ progress: 0 });
    this.cancel("idle");
  }

  // The rate only applies to new utterances, so restart from the current word.
  setRate(rate: number) {
    if (rate === this.state.rate) return;
    const wasSpeaking = this.isSpeaking();
    this.update({ rate });
    if (!wasSpeaking && !this.nativePaused) return;
    this.cancel("paused");
    if (wasSpeaking) this.play();
  }
}
