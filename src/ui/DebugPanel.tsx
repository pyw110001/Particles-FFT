import React, { useEffect, useRef } from 'react';
import { AudioEngine } from '../audio/AudioEngine';

interface DebugPanelProps {
  audioEngine: AudioEngine;
  fpsRef: React.MutableRefObject<number>;
  isVisible: boolean;
  lang: 'zh' | 'en';
}

const translations = {
  zh: {
    telemetry: '系统状态监测',
    fps: '渲染帧率 (FPS)',
    volume: '全局音量',
    bass: '低频能量 (Bass)',
    mid: '中频能量 (Mid)',
    treble: '高频能量 (Treble)',
    beat: '鼓点检测触发'
  },
  en: {
    telemetry: 'System Telemetry',
    fps: 'FPS',
    volume: 'Overall Volume',
    bass: 'Bass (Low)',
    mid: 'Mid (Voice)',
    treble: 'Treble (High)',
    beat: 'Beat Trigger'
  }
};

export const DebugPanel: React.FC<DebugPanelProps> = ({ 
  audioEngine, 
  fpsRef, 
  isVisible,
  lang
}) => {
  const fpsSpan = useRef<HTMLSpanElement>(null);
  const volumeSpan = useRef<HTMLSpanElement>(null);
  const bassSpan = useRef<HTMLSpanElement>(null);
  const midSpan = useRef<HTMLSpanElement>(null);
  const trebleSpan = useRef<HTMLSpanElement>(null);
  const beatSpan = useRef<HTMLDivElement>(null);
  
  const t = translations[lang];

  useEffect(() => {
    let active = true;
    
    const updateStats = () => {
      if (!active) return;
      
      const now = performance.now();
      const audioData = audioEngine.getAnalysisData(now);
      
      if (fpsSpan.current) {
        fpsSpan.current.textContent = fpsRef.current.toString();
      }
      
      if (audioData) {
        if (volumeSpan.current) volumeSpan.current.textContent = audioData.volume.toFixed(3);
        if (bassSpan.current) bassSpan.current.textContent = audioData.bass.toFixed(3);
        if (midSpan.current) midSpan.current.textContent = audioData.mid.toFixed(3);
        if (trebleSpan.current) trebleSpan.current.textContent = audioData.treble.toFixed(3);
        
        if (beatSpan.current) {
          if (audioData.beatDetected) {
            beatSpan.current.className = 'pulse-indicator pulse-indicator-pink';
          } else {
            beatSpan.current.className = 'pulse-indicator';
          }
        }
      } else {
        if (volumeSpan.current) volumeSpan.current.textContent = '0.000';
        if (bassSpan.current) bassSpan.current.textContent = '0.000';
        if (midSpan.current) midSpan.current.textContent = '0.000';
        if (trebleSpan.current) trebleSpan.current.textContent = '0.000';
        if (beatSpan.current) beatSpan.current.className = 'pulse-indicator';
      }
      
      requestAnimationFrame(updateStats);
    };
    
    if (isVisible) {
      requestAnimationFrame(updateStats);
    }
    
    return () => {
      active = false;
    };
  }, [audioEngine, fpsRef, isVisible]);

  if (!isVisible) return null;

  return (
    <div 
      className="hud-panel"
      style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        width: '240px',
        padding: '15px',
        zIndex: 100,
        pointerEvents: 'none'
      }}
    >
      <div className="hud-title">
        <span className="pulse-indicator"></span> {t.telemetry}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="hud-flex-between">
          <span className="hud-label">{t.fps}</span>
          <span ref={fpsSpan} className="hud-value" style={{ color: '#00ff66' }}>0</span>
        </div>
        <div className="hud-flex-between">
          <span className="hud-label">{t.volume}</span>
          <span ref={volumeSpan} className="hud-value">0.000</span>
        </div>
        <div className="hud-flex-between">
          <span className="hud-label">{t.bass}</span>
          <span ref={bassSpan} className="hud-value">0.000</span>
        </div>
        <div className="hud-flex-between">
          <span className="hud-label">{t.mid}</span>
          <span ref={midSpan} className="hud-value">0.000</span>
        </div>
        <div className="hud-flex-between">
          <span className="hud-label">{t.treble}</span>
          <span ref={trebleSpan} className="hud-value">0.000</span>
        </div>
        <div className="hud-flex-between" style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '8px', marginTop: '4px' }}>
          <span className="hud-label">{t.beat}</span>
          <div ref={beatSpan} className="pulse-indicator"></div>
        </div>
      </div>
    </div>
  );
};
