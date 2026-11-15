// Synthesised sound for Lumen Drift: every blip is an oscillator through a
// short envelope, so the game ships no audio files at all. The context is
// created on the first user gesture; every method is a no-op until then, and
// a missing Web Audio API never breaks the game.

export function createSound() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context !== null) return context;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(frequency, duration, type, volume, slideTo) {
    if (muted) return;
    const audio = ensure();
    if (audio === null) return;
    try {
      if (audio.state === 'suspended') void audio.resume();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
      if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, audio.currentTime + duration);
      gain.gain.setValueAtTime(volume, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + duration + 0.02);
    } catch {
      // Sound is garnish: a failure here must never stop the game.
    }
  }

  return {
    /** Call from any user gesture so the browser unlocks audio. */
    unlock() {
      ensure();
    },
    /** Pickup blip, climbing in pitch with the combo multiplier. */
    pickup(combo) {
      const base = 520 + combo * 70;
      tone(base, 0.14, 'sine', 0.16, base * 1.5);
    },
    dash() {
      tone(300, 0.16, 'triangle', 0.14, 720);
    },
    hit() {
      tone(160, 0.3, 'sawtooth', 0.18, 55);
    },
    heart() {
      tone(660, 0.2, 'sine', 0.16, 990);
      tone(990, 0.24, 'sine', 0.1, 1320);
    },
    win() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((note, index) => {
        window.setTimeout(() => tone(note, 0.35, 'sine', 0.16), index * 130);
      });
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
}
