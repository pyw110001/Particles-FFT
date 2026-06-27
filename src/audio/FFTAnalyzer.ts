export type FrequencyBands = {
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  treble: number;
};

export class FFTAnalyzer {
  private analyser: AnalyserNode;
  private freqArray: Uint8Array;
  private timeArray: Uint8Array;

  constructor(analyser: AnalyserNode) {
    this.analyser = analyser;
    this.freqArray = new Uint8Array(analyser.frequencyBinCount);
    this.timeArray = new Uint8Array(analyser.frequencyBinCount);
  }

  getFrequencyData(): Uint8Array {
    this.analyser.getByteFrequencyData(this.freqArray as any);
    return this.freqArray;
  }

  getTimeDomainData(): Uint8Array {
    this.analyser.getByteTimeDomainData(this.timeArray as any);
    return this.timeArray;
  }

  getVolume(): number {
    const timeData = this.getTimeDomainData();
    let sumSq = 0;
    for (let i = 0; i < timeData.length; i++) {
      const val = (timeData[i] - 128) / 128.0;
      sumSq += val * val;
    }
    return Math.sqrt(sumSq / timeData.length);
  }

  getBands(sampleRate: number): FrequencyBands {
    const freqData = this.getFrequencyData();
    const binCount = freqData.length;
    const hzPerBin = (sampleRate / 2) / binCount;

    const getAverageForRange = (lowHz: number, highHz: number): number => {
      const startIndex = Math.max(0, Math.floor(lowHz / hzPerBin));
      const endIndex = Math.min(binCount - 1, Math.ceil(highHz / hzPerBin));
      
      let sum = 0;
      let count = 0;
      for (let i = startIndex; i <= endIndex; i++) {
        sum += freqData[i];
        count++;
      }
      // Return normalized average (0.0 to 1.0)
      return count > 0 ? (sum / count) / 255.0 : 0.0;
    };

    return {
      bass: getAverageForRange(20, 150),
      lowMid: getAverageForRange(150, 500),
      mid: getAverageForRange(500, 2000),
      highMid: getAverageForRange(2000, 6000),
      treble: getAverageForRange(6000, 16000)
    };
  }
}
