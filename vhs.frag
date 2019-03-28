// https://www.shadertoy.com/view/4dBGzK

precision mediump float;

uniform float u_time;
uniform int u_frame;
uniform sampler2D u_texture;
varying vec2 v_texcoord;
uniform float u_magnitude;
uniform vec2 u_resolution;

highp float rand(vec2 co) {
  highp float a = 12.9898;
  highp float b = 78.233;
  highp float c = 43758.5453;
  highp float dt= dot(co.xy ,vec2(a,b));
  highp float sn= mod(dt,3.14);
  return fract(sin(sn) * c);
}

void main() {
  vec2 uv = v_texcoord.xy;

  float magnitude = u_magnitude / u_resolution.x;

  // float time = float(u_frame) / 6000.0;
  float time = u_time;

  vec2 offsetRedUV = uv;
  offsetRedUV.x = uv.x + rand(vec2(time*0.03,uv.y*0.42)) * magnitude;
  offsetRedUV.x += sin(rand(vec2(time*0.2, uv.y)))*0.0005;

  vec2 offsetGreenUV = uv;
  offsetGreenUV.x = uv.x + rand(vec2(time*0.004,uv.y*0.002)) * magnitude * 4.0;
  offsetGreenUV.x += sin(time*9.0)*0.0005;

  // vec2 offsetBlueUV = uv;
  // offsetBlueUV.x = uv.y;
  // offsetBlueUV.x += rand(vec2(cos(time*0.01),sin(uv.y)));

  float r = texture2D(u_texture, offsetRedUV).r;
  float g = texture2D(u_texture, offsetGreenUV).g;
  float b = texture2D(u_texture, uv).b;

  gl_FragColor = vec4(r, g, b, 1.0);
}
