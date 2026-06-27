import React, { useRef, useEffect, useState } from 'react';
import { 
  Play, Pause, Square, Upload, Mic, MicOff, 
  Music, Volume2, VolumeX, Maximize2
} from 'lucide-react';
import { AudioEngine } from '../audio/AudioEngine';

interface PlaybackControlsProps {
  audioEngine: AudioEngine;
  isVisible: boolean;
  lang: 'zh' | 'en';
}

const translations = {
  zh: {
    micInputName: '🎙️ 实时麦克风拾音输入',
    synthDemoName: '🎹 离线合成节奏音乐 (开箱即用)',
    noAudioName: '未选择音轨 (请拖放或上传本地音频)',
    realtimeCapture: '实时外部声波捕获',
    proceduralLoop: '本地实时电子乐发生器',
    idle: '系统空闲呼吸动效',
    demoSynth: '本地合成演示',
    micInput: '麦克风拾音',
    uploadFile: '上传音频文件',
    fullscreen: '全屏模式',
    micErr: '无法访问麦克风。请确保在 HTTPS 环境下或本地 localhost 运行，并授予相应网页麦克风录音权限。'
  },
  en: {
    micInputName: '🎙️ Live Microphone Input Stream',
    synthDemoName: '🎹 Offline Synthesized Music Demo',
    noAudioName: 'No Track Selected (Drag & drop or upload local audio)',
    realtimeCapture: 'Realtime capture active',
    proceduralLoop: 'Procedural synthwave generator',
    idle: 'System idle breathing animation',
    demoSynth: 'Synth Demo',
    micInput: 'Mic Input',
    uploadFile: 'Upload Audio',
    fullscreen: 'Fullscreen',
    micErr: 'Failed to access microphone. Please ensure running in HTTPS or localhost environment, and grant microphone recording permission.'
  }
};

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({ 
  audioEngine, 
  isVisible,
  lang
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMic, setIsMic] = useState(false);
  const [isSynth, setIsSynth] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fileName, setFileName] = useState('');
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  
  const progressBarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[lang];

  // Sync state from audio engine
  const syncState = () => {
    setIsPlaying(audioEngine.isPlaying());
    setIsMic(audioEngine.isMicrophoneActive());
    setIsSynth(audioEngine.isSynthPlaying());
    setCurrentTime(audioEngine.getCurrentTime());
    setDuration(audioEngine.getDuration());
    setFileName(audioEngine.getFileName());
  };

  useEffect(() => {
    audioEngine.registerStateChangeCallback(syncState);
    syncState();

    const interval = setInterval(() => {
      if (audioEngine.isPlaying()) {
        setCurrentTime(audioEngine.getCurrentTime());
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [audioEngine]);

  const handlePlayPause = () => {
    if (isPlaying) {
      audioEngine.pause();
    } else {
      audioEngine.play();
    }
  };

  const handleStop = () => {
    audioEngine.stop();
  };

  const handleMicToggle = async () => {
    if (isMic) {
      audioEngine.disableMicrophone();
    } else {
      try {
        await audioEngine.enableMicrophone();
      } catch (err) {
        alert(t.micErr);
      }
    }
  };

  const handleSynthToggle = () => {
    if (isSynth) {
      audioEngine.disableSynth();
    } else {
      audioEngine.enableSynth();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await audioEngine.loadFile(files[0]);
      audioEngine.play();
    }
  };

  const triggerFileBrowser = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0 || isMic || isSynth) return;
    if (progressBarRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const percentage = Math.max(0, Math.min(1, clickX / width));
      audioEngine.seek(percentage);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    audioEngine.setVolume(isMuted ? 0 : newVol);
  };

  const toggleMute = () => {
    const muteState = !isMuted;
    setIsMuted(muteState);
    audioEngine.setVolume(muteState ? 0 : volume);
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!isVisible) return null;

  return (
    <div 
      className="hud-panel"
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 40px)',
        maxWidth: '800px',
        padding: '16px 20px',
        zIndex: 100
      }}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="audio/*" 
        style={{ display: 'none' }}
      />
      
      {/* 1. Track Info & Title */}
      <div className="hud-flex-between" style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isMic && <span className="pulse-indicator pulse-indicator-pink"></span>}
          {isSynth && <span className="pulse-indicator"></span>}
          <span 
            className="hud-value"
            style={{ 
              fontSize: '0.95rem',
              fontWeight: 600,
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {isMic ? t.micInputName : isSynth ? t.synthDemoName : fileName ? `🎵 ${fileName}` : t.noAudioName}
          </span>
        </div>
        <div className="hud-label" style={{ fontSize: '0.75rem', opacity: 0.8 }}>
          {isMic ? t.realtimeCapture : isSynth ? t.proceduralLoop : duration > 0 ? `${formatTime(currentTime)} / ${formatTime(duration)}` : t.idle}
        </div>
      </div>

      {/* 2. Timeline Progress Bar */}
      <div 
        ref={progressBarRef}
        className="progress-bar-container"
        onClick={handleProgressBarClick}
        style={{
          opacity: (isMic || isSynth || duration === 0) ? 0.3 : 1,
          cursor: (isMic || isSynth || duration === 0) ? 'default' : 'pointer'
        }}
      >
        <div 
          className="progress-bar-fill"
          style={{ width: `${progressPercent}%` }}
        ></div>
        <div 
          className="progress-bar-handle"
          style={{ left: `${progressPercent}%` }}
        ></div>
      </div>

      {/* 3. Controls Row */}
      <div className="hud-flex-between">
        {/* Left Side: Audio Inputs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`cyber-btn ${isSynth ? 'cyber-btn-active' : ''}`}
            onClick={handleSynthToggle}
            title={lang === 'zh' ? '播放合成节奏音乐 (离线演示)' : 'Play Synthesized Synthwave Beats (Offline Demo)'}
          >
            <Music size={15} /> {t.demoSynth}
          </button>
          
          <button 
            className={`cyber-btn ${isMic ? 'cyber-btn-active' : ''}`}
            onClick={handleMicToggle}
            title={lang === 'zh' ? '开启实时麦克风外部录音响应' : 'Enable Live Microphone Input'}
          >
            {isMic ? <MicOff size={15} /> : <Mic size={15} />}
            {t.micInput}
          </button>
          
          <button 
            className="cyber-btn"
            onClick={triggerFileBrowser}
            title={lang === 'zh' ? '上传本地音频 (.mp3, .wav, etc.)' : 'Upload local audio file (.mp3, .wav, etc.)'}
          >
            <Upload size={15} /> {t.uploadFile}
          </button>
        </div>

        {/* Center: Playback state controls (for file playback) */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="cyber-btn"
            onClick={handlePlayPause}
            disabled={duration === 0 || isMic || isSynth}
            style={{ 
              opacity: (duration === 0 || isMic || isSynth) ? 0.4 : 1,
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              padding: 0
            }}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          
          <button 
            className="cyber-btn"
            onClick={handleStop}
            disabled={duration === 0 || isMic || isSynth}
            style={{ 
              opacity: (duration === 0 || isMic || isSynth) ? 0.4 : 1,
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              padding: 0
            }}
          >
            <Square size={16} />
          </button>
        </div>

        {/* Right Side: Volume & Utilities */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button 
              onClick={toggleMute}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', padding: 0 }}
            >
              {(isMuted || volume === 0) ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input 
              type="range" 
              className="cyber-range" 
              style={{ width: '80px', margin: 0 }}
              min="0.0" 
              max="1.0" 
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
            />
          </div>

          <button 
            className="cyber-btn" 
            onClick={toggleFullScreen}
            style={{ padding: '8px', borderRadius: '8px' }}
            title={t.fullscreen}
          >
            <Maximize2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
