import React, { useState } from 'react';
import { 
  Settings, Sliders, Camera, ChevronDown, ChevronUp, 
  Sparkles, EyeOff
} from 'lucide-react';
import { VisualizerSceneSettings } from '../visualization/VisualizerScene';

interface ControlPanelProps {
  settings: VisualizerSceneSettings;
  onChange: (newSettings: Partial<VisualizerSceneSettings>) => void;
  onHideUI: () => void;
  isVisible: boolean;
}

const translations = {
  zh: {
    controlCenter: '控制中心',
    hideUI: '隐藏界面',
    visualStyle: '视觉模式与样式',
    renderMode: '渲染几何模式',
    threads: 'Threads (炫彩声波光缕)',
    tunnel: 'Tunnel (回旋穿梭隧道)',
    waveform: 'Waveform (时空声波场)',
    evileye: 'EvilEye (恶魔火焰之眼)',
    particleShape: '粒子几何外观',
    circle: 'Soft Glow Circle (圆形发光)',
    ring: 'Hologram Ring (科幻圆环)',
    star: 'Shining Cross Star (十字星光)',
    colorScheme: '频谱配色方案',
    frequency: 'Frequency Mapping (频段色彩)',
    energy: 'Volume Intensity (能量强度)',
    gradient: 'Liquid Rainbow (时空彩虹)',
    custom: 'Neon Cyberpunk (粉青霓虹)',
    particleSize: '粒子基础尺寸',
    audioReactivity: '声音灵敏度与增强',
    globalScale: '全局律动增幅',
    bassBoost: '重低音增强 (Bass)',
    midBoost: '中音区增强 (Mids)',
    trebleBoost: '高音细节增强 (Treble)',
    cameraRendering: '相机与画质渲染',
    particleDensity: '粒子质量数量档位',
    low: '低画质 (10k 粒子 / 关闭 Bloom)',
    medium: '中画质 (30k 粒子)',
    high: '高画质 (80k 粒子)',
    autoOrbit: '相机自动环绕旋转',
    bloom: 'Unreal Bloom 全局辉光',
    stats: '显示系统运行监测'
  },
  en: {
    controlCenter: 'Control Center',
    hideUI: 'Hide UI',
    visualStyle: 'Visual Modes & Style',
    renderMode: 'Render Mode',
    threads: 'Threads (Vibrant Waves)',
    tunnel: 'Tunnel (Infinite Space)',
    waveform: 'Waveform (Terrain Field)',
    evileye: 'EvilEye (Demonic Flame)',
    particleShape: 'Particle Shape',
    circle: 'Soft Glow Circle',
    ring: 'Hologram Ring',
    star: 'Shining Cross Star',
    colorScheme: 'Color Scheme',
    frequency: 'Frequency Mapping',
    energy: 'Volume Intensity',
    gradient: 'Liquid Rainbow',
    custom: 'Neon Cyberpunk',
    particleSize: 'Particle Size',
    audioReactivity: 'Audio Reactivity & Boosts',
    globalScale: 'Global Scale Multiplier',
    bassBoost: 'Bass Boost (Low-end)',
    midBoost: 'Mids Boost (Instruments)',
    trebleBoost: 'Treble Boost (Details)',
    cameraRendering: 'Camera & Rendering',
    particleDensity: 'Particle Density',
    low: 'Low (10k / Bloom Off)',
    medium: 'Medium (30k Particles)',
    high: 'High (80k Particles)',
    autoOrbit: 'Auto Orbit Camera',
    bloom: 'Unreal Bloom (Glow)',
    stats: 'Show System Stats'
  }
};

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  settings, 
  onChange, 
  onHideUI, 
  isVisible 
}) => {
  const [openSection, setOpenSection] = useState<'visual' | 'audio' | 'system' | null>('visual');

  const toggleSection = (section: 'visual' | 'audio' | 'system') => {
    setOpenSection(openSection === section ? null : section);
  };

  if (!isVisible) return null;

  const t = translations[settings.lang];

  return (
    <div 
      className="hud-panel hud-scroll"
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '320px',
        maxHeight: 'calc(100vh - 180px)',
        overflowY: 'auto',
        padding: '18px',
        zIndex: 100
      }}
    >
      <div className="hud-title hud-flex-between">
        <div style={{ display: 'flex', alignContent: 'center', gap: '8px' }}>
          <Settings size={18} style={{ color: 'var(--accent-cyan)' }} />
          <span>{t.controlCenter}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            className="cyber-btn"
            onClick={() => onChange({ lang: settings.lang === 'zh' ? 'en' : 'zh' })}
            style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
          >
            {settings.lang === 'zh' ? 'EN' : '中文'}
          </button>
          
          <button 
            className="cyber-btn" 
            onClick={onHideUI} 
            title={settings.lang === 'zh' ? '隐藏整个界面 (按任意键或点击背景即可重新唤醒)' : 'Hide entire UI (Press any key or click background to restore)'}
            style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
          >
            <EyeOff size={12} /> {t.hideUI}
          </button>
        </div>
      </div>

      {/* --- SECTION 1: VISUAL CONFIG --- */}
      <div style={{ marginBottom: '12px' }}>
        <button 
          className="hud-flex-between"
          onClick={() => toggleSection('visual')}
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '6px 0',
            borderBottom: '1px solid rgba(255,255,255,0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
            <Sparkles size={14} style={{ color: 'var(--accent-cyan)' }} />
            <span>{t.visualStyle}</span>
          </div>
          {openSection === 'visual' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {openSection === 'visual' && (
          <div style={{ paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <span className="hud-label">{t.renderMode}</span>
              <select 
                className="cyber-select" 
                value={settings.mode}
                onChange={e => onChange({ mode: e.target.value as any })}
              >
                <option value="threads">{t.threads}</option>
                <option value="tunnel">{t.tunnel}</option>
                <option value="waveform">{t.waveform}</option>
                <option value="evileye">{t.evileye}</option>
              </select>
            </div>

            <div>
              <span className="hud-label">{t.particleShape}</span>
              <select 
                className="cyber-select" 
                value={settings.shape}
                onChange={e => onChange({ shape: parseInt(e.target.value) })}
              >
                <option value={0}>{t.circle}</option>
                <option value={1}>{t.ring}</option>
                <option value={2}>{t.star}</option>
              </select>
            </div>

            <div>
              <span className="hud-label">{t.colorScheme}</span>
              <select 
                className="cyber-select" 
                value={settings.colorMode}
                onChange={e => onChange({ colorMode: parseInt(e.target.value) })}
              >
                <option value={0}>{t.frequency}</option>
                <option value={1}>{t.energy}</option>
                <option value={2}>{t.gradient}</option>
                <option value={3}>{t.custom}</option>
              </select>
            </div>

            <div className="hud-flex-between" style={{ marginTop: '5px' }}>
              <span className="hud-label">{t.particleSize}</span>
              <span className="hud-value">{settings.pointSize.toFixed(1)}</span>
            </div>
            <input 
              type="range" 
              className="cyber-range" 
              min="1.0" 
              max="6.0" 
              step="0.1" 
              value={settings.pointSize}
              onChange={e => onChange({ pointSize: parseFloat(e.target.value) })}
            />
          </div>
        )}
      </div>

      {/* --- SECTION 2: AUDIO SENSITIVITY --- */}
      <div style={{ marginBottom: '12px' }}>
        <button 
          className="hud-flex-between"
          onClick={() => toggleSection('audio')}
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '6px 0',
            borderBottom: '1px solid rgba(255,255,255,0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
            <Sliders size={14} style={{ color: 'var(--accent-pink)' }} />
            <span>{t.audioReactivity}</span>
          </div>
          {openSection === 'audio' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {openSection === 'audio' && (
          <div style={{ paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <div className="hud-flex-between">
                <span className="hud-label">{t.globalScale}</span>
                <span className="hud-value">{settings.intensity.toFixed(2)}</span>
              </div>
              <input 
                type="range" 
                className="cyber-range cyber-range-pink" 
                min="0.4" 
                max="2.5" 
                step="0.05" 
                value={settings.intensity}
                onChange={e => onChange({ intensity: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <div className="hud-flex-between">
                <span className="hud-label">{t.bassBoost}</span>
                <span className="hud-value">{settings.bassBoost.toFixed(2)}</span>
              </div>
              <input 
                type="range" 
                className="cyber-range cyber-range-pink" 
                min="0.5" 
                max="2.5" 
                step="0.05" 
                value={settings.bassBoost}
                onChange={e => onChange({ bassBoost: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <div className="hud-flex-between">
                <span className="hud-label">{t.midBoost}</span>
                <span className="hud-value">{settings.midBoost.toFixed(2)}</span>
              </div>
              <input 
                type="range" 
                className="cyber-range cyber-range-pink" 
                min="0.5" 
                max="2.5" 
                step="0.05" 
                value={settings.midBoost}
                onChange={e => onChange({ midBoost: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <div className="hud-flex-between">
                <span className="hud-label">{t.trebleBoost}</span>
                <span className="hud-value">{settings.trebleBoost.toFixed(2)}</span>
              </div>
              <input 
                type="range" 
                className="cyber-range cyber-range-pink" 
                min="0.5" 
                max="2.5" 
                step="0.05" 
                value={settings.trebleBoost}
                onChange={e => onChange({ trebleBoost: parseFloat(e.target.value) })}
              />
            </div>
          </div>
        )}
      </div>

      {/* --- SECTION 3: SYSTEM & BEAT CONFIG --- */}
      <div style={{ marginBottom: '5px' }}>
        <button 
          className="hud-flex-between"
          onClick={() => toggleSection('system')}
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '6px 0',
            borderBottom: '1px solid rgba(255,255,255,0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
            <Camera size={14} style={{ color: 'var(--accent-purple)' }} />
            <span>{t.cameraRendering}</span>
          </div>
          {openSection === 'system' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {openSection === 'system' && (
          <div style={{ paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <span className="hud-label">{t.particleDensity}</span>
              <select 
                className="cyber-select" 
                value={settings.particleQuality}
                onChange={e => onChange({ particleQuality: e.target.value as any })}
              >
                <option value="low">{t.low}</option>
                <option value="medium">{t.medium}</option>
                <option value="high">{t.high}</option>
              </select>
            </div>

            <div 
              className={`cyber-toggle ${settings.autoRotateCamera ? 'active' : ''}`}
              onClick={() => onChange({ autoRotateCamera: !settings.autoRotateCamera })}
            >
              <span className="cyber-toggle-label">{t.autoOrbit}</span>
              <div className="cyber-toggle-switch"></div>
            </div>

            <div 
              className={`cyber-toggle ${settings.bloomEnabled ? 'active' : ''}`}
              onClick={() => onChange({ bloomEnabled: !settings.bloomEnabled })}
            >
              <span className="cyber-toggle-label">{t.bloom}</span>
              <div className="cyber-toggle-switch"></div>
            </div>

            <div 
              className={`cyber-toggle ${settings.showDebugPanel ? 'active' : ''}`}
              onClick={() => onChange({ showDebugPanel: !settings.showDebugPanel })}
            >
              <span className="cyber-toggle-label">{t.stats}</span>
              <div className="cyber-toggle-switch"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
