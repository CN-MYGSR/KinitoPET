/* ══════════════════════════════════════════════════════════════
   10-levels.js — 3D 关卡：捉迷藏 / 黑暗卧室 / YourWorld 嘉年华 / 个性化房子
   ══════════════════════════════════════════════════════════════ */
'use strict';

/* ── 精灵绘制工具 ───────────────────────────────────────── */
K.Sprite = {
  /* 把 Kinito 画进一个 canvas 上下文（用于 3D 精灵贴图） */
  kinito(cc, S, opts){
    opts = opts || {};
    var cx = S / 2;
    var headR = S * 0.28;
    var headY = S * 0.36;

    /* 腿 */
    cc.fillStyle = '#141418';
    cc.fillRect(cx - S * 0.075, headY + headR * 0.85, S * 0.055, S * 0.42);
    cc.fillRect(cx + S * 0.02, headY + headR * 0.85, S * 0.055, S * 0.42);
    cc.beginPath();
    cc.ellipse(cx - S * 0.047, S * 0.94, S * 0.055, S * 0.028, 0, 0, Math.PI * 2); cc.fill();
    cc.beginPath();
    cc.ellipse(cx + S * 0.047, S * 0.94, S * 0.055, S * 0.028, 0, 0, Math.PI * 2); cc.fill();

    /* 外鳃 */
    var gill = opts.dark ? '#8a3a58' : '#d1568f';
    var gillTip = opts.dark ? '#6a2040' : '#b03f76';
    for(var side = -1; side <= 1; side += 2){
      for(var i = 0; i < 3; i++){
        var by = headY - headR * 0.45 + i * headR * 0.46;
        var ex = cx + side * headR * 1.42;
        var ey = by - headR * 0.28 + i * headR * 0.26;
        cc.strokeStyle = gill;
        cc.lineWidth = S * 0.032;
        cc.lineCap = 'round';
        cc.beginPath();
        cc.moveTo(cx + side * headR * 0.92, by);
        cc.quadraticCurveTo(cx + side * headR * 1.2, by - headR * 0.2, ex, ey);
        cc.stroke();
        cc.fillStyle = gillTip;
        cc.beginPath(); cc.arc(ex, ey, S * 0.036, 0, Math.PI * 2); cc.fill();
      }
    }

    /* 头 */
    var grd = cc.createRadialGradient(cx - headR * 0.35, headY - headR * 0.4, headR * 0.1,
                                      cx, headY, headR * 1.25);
    grd.addColorStop(0, opts.dark ? '#c07a96' : '#ffffff');
    grd.addColorStop(0.45, opts.dark ? '#8a3a58' : '#f9c2dc');
    grd.addColorStop(1, opts.dark ? '#5a1c34' : '#eb8fb8');
    cc.fillStyle = grd;
    cc.beginPath();
    cc.ellipse(cx, headY, headR, headR * 1.08, 0, 0, Math.PI * 2);
    cc.fill();

    /* 眼 */
    var eyeY = headY - headR * 0.08;
    var eyeX = headR * 0.44;
    cc.fillStyle = opts.dark ? '#2a0004' : '#0d0d12';
    cc.beginPath(); cc.ellipse(cx - eyeX, eyeY, headR * 0.19, headR * 0.24, 0, 0, Math.PI * 2); cc.fill();
    cc.beginPath(); cc.ellipse(cx + eyeX, eyeY, headR * 0.19, headR * 0.24, 0, 0, Math.PI * 2); cc.fill();

    if(opts.glowingEyes){
      cc.fillStyle = '#ff2a2a';
      cc.beginPath(); cc.ellipse(cx - eyeX, eyeY, headR * 0.13, headR * 0.17, 0, 0, Math.PI * 2); cc.fill();
      cc.beginPath(); cc.ellipse(cx + eyeX, eyeY, headR * 0.13, headR * 0.17, 0, 0, Math.PI * 2); cc.fill();
      cc.fillStyle = '#ffdada';
      cc.beginPath(); cc.arc(cx - eyeX, eyeY, headR * 0.05, 0, Math.PI * 2); cc.fill();
      cc.beginPath(); cc.arc(cx + eyeX, eyeY, headR * 0.05, 0, Math.PI * 2); cc.fill();
    }else{
      cc.fillStyle = '#ffffff';
      cc.beginPath(); cc.arc(cx - eyeX - headR * 0.05, eyeY - headR * 0.07, headR * 0.06, 0, Math.PI * 2); cc.fill();
      cc.beginPath(); cc.arc(cx + eyeX - headR * 0.05, eyeY - headR * 0.07, headR * 0.06, 0, Math.PI * 2); cc.fill();
    }

    /* 嘴（恐怖态才有） */
    if(opts.mouth){
      cc.fillStyle = '#3d0008';
      cc.beginPath();
      cc.ellipse(cx, headY + headR * 0.62, headR * 0.42, headR * 0.22, 0, 0, Math.PI * 2);
      cc.fill();
      cc.fillStyle = '#f4f4f4';
      for(var t = -2; t <= 2; t++){
        cc.beginPath();
        cc.moveTo(cx + t * headR * 0.16 - headR * 0.06, headY + headR * 0.46);
        cc.lineTo(cx + t * headR * 0.16, headY + headR * 0.62);
        cc.lineTo(cx + t * headR * 0.16 + headR * 0.06, headY + headR * 0.46);
        cc.closePath(); cc.fill();
      }
    }

    /* 手 */
    if(opts.hands !== false){
      cc.fillStyle = '#ffffff';
      [[-1, 0], [1, 0]].forEach(function(h){
        var hx = cx + h[0] * headR * 1.5;
        var hy = headY + headR * 0.75;
        cc.beginPath(); cc.ellipse(hx, hy, S * 0.062, S * 0.075, 0, 0, Math.PI * 2); cc.fill();
        for(var f = 0; f < 5; f++){
          var a = (-0.85 + f * 0.42) * h[0] + Math.PI / 2 * (h[0] > 0 ? 1 : 1);
          var fx = hx + Math.cos(-Math.PI / 2 + (f - 2) * 0.3) * S * 0.09 * h[0];
          var fy = hy + Math.sin(-Math.PI / 2 + (f - 2) * 0.3) * S * 0.09;
          cc.beginPath();
          cc.ellipse(fx, fy, S * 0.019, S * 0.033, 0, 0, Math.PI * 2);
          cc.fill();
        }
      });
    }
  },

  /* 通用物件：桌子 / 灯 / 画框 / 喷泉 / 树 / 摊位 */
  prop(cc, S, kind, opts){
    opts = opts || {};
    var cx = S / 2;
    cc.save();
    if(kind === 'tree'){
      cc.fillStyle = '#4a3a24';
      cc.fillRect(cx - S * 0.045, S * 0.5, S * 0.09, S * 0.48);
      var greens = opts.snow ? ['#2a4a34', '#356044', '#1e3a28'] : ['#3f8a3a', '#4ea53c', '#2f7a2c'];
      greens.forEach(function(g, i){
        cc.fillStyle = g;
        cc.beginPath();
        cc.arc(cx + (i - 1) * S * 0.12, S * (0.42 - i * 0.06), S * (0.24 - i * 0.03), 0, Math.PI * 2);
        cc.fill();
      });
      if(opts.snow){
        cc.fillStyle = '#e8eef4';
        cc.beginPath(); cc.arc(cx, S * 0.34, S * 0.13, Math.PI, 0); cc.fill();
      }
    }else if(kind === 'table'){
      cc.fillStyle = '#a8784a';
      cc.fillRect(cx - S * 0.3, S * 0.46, S * 0.6, S * 0.08);
      cc.fillRect(cx - S * 0.25, S * 0.54, S * 0.06, S * 0.4);
      cc.fillRect(cx + S * 0.19, S * 0.54, S * 0.06, S * 0.4);
    }else if(kind === 'lamp'){
      cc.fillStyle = '#8a8078';
      cc.fillRect(cx - S * 0.02, S * 0.3, S * 0.04, S * 0.6);
      cc.beginPath(); cc.ellipse(cx, S * 0.9, S * 0.16, S * 0.05, 0, 0, Math.PI * 2); cc.fill();
      cc.fillStyle = '#e0c060';
      cc.beginPath();
      cc.moveTo(cx - S * 0.15, S * 0.14);
      cc.lineTo(cx + S * 0.15, S * 0.14);
      cc.lineTo(cx + S * 0.1, S * 0.3);
      cc.lineTo(cx - S * 0.1, S * 0.3);
      cc.closePath(); cc.fill();
    }else if(kind === 'frame'){
      cc.fillStyle = '#7a5a3a';
      cc.fillRect(cx - S * 0.22, S * 0.2, S * 0.44, S * 0.4);
      cc.fillStyle = opts.color || '#ffffff';
      cc.fillRect(cx - S * 0.18, S * 0.24, S * 0.36, S * 0.32);
      if(opts.drawing){
        /* 把玩家画的图缩放贴进去 */
        try{
          cc.drawImage(opts.drawing, cx - S * 0.18, S * 0.24, S * 0.36, S * 0.32);
        }catch(e){}
      }
    }else if(kind === 'fountain'){
      cc.fillStyle = '#a8b0b8';
      cc.beginPath(); cc.ellipse(cx, S * 0.82, S * 0.3, S * 0.1, 0, 0, Math.PI * 2); cc.fill();
      cc.fillStyle = '#8a949e';
      cc.beginPath(); cc.ellipse(cx, S * 0.76, S * 0.3, S * 0.1, 0, 0, Math.PI * 2); cc.fill();
      cc.fillStyle = '#7ec8ff';
      cc.beginPath(); cc.ellipse(cx, S * 0.76, S * 0.24, S * 0.07, 0, 0, Math.PI * 2); cc.fill();
      cc.fillStyle = '#a8b0b8';
      cc.fillRect(cx - S * 0.03, S * 0.42, S * 0.06, S * 0.36);
      cc.beginPath(); cc.ellipse(cx, S * 0.42, S * 0.1, S * 0.04, 0, 0, Math.PI * 2); cc.fill();
      cc.fillStyle = 'rgba(126,200,255,.75)';
      for(var i = 0; i < 6; i++){
        var a = (i / 6) * Math.PI * 2 + (opts.t || 0);
        cc.beginPath();
        cc.arc(cx + Math.cos(a) * S * 0.14, S * 0.36 + Math.sin(a) * S * 0.05, S * 0.02, 0, Math.PI * 2);
        cc.fill();
      }
    }else if(kind === 'stall'){
      cc.fillStyle = opts.color || '#e0453b';
      cc.fillRect(cx - S * 0.34, S * 0.3, S * 0.68, S * 0.12);
      cc.fillStyle = '#f4f4f4';
      for(var k = 0; k < 5; k++){
        if(k % 2 === 0) cc.fillRect(cx - S * 0.34 + k * S * 0.136, S * 0.3, S * 0.136, S * 0.12);
      }
      cc.fillStyle = '#c8b090';
      cc.fillRect(cx - S * 0.32, S * 0.42, S * 0.64, S * 0.34);
      cc.fillStyle = '#8a7050';
      cc.fillRect(cx - S * 0.32, S * 0.42, S * 0.64, S * 0.06);
      cc.fillStyle = '#5a4a34';
      cc.fillRect(cx - S * 0.3, S * 0.76, S * 0.05, S * 0.22);
      cc.fillRect(cx + S * 0.25, S * 0.76, S * 0.05, S * 0.22);
    }else if(kind === 'ferris'){
      var R = S * 0.4;
      cc.strokeStyle = '#c8c8d0'; cc.lineWidth = S * 0.022;
      cc.beginPath(); cc.arc(cx, S * 0.42, R, 0, Math.PI * 2); cc.stroke();
      for(var s = 0; s < 10; s++){
        var ang = (s / 10) * Math.PI * 2 + (opts.t || 0);
        cc.beginPath();
        cc.moveTo(cx, S * 0.42);
        cc.lineTo(cx + Math.cos(ang) * R, S * 0.42 + Math.sin(ang) * R);
        cc.stroke();
        cc.fillStyle = ['#e0453b','#f0c020','#4ea53c','#2f8fd8','#a349a4'][s % 5];
        cc.beginPath();
        cc.arc(cx + Math.cos(ang) * R, S * 0.42 + Math.sin(ang) * R, S * 0.032, 0, Math.PI * 2);
        cc.fill();
      }
      cc.strokeStyle = '#8a8a94'; cc.lineWidth = S * 0.026;
      cc.beginPath();
      cc.moveTo(cx - S * 0.2, S * 0.96); cc.lineTo(cx, S * 0.42);
      cc.lineTo(cx + S * 0.2, S * 0.96);
      cc.stroke();
    }else if(kind === 'coaster'){
      cc.strokeStyle = '#d8d8e0'; cc.lineWidth = S * 0.028;
      cc.beginPath();
      cc.moveTo(0, S * 0.8);
      cc.bezierCurveTo(S * 0.3, S * 0.4, S * 0.55, S * 0.2, S, S * 0.66);
      cc.stroke();
      cc.strokeStyle = '#8a8a94'; cc.lineWidth = S * 0.02;
      cc.beginPath();
      cc.moveTo(0, S * 0.84);
      cc.bezierCurveTo(S * 0.3, S * 0.44, S * 0.55, S * 0.24, S, S * 0.7);
      cc.stroke();
      cc.fillStyle = '#e0453b';
      var t = (opts.t || 0) % 1;
      var bx = t * S;
      var by = S * (0.8 + (0.66 - 0.8) * Math.pow(t, 1.4)) - Math.sin(t * Math.PI) * S * 0.22;
      cc.fillRect(bx - S * 0.05, by - S * 0.05, S * 0.1, S * 0.06);
    }else if(kind === 'train'){
      cc.fillStyle = '#2a3a4a';
      cc.beginPath(); cc.roundRect(cx - S * 0.36, S * 0.5, S * 0.72, S * 0.3, S * 0.05); cc.fill();
      cc.fillStyle = '#4a5a6a';
      cc.fillRect(cx - S * 0.3, S * 0.28, S * 0.24, S * 0.22);
      cc.fillStyle = '#8fd0ff';
      cc.fillRect(cx - S * 0.26, S * 0.32, S * 0.16, S * 0.12);
      cc.fillStyle = '#f0c020';
      cc.beginPath(); cc.arc(cx + S * 0.3, S * 0.62, S * 0.045, 0, Math.PI * 2); cc.fill();
      cc.fillStyle = '#1a1a20';
      cc.beginPath(); cc.arc(cx - S * 0.2, S * 0.82, S * 0.06, 0, Math.PI * 2); cc.fill();
      cc.beginPath(); cc.arc(cx + S * 0.18, S * 0.82, S * 0.06, 0, Math.PI * 2); cc.fill();
    }else if(kind === 'door'){
      cc.fillStyle = '#6a4a2a';
      cc.fillRect(cx - S * 0.22, 0, S * 0.44, S);
      cc.fillStyle = '#5a3a1c';
      cc.fillRect(cx - S * 0.18, S * 0.06, S * 0.36, S * 0.38);
      cc.fillRect(cx - S * 0.18, S * 0.5, S * 0.36, S * 0.44);
      cc.fillStyle = '#e0c060';
      cc.beginPath(); cc.arc(cx + S * 0.13, S * 0.5, S * 0.022, 0, Math.PI * 2); cc.fill();
    }else if(kind === 'key'){
      cc.fillStyle = '#e0c060';
      cc.beginPath(); cc.arc(cx, S * 0.3, S * 0.09, 0, Math.PI * 2); cc.fill();
      cc.fillStyle = '#0a0a0c';
      cc.beginPath(); cc.arc(cx, S * 0.3, S * 0.04, 0, Math.PI * 2); cc.fill();
      cc.fillStyle = '#e0c060';
      cc.fillRect(cx - S * 0.022, S * 0.38, S * 0.044, S * 0.4);
      cc.fillRect(cx, S * 0.68, S * 0.08, S * 0.03);
      cc.fillRect(cx, S * 0.75, S * 0.06, S * 0.03);
    }
    cc.restore();
  }
};

