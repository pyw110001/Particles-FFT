import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ParticleSystem, ParticleSystemSettings, ParticleQuality } from './ParticleSystem';
import { AudioAnalysisData } from '../audio/AudioEngine';

export interface VisualizerSceneSettings extends ParticleSystemSettings {
  mode: 'threads' | 'tunnel' | 'waveform' | 'evileye';
  particleQuality: ParticleQuality;
  autoRotateCamera: boolean;
  bloomEnabled: boolean;
  showDebugPanel: boolean;
  lang: 'zh' | 'en';
}

export class VisualizerScene {
  private container: HTMLElement | null = null;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  
  // Post-processing
  private composer!: EffectComposer;
  private bloomPass!: UnrealBloomPass;
  
  // Particle system
  private particleSystem!: ParticleSystem;
  
  // Animation state
  private clock = new THREE.Clock();
  private animationFrameId: number | null = null;
  private isRunning = false;
  
  // Mode transitioning
  private targetMode = 0.0;
  private interpolatedMode = 0.0;
  
  // Camera shake & auto-rotation
  private cameraShakeAmount = 0.0;
  private currentQuality: ParticleQuality = 'medium';
  private autoRotationAngle = 0.0;

  // Audio callback
  private getAudioAnalysisData: (timestamp: number) => AudioAnalysisData | null = () => null;

  // FPS tracking
  public fpsRef: React.MutableRefObject<number> | null = null;
  private lastFpsUpdate = 0;
  private frameCount = 0;
  private fps = 0;

  init(container: HTMLElement, getAudioAnalysisData: (timestamp: number) => AudioAnalysisData | null) {
    this.container = container;
    this.getAudioAnalysisData = getAudioAnalysisData;
    this.lastFpsUpdate = performance.now();
    this.frameCount = 0;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    this.scene = new THREE.Scene();
    // Dark space background
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.FogExp2(0x000000, 0.015);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 8);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    // 4. Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 25;
    this.controls.minDistance = 3;

    // 5. Particle System
    this.particleSystem = new ParticleSystem(this.scene);
    this.initParticlesForQuality('medium');

    // 6. Post-processing Bloom
    const renderPass = new RenderPass(this.scene, this.camera);
    
    // Default bloom parameters
    const bloomParams = {
      resolution: new THREE.Vector2(width, height),
      strength: 1.5,
      radius: 0.8,
      threshold: 0.15
    };
    
    this.bloomPass = new UnrealBloomPass(
      bloomParams.resolution, 
      bloomParams.strength, 
      bloomParams.radius, 
      bloomParams.threshold
    );

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderPass);
    this.composer.addPass(this.bloomPass);

    // Initial setup
    this.clock.getDelta();
  }

  private initParticlesForQuality(quality: ParticleQuality) {
    let count = 30000;
    if (quality === 'low') count = 10000;
    else if (quality === 'high') count = 80000;
    
    this.particleSystem.init(count);
    this.currentQuality = quality;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.getDelta(); // reset clock
    this.animate();
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  resize() {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.bloomPass.setSize(width, height);
  }

  // Target Mode mapping
  private updateTargetMode(mode: 'threads' | 'tunnel' | 'waveform') {
    if (mode === 'threads') this.targetMode = 0.0;
    else if (mode === 'tunnel') this.targetMode = 1.0;
    else if (mode === 'waveform') this.targetMode = 2.0;
  }

  private animate = () => {
    if (!this.isRunning) return;
    this.animationFrameId = requestAnimationFrame(this.animate);
    
    const deltaTime = Math.min(this.clock.getDelta(), 0.1); // Limit deltaTime to prevent physics jumps
    const now = performance.now();

    // Calculate FPS
    this.frameCount++;
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
      if (this.fpsRef) {
        this.fpsRef.current = this.fps;
      }
    }
    
    // Fetch real-time audio statistics
    const audioData = this.getAudioAnalysisData(now);

    // Read current settings (attached dynamically by App layer)
    const settings = (window as any).visualizerSettings as VisualizerSceneSettings;
    if (settings) {
      // 1. Check if quality changed
      if (settings.particleQuality !== this.currentQuality) {
        this.initParticlesForQuality(settings.particleQuality);
      }

      if (settings.mode === 'evileye' || settings.mode === 'threads') {
        return;
      }

      // 2. Interpolate uMode for smooth transitions
      this.updateTargetMode(settings.mode);
      // Lerp transition
      const modeDiff = this.targetMode - this.interpolatedMode;
      if (Math.abs(modeDiff) > 0.001) {
        this.interpolatedMode += modeDiff * deltaTime * 3.5; // Takes ~1s to switch
      } else {
        this.interpolatedMode = this.targetMode;
      }

      // 3. Update particle system uniforms
      this.particleSystem.update(audioData, deltaTime, settings, this.interpolatedMode);

      // 4. Camera Auto-Rotation
      if (settings.autoRotateCamera) {
        this.autoRotationAngle += deltaTime * 0.06; // Slow rot
        
        // Sphere and Waveform styles rotate differently
        if (settings.mode === 'waveform') {
          // Orthogonal sweep for terrain
          const radius = 10.0;
          this.camera.position.x = Math.sin(this.autoRotationAngle) * radius;
          this.camera.position.z = Math.cos(this.autoRotationAngle) * radius;
          this.camera.position.y = 5.0 + Math.sin(this.autoRotationAngle * 0.5) * 2.0;
          this.camera.lookAt(0, 0, 0);
        } else {
          // Tunnel mode: Keep camera centered looking straight down the Z tube, with slight banking
          this.camera.position.set(0, 0, 8);
          this.camera.rotation.z = this.autoRotationAngle * 0.5;
        }
      }

      // 5. Camera Beat Shake
      if (audioData && audioData.beatDetected) {
        this.cameraShakeAmount = audioData.beatStrength * 0.35;
      }

      if (this.cameraShakeAmount > 0.005) {
        this.camera.position.x += (Math.random() - 0.5) * this.cameraShakeAmount;
        this.camera.position.y += (Math.random() - 0.5) * this.cameraShakeAmount;
        this.cameraShakeAmount *= 0.9; // Fast damp
      }

      // 6. Adjust Bloom Intensity dynamically based on volume / beat
      if (audioData) {
        this.bloomPass.strength = 1.0 + audioData.volume * 2.0 * settings.intensity;
        if (audioData.beatDetected) {
          this.bloomPass.strength += audioData.beatStrength * 1.5;
        }
      } else {
        this.bloomPass.strength = 1.0;
      }

      // 7. Render Pass
      this.controls.update();

      const runBloom = settings.bloomEnabled && settings.particleQuality !== 'low';
      if (runBloom) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    } else {
      // Basic fallback render if settings not loaded yet
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    }
  };

  getScene(): THREE.Scene {
    return this.scene;
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this.resize);
    
    if (this.particleSystem) {
      this.particleSystem.dispose();
    }

    if (this.controls) {
      this.controls.dispose();
    }

    if (this.renderer && this.container) {
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer.dispose();
    }

    if (this.composer) {
      this.composer.dispose();
    }
  }
}
