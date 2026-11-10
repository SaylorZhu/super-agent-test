/**
 * Tiny procedural sound engine. No audio assets are loaded; every effect is
 * synthesised with oscillators and filtered noise so the game stays offline
 * and dependency-free.
 */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.muted = false;
    this.lastShotAt = 0;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    try {
      this.ctx = new AudioContext();
    } catch {
      // Audio is optional; the game remains playable without it.
      this.ctx = null;
      return;
    }

    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.38;
    this.master.connect(this.ctx.destination);

    const seconds = 1;
    const rate = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, rate * seconds, rate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  resume() {
    this.init();
    if (this.ctx?.state === "suspended") this.ctx.resume();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.38, this.ctx.currentTime, 0.03);
    }
  }

  tone({
    frequency,
    endFrequency,
    duration = 0.12,
    type = "sine",
    volume = 0.1,
    delay = 0,
  }) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime + delay;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), now);
    if (endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(20, endFrequency),
        now + duration,
      );
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  noise({ duration = 0.3, volume = 0.2, frequency = 900, q = 0.8, delay = 0, type = "lowpass" }) {
    if (!this.ctx || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime + delay;
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    source.buffer = this.noiseBuffer;
    filter.type = type;
    filter.frequency.setValueAtTime(frequency, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, frequency * 0.2), now + duration);
    filter.Q.value = q;

    gain.gain.setValueAtTime(Math.max(0.0002, volume), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter).connect(gain).connect(this.master);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  shoot() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this.lastShotAt < 0.055) return;
    this.lastShotAt = now;
    this.tone({ frequency: 1180, endFrequency: 620, duration: 0.06, type: "triangle", volume: 0.035 });
  }

  enemyShoot() {
    this.tone({ frequency: 320, endFrequency: 180, duration: 0.1, type: "square", volume: 0.025 });
  }

  explosion(size = 1) {
    const clamped = Math.min(1.6, Math.max(0.5, size));
    this.noise({
      duration: 0.32 * clamped,
      volume: 0.14 * clamped,
      frequency: 1100,
    });
    this.tone({
      frequency: 150,
      endFrequency: 38,
      duration: 0.36 * clamped,
      type: "sine",
      volume: 0.16 * clamped,
    });
  }

  playerHit() {
    this.noise({ duration: 0.4, volume: 0.24, frequency: 500 });
    this.tone({ frequency: 220, endFrequency: 55, duration: 0.45, type: "sawtooth", volume: 0.16 });
  }

  powerUp() {
    this.tone({ frequency: 620, duration: 0.09, type: "sine", volume: 0.08 });
    this.tone({ frequency: 880, duration: 0.1, type: "sine", volume: 0.08, delay: 0.07 });
    this.tone({ frequency: 1320, duration: 0.16, type: "sine", volume: 0.07, delay: 0.14 });
  }

  bossWarning() {
    this.tone({ frequency: 130, endFrequency: 100, duration: 0.22, type: "square", volume: 0.06 });
    this.tone({
      frequency: 130,
      endFrequency: 90,
      duration: 0.26,
      type: "square",
      volume: 0.06,
      delay: 0.34,
    });
  }

  gameOver() {
    this.tone({ frequency: 440, endFrequency: 330, duration: 0.25, type: "triangle", volume: 0.09 });
    this.tone({
      frequency: 330,
      endFrequency: 220,
      duration: 0.3,
      type: "triangle",
      volume: 0.09,
      delay: 0.22,
    });
    this.tone({
      frequency: 220,
      endFrequency: 82,
      duration: 0.7,
      type: "triangle",
      volume: 0.1,
      delay: 0.48,
    });
  }

  uiClick() {
    this.tone({ frequency: 720, endFrequency: 900, duration: 0.05, type: "sine", volume: 0.04 });
  }
}