/* ══════════════════════════════════════════════════════════════
   关卡容器工具
   ══════════════════════════════════════════════════════════════ */
K.Levels = {

  _stage(){ return document.getElementById('stage-layer'); },

  /* 建立一个全屏 3D 舞台 */
  mount(opts){
    opts = opts || {};
    var stage = this._stage();
    stage.innerHTML = '';
    stage.classList.remove('hidden');
    K.Layers.only('stage');

    var box = K.U.el('div', { class: 'stage3d' });
    stage.appendChild(box);
    if(opts.title){
      box.appendChild(K.U.el('div', { class: 's3d-title', text: opts.title }));
    }
    if(opts.sub){
      box.appendChild(K.U.el('div', { class: 's3d-sub', text: opts.sub }));
    }
    if(opts.vignette !== false){
      box.appendChild(K.U.el('div', { class: 's3d-vignette' }));
    }
    if(opts.lamp){
      box.appendChild(K.U.el('div', { class: 's3d-lamp' }));
    }
    if(opts.crosshair !== false){
      box.appendChild(K.U.el('div', { class: 's3d-cross' }));
    }
    var fade = K.U.el('div', { class: 's3d-fade' + (opts.fadeIn === false ? ' on' : '') });
    box.appendChild(fade);

    return { stage: stage, box: box, fade: fade };
  },

  unmount(){
    var stage = this._stage();
    stage.innerHTML = '';
    stage.classList.add('hidden');
    document.body.classList.remove('nocursor');
    K.Layers.only('os');
  },

  async fadeOut(fade, instant){
    if(instant) fade.classList.add('instant');
    fade.classList.add('on');
    await K.U.wait(instant ? 140 : 820);
  },
  async fadeIn(fade, instant){
    if(instant) fade.classList.add('instant');
    fade.classList.remove('on');
    await K.U.wait(instant ? 140 : 820);
  },

  /* 黑幕字幕（独立于 3D 画布） */
  async caption(box, text, opts){
    opts = opts || {};
    var node = K.U.el('div', {
      style: {
        position: 'absolute', inset: '0', zIndex: '45',
        background: opts.bg || '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '18px', padding: '40px', textAlign: 'center'
      }
    });
    var inner = K.U.el('div', {
      style: {
        fontFamily: opts.mono ? 'var(--font-mono)' : 'var(--font-ui)',
        fontSize: opts.size || 'clamp(17px,2.6vmin,30px)',
        color: opts.color || '#d8d8de', lineHeight: '1.6',
        whiteSpace: 'pre-wrap', maxWidth: '860px', letterSpacing: opts.spacing || 'normal'
      }
    });
    node.appendChild(inner);
    box.appendChild(node);
    if(opts.voice !== false && K.Voice.supported){
      K.Voice.say(text, { pitch: opts.pitch != null ? opts.pitch : 0.42,
                          rate: opts.rate != null ? opts.rate : 0.82 });
    }
    await K.U.typeInto(inner, text, opts.speed || 60);
    if(opts.duration !== 0) await K.U.wait(opts.duration == null ? 1200 : opts.duration);
    return {
      node: node,
      inner: inner,
      async hide(ms){
        node.style.transition = 'opacity ' + (ms || 600) + 'ms';
        node.style.opacity = '0';
        await K.U.wait(ms || 600);
        node.remove();
      },
      remove(){ node.remove(); }
    };
  },

  /* 时钟（捉迷藏开场） */
  async clockScene(box, opts){
    opts = opts || {};
    var wrap = K.U.el('div', { class: 'clockface' });
    var svg = [
      '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">',
      '<circle cx="100" cy="100" r="92" fill="#f4f4f4" stroke="#2a2a30" stroke-width="6"/>',
      '<circle cx="100" cy="100" r="82" fill="#fff"/>'
    ];
    for(var i = 1; i <= 12; i++){
      var a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      svg.push('<text x="' + (100 + Math.cos(a) * 66) + '" y="' + (100 + Math.sin(a) * 66 + 6) +
               '" font-size="15" text-anchor="middle" fill="#2a2a30" font-family="sans-serif">' +
               i + '</text>');
    }
    /* 10:59 → 11:00 */
    svg.push('<line id="kh" x1="100" y1="100" x2="100" y2="46" stroke="#1a1a20" stroke-width="7" stroke-linecap="round"/>');
    svg.push('<line id="km" x1="100" y1="100" x2="100" y2="24" stroke="#1a1a20" stroke-width="5" stroke-linecap="round"/>');
    svg.push('<circle cx="100" cy="100" r="6" fill="#1a1a20"/>');
    svg.push('</svg>');
    wrap.innerHTML = svg.join('');
    box.appendChild(wrap);

    var digits = K.U.el('div', { class: 'cf-digit', text: '10:59' });
    wrap.appendChild(digits);

    /* 分针：10:59 → 11:00 */
    var km = wrap.querySelector('#km');
    var kh = wrap.querySelector('#kh');
    km.setAttribute('transform', 'rotate(354 100 100)');
    kh.setAttribute('transform', 'rotate(-30 100 100)');

    await K.U.wait(opts.delay == null ? 2400 : opts.delay);
    /* 跳到 11:00 */
    km.setAttribute('transform', 'rotate(0 100 100)');
    kh.setAttribute('transform', 'rotate(-30 100 100)');
    digits.textContent = '11:00';
    K.Audio._osc('triangle', 880, 0.35, 0.22);
    await K.U.wait(300);
    K.Audio._osc('triangle', 1174, 0.5, 0.2);
    /* 钟声 */
    for(var b = 0; b < 4; b++){
      setTimeout(function(){ K.Audio._osc('sine', 220, 0.5, 0.2); }, b * 380);
    }
    await K.U.wait(1800);
    return wrap;
  }
};

