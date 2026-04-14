// ─── NdPay Sound Effects (Web Audio API — no files needed) ────────────────────

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain: number = 0.15,
  delay: number = 0
): void {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
    osc.frequency.exponentialRampToValueAtTime(
      frequency * 1.1,
      ctx.currentTime + delay + duration * 0.1
    );

    gainNode.gain.setValueAtTime(0, ctx.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + delay + duration
    );

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch {
    // Silently fail if audio isn't available
  }
}

// 💰 Credit received — uplifting "cha-ching" (ascending chime)
export function playCreditSound(): void {
  try {
    // Base chime
    playTone(523.25, 0.18, 'sine', 0.12, 0);      // C5
    playTone(659.25, 0.18, 'sine', 0.10, 0.08);    // E5
    playTone(783.99, 0.20, 'sine', 0.12, 0.16);    // G5
    playTone(1046.50, 0.30, 'sine', 0.10, 0.24);   // C6
    // Sparkle overtone
    playTone(2093.00, 0.12, 'sine', 0.04, 0.28);   // C7
  } catch {
    // Ignore
  }
}

// 📤 Debit sent — soft descending notification tone
export function playDebitSound(): void {
  try {
    playTone(880.0, 0.15, 'sine', 0.08, 0);        // A5
    playTone(659.25, 0.20, 'sine', 0.07, 0.10);    // E5
  } catch {
    // Ignore
  }
}

// 🔔 System notification — simple single tone
export function playSystemSound(): void {
  try {
    playTone(698.46, 0.20, 'sine', 0.06, 0);       // F5
  } catch {
    // Ignore
  }
}

// ✅ Transfer success — triumphant ascending arpeggio
export function playSuccessSound(): void {
  try {
    playTone(523.25, 0.12, 'sine', 0.10, 0);       // C5
    playTone(659.25, 0.12, 'sine', 0.10, 0.10);    // E5
    playTone(783.99, 0.12, 'sine', 0.10, 0.20);    // G5
    playTone(1046.50, 0.35, 'sine', 0.12, 0.30);   // C6
  } catch {
    // Ignore
  }
}

// ❌ Error — subtle descending error sound
export function playErrorSound(): void {
  try {
    playTone(349.23, 0.15, 'sine', 0.07, 0);       // F4
    playTone(293.66, 0.25, 'sine', 0.07, 0.12);    // D4
  } catch {
    // Ignore
  }
}
