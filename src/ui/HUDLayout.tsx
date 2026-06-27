import React, { useState, useEffect } from 'react';
import { PlaybackControls } from './PlaybackControls';
import { ControlPanel } from './ControlPanel';
import { DebugPanel } from './DebugPanel';
import { AudioEngine } from '../audio/AudioEngine';
import { VisualizerSceneSettings } from '../visualization/VisualizerScene';
import { Eye } from 'lucide-react';

interface HUDLayoutProps {
  audioEngine: AudioEngine;
  fpsRef: React.MutableRefObject<number>;
  settings: VisualizerSceneSettings;
  onSettingsChange: (newSettings: Partial<VisualizerSceneSettings>) => void;
}

const translations = {
  zh: {
    dropTitle: '拖放音频文件至此',
    dropFormats: '支持 MP3, WAV, OGG, M4A 格式',
    dropError: '请拖放有效的音频文件！',
    hudHidden: '界面已隐藏 (点击背景或按任意键恢复)',
    hudRestored: '界面控制台已恢复'
  },
  en: {
    dropTitle: 'Drop Audio File Here',
    dropFormats: 'Supports MP3, WAV, OGG, M4A',
    dropError: 'Please drop a valid audio file!',
    hudHidden: 'HUD HIDDEN (Click background or press key to restore)',
    hudRestored: 'HUD Console Restored'
  }
};

export const HUDLayout: React.FC<HUDLayoutProps> = ({
  audioEngine,
  fpsRef,
  settings,
  onSettingsChange
}) => {
  const [isUIVisible, setIsUIVisible] = useState(true);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [showHelperTooltip, setShowHelperTooltip] = useState(false);

  const t = translations[settings.lang];

  // Toggle UI with any keystroke or screen click when hidden
  useEffect(() => {
    const handleGlobalTrigger = () => {
      if (!isUIVisible) {
        setIsUIVisible(true);
        setShowHelperTooltip(true);
        setTimeout(() => setShowHelperTooltip(false), 3000);
      }
    };

    window.addEventListener('keydown', handleGlobalTrigger);
    window.addEventListener('click', handleGlobalTrigger);

    return () => {
      window.removeEventListener('keydown', handleGlobalTrigger);
      window.removeEventListener('click', handleGlobalTrigger);
    };
  }, [isUIVisible]);

  // Drag and Drop File Handlers
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingFile(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (e.clientX === 0 && e.clientY === 0) {
        setIsDraggingFile(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingFile(false);
      
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('audio/')) {
          await audioEngine.loadFile(file);
          audioEngine.play();
        } else {
          alert(t.dropError);
        }
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [audioEngine, t.dropError]);

  const handleHideUI = () => {
    setIsUIVisible(false);
  };

  return (
    // Stop click events on any HUD components from bubbling up to the window listener
    <div onClick={(e) => e.stopPropagation()}>
      {/* 1. Drag & Drop Visual Overlay */}
      {isDraggingFile && (
        <div className="dropzone-overlay">
          <div 
            className="hud-panel"
            style={{
              padding: '40px 60px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '15px'
            }}
          >
            <div style={{ fontSize: '3rem' }}>🎵</div>
            <div className="hud-title" style={{ border: 'none', padding: 0, margin: 0, fontSize: '1.5rem' }}>
              {t.dropTitle}
            </div>
            <div className="hud-label">{t.dropFormats}</div>
          </div>
        </div>
      )}

      {/* 2. Hidden Overlay Prompt Tooltip */}
      {!isUIVisible && (
        <div 
          style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            opacity: 0.5,
            transition: 'opacity 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0,0,0,0.4)',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-hud)',
            letterSpacing: '1px'
          }}
        >
          <Eye size={12} /> {t.hudHidden}
        </div>
      )}

      {/* 3. Floating Restore Help Tooltip */}
      {isUIVisible && showHelperTooltip && (
        <div 
          style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            background: 'rgba(0, 242, 254, 0.1)',
            border: '1px solid var(--accent-cyan)',
            boxShadow: 'var(--glow-cyan)',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            zIndex: 1000,
            animation: 'fadeIn 0.3s ease forwards'
          }}
        >
          {t.hudRestored}
        </div>
      )}

      {/* 4. Left Top Debug Panel */}
      <DebugPanel 
        audioEngine={audioEngine} 
        fpsRef={fpsRef} 
        isVisible={isUIVisible && settings.showDebugPanel} 
        lang={settings.lang}
      />

      {/* 5. Right Top Parameter Control Panel */}
      <ControlPanel 
        settings={settings} 
        onChange={onSettingsChange} 
        onHideUI={handleHideUI} 
        isVisible={isUIVisible} 
      />

      {/* 6. Bottom Floating Playback Player */}
      <PlaybackControls 
        audioEngine={audioEngine} 
        isVisible={isUIVisible} 
        lang={settings.lang}
      />
    </div>
  );
};
