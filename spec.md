# SPEC.md｜FFT 驱动的 Three.js / WebGL 粒子声音可视化项目

## 1\. 项目概述

本项目是在现有 WebGL / Three.js 粒子系统基础上，接入 Web Audio API，通过 FFT 频谱分析实现声音可视化。系统需要支持本地音频上传、实时频谱分析、频段能量提取、节奏 / 鼓点检测，并将音频特征映射到粒子的形态、运动、颜色、亮度、缩放、爆发和相机反馈上。

目标不是做一个简单的频谱柱状图，而是做一个具有舞台感、空间感和节奏响应的粒子视觉系统，可用于网页展示、互动装置、大屏投影、音乐游戏背景或实时声音互动场景。

\---

## 2\. 项目目标

### 2.1 核心目标

1. 接入音频上传与播放能力。
2. 使用 Web Audio API 的 `AnalyserNode` 获取 FFT 频谱数据。
3. 将频谱数据划分为 Bass、Low Mid、Mid、High Mid、Treble 等频段。
4. 将不同频段映射到 Three.js 粒子的不同视觉参数。
5. 实现 Beat Detection，让鼓点触发粒子爆发、冲击波、颜色闪变或相机轻微震动。
6. 提供至少 3 种可视化模式。
7. 保持较高帧率，适合 WebGL 实时运行。
8. 预留麦克风输入和音游级节奏点预分析扩展能力。

### 2.2 最终体验

用户打开页面后，默认看到黑色背景上的动态粒子系统。上传音乐并播放后，粒子会随着音乐实时变化：低频控制整体脉冲和爆发，中频控制粒子流动和形态扭曲，高频控制闪烁、亮点和细节变化。鼓点出现时，系统会触发明显的视觉冲击波，使视觉效果与音乐节奏强绑定。

\---

## 3\. 技术栈

### 3.1 必选技术

* Three.js
* WebGL
* Web Audio API
* FFT / AnalyserNode
* TypeScript 或 JavaScript
* Vite / React / Vanilla JS，根据现有项目结构选择

### 3.2 推荐技术

* `THREE.BufferGeometry`
* `THREE.Points`
* `THREE.ShaderMaterial`
* GLSL Shader
* Postprocessing Bloom
* lil-gui / Leva / dat.GUI，用于调试参数

### 3.3 不推荐方案

不建议使用大量独立 Mesh 作为粒子，因为性能较差。粒子系统应优先使用 `BufferGeometry + Points + ShaderMaterial`，尽可能将动画计算放到 GPU 中完成。

\---

## 4\. 功能范围

## 4.1 MVP 必须实现

### F01｜音频上传

用户可以上传本地音频文件。

支持格式：

* `.mp3`
* `.wav`
* `.ogg`
* `.m4a`，在浏览器支持时启用

上传后系统需要：

1. 创建或恢复 `AudioContext`。
2. 解码音频文件。
3. 创建音频播放源。
4. 连接到 `AnalyserNode`。
5. 连接到扬声器输出。
6. 开始播放并实时分析音频。

\---

### F02｜播放控制

需要提供基础播放控制：

* 播放
* 暂停
* 停止
* 重新播放
* 当前播放进度
* 当前时间 / 总时长

浏览器自动播放限制需要处理，`AudioContext` 必须由用户点击上传、播放等交互后启动。

\---

### F03｜FFT 实时分析

使用 Web Audio API 的 `AnalyserNode` 获取频谱数据。

推荐默认参数：

```ts
analyser.fftSize = 2048;
analyser.smoothingTimeConstant = 0.75;
analyser.minDecibels = -90;
analyser.maxDecibels = -10;
```

需要每帧获取：

```ts
const frequencyData = new Uint8Array(analyser.frequencyBinCount);
const timeDomainData = new Uint8Array(analyser.frequencyBinCount);

analyser.getByteFrequencyData(frequencyData);
analyser.getByteTimeDomainData(timeDomainData);
```

\---

### F04｜频段能量提取

将 FFT 数据划分为以下频段：

|频段|频率范围|主要用途|
|-|-:|-|
|Bass|20–150 Hz|鼓点、脉冲、整体缩放、爆发|
|Low Mid|150–500 Hz|粒子厚度、局部扩张|
|Mid|500–2000 Hz|流动速度、形态扰动|
|High Mid|2000–6000 Hz|边缘噪声、局部闪烁|
|Treble|6000–16000 Hz|星点、亮度、粒子细节|

