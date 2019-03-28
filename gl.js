const HTML = document.querySelector('html');

function compileShader(gl, source, type) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    return shader;
  } else {
    throw new Error(`Coudn't compile shader:\n${gl.getShaderInfoLog(shader)}`);
  }
}

function linkShaders(gl, vertex, fragment) {
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return program;
  } else {
    throw new Error(`Couldn't link program:\n${gl.getProgramInfoLog(program)}`);
  }
}

const UNIFORM = Symbol('uniforms');
const WATCH_RESIZE = Symbol('watchingResize');
// const WATCH_SCROLL = Symbol('watchingScroll');
const VERTEX_SOURCE = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;
function resize(gl) {
  const nWidth = gl.canvas.clientWidth;
  const nHeight = gl.canvas.clientHeight;
  if (gl.canvas.width !== nWidth || gl.canvas.height !== nHeight) {
    gl.canvas.width = nWidth;
    gl.canvas.height = nHeight;
    gl.uniform2f(gl[UNIFORM]["u_resolution"], nWidth, nHeight);
    gl.uniform1f(gl[UNIFORM]["u_depth"], HTML.scrollHeight);
    // scroll(gl);
    gl.viewport(0, 0, nWidth, nHeight);
  }
}
// function scroll(gl) {
//   gl.uniform1f(gl[UNIFORM]["u_scrolldepth"], window.scrollY);
// }
function watchResize(gl) {
  if (gl[WATCH_RESIZE]) { return; }
  gl[WATCH_RESIZE] = true;
  window.addEventListener('resize', () => resize(gl));
}
// let DRAWING_NEXT_FRAME = false;
// function watchScroll(gl, draw) {
//   function nextFrame() {
//     scroll(gl);
//     draw();
//     DRAWING_NEXT_FRAME = false;
//   }
//   window.addEventListener('scroll', () => {
//     if (!DRAWING_NEXT_FRAME) {
//       DRAWING_NEXT_FRAME = true;
//       setTimeout(nextFrame, 64);
//     }
//   });
// }

function initCanvasGl(canvas, fragmentSource, vertexSource = VERTEX_SOURCE) {
  if (!(canvas && fragmentSource && vertexSource)) { return; }

  const gl = canvas.getContext('webgl');

  const vertexShader = compileShader(gl, vertexSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER);
  const program = linkShaders(gl, vertexShader, fragmentShader);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1.0,  1.0, 1.0,  1.0,
    -1.0, -1.0, 1.0, -1.0,
  ]), gl.STATIC_DRAW);
  gl.useProgram(program);

  gl[UNIFORM] = {};
  const uniformResolution = gl[UNIFORM]["u_resolution"] = gl.getUniformLocation(program, "u_resolution");
  gl.uniform2f(uniformResolution, canvas.width, canvas.height);
  const uniformDepth = gl[UNIFORM]['u_depth'] = gl.getUniformLocation(program, "u_depth");
  gl.uniform1f(uniformDepth, HTML.scrollHeight);
  // const uniformScrollDepth = gl[UNIFORM]["u_scrolldepth"] = gl.getUniformLocation(program, "u_scrolldepth");
  // gl.uniform1f(uniformScrollDepth, window.scrollY);

  const position = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  function draw() {
    // gl.clearColor(0, 0, 0, 0);
    // gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  resize(gl);
  // watchResize(gl);
  // watchScroll(gl, draw);

  return {
    canvas,
    gl,
    program,
    draw,
    resize: () => resize(gl),
    watchResize: () => watchResize(gl),
    // watchScroll: () => watchScroll(gl),
    uniforms: gl[UNIFORM],
  };
}
