import { FFTAnalyzer } from './FFTAnalyzer';
import { BeatDetector } from './BeatDetector';
import { SynthEngine } from './SynthEngine';

export type AudioAnalysisData = {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  volume: number;
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  treble: number;
  beatDetected: boolean;
  beatStrength: number;
  timestamp: number;
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  
  // File playback nodes & state
  private source: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private isPlayingFile = false;
  private startTime = 0; // relative to context.currentTime when playing
  private pauseTime = 0; // offset in seconds from start of track
  private duration = 0;
  private fileName = '';

  // Microphone state
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private isMicActive = false;

  // Synth state
  private synthEngine = new SynthEngine();
  private isSynthActive = false;

  // Analysis helpers
  private fftAnalyzer: FFTAnalyzer | null = null;
  private beatDetector = new BeatDetector();

  // Callbacks for UI updates
  private onStateChange: () => void = () => {};

  constructor() {
    // Initializer
  }

  registerStateChangeCallback(callback: () => void) {
    this.onStateChange = callback;
  }

  private initContext() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.75;
    this.analyser.minDecibels = -90;
    this.analyser.maxDecibels = -10;

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(1.0, this.ctx.currentTime);

    // Connect analyzer to gain, and gain to destination (speakers)
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);

    this.fftAnalyzer = new FFTAnalyzer(this.analyser);
  }

  async loadFile(file: File): Promise<void> {
    this.initContext();
    if (!this.ctx) return;

    this.fileName = file.name;
    this.stop(); // Stop any current playback

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.duration = this.audioBuffer.duration;
    this.pauseTime = 0;
    this.onStateChange();
  }

  play() {
    this.initContext();
    if (!this.ctx || !this.audioBuffer || !this.analyser) return;

    if (this.isPlayingFile) return;

    // Turn off mic/synth
    this.disableMicrophone();
    this.disableSynth();

    // Resume context if suspended (browser security)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.source = this.ctx.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.analyser);

    // If we reached the end, loop back to start
    if (this.pauseTime >= this.duration) {
      this.pauseTime = 0;
    }

    this.source.start(0, this.pauseTime);
    this.startTime = this.ctx.currentTime - this.pauseTime;
    this.isPlayingFile = true;

    // Handle audio ending naturally
    this.source.onended = () => {
      // Only reset if this is still the active playing source and hasn't been paused manually
      if (this.isPlayingFile && this.ctx && this.source) {
        const currentOffset = this.ctx.currentTime - this.startTime;
        // If it played all the way to the end
        if (currentOffset >= this.duration - 0.1) {
          this.isPlayingFile = false;
          this.pauseTime = 0;
          this.source = null;
          this.onStateChange();
        }
      }
    };

    this.onStateChange();
  }

  pause() {
    if (!this.isPlayingFile || !this.source || !this.ctx) return;

    this.pauseTime = this.ctx.currentTime - this.startTime;
    this.isPlayingFile = false;
    this.source.stop();
    this.source = null;
    this.onStateChange();
  }

  stop() {
    if (this.source) {
      this.source.stop();
      this.source = null;
    }
    this.pauseTime = 0;
    this.isPlayingFile = false;
    this.onStateChange();
  }

  seek(percent: number) {
    if (!this.audioBuffer) return;
    const targetTime = percent * this.duration;
    const wasPlaying = this.isPlayingFile;

    this.stop();
    this.pauseTime = targetTime;

    if (wasPlaying) {
      this.play();
    } else {
      this.onStateChange();
    }
  }

  async enableMicrophone(): Promise<void> {
    this.initContext();
    if (!this.ctx || !this.analyser) return;

    // Disable other sources
    this.stop();
    this.disableSynth();

    if (this.isMicActive) return;

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.micSource = this.ctx.createMediaStreamSource(this.micStream);
      
      // Connect microphone to analyzer, but NOT to speakers (to avoid feedback loop screech)
      this.micSource.connect(this.analyser);
      this.isMicActive = true;
      
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.onStateChange();
    } catch (err) {
      console.error('Failed to get microphone permissions', err);
      this.isMicActive = false;
      throw err;
    }
  }

  disableMicrophone() {
    if (!this.isMicActive) return;

    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }

    this.isMicActive = false;
    this.onStateChange();
  }

  enableSynth() {
    this.initContext();
    if (!this.ctx || !this.analyser) return;

    // Disable other sources
    this.stop();
    this.disableMicrophone();

    if (this.isSynthActive) return;

    // Connect synth to analyzer (which connects to speaker so we can hear it)
    this.synthEngine.start(this.ctx, this.analyser);
    this.isSynthActive = true;
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.onStateChange();
  }

  disableSynth() {
    if (!this.isSynthActive) return;

    this.synthEngine.stop();
    this.isSynthActive = false;
    this.onStateChange();
  }

  // Set gain volume multiplier
  setVolume(vol: number) {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
  }

  // Getters
  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  getCurrentTime(): number {
    if (this.isPlayingFile && this.ctx) {
      const current = this.ctx.currentTime - this.startTime;
      return Math.min(current, this.duration);
    }
    return this.pauseTime;
  }

  getDuration(): number {
    return this.duration;
  }

  getFileName(): string {
    return this.fileName;
  }

  isPlaying(): boolean {
    return this.isPlayingFile;
  }

  isMicrophoneActive(): boolean {
    return this.isMicActive;
  }

  isSynthPlaying(): boolean {
    return this.isSynthActive;
  }

  getBeatDetector() {
    return this.beatDetector;
  }

  // Extraction of analysis data per-frame
  getAnalysisData(timestamp: number): AudioAnalysisData | null {
    if (!this.ctx || !this.analyser || !this.fftAnalyzer) return null;

    const frequencyData = this.fftAnalyzer.getFrequencyData();
    const timeDomainData = this.fftAnalyzer.getTimeDomainData();
    const volume = this.fftAnalyzer.getVolume();
    const bands = this.fftAnalyzer.getBands(this.ctx.sampleRate);

    // Run beat detector
    const beatData = this.beatDetector.update(bands.bass, timestamp);

    return {
      frequencyData,
      timeDomainData,
      volume,
      ...bands,
      beatDetected: beatData.detected,
      beatStrength: beatData.strength,
      timestamp
    };
  }
}
