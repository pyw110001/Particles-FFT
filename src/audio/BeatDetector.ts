export type BeatData = {
  detected: boolean;
  strength: number;
  timestamp: number;
};

export class BeatDetector {
  private previousBass = 0.0;
  private lastBeatTime = 0;
  private threshold = 0.65;
  private sensitivity = 0.18;
  private cooldown = 180; // ms

  update(bass: number, timestamp: number): BeatData {
    const bassDelta = bass - this.previousBass;
    this.previousBass = bass;

    const timeSinceLastBeat = timestamp - this.lastBeatTime;
    let detected = false;
    let strength = 0.0;

    // Detect beat if current bass is above threshold,
    // the change (delta) is positive and larger than sensitivity,
    // and the cooldown period has passed.
    if (
      bass > this.threshold &&
      bassDelta > this.sensitivity &&
      timeSinceLastBeat > this.cooldown
    ) {
      detected = true;
      strength = bass;
      this.lastBeatTime = timestamp;
    }

    return {
      detected,
      strength,
      timestamp
    };
  }

  setThreshold(value: number) {
    this.threshold = value;
  }

  setSensitivity(value: number) {
    this.sensitivity = value;
  }

  setCooldown(ms: number) {
    this.cooldown = ms;
  }
}