所有频段结果需要归一化为 `0–1`。

输出数据结构：

```ts
type FrequencyBands = {
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  treble: number;
};
```

\---

### F05｜音频分析数据结构

每帧输出统一的音频分析对象。

```ts
type AudioAnalysisData = {
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
```

\---

### F06｜Beat Detection 鼓点检测

使用低频能量变化进行基础鼓点检测。

基础逻辑：

```ts
const bassDelta = currentBass - previousBass;

if (
  currentBass > beatThreshold \&\&
  bassDelta > beatSensitivity \&\&
  now - lastBeatTime > beatCooldown
) {
  beatDetected = true;
  beatStrength = currentBass;
  lastBeatTime = now;
}
```

推荐默认参数：

|参数|默认值|说明|
|-|-:|-|
|`beatThreshold`|`0.65`|低频触发阈值|
|`beatSensitivity`|`0.18`|低频变化灵敏度|
|`beatCooldown`|`180ms`|鼓点触发冷却时间|

Beat 输出结构：

```ts
type BeatData = {
  detected: boolean;
  strength: number;
  timestamp: number;
};
```

\---

## 5\. 视觉系统

## 5.1 粒子系统基础要求

粒子系统应基于 Three.js 实现：

```ts
const geometry = new THREE.BufferGeometry();
const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});
const points = new THREE.Points(geometry, material);
```

\---

## 5.2 粒子数量质量档位

|质量档位|粒子数量|目标设备|
|-|-:|-|
|Low|10,000|普通笔记本 / 移动端|
|Medium|30,000|主流笔记本|
|High|80,000+|独显设备 / 展厅主机|

默认：

```ts
particleCount = 30000;
```

系统应支持运行时切换质量档位，但切换时要正确释放旧 geometry 和 material，避免内存泄漏。

\---

## 5.3 粒子属性

每个粒子至少包含以下 attribute：

```ts
type ParticleAttributes = {
  position: Float32Array;
  basePosition: Float32Array;
  random: Float32Array;
  size: Float32Array;
  frequencyBand: Float32Array;
};
```

Shader attribute 建议：

```glsl
attribute vec3 aBasePosition;
attribute float aRandom;
attribute float aSize;
attribute float aFrequencyBand;
```

\---

## 5.4 Shader Uniforms

Shader 需要接收以下音频和控制参数：

```ts
const uniforms = {
  uTime: { value: 0 },
  uDeltaTime: { value: 0 },

  uVolume: { value: 0 },
  uBass: { value: 0 },
  uLowMid: { value: 0 },
  uMid: { value: 0 },
  uHighMid: { value: 0 },
  uTreble: { value: 0 },

  uBeat: { value: 0 },
  uBeatStrength: { value: 0 },
  uShockwave: { value: 0 },

  uIntensity: { value: 1 },
  uPointSize: { value: 3 },
  uColorMode: { value: 0 },

  uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
};
```

\---

## 6\. 音频到视觉的映射规则

## 6.1 总体映射

|音频特征|视觉映射|
|-|-|
|`volume`|整体亮度、基础能量、镜头推进|
|`bass`|整体缩放、爆发、冲击波、低频脉冲|
|`lowMid`|粒子厚度、局部扩张、形体丰满度|
|`mid`|流动速度、噪声扰动、旋转幅度|
|`highMid`|边缘闪烁、细小扰动、碎片变化|
|`treble`|粒子尺寸、星点闪烁、高光细节|
|`beatDetected`|瞬时爆炸、颜色跳变、相机震动|

\---

## 6.2 粒子整体缩放

```ts
const targetScale = 1.0 + audioData.bass \* 0.8 \* settings.bassBoost;
particleGroup.scale.setScalar(lerp(currentScale, targetScale, 0.12));
```

效果要求：

* 低频增强时粒子整体向外扩张。
* 鼓点之后粒子应平滑回落。
* 不允许出现突兀抖动。

\---

## 6.3 粒子尺寸变化

```ts
const pointSize = basePointSize + audioData.treble \* 6.0 \* settings.trebleBoost;
material.uniforms.uPointSize.value = pointSize;
```

效果要求：

* 高频越强，粒子越锐利、越闪烁。
* 高频较弱时，粒子保持柔和状态。

\---

## 6.4 粒子扰动