/* ══════════════════════════════════════════════════════════════
   关卡一：Hide and Seek（捉迷藏）
   ══════════════════════════════════════════════════════════════ */
K.Levels.hideSeek = async function(opts){
  opts = opts || {};
  var onEnd = opts.onEnd || function(){};

  var ui = K.Levels.mount({ title: opts.title || 'Hide and Seek', sub: '', lamp: true });
  var box = ui.box;

  /* ── 开场：时钟 + 字幕 ── */
  await K.Levels.clockScene(box, { delay: 2200 });
  await K.U.wait(500);

  var c1 = await K.Levels.caption(box, 'something is seeking you.\nDONT GET CAUGHT', {
    mono: true, size: 'clamp(20px,3.4vmin,40px)', duration: 0, color: '#d8d8d8'
  });
  await K.U.wait(900);
  K.Audio.glitchBurst(1.4);
  K.FX.shake(true, true);
  await K.U.wait(320);
  K.FX.shake(false);
  c1.node.style.transition = 'opacity .1s';
  c1.node.style.opacity = '0';
  await K.U.wait(140);
  c1.remove();

  /* ── 建立 3D 世界 ── */
  box.innerHTML = '';
  box.appendChild(K.U.el('div', { class: 's3d-vignette' }));
  var fade = K.U.el('div', { class: 's3d-fade on instant' });
  box.appendChild(fade);
  var cross = K.U.el('div', { class: 's3d-cross' });
  box.appendChild(cross);

  var rc = K.RC.create(box, {
    resolution: 3.0,
    speed: 2.4,
    floorTex: 'concrete',
    ceilTex: 'concrete',
    floorColor: [42, 38, 40],
    ceilColor: [22, 20, 24],
    hint: ''
  });

  var map = K.RC.dungeon(23, 23);
  rc.setMap(map, ['brick', 'bloodwall', 'concrete', 'wood']);
  rc.setPosition(1.5, 1.5, 1, 0);
  rc.setFog({ far: 9, strength: 1 });
  rc.setLight({ on: true, radius: 7.5, ambient: 0.2, color: [255, 200, 140] });

  /* ── 追猎者 ── */
  var hunter = rc.addSprite({
    x: 20.5, y: 20.5, scale: 1.15, aspect: 0.62, vOffset: -0.14,
    tag: 'kinito', noInteract: true,
    texSize: 160,
    draw: function(cc, S){ K.Sprite.kinito(cc, S, { mouth: true, glowingEyes: true, dark: true }); }
  });

  /* 环境装饰 */
  for(var i = 0; i < 22; i++){
    var px = K.U.rand(2, 21), py = K.U.rand(2, 21);
    if(map[Math.floor(py)][Math.floor(px)] !== 0) continue;
    rc.addSprite({
      x: px, y: py, scale: 0.55, aspect: 0.7, vOffset: -0.1,
      noInteract: true, tag: 'debris', texSize: 64,
      draw: function(cc, S){
        cc.fillStyle = '#3a2a2a';
        cc.beginPath();
        cc.ellipse(S/2, S*0.78, S*0.3, S*0.1, 0, 0, Math.PI * 2);
        cc.fill();
        cc.fillStyle = '#5a1018';
        cc.beginPath();
        cc.ellipse(S/2, S*0.76, S*0.2, S*0.06, 0, 0, Math.PI * 2);
        cc.fill();
      }
    });
  }

  /* ── 追猎逻辑 ── */
  var caught = false;
  var escaped = false;
  var t0 = performance.now();
  var SURVIVE = opts.surviveMs || 42000;
  var hunterSpeed = opts.hunterSpeed || 1.05;
  var speedRamp = 0;

  var hintEl = box.querySelector('.s3d-hint');
  if(hintEl){
    hintEl.textContent = 'WASD 移动  ·  移动鼠标环视  ·  撑住';
    hintEl.classList.remove('hidden');
  }

  /* 目标标记 */
  var exitSprite = rc.addSprite({
    x: 21.5, y: 1.5, scale: 0.9, aspect: 0.9, vOffset: -0.1,
    tag: 'exit', hint: '按 E 逃出去',
    texSize: 96,
    draw: function(cc, S){
      var g = cc.createRadialGradient(S/2, S/2, 2, S/2, S/2, S/2);
      g.addColorStop(0, 'rgba(255,240,180,.95)');
      g.addColorStop(0.5, 'rgba(255,200,80,.55)');
      g.addColorStop(1, 'rgba(255,200,80,0)');
      cc.fillStyle = g;
      cc.fillRect(0, 0, S, S);
    }
  });

  K.Audio.startAmbient('creep');
  K.Audio.playChaseMusic();

  rc.start();
  await K.Levels.fadeIn(fade, true);

  var beatTimer = 0;
  var killed = false;

  rc.setFreeze(false);

  var done = new Promise(function(resolve){
    var last = performance.now();
    var stopTick = rc;
    rc._tickHandler = function(dt){
      var now = performance.now();
      var elapsed = now - t0;
      speedRamp = K.U.clamp(elapsed / SURVIVE, 0, 1);
      var sp = hunterSpeed * (1 + speedRamp * 1.5);

      /* 简单追踪 AI：沿轴逼近 + 视线抖动 */
      var dx = rc.player.x - hunter.x;
      var dy = rc.player.y - hunter.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;

      /* 只在"看见"时直线追击，否则随机游走 */
      var sees = d < 14;
      if(sees){
        var nx = hunter.x + (dx / d) * sp * dt;
        var ny = hunter.y + (dy / d) * sp * dt;
        /* 碰墙则换轴 */
        if(map[Math.floor(ny)] && map[Math.floor(ny)][Math.floor(hunter.x)] === 0) hunter.y = ny;
        else if(map[Math.floor(hunter.y)] && map[Math.floor(hunter.y)][Math.floor(nx)] === 0) hunter.x = nx;
        else { hunter.x += K.U.rand(-0.4, 0.4); hunter.y += K.U.rand(-0.4, 0.4); }
      }else{
        hunter.x += K.U.rand(-0.3, 0.3);
        hunter.y += K.U.rand(-0.3, 0.3);
      }
      hunter.x = K.U.clamp(hunter.x, 1.2, 21.8);
      hunter.y = K.U.clamp(hunter.y, 1.2, 21.8);

      /* 心跳随距离加快 */
      beatTimer -= dt;
      if(beatTimer <= 0 && d < 12){
        K.Audio.heartbeat();
        beatTimer = K.U.clamp(d / 12 * 1.4, 0.35, 1.6);
      }

      /* 靠近时画面变红 */
      var prox = K.U.clamp(1 - d / 7, 0, 1);
      if(prox > 0.35){
        K.FX.blood(true);
      }else{
        K.FX.blood(false);
      }

      /* 抓住 */
      if(d < 0.85 && !caught && !escaped){
        caught = true;
        resolve('caught');
      }
      /* 到达出口 */
      if(!caught && !escaped){
        var ed = Math.hypot(rc.player.x - 21.5, rc.player.y - 1.5);
        if(ed < 1.2){ escaped = true; resolve('escaped'); }
      }
      /* 时间到 */
      if(elapsed > SURVIVE && !caught && !escaped){
        resolve('survived');
      }
    };
    rc.setTickHook = function(){};
  });

  /* 把 tick 挂上 */
  var tickHook = function(dt){ if(rc._tickHandler) rc._tickHandler(dt); };

  /* 因为 create() 里 onTick 是创建时固定的，这里重新创建一个带 tick 的实例不方便，
     改为轮询驱动（简单可靠） */
  var pollStop = K.U.raf(function(){
    if(rc._tickHandler) rc._tickHandler(1 / 60);
  });

  var result = await done;

  /* ── 结束演出 ── */
  pollStop();
  rc.setFreeze(true);
  K.Audio.stopEndingSong();
  K.Audio.stopMelody();
  K.FX.blood(false);

  if(result === 'caught'){
    /* 跳吓 */
    rc.releaseLock();
    var node = K.U.el('div', { class: 'jumpscare' });
    node.appendChild(K.U.el('div', { class: 'js-flash' }));
    var art = K.U.el('div', { class: 'js-rush' });
    art.innerHTML = K.SVG.kinitoFaceScary();
    node.appendChild(art);
    box.appendChild(node);
    K.Audio.scream();
    K.Audio.stopAmbient();
    K.FX.shake(true, true);
    await K.U.wait(430);
    art.classList.remove('js-rush'); art.classList.add('js-throb');
    await K.U.wait(1400);
    K.FX.shake(false);
    node.remove();
    rc.destroy();
    await K.U.wait(300);
    onEnd('caught');
  }else{
    /* 逃出：白闪 → 回到桌面 */
    K.Audio.stopAmbient();
    rc.releaseLock();
    K.FX.whiteout(700);
    K.Audio.whoosh(0.8);
    await K.U.wait(760);
    rc.destroy();
    onEnd(result);
  }
};

