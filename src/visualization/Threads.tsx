import { Renderer, Program, Mesh, Triangle } from 'ogl';
import { useEffect, useRef } from 'react';
import { AudioEngine } from '../audio/AudioEngine';

interface ThreadsProps {
  color?: [number, number, number];
  amplitude?: number;
  distance?: number;
  enableMouseInteraction?: boolean;
  audioEngine?: AudioEngine;
  isActive?: boolean;
}

const vertexShader = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec3 iResolution;
uniform vec3 uColor;
uniform float uAmplitude;
uniform float uDistance;
uniform vec2 uMouse;

#define PI 3.1415926538

const int u_line_count = 40;
const float u_line_width = 7.0;
const float u_line_blur = 10.0;

float Perlin2D(vec2 P) {
    vec2 Pi = floor(P);
    vec4 Pf_Pfmin1 = P.xyxy - vec4(Pi, Pi + 1.0);
    vec4 Pt = vec4(Pi.xy, Pi.xy + 1.0);
    Pt = Pt - floor(Pt * (1.0 / 71.0)) * 71.0;
    Pt += vec2(26.0, 161.0).xyxy;
    Pt *= Pt;
    Pt = Pt.xzxz * Pt.yyww;
    vec4 hash_x = fract(Pt * (1.0 / 951.135664));
    vec4 hash_y = fract(Pt * (1.0 / 642.949883));
    vec4 grad_x = hash_x - 0.49999;
    vec4 grad_y = hash_y - 0.49999;
    vec4 grad_results = inversesqrt(grad_x * grad_x + grad_y * grad_y)
        * (grad_x * Pf_Pfmin1.xzxz + grad_y * Pf_Pfmin1.yyww);
    grad_results *= 1.4142135623730950;
    vec2 blend = Pf_Pfmin1.xy * Pf_Pfmin1.xy * Pf_Pfmin1.xy
               * (Pf_Pfmin1.xy * (Pf_Pfmin1.xy * 6.0 - 15.0) + 10.0);
    vec4 blend2 = vec4(blend, vec2(1.0 - blend));
    return dot(grad_results, blend2.zxzx * blend2.wwyy);
}

float pixel(float count, vec2 resolution) {
    return (1.0 / max(resolution.x, resolution.y)) * count;
}