```ts
const distortion = audioData.mid \* 2.0 \* settings.midBoost;
material.uniforms.uMid.value = distortion;
```

效果要求：

* 中频推动粒子产生流体感、噪声位移和形态扭曲。
* 不要让粒子完全失控或散成无意义噪声。

\---

## 6.5 亮度与透明度

```ts
const brightness = 0.35 + audioData.volume \* 1.5 \* settings.intensity;
material.uniforms.uVolume.value = brightness;
```

效果要求：

* 音量越大，整体越亮。
* 静音时仍保留 idle 可视状态，不完全黑屏。

\---

## 6.6 Beat 冲击波

当 `beatDetected === true` 时触发冲击波。

```ts
if (audioData.beatDetected) {
  shockwave.start(audioData.beatStrength);
}
```

视觉表现：

1. 从中心向外扩散一圈粒子波。
2. 粒子短暂加速向外扩张。
3. 画面亮度短暂提升。
4. 可选：相机轻微震动。
5. 可选：颜色产生一次瞬时偏移。

\---

## 7\. 可视化模式

系统至少实现以下 3 种模式。

\---

## 7.1 Mode 1｜Frequency Sphere

### 描述

粒子构成一个 3D 球体，音乐驱动球体呼吸、膨胀、扭曲和爆发。

### 映射规则

|音频特征|视觉效果|
|-|-|
|Bass|球体半径脉冲|
|Mid|球体表面扰动|
|Treble|粒子闪烁和点大小|
|Beat|球体向外爆发|

### 默认效果

* 黑色背景。
* 中心粒子球缓慢旋转。
* 鼓点出现时球体快速膨胀再回落。
* 高频出现时球体表面出现细碎亮点。

\---

## 7.2 Mode 2｜Audio Tunnel

### 描述

粒子形成一个纵深隧道，类似穿梭空间。音乐驱动隧道速度、旋转和脉冲。

### 映射规则

|音频特征|视觉效果|
|-|-|
|Bass|隧道半径周期性扩张|
|Mid|隧道旋转速度|
|Treble|远处星点闪烁|
|Beat|镜头向前推进 / 冲击感|

### 默认效果

* 粒子沿 Z 轴形成环形隧道。
* 中频越强，隧道旋转越明显。
* 鼓点触发时，隧道瞬间前冲。

\---

## 7.3 Mode 3｜Waveform Field

### 描述

粒子形成声波场或频谱地形，直观展示频率能量变化。

### 映射规则

|音频特征|视觉效果|
|-|-|
|Frequency Bin|X 轴频率分布|
|Energy|Y 轴高度|
|Time|Z 轴历史推进|
|Beat|整体波面抬升|

### 默认效果

* X 轴表示频率。
* Y 轴表示频率能量。
* Z 轴形成时间拖尾。
* 更偏技术展示和音频分析风格。

\---

## 8\. UI / 交互需求

## 8.1 基础 UI

页面需要提供：

1. 音频上传按钮。
2. 播放 / 暂停按钮。
3. 停止 / 重播按钮。
4. 当前播放时间。
5. 播放进度条。
6. 可视化模式切换。
7. 粒子质量切换。
8. 全屏按钮。
9. 显示 / 隐藏控制面板按钮。

\---

## 8.2 参数控制面板

需要支持以下参数：

```ts
type VisualizerSettings = {
  mode: 'sphere' | 'tunnel' | 'waveform';
  particleQuality: 'low' | 'medium' | 'high';
  particleCount: number;

  intensity: number;
  bassBoost: number;
  midBoost: number;
  trebleBoost: number;

  beatThreshold: number;
  beatSensitivity: number;
  beatCooldown: number;

  colorMode: 'frequency' | 'energy' | 'gradient' | 'custom';
  autoRotateCamera: boolean;
  bloomEnabled: boolean;
  showDebugPanel: boolean;
};
```

默认参数：

```ts
const defaultSettings: VisualizerSettings = {
  mode: 'sphere',
  particleQuality: 'medium',
  particleCount: 30000,

  intensity: 1.0,
  bassBoost: 1.2,
  midBoost: 1.0,
  trebleBoost: 1.0,

  beatThreshold: 0.65,
  beatSensitivity: 0.18,
  beatCooldown: 180,

  colorMode: 'frequency',
  autoRotateCamera: true,
  bloomEnabled: true,
  showDebugPanel: false
};
```

