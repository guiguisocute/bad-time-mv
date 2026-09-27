// First-person voxel renderer for the "dimension break" section: oriented boxes
// (bones, walls, floor tiles, beams) + billboards (the enemy, the blasters),
// rendered at low resolution so it stays pixel-crunchy. Alpha = emissive.
(function () {
  const MV = window.MV;

  // ---------------------------------------------------------------- tiny mat4 (column-major)
  const M4 = (MV.M4 = {
    persp(fovy, asp, n, f) {
      const t = 1 / Math.tan(fovy / 2), nf = 1 / (n - f);
      return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0];
    },
    look(e, c, up) {
      const z = norm(sub(e, c)), x = norm(cross(up, z)), y = cross(z, x);
      return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1];
    },
    mul(a, b) {
      const o = new Array(16);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; }
      return o;
    },
  });
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  MV.V3 = { sub, add, mul, dot, cross, norm };

  const VS = `attribute vec3 aP; attribute vec3 aN; attribute vec4 aC; uniform mat4 uVP;
    varying vec3 vN; varying vec4 vC; varying float vD;
    void main(){ vec4 p = uVP * vec4(aP, 1.0); gl_Position = p; vN = aN; vC = aC; vD = p.w; }`;
  const FS = `precision mediump float; varying vec3 vN; varying vec4 vC; varying float vD;
    uniform vec3 uL; uniform float uFog;
    void main(){
      float l = 0.35 + 0.65 * max(dot(normalize(vN), uL), 0.0) + 0.15 * max(dot(normalize(vN), vec3(0.0, 0.0, 1.0)), 0.0);
      vec3 c = vC.rgb * mix(l, 1.0, vC.a);
      float f = clamp(vD * uFog, 0.0, 1.0);
      c = mix(c, vec3(0.0), f * (1.0 - vC.a * 0.6));
      gl_FragColor = vec4(c, vC.a * (1.0 - f * 0.5));
    }`;
  const VSB = `attribute vec3 aP; attribute vec2 aT; uniform mat4 uVP; varying vec2 vT; varying float vD;
    void main(){ vec4 p = uVP * vec4(aP, 1.0); gl_Position = p; vT = aT; vD = p.w; }`;
  const FSB = `precision mediump float; varying vec2 vT; varying float vD; uniform sampler2D uTex; uniform float uFog, uEmi, uA; uniform vec3 uTint;
    void main(){ vec4 c = texture2D(uTex, vT); if (c.a < 0.5) discard;
      float f = clamp(vD * uFog * 0.6, 0.0, 1.0);
      gl_FragColor = vec4(mix(c.rgb * uTint, vec3(0.0), f) * uA, uEmi); }`;

  function prog(gl, vs, fs) {
    const mk = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  MV.Voxel = class {
    constructor(gl, w = 480, h = 270) {
      this.gl = gl; this.w = w; this.h = h;
      this.pBox = prog(gl, VS, FS);
      this.pBill = prog(gl, VSB, FSB);
      this.buf = gl.createBuffer();
      this.bbuf = gl.createBuffer();
      this.tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      this.fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);
      const rb = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      this.texCache = new Map();
      this.verts = [];
    }
    // ------------------------------------------------------------ geometry
    // oriented box: centre c, unit axes u,v,n, half sizes hu,hv,hn, colour [r,g,b], emissive e
    obox(c, u, v, n, hu, hv, hn, col, e = 0) {
      const V = this.verts;
      const P = (a, b, d) => add(add(add(c, mul(u, a * hu)), mul(v, b * hv)), mul(n, d * hn));
      const face = (nv, p0, p1, p2, p3) => {
        for (const p of [p0, p1, p2, p0, p2, p3]) V.push(p[0], p[1], p[2], nv[0], nv[1], nv[2], col[0], col[1], col[2], e);
      };
      face(u, P(1, -1, -1), P(1, 1, -1), P(1, 1, 1), P(1, -1, 1));
      face(mul(u, -1), P(-1, -1, -1), P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1));
      face(v, P(-1, 1, -1), P(-1, 1, 1), P(1, 1, 1), P(1, 1, -1));
      face(mul(v, -1), P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1));
      face(n, P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1));
      face(mul(n, -1), P(-1, -1, -1), P(-1, 1, -1), P(1, 1, -1), P(1, -1, -1));
    }
    box(x, y, z, sx, sy, sz, col, e) { this.obox([x + sx / 2, y + sy / 2, z + sz / 2], [1, 0, 0], [0, 1, 0], [0, 0, 1], sx / 2, sy / 2, sz / 2, col, e); }
    // a bone from a to b (3D points), knob width w
    bone(a, b, w, col, e = 0) {
      const d = sub(b, a), L = Math.hypot(d[0], d[1], d[2]);
      if (L < 1) return;
      const u = norm(d);
      let v = Math.abs(u[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
      v = norm(cross(u, v)); const n = cross(u, v);
      const c = mul(add(a, b), 0.5);
      const sh = w * 0.35, kn = w * 0.3;
      this.obox(c, u, v, n, Math.max(0.5, L / 2 - kn), sh, sh, col, e);
      for (const end of [a, b]) {
        const inward = end === a ? u : mul(u, -1);
        const ce = add(end, mul(inward, kn));
        for (const s of [-1, 1]) this.obox(add(ce, mul(v, s * w * 0.25)), u, v, n, kn, w * 0.25, w * 0.3, col, e);
      }
    }
    // ------------------------------------------------------------ render
    textureFor(src, dynamic) {
      const gl = this.gl;
      let t = this.texCache.get(src);
      if (!t) {
        t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
        this.texCache.set(src, t);
        dynamic = true;
      }
      if (dynamic) { gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); }
      return t;
    }
    // sc: {cam:{x,y,z,yaw,pitch,roll,fov}, build(vox) adds boxes, bills:[{src, dynamic, p:[x,y,z], w, h, rot, emi, tint, a}]}
    render(sc) {
      const gl = this.gl, cam = sc.cam;
      this.verts.length = 0;
      sc.build(this);
      const cp = Math.cos(cam.pitch || 0), sp = Math.sin(cam.pitch || 0);
      const f = [Math.sin(cam.yaw) * cp, -Math.cos(cam.yaw) * cp, sp];
      const eye = [cam.x, cam.y, cam.z];
      let up = [0, 0, 1];
      const r0 = norm(cross(f, up));
      const u0 = cross(r0, f);
      up = add(mul(u0, Math.cos(cam.roll || 0)), mul(r0, Math.sin(cam.roll || 0)));
      const view = M4.look(eye, add(eye, f), up);
      const proj = M4.persp(cam.fov || 1.25, this.w / this.h, 0.5, 2000);
      proj[0] = -proj[0]; // world y points down the screen (as in 2D): mirror x so +x stays screen-right
      const VP = M4.mul(proj, view);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.viewport(0, 0, this.w, this.h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      // boxes
      gl.useProgram(this.pBox);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.verts), gl.DYNAMIC_DRAW);
      const loc = (n) => gl.getAttribLocation(this.pBox, n);
      const aP = loc('aP'), aN = loc('aN'), aC = loc('aC');
      gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 40, 0);
      gl.enableVertexAttribArray(aN); gl.vertexAttribPointer(aN, 3, gl.FLOAT, false, 40, 12);
      gl.enableVertexAttribArray(aC); gl.vertexAttribPointer(aC, 4, gl.FLOAT, false, 40, 24);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.pBox, 'uVP'), false, VP);
      gl.uniform3fv(gl.getUniformLocation(this.pBox, 'uL'), norm([0.4, 0.6, 0.7]));
      gl.uniform1f(gl.getUniformLocation(this.pBox, 'uFog'), sc.fog ?? 0.0022);
      gl.drawArrays(gl.TRIANGLES, 0, this.verts.length / 10);
      gl.disableVertexAttribArray(aN); gl.disableVertexAttribArray(aC);
      // billboards (face the camera, stand on their bottom edge)
      gl.useProgram(this.pBill);
      const bP = gl.getAttribLocation(this.pBill, 'aP'), bT = gl.getAttribLocation(this.pBill, 'aT');
      gl.uniformMatrix4fv(gl.getUniformLocation(this.pBill, 'uVP'), false, VP);
      gl.uniform1f(gl.getUniformLocation(this.pBill, 'uFog'), sc.fog ?? 0.0022);
      gl.uniform1i(gl.getUniformLocation(this.pBill, 'uTex'), 5);
      const right = norm([Math.cos(cam.yaw), Math.sin(cam.yaw), 0]);
      for (const b of sc.bills || []) {
        const cr = Math.cos(b.rot || 0), sr = Math.sin(b.rot || 0);
        const ax = add(mul(right, cr), mul([0, 0, 1], sr)), ay = add(mul(right, -sr), mul([0, 0, 1], cr));
        const hw = b.w / 2, hh = b.h / 2;
        const c = b.p;
        const q = (sx, sy) => add(add(c, mul(ax, sx * hw)), mul(ay, sy * hh));
        const p1 = q(-1, -1), p2 = q(1, -1), p3 = q(1, 1), p4 = q(-1, 1);
        const d = [...p1, 0, 1, ...p2, 1, 1, ...p3, 1, 0, ...p1, 0, 1, ...p3, 1, 0, ...p4, 0, 0];
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bbuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(d), gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(bP); gl.vertexAttribPointer(bP, 3, gl.FLOAT, false, 20, 0);
        gl.enableVertexAttribArray(bT); gl.vertexAttribPointer(bT, 2, gl.FLOAT, false, 20, 12);
        gl.activeTexture(gl.TEXTURE5);
        gl.bindTexture(gl.TEXTURE_2D, this.textureFor(b.src, b.dynamic));
        gl.uniform1f(gl.getUniformLocation(this.pBill, 'uFog'), b.nofog ? 0 : sc.fog ?? 0.0022);
        gl.uniform1f(gl.getUniformLocation(this.pBill, 'uEmi'), b.emi || 0);
        gl.uniform1f(gl.getUniformLocation(this.pBill, 'uA'), b.a ?? 1);
        gl.uniform3fv(gl.getUniformLocation(this.pBill, 'uTint'), b.tint || [1, 1, 1]);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.disableVertexAttribArray(bT);
      }
      gl.disable(gl.DEPTH_TEST);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return this.tex;
    }
  };
})();