float lineFn(vec2 st, float width, float perc, float offset, vec2 mouse, float time, float amplitude, float distance) {
    float split_offset = (perc * 0.4);
    float split_point = 0.1 + split_offset;

    float amplitude_normal = smoothstep(split_point, 0.7, st.x);
    float amplitude_strength = 0.5;
    float finalAmplitude = amplitude_normal * amplitude_strength
                           * amplitude * (1.0 + (mouse.y - 0.5) * 0.2);

    float time_scaled = time / 10.0 + (mouse.x - 0.5) * 1.0;
    float blur = smoothstep(split_point, split_point + 0.05, st.x) * perc;

    float xnoise = mix(
        Perlin2D(vec2(time_scaled, st.x + perc) * 2.5),
        Perlin2D(vec2(time_scaled, st.x + time_scaled) * 3.5) / 1.5,
        st.x * 0.3
    );

    float y = 0.5 + (perc - 0.5) * distance + xnoise / 2.0 * finalAmplitude;

    float line_start = smoothstep(
        y + (width / 2.0) + (u_line_blur * pixel(1.0, iResolution.xy) * blur),
        y,
        st.y
    );

    float line_end = smoothstep(
        y,
        y - (width / 2.0) - (u_line_blur * pixel(1.0, iResolution.xy) * blur),
        st.y
    );

    return clamp(
        (line_start - line_end) * (1.0 - smoothstep(0.0, 1.0, pow(perc, 0.3))),
        0.0,
        1.0
    );
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    float line_strength = 1.0;
    for (int i = 0; i < u_line_count; i++) {
        float p = float(i) / float(u_line_count);
        line_strength *= (1.0 - lineFn(
            uv,
            u_line_width * pixel(1.0, iResolution.xy) * (1.0 - p),
            p,
            (PI * 1.0) * p,
            uMouse,
            iTime,
            uAmplitude,
            uDistance
        ));
    }

    float colorVal = 1.0 - line_strength;
    fragColor = vec4(uColor * colorVal, colorVal);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

export const Threads: React.FC<ThreadsProps> = ({
  color = [1, 1, 1],
  amplitude = 5,
  distance = 0.7,
  enableMouseInteraction = false,
  audioEngine,
  isActive = false,
  ...rest
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number>(0);

  // Keep the latest props in a ref so updating them mutates the live shader
  // uniforms instead of tearing down and rebuilding the whole WebGL context.
  const propsRef = useRef({ color, amplitude, distance, enableMouseInteraction });
  propsRef.current = { color, amplitude, distance, enableMouseInteraction };

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({ alpha: true });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    container.appendChild(gl.canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        iTime: { value: 0 },
        iResolution: {
          value: [gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height]
        },
        uColor: { value: [...propsRef.current.color] },
        uAmplitude: { value: propsRef.current.amplitude },
        uDistance: { value: propsRef.current.distance },
        uMouse: { value: [0.5, 0.5] }
      }
    });

    const mesh = new Mesh(gl, { geometry, program });

    // Capping internal resolution to maintain smooth performance
    const MAX_RENDER_DIM = 1920;
    function resize() {
      if (!container) return;
      const { clientWidth, clientHeight } = container;
      const baseDpr = Math.min(window.devicePixelRatio || 1, 2);
      const longestSide = Math.max(clientWidth, clientHeight) * baseDpr;
      const dpr = longestSide > MAX_RENDER_DIM ? (baseDpr * MAX_RENDER_DIM) / longestSide : baseDpr;
      renderer.dpr = dpr;
      renderer.setSize(clientWidth, clientHeight);
      program.uniforms.iResolution.value = [
        gl.canvas.width,
        gl.canvas.height,
        gl.canvas.width / gl.canvas.height
      ];
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    window.addEventListener('resize', resize);
    resize();

    const currentMouse = [0.5, 0.5];
    let targetMouse = [0.5, 0.5];

    function handleMouseMove(e: MouseEvent) {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      targetMouse = [x, y];
    }
    function handleMouseLeave() {
      targetMouse = [0.5, 0.5];
    }
    if (enableMouseInteraction) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    // Visibility tracking to suspend calculations off-screen
    let isVisible = true;
    const intersectionObserver = new IntersectionObserver(
      entries => {
        isVisible = entries[0].isIntersecting;
      },
      { threshold: 0 }
    );
    intersectionObserver.observe(container);

    let lastTime = performance.now();
    let accumulatedTime = 0.0;

    const smoothVolume = { current: 0.0 };
    const smoothBass = { current: 0.0 };
    const smoothMid = { current: 0.0 };
    const smoothTreble = { current: 0.0 };
    const smoothBeat = { current: 0.0 };

    function update() {
      animationFrameId.current = requestAnimationFrame(update);
      if (!isVisible || document.hidden) return;

      const now = performance.now();
      const deltaTime = now - lastTime;
      lastTime = now;

      const { color, amplitude, distance, enableMouseInteraction } = propsRef.current;

      // Extract real-time frequency analysis data from audio engine
      let volume = 0.0;
      let bass = 0.0;
      let mid = 0.0;
      let treble = 0.0;
      let beatDetected = false;
      let beatStrength = 0.0;

      if (audioEngine) {
        const audioData = audioEngine.getAnalysisData(now);
        if (audioData) {
          volume = audioData.volume;
          bass = audioData.bass;
          mid = audioData.mid;
          treble = audioData.treble;
          beatDetected = audioData.beatDetected;
          beatStrength = audioData.beatStrength;
        }
      }

      // Apply low-pass filter (lerp) for smooth tracking
      const lerpFactor = Math.min(1.0, deltaTime * 0.006); // Smooth tracking factor (~10% per frame at 60fps)
      smoothVolume.current += (volume - smoothVolume.current) * lerpFactor;
      smoothBass.current += (bass - smoothBass.current) * lerpFactor;
      smoothMid.current += (mid - smoothMid.current) * lerpFactor;
      smoothTreble.current += (treble - smoothTreble.current) * lerpFactor;

      if (beatDetected) {
        smoothBeat.current = beatStrength;
      } else {
        // Smooth decay for beat pulse
        smoothBeat.current += (0.0 - smoothBeat.current) * Math.min(1.0, deltaTime * 0.008);
      }

      // --- RECOMMENDATION AUDIO MAPPING ---
      // 1. Dynamic Speed: volume and bass speed up the noise wave propagation gently (smoothed)
      const speedScale = 0.5 + smoothVolume.current * 0.8 + smoothBass.current * 0.4;
      accumulatedTime += deltaTime * 0.001 * speedScale;

      // 2. Dynamic Amplitude: amplitude of the lines expands subtly with volume, bass, and beat peaks (smoothed)
      const currentAmplitude = amplitude * (0.8 + smoothVolume.current * 1.2 + smoothBass.current * 0.6 + smoothBeat.current * 0.4);

      // 3. Dynamic Distance: distance stretches out very gently on bass beats (smoothed)
      const currentDistance = distance * (0.95 + smoothBass.current * 0.25);

      // 4. Color shifting: full scale color-shifting brought back, smoothed to prevent harsh flashing
      const baseColor = [...color];
      const finalColor = [
        Math.min(1.0, baseColor[0] * (0.5 + smoothBass.current * 1.5)),
        Math.min(1.0, baseColor[1] * (0.5 + smoothMid.current * 1.5)),
        Math.min(1.0, baseColor[2] * (0.5 + smoothTreble.current * 1.5))
      ];

      program.uniforms.uColor.value = finalColor;
      program.uniforms.uAmplitude.value = currentAmplitude;
      program.uniforms.uDistance.value = currentDistance;

      if (enableMouseInteraction) {
        const smoothing = 0.05;
        currentMouse[0] += smoothing * (targetMouse[0] - currentMouse[0]);
        currentMouse[1] += smoothing * (targetMouse[1] - currentMouse[1]);
        program.uniforms.uMouse.value = [currentMouse[0], currentMouse[1]];
      } else {
        program.uniforms.uMouse.value = [0.5, 0.5];
      }
      
      program.uniforms.iTime.value = accumulatedTime;

      renderer.render({ scene: mesh });
    }
    animationFrameId.current = requestAnimationFrame(update);

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener('resize', resize);
      if (enableMouseInteraction) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (container.contains(gl.canvas)) container.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [isActive, audioEngine]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full" 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        display: isActive ? 'block' : 'none'
      }}
      {...rest}
    />
  );
};

export default Threads;