/* ══════════════════════════════════════════════════════════════
   关卡二：Inside a Dark House（黑暗卧室）
   ══════════════════════════════════════════════════════════════ */
K.Levels.darkBedroom = async function(opts){
  opts = opts || {};
  var onEnd = opts.onEnd || function(){};

  var ui = K.Levels.mount({ lamp: true, crosshair: false });
  var box = ui.box;

  var fade = K.U.el('div', { class: 's3d-fade on instant' });
  box.appendChild(fade);

  var rc = K.RC.create(box, {
    resolution: 2.6, speed: 1.5,
    floorTex: 'wood', ceilTex: 'concrete',
    floorColor: [58, 44, 34], ceilColor: [26, 24, 28],
    hint: ''
  });
  var map = K.RC.bedroom();
  rc.setMap(map, ['wood', 'concrete', 'wood', 'kinito']);
  rc.setPosition(7.5, 8.6, 0, -1);
  rc.setPitch(0.06);
  rc.setFog({ far: 7.5, strength: 1 });
  rc.setLight({ on: true, radius: 4.2, ambient: 0.1, color: [255, 210, 150] });

  /* 床 */
  rc.addSprite({
    x: 3.5, y: 3.6, scale: 0.95, aspect: 1.7, vOffset: 0.16,
    noInteract: true, texSize: 128,
    draw: function(cc, S){
      cc.fillStyle = '#3a4a5a';
      cc.beginPath(); cc.roundRect(S*0.05, S*0.45, S*0.9, S*0.42, S*0.06); cc.fill();
      cc.fillStyle = '#e8e8ee';
      cc.beginPath(); cc.roundRect(S*0.08, S*0.42, S*0.34, S*0.16, S*0.05); cc.fill();
      cc.fillStyle = '#2a3a4a';
      cc.fillRect(S*0.05, S*0.8, S*0.9, S*0.1);
    }
  });

  /* 床头柜 + 台灯 */
  rc.addSprite({
    x: 5.2, y: 3.4, scale: 0.6, aspect: 0.85, vOffset: 0.16,
    noInteract: true, tag: 'lamp', texSize: 96,
    draw: function(cc, S){ K.Sprite.prop(cc, S, 'lamp', {}); }
  });

  /* 窗（Kinito 会出现在这里） */
  var windowSprite = rc.addSprite({
    x: 7.5, y: 1.2, scale: 1.1, aspect: 1.4, vOffset: 0.1,
    noInteract: true, hidden: true, tag: 'window', texSize: 128,
    draw: function(cc, S){
      cc.fillStyle = '#0a0e16';
      cc.beginPath(); cc.roundRect(S*0.06, S*0.1, S*0.88, S*0.8, S*0.04); cc.fill();
      cc.strokeStyle = '#4a4038'; cc.lineWidth = S*0.05;
      cc.strokeRect(S*0.06, S*0.1, S*0.88, S*0.8);
      cc.beginPath();
      cc.moveTo(S*0.5, S*0.1); cc.lineTo(S*0.5, S*0.9);
      cc.moveTo(S*0.06, S*0.5); cc.lineTo(S*0.94, S*0.5);
      cc.stroke();
      /* 外面站着的 Kinito */
      cc.save();
      cc.translate(S*0.5, S*0.52);
      cc.scale(0.42, 0.42);
      cc.translate(-S*0.5, -S*0.5);
      K.Sprite.kinito(cc, S, { mouth: true, glowingEyes: true, dark: true });
      cc.restore();
      /* 玻璃反光 */
      cc.fillStyle = 'rgba(160,200,255,.09)';
      cc.fillRect(S*0.06, S*0.1, S*0.88, S*0.8);
    }
  });

  /* 门 */
  var doorSprite = rc.addSprite({
    x: 13.6, y: 6.5, scale: 1.0, aspect: 0.7, vOffset: 0.1,
    noInteract: true, tag: 'door', texSize: 96,
    draw: function(cc, S){ K.Sprite.prop(cc, S, 'door', {}); }
  });

  /* 天花板灯泡（会灭） */
  var bulb = rc.addSprite({
    x: 7.5, y: 5.5, scale: 0.35, aspect: 1, vOffset: 0.55,
    noInteract: true, tag: 'bulb', texSize: 64,
    draw: function(cc, S){
      var g = cc.createRadialGradient(S/2, S/2, 2, S/2, S/2, S/2);
      g.addColorStop(0, 'rgba(255,245,210,1)');
      g.addColorStop(0.35, 'rgba(255,225,150,.75)');
      g.addColorStop(1, 'rgba(255,225,150,0)');
      cc.fillStyle = g;
      cc.fillRect(0, 0, S, S);
      cc.fillStyle = '#fff8e0';
      cc.beginPath(); cc.arc(S/2, S/2, S*0.16, 0, Math.PI * 2); cc.fill();
    }
  });

  rc.start();
  await K.Levels.fadeIn(fade, true);

  K.Audio.startAmbient('dread');

  var hintEl = box.querySelector('.s3d-hint');
  if(hintEl){
    hintEl.textContent = 'WASD 移动  ·  移动鼠标环顾房间';
    hintEl.classList.remove('hidden');
  }

  /* 演出时间轴 */
  await K.U.wait(1800);

  /* 1) 窗外出现 Kinito */
  windowSprite.hidden = false;
  K.Audio.rumble(2.2);
  await K.U.wait(900);
  K.FX.shake(true, false);
  await K.U.wait(500);
  K.FX.shake(false);

  /* 2) 灯灭 */
  await K.U.wait(1400);
  K.Audio._osc('square', 90, 0.12, 0.25);
  rc.setLight({ on: false });
  bulb.hidden = true;
  box.style.transition = 'filter .5s';
  box.style.filter = 'brightness(.42)';
  K.Audio.startAmbient('creep');
  await K.U.wait(1500);

  /* 3) 门开 */
  doorSprite.hidden = true;
  var doorOpen = rc.addSprite({
    x: 13.6, y: 6.5, scale: 1.0, aspect: 0.16, vOffset: 0.1,
    noInteract: true, texSize: 64,
    draw: function(cc, S){
      cc.fillStyle = '#1a1410';
      cc.fillRect(S*0.3, 0, S*0.4, S);
      cc.fillStyle = 'rgba(255,220,150,.28)';
      cc.fillRect(S*0.32, 0, S*0.36, S);
    }
  });
  K.Audio._osc('sawtooth', 60, 1.4, 0.2);
  await K.U.wait(1600);

  /* 4) 门后探头的 Kinito */
  var peek = rc.addSprite({
    x: 13.4, y: 6.5, scale: 1.0, aspect: 0.42, vOffset: 0.06,
    noInteract: true, texSize: 128,
    draw: function(cc, S){
      cc.save();
      cc.translate(S*0.5, S*0.66);
      cc.scale(0.5, 0.5);
      cc.translate(-S*0.5, -S*0.5);
      K.Sprite.kinito(cc, S, { mouth: true, glowingEyes: true, dark: true, hands: false });
      cc.restore();
    }
  });
  await K.U.wait(1100);

  /* 5) 逼近 + 跳吓 */
  K.Audio.heartbeat();
  var approachStart = performance.now();
  await new Promise(function(resolve){
    var stop = K.U.raf(function(){
      var t = (performance.now() - approachStart) / 2600;
      if(t >= 1){ stop(); resolve(); return; }
      peek.x = 13.4 - t * 5.4;
      peek.y = 6.5 - t * 0.9;
      peek.scale = 1.0 + t * 1.4;
      peek.vOffset = 0.06 - t * 0.12;
      K.FX.blood(t > 0.5);
      if(Math.random() < 0.12) K.Audio.glitchBurst(0.5);
    });
  });

  rc.releaseLock();
  rc.setFreeze(true);
  K.Audio.stopAmbient();
  K.FX.blood(false);

  var js = K.U.el('div', { class: 'jumpscare' });
  js.appendChild(K.U.el('div', { class: 'js-flash' }));
  var art = K.U.el('div', { class: 'js-rush' });
  art.innerHTML = K.SVG.kinitoFaceScary();
  js.appendChild(art);
  box.appendChild(js);
  K.Audio.scream();
  K.FX.shake(true, true);
  await K.U.wait(430);
  art.classList.remove('js-rush'); art.classList.add('js-throb');
  await K.U.wait(1200);
  K.FX.shake(false);
  js.remove();

  rc.destroy();
  await K.U.wait(260);
  onEnd('scared');
};

