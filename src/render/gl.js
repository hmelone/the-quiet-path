// A tiny WebGL2 compositor: fullscreen layer passes, instanced particles,
// and offscreen targets for photographs.
import * as S from './shaders.js';

export class Renderer {
  constructor(canvas) {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: 'default',
    });
    if (!gl) throw new Error('WebGL2 is not available');
    this.gl = gl;
    this.canvas = canvas;
    this.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    this.width = 1;
    this.height = 1;

    this.programs = {
      paint: this._program(S.FULLSCREEN_VS, S.PAINT_FS),
      sky: this._program(S.FULLSCREEN_VS, S.SKY_FS),
      mist: this._program(S.FULLSCREEN_VS, S.MIST_FS),
      water: this._program(S.FULLSCREEN_VS, S.WATER_FS),
      rain: this._program(S.FULLSCREEN_VS, S.RAIN_FS),
      film: this._program(S.FULLSCREEN_VS, S.FILM_FS),
      particle: this._program(S.PARTICLE_VS, S.PARTICLE_FS),
    };

    // Fullscreen quad
    this.quadVao = gl.createVertexArray();
    gl.bindVertexArray(this.quadVao);
    const qb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, qb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    for (const name of ['paint', 'sky', 'mist', 'water', 'rain', 'film']) {
      const loc = gl.getAttribLocation(this.programs[name].prog, 'aPos');
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      }
    }

    // Particles: one quad, many instances
    const pp = this.programs.particle.prog;
    this.partVao = gl.createVertexArray();
    gl.bindVertexArray(this.partVao);
    const cb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]), gl.STATIC_DRAW);
    const cl = gl.getAttribLocation(pp, 'aCorner');
    gl.enableVertexAttribArray(cl);
    gl.vertexAttribPointer(cl, 2, gl.FLOAT, false, 0, 0);
    this.instBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
    gl.bufferData(gl.ARRAY_BUFFER, 4 * 12 * 512, gl.DYNAMIC_DRAW);
    const stride = 12 * 4;
    [['iPos', 0], ['iCol', 16], ['iKind', 32]].forEach(([n, off]) => {
      const l = gl.getAttribLocation(pp, n);
      gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, 4, gl.FLOAT, false, stride, off);
      gl.vertexAttribDivisor(l, 1);
    });
    gl.bindVertexArray(null);

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

    this.blank = this.createTexture(null);
  }

  _program(vsSrc, fsSrc) {
    const gl = this.gl;
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s);
        console.error(log, src);
        throw new Error('Shader compile failed: ' + log);
      }
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('Program link failed: ' + gl.getProgramInfoLog(prog));
    }
    const uniforms = {};
    const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    let unit = 0;
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(prog, i);
      const u = { loc: gl.getUniformLocation(prog, info.name), type: info.type };
      if (info.type === gl.SAMPLER_2D) u.unit = unit++;
      uniforms[info.name] = u;
    }
    return { prog, uniforms };
  }

  _use(p, values, textures) {
    const gl = this.gl;
    gl.useProgram(p.prog);
    for (const k in values) {
      const u = p.uniforms[k];
      if (!u) continue;
      const v = values[k];
      switch (u.type) {
        case gl.FLOAT: gl.uniform1f(u.loc, v); break;
        case gl.FLOAT_VEC2: gl.uniform2fv(u.loc, v); break;
        case gl.FLOAT_VEC3: gl.uniform3fv(u.loc, v); break;
        case gl.FLOAT_VEC4: gl.uniform4fv(u.loc, v); break;
        default: break;
      }
    }
    for (const name in p.uniforms) {
      const u = p.uniforms[name];
      if (u.type !== gl.SAMPLER_2D) continue;
      gl.activeTexture(gl.TEXTURE0 + u.unit);
      gl.bindTexture(gl.TEXTURE_2D, (textures && textures[name]) || this.blank);
      gl.uniform1i(u.loc, u.unit);
    }
  }

  /** Upload a canvas as a mipmapped texture (premultiplied alpha). */
  createTexture(source, { mip = true } = {}) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (source) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (mip && source) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    return tex;
  }

  deleteTexture(tex) {
    if (tex && tex !== this.blank) this.gl.deleteTexture(tex);
  }

  resize(cssW, cssH, pixelRatio) {
    const w = Math.max(1, Math.round(cssW * pixelRatio));
    const h = Math.max(1, Math.round(cssH * pixelRatio));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.width = w;
    this.height = h;
  }

  /** Bind a render target (or the screen when null) and clear it. */
  begin(target, clear = [0, 0, 0]) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null);
    const w = target ? target.w : this.width;
    const h = target ? target.h : this.height;
    gl.viewport(0, 0, w, h);
    gl.clearColor(clear[0], clear[1], clear[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  draw(kind, uniforms, textures) {
    const gl = this.gl;
    this._use(this.programs[kind], uniforms, textures);
    gl.bindVertexArray(this.quadVao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  drawParticles(data, count, uniforms) {
    if (!count) return;
    const gl = this.gl;
    this._use(this.programs.particle, uniforms, null);
    gl.bindVertexArray(this.partVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
    const bytes = count * 12 * 4;
    if (bytes > (this._instCap || 4 * 12 * 512)) {
      this._instCap = bytes * 2;
      gl.bufferData(gl.ARRAY_BUFFER, this._instCap, gl.DYNAMIC_DRAW);
    }
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, count * 12);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
  }

  createTarget(w, h) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fb, tex, w, h };
  }

  deleteTarget(t) {
    if (!t) return;
    this.gl.deleteFramebuffer(t.fb);
    this.gl.deleteTexture(t.tex);
  }

  mipmapTarget(t) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  /** Read a target into a 2D canvas (flipping rows, since GL is bottom-up). */
  readToCanvas(t) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
    const px = new Uint8Array(t.w * t.h * 4);
    gl.readPixels(0, 0, t.w, t.h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const c = document.createElement('canvas');
    c.width = t.w;
    c.height = t.h;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(t.w, t.h);
    const row = t.w * 4;
    for (let y = 0; y < t.h; y++) {
      img.data.set(px.subarray((t.h - 1 - y) * row, (t.h - y) * row), y * row);
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }
}
