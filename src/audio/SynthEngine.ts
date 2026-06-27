export class SynthEngine {
  private audioContext: AudioContext | null = null;
  private destination: AudioNode | null = null;
  private isRunning = false;
  private intervalId: number | null = null;
  private nextNoteTime = 0.0;
  private beatCount = 0;
  private tempo = 124.0; // BPM
  private lookahead = 25.0; // ms
  private scheduleAheadTime = 0.1; // seconds

  start(audioContext: AudioContext, destination: AudioNode) {
    if (this.isRunning) return;
    this.audioContext = audioContext;
    this.destination = destination;
    this.isRunning = true;
    this.nextNoteTime = audioContext.currentTime;
    this.beatCount = 0;

    this.intervalId = window.setInterval(() => {
      this.scheduler();
    }, this.lookahead);
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private scheduler() {
    if (!this.audioContext) return;
    while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.beatCount, this.nextNoteTime);
      this.advanceNote();
    }
  }

  private advanceNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat; // 16th note step
    this.beatCount = (this.beatCount + 1) % 16;
  }

  private scheduleNote(step: number, time: number) {
    if (!this.audioContext || !this.destination) return;

    // 1. Kick drum on 1, 5, 9, 13 (step 0, 4, 8, 12)
    if (step === 0 || step === 4 || step === 8 || step === 12) {
      this.playKick(time);
    }

    // 2. Hi-hat (noise) on off-beats (step 2, 6, 10, 14) and general tick
    if (step % 4 === 2) {
      this.playHihat(time, 0.15); // Loud hi-hat
    } else if (step % 2 === 1) {
      this.playHihat(time, 0.03); // Quiet tick
    }

    // 3. Simple bass synth line in A minor (A1: 55Hz, C2: 65.4Hz, E2: 82.4Hz, G2: 98Hz)
    if (step % 2 === 0) {
      const bassNotes = [55.0, 55.0, 65.4, 65.4, 82.4, 82.4, 98.0, 98.0, 110.0, 98.0, 82.4, 82.4, 65.4, 65.4, 55.0, 82.4];
      const freq = bassNotes[step];
      this.playBassNote(freq, time);
    }

    // 4. Ambient chords / melody notes (Treble range) on some beats
    if (step === 2 || step === 6 || step === 10 || step === 14) {
      // High synth note to create treble frequencies
      const trebleNotes = [440.0, 523.25, 659.25, 783.99]; // A4, C5, E5, G5
      const freq = trebleNotes[(step / 2) % 4];
      this.playTrebleNote(freq, time);
    }
  }

  private playKick(time: number) {
    if (!this.audioContext || !this.destination) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.connect(gain);
    gain.connect(this.destination);

    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.25);

    gain.gain.setValueAtTime(1.0, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.28);

    osc.start(time);
    osc.stop(time + 0.28);
  }

  private playHihat(time: number, volume: number) {
    if (!this.audioContext || !this.destination) return;

    const bufferSize = Math.floor(this.audioContext.sampleRate * 0.08); // 80ms buffer
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(8000, time);

    const gain = this.audioContext.createGain();

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.destination);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    noise.start(time);
    noise.stop(time + 0.07);
  }

  private playBassNote(freq: number, time: number) {
    if (!this.audioContext || !this.destination) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, time);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.destination);

    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.start(time);
    osc.stop(time + 0.19);
  }

  private playTrebleNote(freq: number, time: number) {
    if (!this.audioContext || !this.destination) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.5, time);
    filter.Q.setValueAtTime(2.0, time);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    // Simple echo delay
    const delay = this.audioContext.createDelay();
    delay.delayTime.setValueAtTime(0.15, time);

    const feedback = this.audioContext.createGain();
    feedback.gain.setValueAtTime(0.4, time);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.destination);

    // Connect to echo
    gain.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(this.destination);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    osc.start(time);
    osc.stop(time + 0.25);
  }
}