\---

## 8.3 Debug 信息

开发模式下可显示：

* FPS
* 当前音量
* Bass / Mid / Treble 数值
* Beat 状态
* 粒子数量
* 当前模式
* 当前 FFT Size

\---

## 9\. 视觉风格

## 9.1 默认视觉方向

整体风格应为：

* 黑色背景
* 高对比粒子
* 发光感
* 空间深度
* 音乐驱动
* 流体感
* 舞台视觉感
* 适合大屏展示

\---

## 9.2 色彩策略

默认使用频段映射色彩：

|频段|推荐色彩|
|-|-|
|Bass|深蓝 / 紫 / 红|
|Mid|青色 / 蓝绿|
|Treble|白色 / 金色 / 电光蓝|
|Beat|瞬时白色高亮或红色闪光|

\---

## 9.3 后期效果

建议支持：

* Bloom
* Additive Blending
* Vignette，可选
* Motion Trail，可选
* Film Grain，可选
* Chromatic Aberration，可选，但不要过度使用

\---

## 10\. 系统架构

## 10.1 推荐目录结构

```txt
src/
  audio/
    AudioEngine.ts
    FFTAnalyzer.ts
    BeatDetector.ts
    frequencyBands.ts

  visualization/
    VisualizerScene.ts
    ParticleSystem.ts
    VisualizerMode.ts
    modes/
      FrequencySphere.ts
      AudioTunnel.ts
      WaveformField.ts

  shaders/
    particle.vert
    particle.frag

  ui/
    AudioUploader.tsx
    PlaybackControls.tsx
    ControlPanel.tsx
    DebugPanel.tsx

  utils/
    math.ts
    performance.ts
    dispose.ts

  main.tsx
```

如果现有项目不是 React，可将 `.tsx` 文件改为普通 `.ts` 或 `.js`。

\---

## 10.2 数据流

```txt
Audio File / Microphone
        ↓
AudioContext
        ↓
AnalyserNode
        ↓
FFT Frequency Data
        ↓
Frequency Band Extraction
        ↓
Beat Detection
        ↓
AudioAnalysisData
        ↓
ParticleSystem uniforms / attributes
        ↓
Three.js Render Loop
        ↓
WebGL Visual Output
```

\---

## 11\. 核心类设计

## 11.1 AudioEngine

负责音频加载、播放、暂停和音频节点连接。

```ts
class AudioEngine {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private source: AudioBufferSourceNode | null;
  private gainNode: GainNode;

  loadFile(file: File): Promise<void>;
  play(): void;
  pause(): void;
  stop(): void;

  getAnalyser(): AnalyserNode;
  getCurrentTime(): number;
  getDuration(): number;
  isPlaying(): boolean;
}
```

\---

## 11.2 FFTAnalyzer

负责读取 FFT 数据，并输出归一化的音频分析结果。

```ts
class FFTAnalyzer {
  constructor(analyser: AnalyserNode);

  update(timestamp: number): AudioAnalysisData;
  getFrequencyData(): Uint8Array;
  getTimeDomainData(): Uint8Array;
  getBands(): FrequencyBands;
  getVolume(): number;
}
```

\---

## 11.3 BeatDetector

负责根据低频能量变化检测鼓点。

```ts
class BeatDetector {
  private previousBass: number;
  private lastBeatTime: number;

  update(bass: number, volume: number, timestamp: number): BeatData;
  setThreshold(value: number): void;
  setSensitivity(value: number): void;
  setCooldown(ms: number): void;
}
```

\---

## 11.4 ParticleSystem

负责粒子初始化、更新、模式切换和资源释放。

```ts
class ParticleSystem {
  init(count: number): void;
  update(audioData: AudioAnalysisData, deltaTime: number): void;
  setMode(mode: VisualizerMode): void;
  setQuality(quality: 'low' | 'medium' | 'high'): void;
  dispose(): void;
}
```

\---

## 11.5 VisualizerScene

负责 Three.js 场景、相机、渲染器、后期效果和主循环。

```ts
class VisualizerScene {
  init(container: HTMLElement): void;
  start(): void;
  stop(): void;
  resize(): void;
  update(audioData: AudioAnalysisData): void;
  dispose(): void;
}
```

\---

## 12\. 性能要求

## 12.1 帧率目标

