import React, { useEffect, useRef, useState } from 'react';
import { AudioEngine } from './audio/AudioEngine';
import { VisualizerScene, VisualizerSceneSettings } from './visualization/VisualizerScene';
import { HUDLayout } from './ui/HUDLayout';
import EvilEye from './visualization/EvilEye';

export const App: React.FC = () => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  
  // Singletons
  const audioEngine = useRef(new AudioEngine()).current;
  const visualizerScene = useRef(new VisualizerScene()).current;
  const fpsRef = useRef<number>(0);

  // Settings state management
  const [settings, setSettings] = useState<VisualizerSceneSettings>({
    mode: 'sphere',
    particleQuality: 'medium',
    intensity: 1.0,
    pointSize: 3.0,
    bassBoost: 1.2,
    midBoost: 1.0,
    trebleBoost: 1.0,
    shape: 0, // Circle
    colorMode: 0, // Frequency
    autoRotateCamera: true,
    bloomEnabled: true,
    showDebugPanel: true,
    lang: 'zh'
  });

  // Keep setting values synced with window globally for Three.js render thread to read synchronously
  useEffect(() => {
    (window as any).visualizerSettings = settings;
  }, [settings]);

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    // Initialize 3D Visualizer Scene
    visualizerScene.init(
      canvasContainerRef.current, 
      (timestamp) => audioEngine.getAnalysisData(timestamp)
    );

    // Sync fpsRef in visualizer scene
    (visualizerScene as any).fpsRef = fpsRef;

    // Start rendering loops
    visualizerScene.start();

    // Resize Handler
    const handleResize = () => {
      visualizerScene.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      visualizerScene.dispose();
      audioEngine.stop();
      audioEngine.disableMicrophone();
      audioEngine.disableSynth();
    };
  }, [audioEngine, visualizerScene]);

  const handleSettingsChange = (newSettings: Partial<VisualizerSceneSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...newSettings
    }));
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#000' }}>
      {/* 3D Canvas Mount Point */}
      <div 
        ref={canvasContainerRef} 
        style={{ 
          width: '100%', 
          height: '100%', 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          zIndex: 1,
          display: settings.mode !== 'evileye' ? 'block' : 'none'
        }} 
      />

      {/* Evil Eye visualizer */}
      <EvilEye
        isActive={settings.mode === 'evileye'}
        audioEngine={audioEngine}
        eyeColor="#ff6f37"
        backgroundColor="#120f17"
        intensity={1.2}
        pupilSize={0.7}
        irisWidth={0.2}
        glowIntensity={0.25}
        scale={0.8}
      />

      {/* Custom Cyberpunk HUD Panels Overlay */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {/* Enable mouse pointer events specifically for overlays */}
        <div style={{ pointerEvents: 'auto' }}>
          <HUDLayout
            audioEngine={audioEngine}
            fpsRef={fpsRef}
            settings={settings}
            onSettingsChange={handleSettingsChange}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
