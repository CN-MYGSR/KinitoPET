/* ══════════════════════════════════════════════════════════════
   02-crt.js — CRT 显示器 / 开机自检 / 蓝屏 / 关机 / 全屏故障特效
   ══════════════════════════════════════════════════════════════ */
'use strict';

/* ── 静电雪花画布 ───────────────────────────────────────── */
K.CRT = {

  _staticStop: null,

  /* 在容器里铺一层动态雪花 */
  staticCanvas(host, opts){
    opts = opts || {};
    var cv = document.createElement('canvas');
    cv.className = 'static-canvas';
    host.appendChild(cv);
    var ctx = cv.getContext('2d', { alpha: false });
    var intensity = opts.intensity == null ? 1 : opts.intensity;
    var tint = opts.tint || null;

    function resize(){
      cv.width = Math.max(160, Math.floor(host.clientWidth / 2));
      cv.height = Math.max(120, Math.floor(host.clientHeight / 2));
    }
    resize();
    window.addEventListener('resize', resize);

    var img = ctx.createImageData(cv.width, cv.height);
    var stop = K.U.raf(function(){
      var d = img.data;
      var len = d.length;
      for(var i = 0; i < len; i += 4){
        var v = Math.random() * 255 * intensity;
        d[i] = v; d[i+1] = v; d[i+2] = v; d[i+3] = 255;
        if(tint && Math.random() < 0.06){
          d[i] = tint[0]; d[i+1] = tint[1]; d[i+2] = tint[2];
        }
      }
      ctx.putImageData(img, 0, 0);
      /* 滚动条带 */
      if(Math.random() < 0.12){
        var y = Math.random() * cv.height;
        var h = 2 + Math.random() * 14;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.12 + Math.random() * 0.3) + ')';
        ctx.fillRect(0, y, cv.width, h);
      }
    });

    return {
      stop(){ stop(); window.removeEventListener('resize', resize); },
      setIntensity(v){ intensity = v; },
      canvas: cv
    };
  },

  /* ── CRT 外壳 DOM ───────────────────────── */
  buildShell(){
    var room = K.U.el('div', { class: 'crt-room' });
    var shell = K.U.el('div', { class: 'crt-shell' });
    var bezel = K.U.el('div', { class: 'crt-bezel' });
    var glass = K.U.el('div', { class: 'crt-glass' });
    var content = K.U.el('div', { class: 'crt-content' });
    glass.appendChild(content);
    bezel.appendChild(glass);
    var power = K.U.el('button', { class: 'crt-power', title: 'Power' }, '\u23FB');
    var led = K.U.el('div', { class: 'crt-led' });
    shell.appendChild(bezel);
    shell.appendChild(power);
    shell.appendChild(led);
    room.appendChild(shell);
    return { room: room, shell: shell, bezel: bezel, glass: glass,
             content: content, power: power, led: led };
  },

  /* ── 开场：等待玩家按下电源键 ─────────────── */
  waitForPower(){
    var boot = K.Layers.boot();
    boot.innerHTML = '';
    boot.classList.remove('hidden');
    var ui = this.buildShell();
    boot.appendChild(ui.room);

    var st = this.staticCanvas(ui.content, { intensity: 0.22 });
    /* 先暗淡，按下后变亮 */
    ui.content.style.filter = 'brightness(.25)';

    return new Promise(function(resolve){
      ui.power.addEventListener('click', function once(){
        ui.power.removeEventListener('click', once);
        ui.power.classList.add('on');
        ui.led.classList.add('on');
        ui.content.style.transition = 'filter .35s';
        ui.content.style.filter = 'brightness(1)';
        st.setIntensity(1);
        K.Audio.init(); K.Audio.resume(); K.Audio.postBeep();
        setTimeout(function(){
          st.stop();
          ui.content.innerHTML = '';
          resolve(ui);
        }, 620);
      });
      /* 也允许直接点屏幕 */
      ui.glass.addEventListener('click', function once2(){
        ui.glass.removeEventListener('click', once2);
        ui.power.click();
      });
    });
  },

  /* ── POST 自检文本 ──────────────────────── */
  async post(ui, lines, perLine){
    perLine = perLine || 130;
    var box = K.U.el('div', { class: 'post' });
    ui.content.innerHTML = '';
    ui.content.appendChild(box);
    for(var i = 0; i < lines.length; i++){
      var L = lines[i];
      var row = K.U.el('div', { class: L.cls || '' });
      box.appendChild(row);
      await K.U.typeInto(row, L.t, 6);
      if(L.cls === 'ok' || L.cls === 'bad') K.Audio.postBeep();
      await K.U.wait(L.wait == null ? perLine : L.wait);
      box.scrollTop = box.scrollHeight;
    }
    await K.U.wait(420);
    return box;
  },

  /* ── 系统启动 Logo ─────────────────────── */
  async bootLogo(ui, opts){
    opts = opts || {};
    var name = opts.name || 'KinitoOS';
    var sub = opts.sub || 'WEB WORLD EDITION';
    var dur = opts.duration == null ? 2600 : opts.duration;

    var wrap = K.U.el('div', { class: 'bootlogo' });
    wrap.appendChild(K.U.el('div', { class: 'bl-mark', html: opts.markHtml || ('<b>' + K.U.esc(name) + '</b>') }));
    wrap.appendChild(K.U.el('div', { class: 'bl-sub', text: sub }));
    var dots = K.U.el('div', { class: 'bl-dots' });
    dots.appendChild(K.U.el('i')); dots.appendChild(K.U.el('i')); dots.appendChild(K.U.el('i'));
    wrap.appendChild(dots);
    ui.content.innerHTML = '';
    ui.content.appendChild(wrap);

    K.Audio.bootChime();
    await K.U.wait(dur);
    return wrap;
  },

  /* ── 蓝屏 ──────────────────────────────── */
  async bsod(opts){
    opts = opts || {};
    var layer = K.Layers.bsod();
    layer.classList.remove('hidden');
    layer.innerHTML = '';
    var inner = K.U.el('div', { class: 'bsod-inner' });
    inner.appendChild(K.U.el('div', { class: 'bsod-face', text: ':(' }));
    var txt = K.U.el('div', { class: 'bsod-text' });
    inner.appendChild(txt);
    var hint = K.U.el('div', { class: 'bsod-hint',
      text: opts.hint || '按任意键继续  ·  Press any key to continue' });
    inner.appendChild(hint);
    layer.appendChild(inner);

    K.Audio.crash();
    await K.U.typeInto(txt, opts.text || this.defaultBsodText(), 4);
    await K.U.wait(opts.wait == null ? 1400 : opts.wait);

    await new Promise(function(resolve){
      function go(){
        window.removeEventListener('keydown', go);
        window.removeEventListener('mousedown', go);
        window.removeEventListener('touchstart', go);
        resolve();
      }
      window.addEventListener('keydown', go);
      window.addEventListener('mousedown', go);
      window.addEventListener('touchstart', go);
    });
    layer.classList.add('hidden');
    layer.innerHTML = '';
  },

  defaultBsodText(){
    return [
      'A problem has been detected and Windows has been shut down to prevent',
      'damage to your computer.',
      '',
      'KINITO_OVERFLOW_EXCEPTION',
      '',
      'If this is the first time you\'ve seen this Stop error screen,',
      'restart your computer. If this screen appears again, follow these steps:',
      '',
      'Check to make sure any new hardware or software is properly installed.',
      'If problems continue, disable or remove any newly installed hardware',
      'or software. Disable BIOS memory options such as caching or shadowing.',
      '',
      'Technical information:',
      '',
      '*** STOP: 0x000000K1 (0x4B696E69, 0x746F5045, 0x00000000, 0xFFFFFFFF)',
      '',
      '***  kinito.sys - Address K1N1T0 base at F7B8C000, DateStamp 3f9d1a20'
    ].join('\n');
  },

  /* ── 关机 / 熄屏 ───────────────────────── */
  async powerOff(ui, msg, delay){
    var screen = document.getElementById('screen');
    K.Audio.silenceAll();
    var sd = K.U.el('div', { class: 'shutdown', text: msg || '正在关机...' });
    document.getElementById('screen').appendChild(sd);
    await K.U.wait(delay == null ? 1300 : delay);
    sd.remove();
    var glass = ui ? ui.glass : document.getElementById('screen');
    glass.classList.add('crt-off');
    await K.U.wait(460);
    return true;
  },

  /* ── 快速开机：屏幕一闪恢复 ─────────────── */
  async flickerOn(container, ms){
    var cv = K.U.el('div', { style: {
      position: 'absolute', inset: '0', background: '#000', zIndex: '8500'
    }});
    container.appendChild(cv);
    K.Audio.postBeep();
    await K.U.wait(ms == null ? 260 : ms);
    cv.classList.add('crt-on');
    await K.U.wait(500);
    cv.remove();
  },

  /* ── 标准自检行 ────────────────────────── */
  postLines(){
    var ram = 512 + K.U.randInt(0, 512);
    return [
      { t: 'KinitoBIOS v2.04  (C) 1999 Kinito Leisure & Entertainment Co.', cls: '' , wait: 90 },
      { t: '', wait: 40 },
      { t: 'CPU : KIN-3 @ 1.40GHz .......... OK', cls: 'ok', wait: 70 },
      { t: 'Memory Test : ' + ram + 'M ....... OK', cls: 'ok', wait: 70 },
      { t: 'Detecting IDE drives ...', wait: 110 },
      { t: '  Primary Master  : KINITO-HDD-1999', wait: 60 },
      { t: '  Primary Slave   : None', wait: 50 },
      { t: '  Secondary Master: CD-ROM 52X', wait: 60 },
      { t: 'Detecting USB devices ...', wait: 110 },
      { t: '  [1] Webcam .......... FOUND', cls: 'warn', wait: 90 },
      { t: '  [2] Microphone ...... FOUND', cls: 'warn', wait: 90 },
      { t: '  [3] Unknown Device .. FOUND', cls: 'bad', wait: 220 },
      { t: '', wait: 60 },
      { t: 'Initializing RRA System (React Respond Algorithm) ...', wait: 200 },
      { t: 'RRA System .......... ONLINE', cls: 'ok', wait: 130 },
      { t: '', wait: 60 },
      { t: 'Booting from KINITO-HDD-1999 ...', wait: 240 },
      { t: '', wait: 100 },
      { t: '  WARNING: user presence detected.', cls: 'warn', wait: 300 },
      { t: '  WARNING: establishing companion link ...', cls: 'bad', wait: 380 }
    ];
  }
};

