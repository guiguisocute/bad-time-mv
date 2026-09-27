// WebGL post-processing: 3D camera over the pixel world plane (pitch / yaw /
// roll / dolly), parallax void background, bloom, chromatic aberration,
// impact frames (invert / B&W), glitch slices, motion smear, dot-matrix grid.
(function () {
  const MV = window.MV;

  const VS = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
  const FS = `
precision highp float;
uniform sampler2D uWorld, uGlowA, uGlowB, uScreen, u3D;
uniform float uMode3D;
uniform vec2 uOut, uWorldSize, uPad, uView;
uniform vec4 uRect;
uniform vec3 uCamPos, uF, uR, uD;
uniform vec2 uTan;
uniform float uVHS;
uniform float uTime, uCA, uInv, uBW, uFlash, uGlitch, uBloom, uVig, uDesat, uTintAmt, uGrid, uScan, uLetter, uBg, uBgHue, uNoise, uSeed;
uniform vec3 uTint, uFlashCol;
uniform vec2 uSmear;

float h1(float n){ return fract(sin(n*127.1+311.7)*43758.5453); }
float h2(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }

// screen uv (0..1, y down) -> world-plane point (px) via the 3D camera
vec3 rayAt(vec2 uv){
  vec2 s = (uv - 0.5) * 2.0;
  return uF + uR * s.x * uTan.x + uD * s.y * uTan.y;
}
vec2 planeHit(vec3 dir, float z, out float ok){
  float t = (z - uCamPos.z) / dir.z;
  ok = step(0.0, t) * step(0.0001, abs(dir.z));
  return uCamPos.xy + dir.xy * t;
}
vec4 world(vec2 wp){
  vec2 uv = (wp + uPad) / uWorldSize;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec4(0.0);
  return texture2D(uWorld, uv);
}
vec3 glow(vec2 wp){
  vec2 uv = (wp + uPad) / uWorldSize;
  vec4 a = texture2D(uGlowA, uv), b = texture2D(uGlowB, uv);
  return a.rgb * a.a * 0.9 + b.rgb * b.a * 0.7;
}
// far "void" plane: dotted grid + drifting pixel stars, gives parallax depth
vec3 voidBg(vec3 dir){
  float ok; vec2 p = planeHit(dir, 420.0, ok);
  if (ok < 0.5) return vec3(0.0);
  vec2 cell = floor(p / 24.0);
  vec2 f = fract(p / 24.0);
  float dotv = step(f.x, 0.09) * step(f.y, 0.09);
  float star = step(0.985, h2(cell + 7.0)) * (0.5 + 0.5 * sin(uTime * 3.0 + h2(cell) * 40.0));
  vec3 base = mix(vec3(0.08, 0.1, 0.22), vec3(0.0, 0.25, 0.4), uBgHue);
  float fade = clamp(1.0 - length(p - vec2(480.0, 270.0)) / 1400.0, 0.0, 1.0);
  return (base * dotv * 0.9 + vec3(star) * 0.55) * uBg * fade;
}
vec3 sceneAt(vec2 uv, float caPx){
  vec3 dir = rayAt(uv);
  float ok; vec2 wp = planeHit(dir, 0.0, ok);
  vec3 bg = voidBg(dir);
  if (ok < 0.5) return bg;
  // chromatic aberration: split channels along the radial direction
  vec4 c = world(wp);
  vec3 col = c.rgb; float a = c.a;
  if (caPx > 0.05) {
    vec2 rd = (uv - 0.5); float rl = length(rd) + 1e-4;
    vec2 off = rd / rl * caPx * (0.35 + rl);
    vec4 cr = world(wp + off), cb = world(wp - off);
    col = vec3(cr.r, c.g, cb.b);
    a = max(a, max(cr.a, cb.a));
  }
  col = mix(bg, col, a);
  // dot-matrix LCD grid on world pixels (visible when zoomed in)
  vec2 pf = fract(wp);
  float gridv = max(step(0.82, pf.x), step(0.82, pf.y));
  col *= 1.0 - uGrid * gridv * a;
  // desaturate / cold tint (blue bone "don't move" moments)
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(l), uDesat);
  col = mix(col, col * uTint + uTint * 0.04, uTintAmt);
  col += glow(wp) * uBloom;
  return col;
}
void main(){
  vec2 uv = vec2((gl_FragCoord.x - uRect.x) / uRect.z, 1.0 - (gl_FragCoord.y - uRect.y) / uRect.w);
  // glitch: horizontal slice displacement
  if (uGlitch > 0.0) {
    float band = floor(uv.y * 36.0 + h1(floor(uTime * 24.0)) * 7.0);
    float r = h1(band * 3.1 + floor(uTime * 30.0) + uSeed);
    if (r < 0.35 * uGlitch) uv.x += (h1(band + uSeed * 7.0) - 0.5) * 0.18 * uGlitch;
    float blk = h2(floor(uv * vec2(24.0, 14.0)) + floor(uTime * 20.0));
    if (blk > 1.0 - 0.05 * uGlitch) uv += (vec2(h1(blk), h1(blk + 1.0)) - 0.5) * 0.06;
  }
  // VHS rewind: wobbling rows + a rolling tracking band
  if (uVHS > 0.0) {
    uv.x += sin(uv.y * 40.0 + uTime * 30.0) * 0.003 + (h1(floor(uv.y * 120.0) + floor(uTime * 60.0)) - 0.5) * 0.006;
    float band = fract(uTime * 1.7);
    if (abs(uv.y - band) < 0.03) uv.x += (h1(floor(uTime * 60.0)) - 0.5) * 0.08;
  }
  float ca = uCA + uGlitch * 6.0 + uVHS * 3.0;
  vec3 col;
  if (uMode3D > 0.5) {
    // first-person voxel pass: chromatic split + bloom from the emissive alpha
    vec2 q = vec2(uv.x, 1.0 - uv.y);
    vec2 off = (uv - 0.5) * ca / 480.0;
    vec4 c = texture2D(u3D, q);
    col = vec3(texture2D(u3D, q + off).r, c.g, texture2D(u3D, q - off).b);
    vec3 g = vec3(0.0);
    for (int i = 0; i < 12; i++) {
      float a = float(i) * 0.5236;
      for (int j = 1; j <= 2; j++) {
        vec4 s = texture2D(u3D, q + vec2(cos(a), sin(a)) * float(j * j) * 2.5 / vec2(480.0, 270.0));
        g += s.rgb * s.a;
      }
    }
    col += g / 24.0 * 1.6 * uBloom;
  } else col = sceneAt(uv, ca);
  // motion smear along camera velocity
  if (dot(uSmear, uSmear) > 1e-6) {
    vec3 acc = col;
    for (int i = 1; i <= 4; i++) acc += sceneAt(uv - uSmear * float(i) * 0.25, ca);
    col = acc / 5.0;
  }
  // screen-space overlay (letterbox texts, prompts)
  vec4 sc = texture2D(uScreen, uv);
  col = mix(col, sc.rgb, sc.a);
  // letterbox bars
  float lb = uLetter * 0.14;
  if (uv.y < lb || uv.y > 1.0 - lb) col = vec3(0.0);
  // vignette
  float v = length((uv - 0.5) * vec2(1.0, 0.8));
  col *= 1.0 - uVig * smoothstep(0.35, 0.85, v);
  // CRT-ish row darkening on output pixels
  col *= 1.0 - uScan * step(0.5, fract(gl_FragCoord.y * 0.5));
  // impact frames: hard black & white, optionally inverted
  if (uBW > 0.5) { float l = dot(col, vec3(0.333)); col = vec3(step(0.22, l)); }
  if (uVHS > 0.0) {
    float band = fract(uTime * 1.7);
    col += vec3(smoothstep(0.03, 0.0, abs(uv.y - band)) * 0.35 * h1(floor(uv.x * 200.0) + floor(uTime * 60.0)));
    col = mix(col, col * vec3(1.05, 0.9, 1.1), 0.5);
  }
  if (uInv > 0.5) col = 1.0 - col;
  else col = mix(col, uFlashCol, uFlash);
  gl_FragColor = vec4(col, 1.0);
}`;

  function makeTex(gl, filter) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  MV.Post = class {
    constructor(canvas) {
      const gl = (this.gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false }));
      if (!gl) throw new Error('WebGL unavailable');
      const sh = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const pr = (this.pr = gl.createProgram());
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
      gl.useProgram(pr);
      const buf = (this.vbuf = gl.createBuffer());
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = (this.aLoc = gl.getAttribLocation(pr, 'p'));
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      this.tex = { world: makeTex(gl, gl.NEAREST), ga: makeTex(gl, gl.LINEAR), gb: makeTex(gl, gl.LINEAR), screen: makeTex(gl, gl.NEAREST) };
      this.u = {};
      const n = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(pr, i);
        this.u[info.name] = gl.getUniformLocation(pr, info.name);
      }
      gl.uniform1i(this.u.uWorld, 0); gl.uniform1i(this.u.uGlowA, 1); gl.uniform1i(this.u.uGlowB, 2); gl.uniform1i(this.u.uScreen, 3); gl.uniform1i(this.u.u3D, 4);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    }
    upload(unit, tex, src) {
      const gl = this.gl;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    }
    // cam: {x, y, zoom, roll, pitch, yaw}; p: post params
    // rect: optional [x, y, w, h] viewport in canvas pixels (GL origin bottom-left) for split screens
    render(src, cam, p, rect, noUpload) {
      const gl = this.gl, u = this.u, cv = gl.canvas;
      const R4 = rect || [0, 0, cv.width, cv.height];
      gl.useProgram(this.pr);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuf);
      gl.vertexAttribPointer(this.aLoc, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.aLoc);
      gl.viewport(R4[0], R4[1], R4[2], R4[3]);
      gl.uniform4f(u.uRect, R4[0], R4[1], R4[2], R4[3]);
      if (noUpload) {
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex.world);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.tex.ga);
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.tex.gb);
      } else if (!p.mode3D) {
        this.upload(0, this.tex.world, src.world);
        this.upload(1, this.tex.ga, src.glowA);
        this.upload(2, this.tex.gb, src.glowB);
      } else {
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, src.tex3D);
      }
      if (!noUpload) this.upload(3, this.tex.screen, src.screen);
      else { gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, this.tex.screen); }
      // camera basis: looking down +z at the world plane (z = 0); screen y = +y world
      const fovY = 0.7, tanY = Math.tan(fovY / 2), tanX = tanY * (R4[2] / R4[3]);
      const dist = MV.VH / 2 / (tanY * (cam.zoom || 1));
      const cp = Math.cos(cam.pitch || 0), sp = Math.sin(cam.pitch || 0);
      const cy = Math.cos(cam.yaw || 0), sy = Math.sin(cam.yaw || 0);
      const cr = Math.cos(cam.roll || 0), sr = Math.sin(cam.roll || 0);
      // start: F=(0,0,1) R=(1,0,0) D=(0,1,0); apply roll (about F), pitch (about R), yaw (about D)
      let F = [0, 0, 1], Rv = [cr, sr, 0], Dv = [-sr, cr, 0];
      const rotX = (v) => [v[0], v[1] * cp - v[2] * sp, v[1] * sp + v[2] * cp];
      const rotY = (v) => [v[0] * cy + v[2] * sy, v[1], -v[0] * sy + v[2] * cy];
      F = rotY(rotX(F)); Rv = rotY(rotX(Rv)); Dv = rotY(rotX(Dv));
      const pos = [cam.x - F[0] * dist, cam.y - F[1] * dist, -F[2] * dist];
      gl.uniform3fv(u.uCamPos, pos);
      gl.uniform3fv(u.uF, F); gl.uniform3fv(u.uR, Rv); gl.uniform3fv(u.uD, Dv);
      gl.uniform2f(u.uTan, tanX, tanY);
      gl.uniform2f(u.uOut, R4[2], R4[3]);
      gl.uniform2f(u.uWorldSize, src.world.width, src.world.height);
      gl.uniform2f(u.uPad, MV.PADX, MV.PADY);
      const f1 = (n, v) => u[n] && gl.uniform1f(u[n], v);
      f1('uTime', p.time); f1('uCA', p.ca); f1('uInv', p.inv); f1('uBW', p.bw); f1('uFlash', p.flash);
      f1('uGlitch', p.glitch); f1('uBloom', p.bloom); f1('uVig', p.vig); f1('uDesat', p.desat);
      f1('uTintAmt', p.tintAmt); f1('uGrid', p.grid); f1('uScan', p.scan); f1('uLetter', p.letter);
      f1('uBg', p.bg); f1('uVHS', p.vhs || 0); f1('uMode3D', p.mode3D ? 1 : 0); f1('uBgHue', p.bgHue); f1('uSeed', p.seed || 0);
      gl.uniform3fv(u.uTint, p.tint || [0.55, 0.8, 1.3]);
      gl.uniform3fv(u.uFlashCol, p.flashCol || [1, 1, 1]);
      gl.uniform2fv(u.uSmear, p.smear || [0, 0]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  };
})();
