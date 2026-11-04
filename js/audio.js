// Procedural audio: every sound is synthesized with WebAudio, so the game ships no audio files.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.volume = 0.6;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 6;
    this.master.connect(comp);
    comp.connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  get ready() { return !!this.ctx && this.ctx.state === 'running'; }

  _env(gainNode, t, attack, peak, decay) {
    const g = gainNode.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(peak, t + attack);
    g.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  _noise({ type = 'lowpass', freq = 2000, q = 0.7, peak = 0.5, attack = 0.002, decay = 0.2, delay = 0, rate = 1 }) {
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = rate;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    this._env(g, t, attack, peak, decay);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + attack + decay + 0.05);
  }

  _tone({ type = 'sine', from = 440, to = from, peak = 0.3, attack = 0.002, decay = 0.15, delay = 0 }) {
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + attack + decay);
    const g = ctx.createGain();
    this._env(g, t, attack, peak, decay);
    o.connect(g); g.connect(this.master);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  }

  // profile comes from the weapon definition
  shot(p) {
    if (!this.ready) return;
    const j = 0.92 + Math.random() * 0.16;
    this._noise({ type: 'bandpass', freq: p.crack * j, q: 0.9, peak: p.gain, decay: 0.05 });
    this._noise({ type: 'lowpass', freq: p.body * j, q: 0.5, peak: p.gain * 0.9, decay: p.tail });
    this._tone({ type: 'sine', from: p.thump * j, to: 35, peak: p.gain * 0.8, decay: p.tail * 0.6 });
    if (p.mech) this._noise({ type: 'highpass', freq: 3500, peak: 0.08, decay: 0.03, delay: p.mech });
  }

  empty() {
    if (!this.ready) return;
    this._noise({ type: 'highpass', freq: 4000, peak: 0.15, decay: 0.03 });
    this._tone({ type: 'square', from: 1800, to: 1200, peak: 0.03, decay: 0.03 });
  }

  reload(stage) {
    if (!this.ready) return;
    if (stage === 'out') {
      this._noise({ type: 'bandpass', freq: 1800, q: 2, peak: 0.2, decay: 0.06 });
      this._tone({ type: 'triangle', from: 600, to: 300, peak: 0.06, decay: 0.08 });
    } else if (stage === 'in') {
      this._noise({ type: 'bandpass', freq: 2500, q: 3, peak: 0.28, decay: 0.05 });
      this._tone({ type: 'square', from: 900, to: 500, peak: 0.05, decay: 0.04 });
    } else if (stage === 'rack') {
      this._noise({ type: 'bandpass', freq: 3000, q: 2, peak: 0.25, decay: 0.04 });
      this._noise({ type: 'bandpass', freq: 2200, q: 2, peak: 0.25, decay: 0.05, delay: 0.09 });
    }
  }

  equip() {
    if (!this.ready) return;
    this._noise({ type: 'bandpass', freq: 1400, q: 1.5, peak: 0.12, decay: 0.12, rate: 0.6 });
    this._noise({ type: 'bandpass', freq: 3200, q: 3, peak: 0.15, decay: 0.03, delay: 0.12 });
  }

  hit(head = false) {
    if (!this.ready) return;
    if (head) {
      this._tone({ type: 'sine', from: 1900, to: 1700, peak: 0.22, decay: 0.12 });
      this._tone({ type: 'sine', from: 2850, to: 2700, peak: 0.1, decay: 0.1 });
    } else {
      this._tone({ type: 'triangle', from: 1250, to: 1100, peak: 0.16, decay: 0.06 });
    }
  }

  kill() {
    if (!this.ready) return;
    this._tone({ type: 'sine', from: 660, to: 990, peak: 0.18, decay: 0.12 });
    this._tone({ type: 'sine', from: 990, to: 1320, peak: 0.14, decay: 0.16, delay: 0.07 });
  }

  impact() {
    if (!this.ready) return;
    this._noise({ type: 'bandpass', freq: 2600, q: 1.2, peak: 0.05, decay: 0.04, delay: 0.02 });
  }

  plate() {
    if (!this.ready) return;
    this._tone({ type: 'sine', from: 1450, to: 1400, peak: 0.12, decay: 0.5 });
    this._tone({ type: 'sine', from: 2380, to: 2300, peak: 0.05, decay: 0.35 });
  }

  beep(high = false) {
    if (!this.ready) return;
    this._tone({ type: 'square', from: high ? 1320 : 880, peak: 0.07, decay: high ? 0.35 : 0.12 });
  }

  ui(kind = 'click') {
    if (!this.ready) return;
    if (kind === 'hover') this._tone({ type: 'sine', from: 2200, to: 2000, peak: 0.025, decay: 0.03 });
    else this._tone({ type: 'triangle', from: 900, to: 1400, peak: 0.06, decay: 0.06 });
  }

  swoosh(heavy = false) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(heavy ? 500 : 900, t);
    f.frequency.exponentialRampToValueAtTime(heavy ? 1800 : 3200, t + 0.12);
    f.frequency.exponentialRampToValueAtTime(600, t + 0.25);
    const g = ctx.createGain(); this._env(g, t, 0.05, heavy ? 0.35 : 0.25, 0.2);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random() * 0.5); src.stop(t + 0.35);
  }

  stab() {
    if (!this.ready) return;
    this._tone({ type: 'sine', from: 160, to: 60, peak: 0.4, decay: 0.12 });
    this._noise({ type: 'lowpass', freq: 900, peak: 0.3, decay: 0.08 });
  }

  clang() {
    if (!this.ready) return;
    this._noise({ type: 'bandpass', freq: 3200, q: 4, peak: 0.25, decay: 0.08 });
    this._tone({ type: 'triangle', from: 2400, to: 2200, peak: 0.08, decay: 0.25 });
  }

  footstep() {
    if (!this.ready) return;
    this._noise({ type: 'lowpass', freq: 500, peak: 0.07, decay: 0.07, rate: 0.5 });
  }
}