/* ══════════════════════════════════════════════════════════════
   关卡三：YourWorld.exe（嘉年华）
   ══════════════════════════════════════════════════════════════ */
K.Levels.carnival = async function(opts){
  opts = opts || {};
  var onEnd = opts.onEnd || function(){};
  var name = K.State.userName || 'Player';

  var ui = K.Levels.mount({ crosshair: false });
  var box = ui.box;
  var fade = K.U.el('div', { class: 's3d-fade on instant' });
  box.appendChild(fade);

  var rc = K.RC.create(box, {
    resolution: 3.2, speed: 3.2,
    floorTex: 'grass', ceilTex: 'tile',
    floorColor: [74, 122, 62], ceilColor: [140, 190, 226],
    hint: ''
  });
  var map = K.RC.carnival();
  rc.setMap(map, ['wood', 'kinito', 'brick']);
  rc.setPosition(15.5, 28.5, 0, -1);
  rc.setPitch(0.02);
  rc.setFog({ far: 24, strength: 0.85 });
  rc.setLight({ on: false, ambient: 0.5 });

  var t = 0;
  var visited = {};

  /* 摊位 */
  var stallColors = ['#e0453b', '#f0c020', '#4ea53c', '#2f8fd8', '#a349a4', '#e070a0', '#20b0a0'];
  [[7, 7], [15, 6], [23, 8], [8, 16], [24, 17], [14, 25], [21, 24]].forEach(function(p, i){
    rc.addSprite({
      x: p[0] + 1.4, y: p[1] + 1.0, scale: 1.5, aspect: 1.25, vOffset: 0.05,
      tag: 'stall', hint: '按 E 看看这个摊位',
      data: { idx: i },
      texSize: 160,
      draw: function(cc, S){ K.Sprite.prop(cc, S, 'stall', { color: stallColors[i % stallColors.length] }); }
    });
  });

  /* 摩天轮 */
  var ferris = rc.addSprite({
    x: 8, y: 26, scale: 3.6, aspect: 1.1, vOffset: -0.28,
    tag: 'ferris', hint: '按 E 坐摩天轮',
    texSize: 256,
    draw: function(cc, S){ K.Sprite.prop(cc, S, 'ferris', { t: 0 }); }
  });

  /* 过山车 */
  var coaster = rc.addSprite({
    x: 26, y: 27, scale: 3.2, aspect: 1.6, vOffset: -0.16,
    tag: 'coaster', hint: '按 E 乘坐过山车',
    texSize: 256,
    draw: function(cc, S){ K.Sprite.prop(cc, S, 'coaster', { t: 0.4 }); }
  });

  /* 火车（去程） */
  var train = rc.addSprite({
    x: 15.5, y: 22, scale: 1.5, aspect: 1.5, vOffset: 0.06,
    tag: 'train', hint: '按 E 上车',
    texSize: 160,
    draw: function(cc, S){ K.Sprite.prop(cc, S, 'train', {}); }
  });

  /* 树 */
  for(var i = 0; i < 26; i++){
    var px = K.U.rand(1.5, 29.5), py = K.U.rand(1.5, 29.5);
    if(map[Math.floor(py)][Math.floor(px)] !== 0) continue;
    rc.addSprite({
      x: px, y: py, scale: 1.1, aspect: 0.8, vOffset: -0.05,
      noInteract: true, texSize: 96,
      draw: function(cc, S){ K.Sprite.prop(cc, S, 'tree', { snow: false }); }
    });
  }

  rc.start();
  await K.Levels.fadeIn(fade, false);

  var hintEl = box.querySelector('.s3d-hint');
  if(hintEl){
    hintEl.textContent = 'WASD 移动  ·  鼠标环视  ·  E 互动';
    hintEl.classList.remove('hidden');
  }

  var caption = await K.Levels.caption(box, name + '_world.exe', {
    mono: true, size: 'clamp(22px,3.6vmin,44px)', duration: 1800, voice: false
  });
  await caption.hide(500);

  K.Desktop.notify('Kinito', '这是我为你做的世界。全都是你的。', { duration: 5200 });

  /* 动画循环（摩天轮转动） */
  var animT = 0;
  var animStop = K.U.raf(function(dt){
    animT += 1 / 60;
    /* 精灵重绘代价高，这里只更新光晕数据 */
  });

  /* 交互处理 */
  var coasterUnlocked = false;
  var stallCount = 0;
  var finished = false;

  var waitFor = new Promise(function(resolve){
    rc.setTickHook = null;
    /* 用 create 的 onInteract 无法后挂，改用轮询检测 E 键 */
  });

  /* 由于 onInteract 在 create 时固定，这里用键盘监听补充 */
  function onKey(e){
    if(e.key.toLowerCase() !== 'e' || finished) return;
    var sp = rc.pickSprite();
    if(!sp) return;
    if(sp.tag === 'stall'){
      stallCount++;
      visited[sp.data.idx] = true;
      K.Audio.coin();
      K.Desktop.notify('Kinito', '你玩得开心吗？还有更多。', { duration: 3200 });
      if(stallCount >= 4 && !coasterUnlocked){
        coasterUnlocked = true;
        coaster.hint = '按 E 乘坐过山车';
        K.Desktop.notify('Kinito', '现在……坐过山车吧。我等这一刻很久了。', { duration: 5200 });
      }
    }else if(sp.tag === 'ferris'){
      K.Audio.ok();
      K.Desktop.notify('Kinito', '从上面能看到整个属于你的世界。', { duration: 3600 });
    }else if(sp.tag === 'train'){
      K.Audio.whoosh(0.6);
      rc.setPosition(15.5, 20, 0, -1);
      K.Desktop.notify('Kinito', '坐稳了。', { duration: 2600 });
    }else if(sp.tag === 'coaster'){
      if(!coasterUnlocked){
        K.Audio.error();
        K.Desktop.notify('Kinito', '先把别的地方都玩一遍。别急 —— 我们有的是时间。',
          { duration: 4600 });
        return;
      }
      finished = true;
      resolve('coaster');
    }
  }
  window.addEventListener('keydown', onKey);

  var result = await waitFor;

  /* ── 过山车 → 隧道 → 你的季节 ── */
  window.removeEventListener('keydown', onKey);
  animStop();
  rc.releaseLock();
  rc.setFreeze(true);
  K.Audio.whoosh(1.2);

  /* 过山车视角 */
  var ride = K.U.el('div', {
    style: {
      position: 'absolute', inset: '0', zIndex: '40',
      background: 'linear-gradient(180deg,#7ec8ff,#bfe9ff 40%,#4a8a3a 41%,#2f6a2c)',
      overflow: 'hidden'
    }
  });
  box.appendChild(ride);
  /* 轨道 */
  var track = K.U.el('div', {
    style: {
      position: 'absolute', left: '50%', bottom: '0', width: '14px', height: '100%',
      background: 'repeating-linear-gradient(180deg,#8a8a94 0 18px,#5a5a64 18px 36px)',
      transform: 'translateX(-50%) rotate(-6deg)', transformOrigin: 'bottom center'
    }
  });
  ride.appendChild(track);

  for(var k = 0; k < 3; k++){
    (function(idx){
      var seg = K.U.el('div', {
        style: {
          position: 'absolute', left: '50%', top: (idx * 32) + '%',
          width: '200%', height: '3px', background: 'rgba(255,255,255,.75)',
          transform: 'translateX(-50%)'
        }
      });
      ride.appendChild(seg);
    })(k);
  }

  await K.U.wait(600);
  /* 加速感 */
  K.Audio.rumble(3);
  for(var s = 0; s < 22; s++){
    K.FX.shake(true, false);
    await K.U.wait(90);
  }
  K.FX.shake(false);

  var cap2 = await K.Levels.caption(box, 'Kinito：\n\n其实……游乐场不是我为\n你做的最用心的东西。', {
    size: 'clamp(17px,2.6vmin,30px)', duration: 2400, pitch: 0.7, rate: 0.92
  });
  await cap2.hide(600);

  /* 隧道 */
  var tunnel = K.U.el('div', {
    style: {
      position: 'absolute', inset: '0', zIndex: '44',
      background: 'radial-gradient(circle at 50% 50%, #2a2a34 0%, #0a0a0e 62%, #000 100%)'
    }
  });
  box.appendChild(tunnel);
  K.Audio.startAmbient('dread');
  for(var ring = 0; ring < 16; ring++){
    var r = K.U.el('div', {
      style: {
        position: 'absolute', left: '50%', top: '50%',
        width: (ring * 90 + 60) + 'px', height: (ring * 90 + 60) + 'px',
        marginLeft: -(ring * 90 + 60) / 2 + 'px', marginTop: -(ring * 90 + 60) / 2 + 'px',
        border: '2px solid rgba(120,140,170,' + (0.5 - ring * 0.028) + ')',
        borderRadius: '50%'
      }
    });
    tunnel.appendChild(r);
  }
  await K.U.wait(3200);
  K.Audio.stopAmbient();

  rc.destroy();
  onEnd('tunnel');
};

