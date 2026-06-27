export const vertexShader = `
  uniform float uTime;
  uniform float uDeltaTime;
  uniform float uVolume;
  uniform float uBass;
  uniform float uLowMid;
  uniform float uMid;
  uniform float uHighMid;
  uniform float uTreble;
  
  uniform float uBeat;
  uniform float uBeatStrength;
  uniform float uShockwave;
  uniform float uIntensity;
  uniform float uPointSize;
  uniform float uColorMode;
  uniform float uMode; // 0: Sphere, 1: Tunnel, 2: Waveform (interpolated)
  
  uniform sampler2D uAudioTexture; // 1D audio data texture
  
  attribute vec3 aBasePosition;
  attribute float aRandom;
  attribute float aSize;
  attribute float aFrequencyBand;
  
  varying vec3 vColor;
  varying float vAlpha;
  varying float vBand;
  
  // Simple 3D noise generator
  float hash(float n) { return fract(sin(n) * 43758.5453123); }
  float noise(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    float n = p.x + p.y * 157.0 + 113.0 * p.z;
    return mix(mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
                   mix(hash(n + 157.0), hash(n + 158.0), f.x), f.y),
               mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
                   mix(hash(n + 270.0), hash(n + 271.0), f.x), f.y), f.z);
  }

  void main() {
    vBand = aFrequencyBand;
    
    // --- MODE 0: Sphere Position ---
    float sphereRadius = 2.0 + uBass * 1.5 * (1.0 + 0.2 * aRandom);
    // Add 3D noise displacement based on mid frequencies
    vec3 noiseInput = aBasePosition * 2.0 + vec3(0.0, 0.0, uTime * 0.5);
    float disp = noise(noiseInput) * uMid * 1.2;
    sphereRadius += disp;
    // Treble jitter
    sphereRadius += sin(uTime * 15.0 + aRandom * 50.0) * uTreble * 0.05;
    
    vec3 posSphere = aBasePosition * sphereRadius;
    // Beat shockwave pulse
    float waveProgress = sin(uShockwave * 3.14159265);
    posSphere += normalize(aBasePosition) * waveProgress * uBeatStrength * 1.5;
    
    // --- MODE 1: Tunnel Position ---
    float angle = atan(aBasePosition.y, aBasePosition.x);
    float zVal = aBasePosition.z * 18.0;
    // Infinite looping along Z
    zVal = mod(zVal - uTime * 4.0, 36.0) - 18.0;
    // Radius of tunnel, modulated by bass
    float tunnelRadius = 2.5 + sin(zVal * 0.3 + uTime * 2.0) * 0.4 * uBass;
    // Twist/spin tunnel based on mid
    float spin = angle + uTime * 0.15 + sin(zVal * 0.1) * uMid * 0.6;
    
    vec3 posTunnel = vec3(cos(spin) * tunnelRadius, sin(spin) * tunnelRadius, zVal);
    // Expand tunnel on beat
    posTunnel.xy += vec2(cos(spin), sin(spin)) * waveProgress * uBeatStrength * 1.2;
    
    // --- MODE 2: Waveform Field Position ---
    // Grid on XZ plane
    float xVal = aBasePosition.x * 8.0;
    float zGrid = aBasePosition.y * 8.0;
    
    // Normalize X to [0, 1] for audio data lookup
    float u = (aBasePosition.x + 1.0) * 0.5;
    float audioVal = texture2D(uAudioTexture, vec2(u, 0.5)).r;
    
    // Height determined by frequency, time-domain waveform, and settings
    float yVal = audioVal * 3.5 * uIntensity - 1.5;
    // Add secondary wave propagation
    yVal += sin(xVal * 1.5 + zGrid * 1.0 - uTime * 5.0) * 0.35 * uBass;
    
    vec3 posWaveform = vec3(xVal, yVal, zGrid);
    // Elevate on beat
    posWaveform.y += waveProgress * uBeatStrength * 1.0;
    
    // --- Interpolate Position based on uMode ---
    vec3 mixedPos;
    if (uMode < 1.0) {
      mixedPos = mix(posSphere, posTunnel, uMode);
    } else {
      mixedPos = mix(posTunnel, posWaveform, uMode - 1.0);
    }
    
    // Calculate final model view position
    vec4 mvPosition = modelViewMatrix * vec4(mixedPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // --- Particle Size ---
    // Size scales with treble and random variation
    float sizeFactor = aSize * (1.0 + uTreble * 3.0);
    // Attenuate size based on camera depth, clamping to prevent close-up particles from swelling
    gl_PointSize = clamp(uPointSize * sizeFactor * (10.0 / -mvPosition.z), 1.0, 40.0);
    
    // --- COLOR MODES ---
    vec3 color = vec3(0.0);
    
    if (uColorMode < 0.5) {
      // 0: Frequency band mapping (Bass = Red/Purple, Mid = Cyan/Teal, Treble = Gold/White)
      if (aFrequencyBand < 0.5) {
        color = mix(vec3(0.8, 0.1, 0.2), vec3(0.5, 0.0, 0.8), uBass);
      } else if (aFrequencyBand < 1.5) {
        color = mix(vec3(0.5, 0.0, 0.8), vec3(0.0, 0.4, 0.8), uLowMid);
      } else if (aFrequencyBand < 2.5) {
        color = mix(vec3(0.0, 0.4, 0.8), vec3(0.0, 0.8, 0.6), uMid);
      } else if (aFrequencyBand < 3.5) {
        color = mix(vec3(0.0, 0.8, 0.6), vec3(0.0, 0.9, 0.9), uHighMid);
      } else {
        color = mix(vec3(0.0, 0.9, 0.9), vec3(0.9, 0.8, 0.5), uTreble);
      }
    } 
    else if (uColorMode < 1.5) {
      // 1: Energy based (Blue to Orange/Red)
      color = mix(vec3(0.1, 0.3, 0.8), vec3(1.0, 0.4, 0.1), uVolume * 1.8 + aRandom * 0.1);
    } 
    else if (uColorMode < 2.5) {
      // 2: Gradient (Rainbow flowing with time)
      color = 0.5 + 0.5 * cos(uTime * 0.5 + mixedPos.xyx * 0.2 + vec3(0.0, 2.0, 4.0));
    } 
    else {
      // 3: Custom Neon Cyberpunk (Magenta & Electric Cyan)
      color = mix(vec3(1.0, 0.0, 0.5), vec3(0.0, 1.0, 0.9), sin(aRandom * 6.28 + uTime) * 0.5 + 0.5);
    }
    
    // Add instantaneous beat flash (whitish highlight)
    color += vec3(0.6, 0.8, 1.0) * waveProgress * uBeatStrength * 0.4;
    
    vColor = color;
    
    // --- Alpha calculation ---
    // Fade particles slightly at the edge of screen or depth
    vAlpha = 0.4 + uVolume * 0.6;
  }
`;

export const fragmentShader = `
  uniform float uShape; // 0: Circle, 1: Ring, 2: Star
  varying vec3 vColor;
  varying float vAlpha;
  varying float vBand;
  
  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float dist = length(uv);
    float alpha = 0.0;
    
    if (uShape < 0.5) {
      // Shape 0: Smooth circle
      if (dist > 0.5) discard;
      alpha = smoothstep(0.5, 0.1, dist);
    } 
    else if (uShape < 1.5) {
      // Shape 1: Tech Ring
      float thickness = 0.05;
      float ringRadius = 0.25;
      float d = abs(dist - ringRadius);
      if (dist > 0.5 || dist < 0.1) discard;
      alpha = smoothstep(thickness, 0.0, d);
    } 
    else {
      // Shape 2: Cross Star
      if (dist > 0.5) discard;
      float crossLine = 0.015 / (abs(uv.x) + 0.005) * 0.015 / (abs(uv.y) + 0.005);
      alpha = crossLine * smoothstep(0.5, 0.0, dist) + smoothstep(0.12, 0.0, dist) * 0.5;
    }
    
    // Final color output
    gl_FragColor = vec4(vColor, alpha * vAlpha);
  }
`;