|设备|目标帧率|
|-|-:|
|普通笔记本|45–60 FPS|
|独显设备|60 FPS|
|移动端|30 FPS 以上|

\---

## 12.2 性能策略

必须避免：

* 每帧创建新数组。
* 每帧创建新 Vector / Color / Object。
* 每帧重建 Geometry。
* 使用大量独立 Mesh 粒子。
* 大量 DOM 更新。
* 频繁 dispose / recreate 材质。

推荐做法：

* 复用 `Uint8Array`。
* 粒子动画尽量通过 Shader uniform 完成。
* 使用 `BufferGeometry`。
* 使用 `requestAnimationFrame` 驱动渲染。
* Bloom 分辨率可降级。
* 根据设备性能自动选择粒子数量。
* 页面不可见时暂停渲染或降低帧率。

\---

## 13\. 兼容性要求

目标浏览器：

* Chrome
* Edge
* Safari
* Firefox

注意：

1. `AudioContext` 需要由用户交互触发。
2. iOS Safari 对音频播放和 WebGL 性能限制较多，需要降级处理。
3. 音频文件应只在本地浏览器解析，不上传服务器。
4. 如果使用麦克风，需要 HTTPS 环境。

\---

## 14\. Idle 状态

当没有音频输入或音乐暂停时，系统不能黑屏，需要保留 idle 动效。

Idle 状态要求：

* 粒子缓慢旋转。
* 粒子有轻微呼吸感。
* 亮度保持较低水平。
* 不触发 Beat 效果。
* UI 提示用户上传音频。

\---

## 15\. 可扩展功能

## 15.1 麦克风输入

后续可支持实时麦克风输入：

```ts
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const source = audioContext.createMediaStreamSource(stream);
source.connect(analyser);
```

可用于：

* 鼓掌触发
* 人声互动
* 现场音乐响应
* 互动装置实时声音输入

\---

## 15.2 音频预分析

如果后续要用于音游或节奏强绑定场景，应增加离线音频预分析能力。

目标输出：

```json
{
  "bpm": 128,
  "beats": \[0.42, 0.89, 1.36, 1.83],
  "onsets": \[0.12, 0.48, 0.93],
  "sections": \[
    {
      "start": 0,
      "end": 32,
      "energy": "low"
    },
    {
      "start": 32,
      "end": 64,
      "energy": "high"
    }
  ]
}
```

该功能不属于 MVP，但需要在架构上预留接口。

\---

## 15.3 Preset 系统

后续可以支持视觉预设：

```ts
type VisualPreset = {
  name: string;
  mode: VisualizerMode;
  settings: VisualizerSettings;
  colors: string\[];
};
```

示例：

* `Deep Bass Sphere`
* `Cyber Tunnel`
* `Minimal Waveform`
* `Ambient Particles`
* `Club Visual`

\---

## 16\. 验收标准

## 16.1 功能验收

|编号|验收项|标准|
|-|-|-|
|A01|音频上传|可以上传并播放本地 MP3 / WAV|
|A02|FFT 分析|播放时能实时获取频谱数据|
|A03|频段提取|能输出 bass / mid / treble 等归一化数据|
|A04|粒子响应|粒子运动明显受音乐驱动|
|A05|低频响应|鼓点出现时有明显脉冲或爆发|
|A06|高频响应|高频变化能影响粒子闪烁或细节|
|A07|Beat Detection|鼓点能触发独立视觉事件|
|A08|模式切换|至少支持 3 种可视化模式|
|A09|参数调节|可调强度、粒子数量、灵敏度|
|A10|播放控制|支持播放、暂停、停止、重播|
|A11|Idle 状态|没有音频时仍有基础粒子动效|
|A12|性能|默认模式下保持稳定帧率|

\---

## 16.2 视觉验收

|编号|验收项|标准|
|-|-|-|
|V01|黑底粒子效果|画面干净，粒子层次清晰|
|V02|节奏感|鼓点与粒子冲击基本同步|
|V03|空间感|粒子具备明显 3D 深度|
|V04|可读性|视觉不应混乱到无法识别结构|
|V05|大屏适配|16:9 画面下中心构图稳定|
|V06|视觉冲击|Beat 出现时有明显能量变化|

\---

## 16.3 性能验收