/* ══════════════════════════════════════════════════════════════
   关卡四：你回答过的那个地方 + 个性化房子
   ══════════════════════════════════════════════════════════════ */
K.Levels.yourSeason = async function(opts){
  opts = opts || {};
  var onEnd = opts.onEnd || function(){};
  var season = K.State.season || 'winter';
  var isSnow = season === 'winter';

  var ui = K.Levels.mount({ crosshair: false });
  var box = ui.box;
  var fade = K.U.el('div', { class: 's3d-fade on instant' });
  box.appendChild(fade);

  var rc = K.RC.create(box, {
    resolution: 3.2, speed: 3.0,
    floorTex: isSnow ? 'snow' : 'grass',
    ceilTex: 'tile',
    floorColor: isSnow ? [220, 230, 240] : [74, 122, 62],
    ceilColor: isSnow ? [180, 200, 225] : [150, 195, 230],
    hint: ''
  });
  var map = K.RC.forestWorld(season);
  rc.setMap(map, [isSnow ? 'snow' : 'forest', isSnow ? 'snow' : 'forest', 'concrete']);
  rc.setPosition(20.5, 32.5, 0, -1);
  rc.setFog({ far: 26, strength: 0.9 });
  rc.setLight({ on: false, ambient: 0.55 });

  /* 树 */
  for(var i = 0; i < 220; i++){
    var px = K.U.rand(1.5, 39.5), py = K.U.rand(1.5, 39.5);
    if(map[Math.floor(py)][Math.floor(px)] !== 1) continue;
    rc.addSprite({
      x: px, y: py, scale: K.U.rand(1.2, 2.0), aspect: 0.8, vOffset: -0.06,
      noInteract: true, texSize: 96,
      draw: function(cc, S){ K.Sprite.prop(cc, S, 'tree', { snow: isSnow }); }
    });
  }

  /* 红色 X */
  var xMark = rc.addSprite({
    x: 20.5, y: 18, scale: 1.2, aspect: 1.6, vOffset: 0.24,
    tag: 'x', hint: '按 E 站在这里',
    texSize: 128,
    draw: function(cc, S){
      cc.strokeStyle = '#d81b1b'; cc.lineWidth = S * 0.09; cc.lineCap = 'round';
      cc.beginPath();
      cc.moveTo(S * 0.22, S * 0.22); cc.lineTo(S * 0.78, S * 0.78);
      cc.moveTo(S * 0.78, S * 0.22); cc.lineTo(S * 0.22, S * 0.78);
      cc.stroke();
    }
  });

  rc.start();
  await K.Levels.fadeIn(fade, false);

  var hintEl = box.querySelector('.s3d-hint');
  if(hintEl){
    hintEl.textContent = 'WASD 移动  ·  走到红色 X 上';
    hintEl.classList.remove('hidden');
  }

  var cap = await K.Levels.caption(box, '（这里是你说的那个地方。）', {
    size: 'clamp(16px,2.4vmin,28px)', duration: 2200, pitch: 0.55, rate: 0.86
  });
  await cap.hide(500);

  /* 等玩家走到 X */
  await new Promise(function(resolve){
    var stop = K.U.raf(function(){
      var d = Math.hypot(rc.player.x - 20.5, rc.player.y - 18);
      if(d < 1.6){ stop(); resolve(); }
    });
  });

  /* Kinito 关掉显示器 */
  rc.setFreeze(true);
  rc.releaseLock();
  var off = K.U.el('div', {
    style: {
      position: 'absolute', inset: '0', zIndex: '46',
      background: 'radial-gradient(circle at 50% 50%, #1a1a1e 0%, #000 70%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }
  });
  box.appendChild(off);
  K.Audio._osc('square', 120, 0.14, 0.3);
  var offCap = await K.Levels.caption(box, 'Kinito：别偷看。\n\n我在给你盖房子。', {
    size: 'clamp(17px,2.6vmin,30px)', duration: 3200, pitch: 0.72, rate: 0.9
  });
  await offCap.hide(700);
  off.remove();

  /* 房子出现 */
  var house = rc.addSprite({
    x: 20.5, y: 14, scale: 4.2, aspect: 1.15, vOffset: -0.16,
    tag: 'house', hint: '按 E 走进去',
    texSize: 256,
    draw: function(cc, S){
      /* 程序化房子 */
      cc.fillStyle = isSnow ? '#e0d8c8' : '#e8d4b8';
      cc.fillRect(S * 0.14, S * 0.42, S * 0.72, S * 0.56);
      cc.fillStyle = '#8a5a3a';
      cc.beginPath();
      cc.moveTo(S * 0.06, S * 0.44);
      cc.lineTo(S * 0.5, S * 0.06);
      cc.lineTo(S * 0.94, S * 0.44);
      cc.closePath(); cc.fill();
      if(isSnow){
        cc.fillStyle = '#f4f8fc';
        cc.beginPath();
        cc.moveTo(S * 0.06, S * 0.44);
        cc.lineTo(S * 0.5, S * 0.06);
        cc.lineTo(S * 0.94, S * 0.44);
        cc.lineTo(S * 0.86, S * 0.44);
        cc.lineTo(S * 0.5, S * 0.14);
        cc.lineTo(S * 0.14, S * 0.44);
        cc.closePath(); cc.fill();
      }
      cc.fillStyle = '#6a4a2a';
      cc.fillRect(S * 0.42, S * 0.64, S * 0.16, S * 0.34);
      cc.fillStyle = '#e0c060';
      cc.beginPath(); cc.arc(S * 0.55, S * 0.82, S * 0.016, 0, Math.PI * 2); cc.fill();
      cc.fillStyle = '#ffe9a8';
      cc.fillRect(S * 0.2, S * 0.54, S * 0.14, S * 0.14);
      cc.fillRect(S * 0.66, S * 0.54, S * 0.14, S * 0.14);
      cc.strokeStyle = '#8a5a3a'; cc.lineWidth = S * 0.02;
      cc.strokeRect(S * 0.2, S * 0.54, S * 0.14, S * 0.14);
      cc.strokeRect(S * 0.66, S * 0.54, S * 0.14, S * 0.14);
    }
  });

  K.Audio.whoosh(1.0);
  K.FX.whiteout(800);
  await K.U.wait(900);
  rc.setFreeze(false);

  await new Promise(function(resolve){
    var stop = K.U.raf(function(){
      var d = Math.hypot(rc.player.x - 20.5, rc.player.y - 14);
      if(d < 2.6){ stop(); resolve(); }
    });
  });

  rc.releaseLock();
  rc.destroy();
  K.Audio.whoosh(0.7);
  await K.U.wait(400);
  onEnd('entered');
};

/* ══════════════════════════════════════════════════════════════
   关卡五：个性化房子内部
   你之前的回答与画作都会出现在这里
   ══════════════════════════════════════════════════════════════ */
K.Levels.house = async function(opts){
  opts = opts || {};
  var onEnd = opts.onEnd || function(){};
  var name = K.State.userName || 'Player';

  var ui = K.Levels.mount({ crosshair: false });
  var box = ui.box;
  var fade = K.U.el('div', { class: 's3d-fade on instant' });
  box.appendChild(fade);

  var rc = K.RC.create(box, {
    resolution: 3.0, speed: 2.6,
    floorTex: 'wood', ceilTex: 'tile',
    floorColor: [96, 70, 46], ceilColor: [210, 208, 200],
    hint: ''
  });
  var map = K.RC.houseInterior();
  rc.setMap(map, ['wood', 'brick', 'wood', 'kinito', 'bloodwall']);
  rc.setPosition(8.5, 12.5, 0, -1);
  rc.setFog({ far: 16, strength: 0.8 });
  rc.setLight({ on: true, radius: 8, ambient: 0.42, color: [255, 236, 200] });

  /* ── 墙上挂着的画（玩家在分析中心画的） ── */
  var drawings = K.State.drawings || {};
  var drawKeys = ['happy', 'sad', 'friend', 'self'].filter(function(k){ return drawings[k]; });
  var drawingImgs = {};
  drawKeys.forEach(function(k){
    var im = new Image();
    im.onload = function(){ drawingImgs[k] = im; };
    im.src = drawings[k];
  });

  var framePositions = [[4, 1.4], [7, 1.4], [10, 1.4], [13, 1.4]];
  drawKeys.forEach(function(k, i){
    var p = framePositions[i] || framePositions[0];
    rc.addSprite({
      x: p[0], y: p[1], scale: 1.0, aspect: 1.1, vOffset: 0.18,
      noInteract: true, tag: 'drawing', texSize: 128,
      draw: function(cc, S){
        K.Sprite.prop(cc, S, 'frame', {
          color: '#fff8f0',
          drawing: drawingImgs[k] || null
        });
        if(!drawingImgs[k]){
          /* 图片还没加载完，画个占位 */
          cc.fillStyle = ['#f9c2dc','#a8c8f0','#f0d0a0','#c0e8c0'][i % 4];
          cc.fillRect(S * 0.32, S * 0.24, S * 0.36, S * 0.32);
        }
      }
    });
  });

  /* 桌子 */
  rc.addSprite({
    x: 7, y: 7.5, scale: 1.4, aspect: 1.2, vOffset: 0.02,
    tag: 'table', hint: '按 E 查看桌子',
    texSize: 160,
    draw: function(cc, S){ K.Sprite.prop(cc, S, 'table', {}); }
  });

  /* 游戏机（他把你喜欢的游戏放进来了） */
  rc.addSprite({
    x: 12, y: 7.5, scale: 1.1, aspect: 1.0, vOffset: 0.1,
    tag: 'games', hint: '按 E 看看这些游戏',
    texSize: 128,
    draw: function(cc, S){
      cc.fillStyle = '#2a2a34';
      cc.beginPath(); cc.roundRect(S*0.1, S*0.3, S*0.8, S*0.5, S*0.06); cc.fill();
      cc.fillStyle = '#8fd0ff';
      cc.fillRect(S*0.2, S*0.38, S*0.6, S*0.3);
      cc.fillStyle = '#1a1a20';
      cc.beginPath(); cc.arc(S*0.28, S*0.86, S*0.04, 0, Math.PI*2); cc.fill();
      cc.beginPath(); cc.arc(S*0.72, S*0.86, S*0.04, 0, Math.PI*2); cc.fill();
    }
  });

  /* 喷泉 */
  var fountain = rc.addSprite({
    x: 8.5, y: 9.5, scale: 1.3, aspect: 1.0, vOffset: 0.06,
    tag: 'fountain', hint: '按 E 触碰喷泉',
    texSize: 160,
    draw: function(cc, S){ K.Sprite.prop(cc, S, 'fountain', { t: fountainT }); }
  });
  var fountainT = 0;
  var fountainUsed = false;

  /* 楼梯 / 阁楼门 */
  var atticDoor = rc.addSprite({
    x: 3, y: 4, scale: 1.5, aspect: 0.7, vOffset: 0.08,
    tag: 'attic', hint: '按 E 上楼（需要钥匙）',
    texSize: 128,
    draw: function(cc, S){ K.Sprite.prop(cc, S, 'door', {}); }
  });

  /* 两扇锁着的门 */
  var lockedDoorL = rc.addSprite({
    x: 12.4, y: 1.6, scale: 1.4, aspect: 0.7, vOffset: 0.08,
    tag: 'doorL', hint: '按 E 打开',
    texSize: 128,
    draw: function(cc, S){ K.Sprite.prop(cc, S, 'door', {}); }
  });
  var lockedDoorR = rc.addSprite({
    x: 4.4, y: 1.6, scale: 1.4, aspect: 0.7, vOffset: 0.08,
    tag: 'doorR', hint: '按 E 打开',
    texSize: 128,
    draw: function(cc, S){ K.Sprite.prop(cc, S, 'door', {}); }
  });

  /* 椅子（结局场景里的那把） */
  rc.addSprite({
    x: 15, y: 12.5, scale: 1.0, aspect: 0.8, vOffset: 0.06,
    noInteract: true, texSize: 96,
    draw: function(cc, S){
      cc.fillStyle = '#5a3a1c';
      cc.fillRect(S*0.42, S*0.3, S*0.16, S*0.6);
      cc.fillRect(S*0.2, S*0.86, S*0.6, S*0.08);
      cc.fillRect(S*0.22, S*0.5, S*0.56, S*0.06);
    }
  });

  /* Kinito 在场 */
  var kinito = rc.addSprite({
    x: 8.5, y: 8, scale: 1.3, aspect: 0.62, vOffset: -0.1,
    noInteract: true, tag: 'kinito', texSize: 160,
    draw: function(cc, S){ K.Sprite.kinito(cc, S, { hands: true }); }
  });

  rc.start();
  await K.Levels.fadeIn(fade, false);

  var hintEl = box.querySelector('.s3d-hint');
  if(hintEl){
    hintEl.textContent = 'WASD 移动  ·  E 互动';
    hintEl.classList.remove('hidden');
  }

  var hasKey1 = false, hasKey2 = false;
  var found = { table: false, games: false, fountain: false, attic: false, doorL: false, doorR: false };
  var finished = false;

  var cap = await K.Levels.caption(box,
    'Kinito：欢迎回家，' + name + '。\n\n这些都是你告诉我的。我一件都没忘。', {
      size: 'clamp(16px,2.4vmin,28px)', duration: 3600, pitch: 0.74, rate: 0.92
    });
  await cap.hide(700);

  function checkAll(){
    var done = Object.keys(found).filter(function(k){ return found[k]; }).length;
    if(done >= 5 && !finished){
      finished = true;
      resolveEnding();
    }
  }

  var resolveEnding = function(){};

  var endingPromise = new Promise(function(res){ resolveEnding = res; });

  function onKey(e){
    if(e.key.toLowerCase() !== 'e') return;
    var sp = rc.pickSprite();
    if(!sp) return;
    var tag = sp.tag;

    if(tag === 'table'){
      found.table = true;
      if(!hasKey1){ hasKey1 = true; K.Audio.coin(); }
      K.Desktop.notify('Kinito', '桌上有一把钥匙。它一直都在那儿 —— 我在等你找到它。',
        { duration: 4600 });
    }else if(tag === 'games'){
      found.games = true;
      K.Desktop.notify('Kinito',
        '这些是你最喜欢的游戏：' + (K.State.favGame || '（你没告诉我名字）') +
        '\n我从你的电脑里拷过来了。全部。', { duration: 5200 });
    }else if(tag === 'fountain'){
      if(fountainUsed) return;
      fountainUsed = true;
      found.fountain = true;
      K.Audio.rumble(2.4);
      K.FX.invert(true);
      K.FX.rgb(true);
      box.style.transition = 'filter 1.2s';
      box.style.filter = 'grayscale(1) contrast(1.4)';
      setTimeout(function(){
        K.FX.invert(false); K.FX.rgb(false);
        box.style.filter = '';
      }, 1800);
      K.Desktop.notify('Kinito', '那个喷泉……不是我给你做的。\n\n（它消失了。）',
        { duration: 5200 });
      setTimeout(function(){ sp.hidden = true; }, 1900);
    }else if(tag === 'attic'){
      if(!hasKey1 && !hasKey2){
        K.Audio.error();
        K.Desktop.notify('Kinito', '门锁着。去找钥匙。', { duration: 3000 });
        return;
      }
      found.attic = true;
      if(!hasKey2){ hasKey2 = true; K.Audio.coin(); }
      K.Desktop.notify('Kinito',
        '阁楼里是我照你画的图做的玩具 —— 给 Jade 的。\n你也该看看 Sam 的房间。',
        { duration: 5600 });
    }else if(tag === 'doorL'){
      if(!hasKey1){
        K.Audio.error();
        K.Desktop.notify('Kinito', '这扇门需要钥匙。', { duration: 2600 });
        return;
      }
      found.doorL = true;
      K.Audio.ok();
      K.Desktop.notify('Kinito',
        '里面是我照你给 Sam 装修的样子重做的房间。\n连那块黑色的方块我都留着。', { duration: 5600 });
    }else if(tag === 'doorR'){
      if(!hasKey2){
        K.Audio.error();
        K.Desktop.notify('Kinito', '先去阁楼拿另一把钥匙。', { duration: 2800 });
        return;
      }
      found.doorR = true;
      K.Audio.ok();
      K.Desktop.notify('Kinito',
        '这里放着你的画。全部四张。\n包括那张……「站在你身后的人」。', { duration: 5600 });
    }
    checkAll();
  }
  window.addEventListener('keydown', onKey);

  /* 喷泉动画 */
  var fountainRaf = K.U.raf(function(){
    fountainT += 1 / 60;
  });

  var result = await endingPromise;

  window.removeEventListener('keydown', onKey);
  fountainRaf();
  rc.setFreeze(true);
  rc.releaseLock();

  /* ── 最终提问 ── */
  K.Audio.stopAmbient();
  K.Audio.startAmbient('dread');

  kinito.x = rc.player.x + rc.player.dirX * 1.6;
  kinito.y = rc.player.y + rc.player.dirY * 1.6;
  kinito.scale = 1.5;
  kinito.vOffset = -0.06;

  var cap2 = await K.Levels.caption(box,
    'Kinito：\n\n我玩得很开心。\n\n我从来没这么开心过。', {
      size: 'clamp(17px,2.6vmin,32px)', duration: 3000, pitch: 0.7, rate: 0.88
    });
  await cap2.hide(700);

  K.Audio.stopAmbient();
  rc.destroy();

  onEnd('ready-to-choose');
};
