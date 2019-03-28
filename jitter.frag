precision mediump float;

varying vec2 v_texcoord;
uniform vec2 u_resolution;
uniform float u_time;
uniform int u_frame;
uniform sampler2D u_texture;
// instance specific
uniform float u_magnitude;
uniform float u_jitter;
uniform float u_random_1;
uniform float u_random_2;

highp float rand(vec2 co) {
  highp float a = 12.9898;
  highp float b = 78.233;
  highp float c = 43758.5453;
  highp float dt= dot(co.xy ,vec2(a,b));
  highp float sn= mod(dt,3.14);
  return fract(sin(sn) * c) * 2.0 - 1.0;
}

float bandwidth = 0.025;
float rate = 20.0 + 80.0 * u_random_2;
float delay = u_random_1 * 1000.0;

float scan(vec2 uv, float t) {
  float y = uv.y;
  float period = fract((t + delay) / (u_resolution.y * rate));

  return smoothstep(period - bandwidth, period, y) - smoothstep(period, period + bandwidth, y);
}

void main() {
  vec2 uv = v_texcoord.xy;
  float time = u_time;

  vec2 offset = uv;
  offset.x += u_magnitude / u_resolution.x * rand(vec2(time*0.004, uv.y*0.002));
  offset.x += sin(time*9.0)*0.0005;

  offset.x += u_jitter * scan(uv, time);

  gl_FragColor = texture2D(u_texture, offset);
}