/* ══════════════════════════════════════════════════════════════
   K.FX — 全屏故障 / 抖动 / 跳吓 / 血字 / 黑影
   ══════════════════════════════════════════════════════════════ */
K.FX = {

  _timers: [],

  _screen(){ return document.getElementById('screen'); },

  /* 色差抖动 */
  rgb(on, ms){
    var os = document.getElementById('os-layer');
    var st = document.getElementById('stage-layer');
    [os, st].forEach(function(n){
      if(!n) return;
      n.classList.toggle('fx-rgb', !!on);
    });
    if(on && ms) setTimeout(function(){ K.FX.rgb(false); }, ms);
  },

  shake(on, hard){
    var os = document.getElementById('os-layer');
    var st = document.getElementById('stage-layer');
    [os, st].forEach(function(n){
      if(!n) return;
      n.classList.remove('shake-hard', 'shake-soft');
      if(on) n.classList.add(hard === false ? 'shake-soft' : 'shake-hard');
    });
  },

  invert(on){
    var os = document.getElementById('os-layer');
    var st = document.getElementById('stage-layer');
    [os, st].forEach(function(n){
      if(!n) return;
      n.classList.toggle('fx-invert', !!on);
    });
  },

  /* 撕裂条 */
  tears(on, count){
    var ov = document.getElementById('glitch-overlay');
    if(!ov) return;
    if(!on){ ov.innerHTML = ''; ov.classList.remove('on'); return; }
    ov.innerHTML = '';
    ov.classList.add('on');
    count = count || 2;
    for(var i = 0; i < count; i++){
      var b = K.U.el('div', { class: 'tear-band' + (i === 0 ? '' : ' b' + (i + 1)) });
      ov.appendChild(b);
    }
  },

  /* 血色覆盖 */
  blood(on){
    var v = K.U.$('.blood-veil');
    if(!v){
      v = K.U.el('div', { class: 'blood-veil' });
      this._screen().appendChild(v);
    }
    v.classList.toggle('on', !!on);
  },

  /* 综合故障爆发 */
  burst(ms, opts){
    opts = opts || {};
    ms = ms || 700;
    K.Audio.glitchBurst(opts.intensity || 1);
    this.rgb(true);
    this.tears(true, opts.tears || 2);
    if(opts.shake !== false) this.shake(true, opts.hard !== false);
    var self = this;
    var t = setTimeout(function(){
      self.rgb(false); self.tears(false); self.shake(false);
    }, ms);
    this._timers.push(t);
    return t;
  },

  /* 闪白 */
  whiteout(ms){
    var w = K.U.el('div', { class: 'whiteout' });
    this._screen().appendChild(w);
    setTimeout(function(){ w.remove(); }, ms || 600);
  },

  /* ── 血字 ──────────────────────────────── */
  bloodText(text, ms, opts){
    opts = opts || {};
    var host = document.getElementById('stage-layer');
    if(opts.inOS || host.classList.contains('hidden')) host = document.getElementById('os-layer');
    var node = K.U.el('div', { class: 'bloodtext' });
    node.appendChild(K.U.el('div', { class: 'bt-inner', text: text }));
    if(opts.dark !== false){
      node.style.background = opts.bg || 'rgba(0,0,0,.82)';
    }
    host.appendChild(node);
    K.Audio.rumble(1.6);
    var self = this;
    return new Promise(function(resolve){
      var t = setTimeout(function(){
        node.style.transition = 'opacity .6s';
        node.style.opacity = '0';
        setTimeout(function(){ node.remove(); resolve(); }, 620);
      }, ms == null ? 1800 : ms);
      self._timers.push(t);
    });
  },

  /* ── 黑影剪影 ──────────────────────────── */
  silhouette(host, opts){
    opts = opts || {};
    host = host || document.getElementById('os-layer');
    var node = K.U.el('div', { class: 'silhouette' });
    Object.assign(node.style, {
      left: opts.left || 'auto', right: opts.right || 'auto',
      top: opts.top || 'auto', bottom: opts.bottom || 'auto',
      width: (opts.w || 90) + 'px', height: (opts.h || 190) + 'px',
      opacity: opts.opacity || 0.92
    });
    node.innerHTML = K.SVG.silhouetteFigure(opts.kind || 'tall');
    host.appendChild(node);
    return {
      node: node,
      remove(){ node.remove(); }
    };
  },

  /* ── 红框错误弹窗 ──────────────────────── */
  errorPopup(opts){
    opts = opts || {};
    var host = document.getElementById('sysdialog-host');
    var pop = K.U.el('div', { class: 'errpop' });
    Object.assign(pop.style, {
      left: (opts.x != null ? opts.x + 'px' : '50%'),
      top: (opts.y != null ? opts.y + 'px' : '50%'),
      transform: (opts.x != null ? 'none' : 'translate(-50%,-50%)'),
      zIndex: 9360 + (K.FX._popN = (K.FX._popN || 0) + 1)
    });
    var title = K.U.el('div', { class: 'ep-t' });
    title.appendChild(K.U.el('span', { text: '\u26A0' }));
    title.appendChild(K.U.el('span', { text: opts.title || 'Error' }));
    pop.appendChild(title);
    var body = K.U.el('div', { class: 'ep-b' });
    body.appendChild(K.U.el('div', { class: 'epi', text: '\u26A0\uFE0F' }));
    body.appendChild(K.U.el('div', { text: opts.message || '发生未知错误。' }));
    pop.appendChild(body);
    var foot = K.U.el('div', { class: 'ep-f' });
    var btn = K.U.el('button', { text: opts.button || 'OK' });
    foot.appendChild(btn);
    pop.appendChild(foot);
    host.appendChild(pop);
    K.Audio.error();
    return new Promise(function(resolve){
      btn.addEventListener('click', function(){
        pop.remove();
        resolve();
      });
    });
  },

  /* ── 跳吓 ──────────────────────────────── */
  jumpscare(opts){
    opts = opts || {};
    var host = document.getElementById('stage-layer');
    var inOS = false;
    if(host.classList.contains('hidden')){ host = document.getElementById('os-layer'); inOS = true; }
    var node = K.U.el('div', { class: 'jumpscare' });
    node.appendChild(K.U.el('div', { class: 'js-flash' }));
    var art = K.U.el('div', { class: 'js-rush' });
    art.innerHTML = opts.svg || K.SVG.kinitoFaceScary();
    node.appendChild(art);
    host.appendChild(node);

    K.Audio.scream();
    K.FX.shake(true, true);

    var self = this;
    var hold = opts.hold == null ? 900 : opts.hold;
    return new Promise(function(resolve){
      setTimeout(function(){
        art.classList.remove('js-rush');
        art.classList.add('js-throb');
      }, 430);
      setTimeout(function(){
        self.shake(false);
        node.style.transition = 'opacity .35s';
        node.style.opacity = '0';
        setTimeout(function(){ node.remove(); resolve(); }, 380);
      }, 430 + hold);
    });
  },

  /* ── 屏幕冻结 ──────────────────────────── */
  freeze(ms){
    var os = document.getElementById('os-layer');
    os.classList.add('frozen');
    K.Audio._osc('square', 120, 0.5, 0.2);
    setTimeout(function(){ os.classList.remove('frozen'); }, ms || 1200);
  },

  /* 清掉所有特效 */
  clearAll(){
    this._timers.forEach(clearTimeout);
    this._timers = [];
    this.rgb(false); this.tears(false); this.shake(false); this.invert(false);
    this.blood(false);
    document.getElementById('glitch-overlay').innerHTML = '';
    document.getElementById('glitch-overlay').classList.remove('on');
    document.getElementById('sysdialog-host').innerHTML = '';
    K.U.$$('.blood-veil, .whiteout, .jumpscare, .silhouette, .errpop, .freeze-frame')
      .forEach(function(n){ n.remove(); });
    document.getElementById('os-layer').classList.remove('frozen');
  }
};
