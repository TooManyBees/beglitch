//= require gl/html2canvas.min.js
//= require gl

const DEFAULT_VERT = `
attribute vec2 a_texcoord;
attribute vec2 a_position;
varying vec2 v_texcoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texcoord = a_texcoord;
}
`;

const DEFAULT_FRAG = `
precision mediump float;

uniform sampler2D u_texture;
varying vec2 v_texcoord;

void main() {
  gl_FragColor = texture2D(u_texture, v_texcoord);
}
`;

const INVIEW_CLOSURES = [];
window.addEventListener('scroll', debounce(function() {
  INVIEW_CLOSURES.forEach(cb => cb());
}, 100));

function isInView(element) {
  const rect = element.getBoundingClientRect();
  return !(rect.y + rect.height < 0 || rect.y > window.innerHeight);
}

// const COLOR_MATCHER = /^rgba?\((\d+), (\d+), (\d+)/;
function findBackgroundColor(element) {
  const BLANK = 'rgba(0, 0, 0, 0)';
  let bg = BLANK;
  let currentEl = element;
  while (currentEl && bg === BLANK) {
    bg = getComputedStyle(currentEl).backgroundColor;
    currentEl = currentEl.parentElement;
  }
  // const match = bg.match(COLOR_MATCHER);
  // if (match) {
  //   bg = `rgba(${match[1]}, ${match[2]}, ${match[3]}, 0.01)`;
  // }
  return bg;
}

function beglitchThis(fragSource, options) {
  const el = Array.prototype.slice.call(document.scripts, -1)[0].parentElement;
  return beglitch(el, fragSource, options);
}

const SHADER_REQUESTS = {};
function fetchShader(path) {
  return SHADER_REQUESTS[path] || (SHADER_REQUESTS[path] = fetch(path).then(r => r.ok ? r.text() : Promise.reject()));
}

let beglitchQueue = Promise.resolve();

function beglitch(...args) {
  return (beglitchQueue = beglitchQueue.then(() => _beglitch(...args)).catch(console.error));
}

function maybeWrapElement(element, canvas) {
  const display = getComputedStyle(element).display;
  const block = display === 'block' || display === 'flex' || display === 'list-item';
  if (block) {
    if (getComputedStyle(element).position === 'static') {
      element.style.position = 'relative';
    }
    element.appendChild(canvas)
  } else {
    const wrapper = document.createElement('span');
    wrapper.style.position = 'relative';
    wrapper.style.whiteSpace = 'nowrap';
    element.parentElement.replaceChild(wrapper, element);
    wrapper.appendChild(element);
    wrapper.appendChild(canvas);
  }
}

async function _beglitch(element, maybeFragSource = DEFAULT_FRAG, options = {}) {
  const fragSource = maybeFragSource.includes('void main') ? maybeFragSource : fetchShader(maybeFragSource);

  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.top = 0;
  canvas.style.left = 0;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.setAttribute('aria-hidden', true);

  maybeWrapElement(element, canvas);

  const glitch = initCanvasGl(canvas, (await fragSource), DEFAULT_VERT);
  const { gl, program } = glitch;

  {
    const location = gl.getUniformLocation(program, "u_texture");
    gl.uniform1i(location, 0);
  }

  {
    const texcoord = gl.getAttribLocation(program, "a_texcoord");
    const texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.enableVertexAttribArray(texcoord);
    gl.vertexAttribPointer(texcoord, 2, gl.FLOAT, false, 0, 0);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0.0,  0.0,
      1.0,  0.0,
      0.0,  1.0,
      1.0,  1.0,
    ]), gl.STATIC_DRAW);
  }

  const { autostart = true, ...renderOptions } = options;

  Object.entries(renderOptions).forEach(([k, v]) => {
    const loc = gl.getUniformLocation(program, k);
    gl.uniform1f(loc, v);
  });
  gl.uniform1f(gl.getUniformLocation(program, 'u_random_1'), Math.random());
  gl.uniform1f(gl.getUniformLocation(program, 'u_random_2'), Math.random());

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));

  const backgroundColor = findBackgroundColor(element);
  async function repaint() {
    const painted = await html2canvas(element, { windowWidth: document.body.clientWidth, backgroundColor });

    glitch.resize();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, painted);
    glitch.draw();
  }

  let frame = 0;
  function update(timestamp) {
    frame += 1;
    gl.uniform1i(gl.getUniformLocation(program, 'u_frame'), frame);
    gl.uniform1f(gl.getUniformLocation(program, 'u_time'), timestamp);

    const rect = element.getBoundingClientRect();

    const topY = rect.y / window.innerHeight;
    const bottomY = (rect.y + rect.height) / window.innerHeight;
    const locTop = gl.getUniformLocation(program, 'u_topy');
    gl.uniform1f(locTop, topY);
    const locBottom = gl.getUniformLocation(program, 'u_bottomy');
    gl.uniform1f(locBottom, bottomY);
  }

  let lastframe;
  let inView = !autostart || isInView(canvas);
  function start(timestamp) {
    if (!inView) return;
    update(timestamp);
    glitch.draw();
    lastframe = requestAnimationFrame(start);
  }
  function stop() {
    cancelAnimationFrame(lastframe);
  }
  function toggleInViewClosure() {
    if (!isInView(canvas)) {
      inView = false;
      stop();
    } else if (!inView) {
      inView = true;
      start();
    }
  }
  if (autostart) {
    INVIEW_CLOSURES.push(toggleInViewClosure);
  }

  window.addEventListener('resize', debounce(repaint, 500));
  if (autostart) {
    await repaint();
    start(0);
  }
  return {...glitch, element, start, stop, repaint};
}
