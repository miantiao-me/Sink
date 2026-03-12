export const earthVertexShader = /* glsl */ `
  attribute vec3 position;
  attribute vec2 texcoord;

  uniform mat4 model;
  uniform mat4 view;
  uniform mat4 projection;

  varying vec2 vUv;

  void main() {
    vUv = texcoord;
    gl_Position = projection * view * model * vec4(position, 1.0);
  }
`

export const earthFragmentShader = /* glsl */ `
  precision mediump float;

  uniform sampler2D u_countryTexture;

  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    uv.x = fract(uv.x);
    gl_FragColor = vec4(texture2D(u_countryTexture, uv).rgb, 1.0);
  }
`

export const arcVertexShader = /* glsl */ `
  attribute vec3 position;
  attribute float alpha;
  attribute float dashParam;

  uniform mat4 model;
  uniform mat4 view;
  uniform mat4 projection;

  varying float vAlpha;
  varying float vDashParam;

  void main() {
    gl_Position = projection * view * model * vec4(position, 1.0);
    vAlpha = alpha;
    vDashParam = dashParam;
  }
`

export const arcFragmentShader = /* glsl */ `
  precision mediump float;

  uniform vec3 u_color;
  uniform float u_fade;
  uniform float u_dashCount;
  uniform float u_dashRatio;

  varying float vAlpha;
  varying float vDashParam;

  void main() {
    // Dashed line: discard fragments in gaps
    float dashPhase = fract(vDashParam * u_dashCount);
    if (dashPhase > u_dashRatio) discard;

    float a = min(vAlpha * u_fade * 2.5, 1.0);
    gl_FragColor = vec4(u_color * a, a);
  }
`

export const rippleVertexShader = /* glsl */ `
  attribute vec3 position;

  uniform mat4 model;
  uniform mat4 view;
  uniform mat4 projection;
  uniform float u_pointSize;

  varying vec3 vWorldPos;

  void main() {
    vec4 worldPos = model * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projection * view * worldPos;
    gl_PointSize = u_pointSize;
  }
`

export const rippleFragmentShader = /* glsl */ `
  precision mediump float;

  uniform vec3 u_color;
  uniform vec3 u_eye;
  uniform float u_alpha;
  uniform float u_ringWidth;

  varying vec3 vWorldPos;

  void main() {
    vec3 toEye = normalize(u_eye - vWorldPos);
    vec3 normal = normalize(vWorldPos);
    if (dot(toEye, normal) < 0.0) discard;

    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    // Ring shape
    float inner = 0.5 - u_ringWidth;
    float ring = smoothstep(inner - 0.05, inner, dist) * (1.0 - smoothstep(0.45, 0.5, dist));
    float a = ring * u_alpha;
    if (a < 0.01) discard;

    gl_FragColor = vec4(u_color * a, a);
  }
`
