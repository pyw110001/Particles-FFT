import * as THREE from 'three';
import { vertexShader, fragmentShader } from '../shaders/particleShader';
import { AudioAnalysisData } from '../audio/AudioEngine';

export type ParticleQuality = 'low' | 'medium' | 'high';

export interface ParticleSystemSettings {
  shape: number; // 0: Circle, 1: Ring, 2: Star
  colorMode: number; // 0: Frequency, 1: Energy, 2: Gradient, 3: Custom
  intensity: number;
  pointSize: number;
  bassBoost: number;
  midBoost: number;
  trebleBoost: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particleCount = 30000;
  
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private points: THREE.Points | null = null;
  
  // Audio texture
  private audioTexture: THREE.DataTexture | null = null;
  private audioDataArray: Uint8Array | null = null;
  
  // Shockwave state
  private shockwaveProgress = 1.0;
  private beatStrength = 0.0;
  private totalTime = 0.0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  init(count: number) {
    this.dispose(); // Clean up existing system first
    
    this.particleCount = count;

    this.geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(this.particleCount * 3);
    const basePositions = new Float32Array(this.particleCount * 3);
    const randoms = new Float32Array(this.particleCount);
    const sizes = new Float32Array(this.particleCount);
    const frequencyBands = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      // 1. Distribute base positions uniformly on a sphere of radius 1.0
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos((Math.random() * 2) - 1);
      
      const x = Math.sin(theta) * Math.cos(phi);
      const y = Math.sin(theta) * Math.sin(phi);
      const z = Math.cos(theta);

      // basePosition will be the reference shape coordinate
      basePositions[i * 3] = x;
      basePositions[i * 3 + 1] = y;
      basePositions[i * 3 + 2] = z;

      // position is the active rendering coordinate (initially same)
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // 2. Random factors
      randoms[i] = Math.random();
      
      // 3. Sizes (0.5 to 2.5)
      sizes[i] = 0.5 + Math.random() * 2.0;

      // 4. Map particle to a specific frequency band. 
      // Distribute based on human hearing weights:
      // 15% Bass (0), 20% LowMid (1), 35% Mid (2), 20% HighMid (3), 10% Treble (4)
      const pct = i / this.particleCount;
      if (pct < 0.15) {
        frequencyBands[i] = 0.0; // Bass
      } else if (pct < 0.35) {
        frequencyBands[i] = 1.0; // Low Mid
      } else if (pct < 0.70) {
        frequencyBands[i] = 2.0; // Mid
      } else if (pct < 0.90) {
        frequencyBands[i] = 3.0; // High Mid
      } else {
        frequencyBands[i] = 4.0; // Treble
      }
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('aBasePosition', new THREE.BufferAttribute(basePositions, 3));
    this.geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('aFrequencyBand', new THREE.BufferAttribute(frequencyBands, 1));

    // Initialize 1024-pixel audio data texture (since fftSize is 2048)
    this.audioDataArray = new Uint8Array(1024);
    this.audioTexture = new THREE.DataTexture(
      this.audioDataArray as any,
      1024,
      1,
      THREE.RedFormat,
      THREE.UnsignedByteType
    );
    this.audioTexture.minFilter = THREE.LinearFilter;
    this.audioTexture.magFilter = THREE.LinearFilter;
    this.audioTexture.needsUpdate = true;

    // Shader Uniforms
    const uniforms = {
      uTime: { value: 0.0 },
      uDeltaTime: { value: 0.0 },
      uVolume: { value: 0.0 },
      uBass: { value: 0.0 },
      uLowMid: { value: 0.0 },
      uMid: { value: 0.0 },
      uHighMid: { value: 0.0 },
      uTreble: { value: 0.0 },
      
      uBeat: { value: 0.0 },
      uBeatStrength: { value: 0.0 },
      uShockwave: { value: 1.0 }, // starts finished
      
      uIntensity: { value: 1.0 },
      uPointSize: { value: 3.0 },
      uColorMode: { value: 0.0 },
      uMode: { value: 0.0 },
      uShape: { value: 0.0 },
      
      uAudioTexture: { value: this.audioTexture }
    };

    this.material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  update(
    audioData: AudioAnalysisData | null, 
    deltaTime: number, 
    settings: ParticleSystemSettings, 
    interpolatedMode: number
  ) {
    if (!this.material || !this.material.uniforms) return;

    this.totalTime += deltaTime;
    const uniforms = this.material.uniforms;

    // Update global uniforms
    uniforms.uTime.value = this.totalTime;
    uniforms.uDeltaTime.value = deltaTime;
    uniforms.uMode.value = interpolatedMode;
    uniforms.uShape.value = settings.shape;
    uniforms.uColorMode.value = settings.colorMode;
    uniforms.uIntensity.value = settings.intensity;
    uniforms.uPointSize.value = settings.pointSize;

    // Update audio data uniforms
    if (audioData) {
      // Apply boost settings from control panel
      const bassVal = audioData.bass * settings.bassBoost;
      const midVal = audioData.mid * settings.midBoost;
      const trebleVal = audioData.treble * settings.trebleBoost;
      const volumeVal = audioData.volume * settings.intensity;

      uniforms.uVolume.value = volumeVal;
      uniforms.uBass.value = bassVal;
      uniforms.uLowMid.value = audioData.lowMid;
      uniforms.uMid.value = midVal;
      uniforms.uHighMid.value = audioData.highMid;
      uniforms.uTreble.value = trebleVal;

      // Update Audio Texture
      if (this.audioTexture && this.audioDataArray) {
        this.audioDataArray.set(audioData.frequencyData);
        this.audioTexture.needsUpdate = true;
      }

      // Beat / Shockwave trigger
      if (audioData.beatDetected) {
        this.shockwaveProgress = 0.0;
        this.beatStrength = audioData.beatStrength;
        uniforms.uBeat.value = 1.0;
      } else {
        uniforms.uBeat.value = 0.0;
      }

      // Animate shockwave outwards
      if (this.shockwaveProgress < 1.0) {
        this.shockwaveProgress += deltaTime * 2.0; // takes 0.5 seconds to complete
        if (this.shockwaveProgress > 1.0) {
          this.shockwaveProgress = 1.0;
        }
      }

      uniforms.uShockwave.value = this.shockwaveProgress;
      // Exponentially decay the shockwave strength for displacement math in shader
      uniforms.uBeatStrength.value = this.beatStrength * Math.pow(1.0 - this.shockwaveProgress, 1.5);
    } else {
      // Idle state defaults
      const idleVolume = 0.08;
      const idleBass = 0.1 * Math.sin(this.totalTime * 0.5) + 0.15;
      
      uniforms.uVolume.value = idleVolume;
      uniforms.uBass.value = idleBass;
      uniforms.uLowMid.value = 0.08;
      uniforms.uMid.value = 0.08;
      uniforms.uHighMid.value = 0.05;
      uniforms.uTreble.value = 0.03;
      uniforms.uBeat.value = 0.0;
      uniforms.uBeatStrength.value = 0.0;
      uniforms.uShockwave.value = 1.0;
    }
  }

  getPoints(): THREE.Points | null {
    return this.points;
  }

  dispose() {
    if (this.points) {
      this.scene.remove(this.points);
      this.points = null;
    }

    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }

    if (this.material) {
      this.material.dispose();
      this.material = null;
    }

    if (this.audioTexture) {
      this.audioTexture.dispose();
      this.audioTexture = null;
    }

    this.audioDataArray = null;
  }
}
