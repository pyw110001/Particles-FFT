# FFT 驱动的 Three.js / WebGL 粒子声音可视化系统

这是一个基于 **React + Vite + TypeScript** 构建的高级 WebGL / Three.js 声音可视化交互项目。系统接入 Web Audio API 进行实时 FFT 频谱分析，将提取出的 Bass、Mid、Treble 等多频段能量数据以及鼓点检测（Beat Detection）映射至三维粒子的形态、色彩、光效和运动。

此外，项目还融合集成了基于 `ogl` 渲染的 **EvilEye (恶魔火焰之眼)** 着色器特效，支持全中文/英文双语一键切换以及科技感十足的 HUD 控制面板。

---

## 🌟 核心特性

1. **三维粒子系统 (Three.js)**
   * **Sphere (呼吸粒子球)**: 粒子受低频 Bass 呼吸脉动，受中频 Mid 产生表面流体噪声扭曲，高频 Treble 控制亮点细节闪烁。
   * **Tunnel (回旋穿梭隧道)**: 粒子沿 Z 轴管状排布并无限向前循环推进，中频声浪控制扭转倾角。
   * **Waveform (时空声波场)**: 在 XZ 平面上以粒子网格绘制三维地形，通过 WebGL `DataTexture` 动态向顶点着色器传入每一帧的音频频率及波形，实时起伏。

2. **魔焰之眼特效 (OGL + Shaders)**
   * 集成 React Bits 的 **EvilEye (恶魔火焰之眼)** 着色器，并彻底改写为**声音响应版**。
   * 眼睛随重低音产生心脏般跳动的缩放，周围火焰燃烧速度受高音细节控制，瞳孔在检测到节奏鼓点（Beat）时瞬时张缩。支持鼠标划过时的视线智能追踪。

3. **智能音频源处理 (Web Audio API)**
   * **本地音频上传**: 支持拖放（Drag & Drop）或点击上传本地 `.mp3`, `.wav`, `.ogg`, `.m4a` 音频文件，带有时序进度条和音量调节。
   * **麦克风拾音**: 实时接收外部麦克风输入，让粒子根据环境声音、说话、掌声等起伏。
   * **合成电子乐 (Synth Engine)**: 纯本地离线基于振荡器（Oscillator）与噪声发生器合成节奏音序器循环，无需任何网络即可开始舞动。

4. **精致 HUD 控制中心 (Glassmorphism UI)**
   * 全站采用深色半透明毛玻璃（HUD）微光边框视觉设计。
   * **中英双语切换**: 控制面板头部支持 [EN / 中文] 一键秒级翻译。
   * **隐藏界面/全屏模式**: 点击右上角 HIDE UI 或使用底部全屏按钮，控制台完全隐去，点击背景或按任意键一键还原，提供纯净沉浸式体验。
   * **画质降级**: 支持 Low (10k 粒子/关闭 Bloom 辉光以兼容低端设备)、Medium (30k 粒子)、High (80k 粒子) 三档动态调度。
   * **Debug 监控**: 左上角极速 DOM 监控面板，免 React 重绘性能开销直写显示当前渲染 FPS 及各频段电平。

---

## 🚀 快速开始

### 1. 克隆与安装依赖
首先确保您的电脑中已安装 [Node.js](https://nodejs.org/)。

```bash
# 进入项目目录
npm install
```

### 2. 启动开发服务器
```bash
npm run dev
```
启动后，浏览器会自动打开 `http://localhost:3000/` 开始体验。

### 3. 生成生产环境打包
```bash
npm run build
```
打包产物将保存在 `dist/` 文件夹中。

---

## 🛠️ 技术栈
* **核心**: React 18, Vite 5, TypeScript, Web Audio API
* **3D 引擎**: Three.js (r160), OGL
* **样式与图标**: CSS 3 (Backdrop-filter Glassmorphism), Lucide React
* **特效**: Custom GLSL Shaders (Vertex & Fragment)
