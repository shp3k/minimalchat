export type UiSound = "notification" | "sent";

export async function playUiSound(sound: UiSound) {
  const AudioContextClass = window.AudioContext;

  if (!AudioContextClass) return;

  try {
    const context = new AudioContextClass();

    if (context.state === "suspended") {
      await context.resume();
    }

    if (sound === "notification") {
      scheduleTone(context, 659.25, 0, 0.12, 0.055, "sine");
      scheduleTone(context, 880, 0.1, 0.2, 0.05, "sine");
    } else {
      scheduleTone(context, 493.88, 0, 0.07, 0.035, "sine");
      scheduleTone(context, 739.99, 0.055, 0.13, 0.03, "sine");
    }

    window.setTimeout(() => {
      void context.close();
    }, 500);
  } catch {
    // Sound playback is best-effort and should never interrupt chatting.
  }
}

function scheduleTone(
  context: AudioContext,
  frequency: number,
  delay: number,
  duration: number,
  volume: number,
  type: OscillatorType
) {
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}