|编号|验收项|标准|
|-|-|-|
|P01|默认帧率|Medium 档位下主流笔记本可达到 45 FPS 以上|
|P02|内存稳定|长时间运行无明显内存泄漏|
|P03|切换稳定|模式切换不崩溃、不残留旧粒子|
|P04|音频稳定|暂停 / 重新播放后频谱分析正常|
|P05|Resize|浏览器窗口变化后画面比例正确|

\---

## 17\. 开发阶段

## Phase 1｜基础音频与 FFT 接入

目标：完成音频上传、播放和频谱分析。

任务：

1. 创建 `AudioEngine`。
2. 接入本地音频上传。
3. 创建 `AudioContext`。
4. 创建 `AnalyserNode`。
5. 获取 `frequencyData` 和 `timeDomainData`。
6. 实现 `FFTAnalyzer`。
7. 输出 `AudioAnalysisData`。

\---

## Phase 2｜基础粒子视觉响应

目标：让粒子系统能够响应音频数据。

任务：

1. 创建 `ParticleSystem`。
2. 使用 `BufferGeometry + Points` 生成粒子。
3. 将 `volume / bass / mid / treble` 传入 shader uniforms。
4. 实现粒子缩放、扰动、亮度和尺寸变化。
5. 实现 idle 动效。

\---

## Phase 3｜Beat Detection 与节奏强化

目标：让鼓点触发明确的视觉事件。

任务：

1. 创建 `BeatDetector`。
2. 基于低频能量变化检测鼓点。
3. 加入 beat cooldown 防抖。
4. 鼓点触发冲击波。
5. 鼓点触发短暂亮度增强。
6. 可选加入相机轻微震动。

\---

## Phase 4｜多模式可视化

目标：实现 3 种视觉模式。

任务：

1. 实现 `FrequencySphere`。
2. 实现 `AudioTunnel`。
3. 实现 `WaveformField`。
4. 增加模式切换 UI。
5. 切换时保留播放状态。

\---

## Phase 5｜UI、参数和性能优化

目标：形成可演示版本。

任务：

1. 增加控制面板。
2. 增加播放进度条。
3. 增加粒子质量切换。
4. 增加全屏模式。
5. 增加 FPS 显示。
6. 增加 Bloom 开关。
7. 优化内存释放和窗口 Resize。

\---

## 18\. 不做范围

当前版本不包含：

1. 后端音频上传与处理。
2. 云端音频分析。
3. 精确 BPM 自动识别。
4. 音游级 beat grid 编辑器。
5. MIDI 输入。
6. DMX 灯光控制。
7. 多人互动。
8. 复杂时间轴编辑器。

这些功能可作为后续版本扩展。

\---

## 19\. 实现指令摘要

请在现有 Three.js / WebGL 粒子项目中实现一个 FFT 驱动的声音可视化系统。系统需要支持本地音频上传和播放，通过 Web Audio API 的 AnalyserNode 获取实时 FFT 频谱数据，划分 bass、lowMid、mid、highMid、treble 等频段，并输出统一的 AudioAnalysisData。将不同频段映射到粒子的缩放、扰动、亮度、颜色、尺寸和速度上；使用低频能量变化实现 Beat Detection，鼓点触发粒子冲击波、瞬时爆发和亮度增强。粒子系统应使用 BufferGeometry、Points 和 ShaderMaterial 实现，避免大量独立 Mesh。项目至少包含 Frequency Sphere、Audio Tunnel、Waveform Field 三种可视化模式，并提供音频上传、播放暂停、模式切换、粒子质量、强度和灵敏度调节 UI。需要保证默认 30000 粒子在主流笔记本上稳定运行，并预留麦克风输入与离线音频预分析接口。

\---

## 20\. 推荐默认参数

```ts
export const DEFAULT\_AUDIO\_CONFIG = {
  fftSize: 2048,
  smoothingTimeConstant: 0.75,
  minDecibels: -90,
  maxDecibels: -10
};

export const DEFAULT\_BEAT\_CONFIG = {
  threshold: 0.65,
  sensitivity: 0.18,
  cooldown: 180
};

export const DEFAULT\_VISUALIZER\_SETTINGS = {
  mode: 'sphere',
  particleQuality: 'medium',
  particleCount: 30000,
  intensity: 1.0,
  bassBoost: 1.2,
  midBoost: 1.0,
  trebleBoost: 1.0,
  colorMode: 'frequency',
  autoRotateCamera: true,
  bloomEnabled: true,
  showDebugPanel: false
};
```

