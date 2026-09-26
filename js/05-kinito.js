/* ══════════════════════════════════════════════════════════════
   05-kinito.js — Kinito 本体：桌面宠物 / 对话气泡 / 行走 / 表情 / 逼近
   ══════════════════════════════════════════════════════════════ */
'use strict';

K.Kinito = {
  el: null,          /* 角色 DOM */
  bubble: null,      /* 对话气泡 DOM */
  _blinkTimer: null,
  _walkRaf: null,
  x: 0, y: 0,
  width: 175,
  visible: false,
  _busy: false,
  _queue: [],
  _autoBlink: true,

  layer(){ return document.getElementById('kinito-pet-layer'); },

  /* ── 生成 ───────────────────────────────── */
  spawn(opts){
    opts = opts || {};
    if(this.el){ this.show(); return this; }
    var self = this;
    var layer = this.layer();

    this.width = opts.width || 175;
    var node = K.U.el('div', { class: 'kinito', style: { '--kw': this.width + 'px' } });
    node.innerHTML = K.SVG.kinito({ surfboard: opts.surfboard });
    layer.appendChild(node);
    this.el = node;

    var screen = document.getElementById('screen');
    this.x = opts.x != null ? opts.x : Math.round(screen.clientWidth / 2 - this.width / 2);
    this.y = opts.y != null ? opts.y : Math.round(screen.clientHeight - 40 - this.height());
    this.place();

    node.style.opacity = '0';
    node.style.transition = 'opacity .5s, transform .5s';
    requestAnimationFrame(function(){ node.style.opacity = '1'; });
    this.visible = true;

    this.startBlink();
    if(opts.grabbable !== false) this.makeGrabbable();
    return this;
  },

  despawn(instant){
    if(this.bubble){ this.bubble.remove(); this.bubble = null; }
    if(!this.el) return;
    var el = this.el;
    this.el = null;
    this.visible = false;
    this.stopBlink();
    if(this._walkRaf){ this._walkRaf(); this._walkRaf = null; }
    if(instant){ el.remove(); return; }
    el.style.transition = 'opacity .5s, transform .5s';
    el.style.opacity = '0';
    el.style.transform = (el.style.transform || '') + ' translateY(30px)';
    setTimeout(function(){ el.remove(); }, 520);
  },

  show(){ if(this.el){ this.el.classList.remove('hidden'); this.visible = true; } },
  hide(){ if(this.el){ this.el.classList.add('hidden'); this.visible = false; } },

  height(){
    if(!this.el) return 320;
    var svg = this.el.querySelector('svg');
    if(!svg) return 320;
    return svg.getBoundingClientRect().height || 300;
  },

  place(){
    if(!this.el) return;
    this.el.style.left = this.x + 'px';
    this.el.style.top = this.y + 'px';
    this.positionBubble();
  },

  setWidth(px, animate){
    this.width = px;
    if(!this.el) return;
    if(animate) this.el.classList.add('towering');
    this.el.style.setProperty('--kw', px + 'px');
    if(!animate) this.el.classList.remove('towering');
  },

  /* ── 眨眼 ───────────────────────────────── */
  startBlink(){
    var self = this;
    this.stopBlink();
    (function loop(){
      self._blinkTimer = setTimeout(function(){
        if(!self.el) return;
        self.el.classList.add('blink');
        setTimeout(function(){
          if(self.el) self.el.classList.remove('blink');
        }, 130);
        loop();
      }, K.U.rand(2200, 5200));
    })();
  },
  stopBlink(){
    if(this._blinkTimer){ clearTimeout(this._blinkTimer); this._blinkTimer = null; }
  },

  /* ── 拖动 ───────────────────────────────── */
  makeGrabbable(){
    var self = this;
    if(!this.el) return;
    this.el.classList.add('grabbable');
    var dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
    this.el.addEventListener('mousedown', function(e){
      dragging = true;
      sx = e.clientX; sy = e.clientY; ox = self.x; oy = self.y;
      e.preventDefault();
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    });
    function move(e){
      if(!dragging) return;
      var screen = document.getElementById('screen');
      self.x = K.U.clamp(ox + (e.clientX - sx), -40, screen.clientWidth - self.width + 40);
      self.y = K.U.clamp(oy + (e.clientY - sy), 0, screen.clientHeight - 80);
      self.place();
    }
    function up(){
      dragging = false;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      /* 松手后轻轻落回底部 */
      self.settle();
    }
  },

  settle(){
    if(!this.el) return;
    var screen = document.getElementById('screen');
    var ground = screen.clientHeight - 40 - this.height();
    if(this.y > ground - 10) this.y = ground;
    else this.y = K.U.clamp(this.y, 0, ground);
    this.el.style.transition = 'top .4s cubic-bezier(.3,1.3,.5,1), left .4s ease';
    this.place();
    var self = this;
    setTimeout(function(){ if(self.el) self.el.style.transition = 'opacity .5s, transform .5s'; }, 440);
  },

  /* ── 行走 ───────────────────────────────── */
  walkTo(tx, ty, duration){
    var self = this;
    if(!this.el) return Promise.resolve();
    return new Promise(function(resolve){
      if(self._walkRaf){ self._walkRaf(); self._walkRaf = null; }
      var sx = self.x, sy = self.y;
      var dx = tx - sx, dy = (ty == null ? sy : ty) - sy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if(dist < 4){ resolve(); return; }
      var dur = duration || K.U.clamp(dist * 2.2, 420, 2600);
      var t0 = performance.now();
      self.el.classList.add('walking');
      self.el.style.transition = 'none';
      function frame(now){
        var t = K.U.clamp((now - t0) / dur, 0, 1);
        var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        self.x = sx + dx * e;
        self.y = sy + dy * e;
        self.place();
        if(t < 1) self._walkRaf = requestAnimationFrame(frame);
        else {
          self.el.classList.remove('walking');
          self._walkRaf = null;
          resolve();
        }
      }
      self._walkRaf = requestAnimationFrame(frame);
    });
  },

  walkToRandom(){
    var screen = document.getElementById('screen');
    var tx = K.U.rand(60, screen.clientWidth - this.width - 60);
    var ty = screen.clientHeight - 40 - this.height();
    return this.walkTo(tx, ty);
  },

  /* ── 气泡定位 ───────────────────────────── */
  positionBubble(){
    if(!this.bubble || !this.el) return;
    var screen = document.getElementById('screen');
    var bw = this.bubble.offsetWidth || 260;
    var bh = this.bubble.offsetHeight || 90;
    var cx = this.x + this.width / 2;
    var by = this.y - bh - 14;
    var left = K.U.clamp(cx - bw / 2, 12, screen.clientWidth - bw - 12);
    var top = by;
    if(top < 10) top = this.y + this.height() + 20;

    this.bubble.style.left = left + 'px';
    this.bubble.style.top = top + 'px';

    /* 箭头方向 */
    var arrowRight = cx < screen.clientWidth / 2;
    this.bubble.classList.toggle('arrow-right', !arrowRight);
  },

  /* ── 说话 ───────────────────────────────── */
  _ensureBubble(opts){
    opts = opts || {};
    if(this.bubble) this.bubble.remove();
    var b = K.U.el('div', { class: 'kspeech ' + (opts.dark ? 'dark' : '') });
    var name = opts.name === null ? null : (opts.name || 'KINITO');
    if(name) b.appendChild(K.U.el('div', { class: 'ks-name', text: name }));
    var t = K.U.el('div', { class: 'ks-text' });
    b.appendChild(t);
    this.layer().appendChild(b);
    this.bubble = b;
    this.positionBubble();
    return t;
  },

  /* 显示一句话（打字机），返回 Promise */
  async say(text, opts){
    opts = opts || {};
    var textEl = this._ensureBubble(opts);
    var self = this;
    var cancelled = false;
    var timer = setInterval(function(){ self.positionBubble(); }, 120);

    /* 语音与字幕并行；语音过长时不阻塞 */
    var voicePromise = null;
    if(opts.voice !== false && K.Voice.supported && !opts.silentVoice){
      if(opts.voiceStyle === 'distorted') voicePromise = K.Voice.sayDistorted(text);
      else if(opts.voiceStyle === 'panic') voicePromise = K.Voice.sayPanic(text);
      else if(opts.voiceStyle === 'soft')  voicePromise = K.Voice.saySoft(text);
      else voicePromise = K.Voice.say(text, opts.voiceOpts);
    }

    var speed = opts.speed != null ? opts.speed : (opts.dark ? 46 : 30);
    await K.U.typeInto(textEl, text, speed, function(){ return cancelled; });

    if(opts.hold !== false){
      var more = K.U.el('span', { class: 'ks-next', text: opts.nextHint || '▼ 点击继续' });
      textEl.appendChild(more);
      await new Promise(function(resolve){
        function go(e){
          if(e && e.target && e.target.closest('.kask, .kchoice')) return;
          clearInterval(timer);
          self.bubble && self.bubble.removeEventListener('click', go);
          window.removeEventListener('keydown', go);
          resolve();
        }
        if(self.bubble) self.bubble.addEventListener('click', go);
        window.addEventListener('keydown', go);
        if(opts.autoAdvance) setTimeout(go, opts.autoAdvance);
      });
    }
    clearInterval(timer);
    if(voicePromise){ try{ await Promise.race([voicePromise, K.U.wait(120)]); }catch(e){} }
    if(opts.keep !== true && opts.hold !== false){ /* 保留气泡等下一步 */ }
    return true;
  },

  /* 依次说多句 */
  async sayAll(lines, opts){
    for(var i = 0; i < lines.length; i++){
      await this.say(lines[i], opts);
    }
  },

  /* 提问（带输入框），返回玩家输入 */
  ask(text, opts){
    opts = opts || {};
    var self = this;
    var textEl = this._ensureBubble(opts);
    textEl.textContent = text;
    var timer = setInterval(function(){ self.positionBubble(); }, 120);

    var voicePromise = null;
    if(opts.voice !== false && K.Voice.supported){
      voicePromise = K.Voice.say(text, opts.voiceOpts);
    }

    return new Promise(function(resolve){
      var row = K.U.el('div', { class: 'kask' });
      var inp = K.U.el('input', { type: 'text', placeholder: opts.placeholder || '',
                                  maxlength: opts.maxlength || 40, value: opts.value || '' });
      var btn = K.U.el('button', { text: opts.okText || '确认' });
      row.appendChild(inp); row.appendChild(btn);
      self.bubble.appendChild(row);
      self.positionBubble();
      setTimeout(function(){ inp.focus(); }, 60);

      function submit(){
        var v = inp.value.trim();
        if(!v && opts.require !== false){ K.Audio.error(); return; }
        clearInterval(timer);
        if(voicePromise) voicePromise = null;
        K.Audio.ok();
        resolve(v);
      }
      btn.addEventListener('click', submit);
      inp.addEventListener('keydown', function(e){
        if(e.key === 'Enter') submit();
      });
    });
  },

  /* 选择题，返回所选值 */
  choice(text, options, opts){
    opts = opts || {};
    var self = this;
    var textEl = this._ensureBubble(opts);
    textEl.textContent = text;
    var timer = setInterval(function(){ self.positionBubble(); }, 120);
    if(opts.voice !== false && K.Voice.supported){
      K.Voice.say(text, opts.voiceOpts);
    }

    return new Promise(function(resolve){
      var row = K.U.el('div', { class: 'kchoice' });
      options.forEach(function(o){
        var b = K.U.el('button', { text: o.label });
        b.addEventListener('click', function(){
          clearInterval(timer);
          K.Audio.click();
          resolve(o.value);
        });
        row.appendChild(b);
      });
      self.bubble.appendChild(row);
      self.positionBubble();
    });
  },

  /* 关掉气泡 */
  clearBubble(){
    if(this.bubble){ this.bubble.remove(); this.bubble = null; }
  },

  /* ── 表情 / 状态 ────────────────────────── */
  setClass(cls, on){
    if(!this.el) return;
    this.el.classList.toggle(cls, on !== false);
  },
  angry(on){ this.setClass('angry', on); },
  glitching(on){ this.setClass('glitching', on); },

  /* 巨化逼近：占满屏幕并压向玩家 */
  async tower(targetWidth, ms){
    if(!this.el) return;
    var screen = document.getElementById('screen');
    var tw = targetWidth || Math.round(screen.clientWidth * 0.95);
    var th = tw * 1.5;
    this.el.style.transition = 'width ' + (ms || 1200) + 'ms cubic-bezier(.3,0,.4,1), ' +
                               'left ' + (ms || 1200) + 'ms cubic-bezier(.3,0,.4,1), ' +
                               'top ' + (ms || 1200) + 'ms cubic-bezier(.3,0,.4,1)';
    this.width = tw;
    this.x = Math.round((screen.clientWidth - tw) / 2);
    this.y = Math.round(screen.clientHeight - 40 - th * 0.82);
    this.el.style.setProperty('--kw', tw + 'px');
    this.el.style.left = this.x + 'px';
    this.el.style.top = this.y + 'px';
    await K.U.wait(ms || 1200);
    return true;
  },

  resetSize(){
    if(!this.el) return;
    this.el.style.transition = '';
    this.el.classList.remove('towering');
    this.setWidth(175);
    this.settle();
  },

  /* ── 换素材（正常/恐怖） ────────────────── */
  setSkin(kind){
    if(!this.el) return;
    var opts = {};
    if(kind === 'scary'){ opts.mouth = 'scary'; opts.eyeColor = '#3d0008'; }
    if(kind === 'bedroom'){ opts.mouth = 'open'; opts.eyeColor = '#0d0d12'; }
    if(kind === 'normal'){ opts = {}; }
    this.el.innerHTML = K.SVG.kinito(opts);
  },

  /* ── 静态肖像（用于窗口内） ─────────────── */
  portrait(host, opts){
    opts = opts || {};
    var box = K.U.el('div', { style: {
      width: (opts.size || 120) + 'px', margin: opts.center === false ? '0' : '0 auto'
    }});
    box.innerHTML = K.SVG.kinito(opts.svgOpts || {});
    if(host) host.appendChild(box);
    return box;
  }
};

/* ══════════════════════════════════════════════════════════════
   K.Narr — 旁白 / 黑屏字幕（不需要 Kinito 在场时用）
   ══════════════════════════════════════════════════════════════ */
K.Narr = {
  _host(){ return document.getElementById('stage-layer'); },

  /* 全屏黑底文字，逐字打出 */
  async show(text, opts){
    opts = opts || {};
    var host = document.getElementById('stage-layer');
    if(host.classList.contains('hidden')) host = document.getElementById('os-layer');

    var node = K.U.el('div', {
      style: {
        position: 'absolute', inset: '0', zIndex: '9250',
        background: opts.bg || 'rgba(0,0,0,.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px', textAlign: 'center'
      }
    });
    var inner = K.U.el('div', {
      style: {
        fontFamily: opts.mono ? 'var(--font-mono)' : 'var(--font-ui)',
        fontSize: (opts.size || 'clamp(18px,2.6vmin,30px)'),
        color: opts.color || '#d8d8de',
        lineHeight: '1.6', whiteSpace: 'pre-wrap', maxWidth: '860px',
        letterSpacing: opts.spacing || 'normal'
      }
    });
    node.appendChild(inner);
    host.appendChild(node);

    if(opts.voice && K.Voice.supported){
      K.Voice.say(text, { pitch: 0.5, rate: 0.85 });
    }

    await K.U.typeInto(inner, text, opts.speed || 42);

    if(opts.duration !== 0){
      await K.U.wait(opts.duration == null ? 1400 : opts.duration);
    }
    if(opts.hold){
      await new Promise(function(r){ setTimeout(r, opts.hold); });
    }
    return {
      node: node,
      inner: inner,
      fade: async function(ms){
        node.style.transition = 'opacity ' + (ms || 600) + 'ms';
        node.style.opacity = '0';
        await K.U.wait(ms || 600);
        node.remove();
      },
      remove(){ node.remove(); }
    };
  }
};
