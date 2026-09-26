/* ══════════════════════════════════════════════════════════════
   01-audio.js — WebAudio 音效合成引擎 + 语音合成（Kinito 的机械男声）
   全部音频程序化生成，不加载任何外部素材。
   ══════════════════════════════════════════════════════════════ */
'use strict';

K.Audio = {
  ctx: null,
  master: null,
  musicGain: null,
  sfxGain: null,
  ambientGain: null,
  ready: false,
  muted: false,
  silent: false,          /* 打字音效开关 */
  _ambientNodes: [],
  _musicTimer: null,

  /* ── 初始化（必须在用户手势后调用） ───────── */
  init(){
    if(this.ctx) return true;
    try{
      var AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.75;
      this.master.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.6;
      this.sfxGain.connect(this.master);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.35;
      this.musicGain.connect(this.master);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.0;
      this.ambientGain.connect(this.master);

      this.ready = true;
      return true;
    }catch(e){
      console.warn('音频初始化失败', e);
      return false;
    }
  },

  resume(){
    if(this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  setVolume(v){
    if(!this.master) return;
    this.master.gain.setTargetAtTime(K.U.clamp(v, 0, 3), this.ctx.currentTime, 0.05);
  },

  /* ── 基础发声单元 ─────────────────────────── */
  _osc(type, freq, dur, vol, dest, detune){
    if(!this.ready) return null;
    var t = this.ctx.currentTime;
    var o = this.ctx.createOscillator();
    var g = this.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if(detune) o.detune.value = detune;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol == null ? 0.3 : vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest || this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.03);
    return o;
  },

  _noiseBuf(dur){
    var sr = this.ctx.sampleRate;
    var len = Math.max(1, Math.floor(sr * dur));
    var buf = this.ctx.createBuffer(1, len, sr);
    var d = buf.getChannelData(0);
    for(var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  },

  _noise(dur, vol, filterType, filterFreq, dest, q){
    if(!this.ready) return null;
    var t = this.ctx.currentTime;
    var src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf(dur);
    var g = this.ctx.createGain();
    g.gain.setValueAtTime(vol == null ? 0.2 : vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    var node = src;
    if(filterType){
      var f = this.ctx.createBiquadFilter();
      f.type = filterType;
      f.frequency.value = filterFreq || 1000;
      if(q) f.Q.value = q;
      src.connect(f); node = f;
    }
    node.connect(g);
    g.connect(dest || this.sfxGain);
    src.start(t);
    src.stop(t + dur + 0.02);
    return src;
  },

  /* ── 具体音效 ─────────────────────────────── */

  /* 打字 tick */
  tick(ch){
    if(!this.ready || this.muted) return;
    var code = (typeof ch === 'string' && ch.length) ? ch.charCodeAt(0) : 0;
    var f = 1500 + (code % 11) * 42;
    this._osc('square', f, 0.022, 0.035);
  },

  /* UI 点击 */
  click(){
    if(!this.ready || this.muted) return;
    this._osc('square', 880, 0.035, 0.075);
    this._osc('square', 1320, 0.028, 0.04);
  },

  /* 弹窗提示 */
  blip(){
    if(!this.ready || this.muted) return;
    this._osc('triangle', 660, 0.09, 0.16);
    var self = this;
    setTimeout(function(){ self._osc('triangle', 990, 0.11, 0.13); }, 75);
  },

  /* 错误 */
  error(){
    if(!this.ready || this.muted) return;
    this._osc('sawtooth', 220, 0.16, 0.2);
    var self = this;
    setTimeout(function(){ self._osc('sawtooth', 165, 0.26, 0.2); }, 130);
  },

  /* 成功 / 确认 */
  ok(){
    if(!this.ready || this.muted) return;
    var self = this;
    [523.25, 659.25, 783.99].forEach(function(f, i){
      setTimeout(function(){ self._osc('triangle', f, 0.16, 0.14); }, i * 70);
    });
  },

  /* 开机自检 beep */
  postBeep(){
    if(!this.ready || this.muted) return;
    this._osc('square', 1000, 0.09, 0.09);
  },

  /* 启动和弦 */
  bootChime(){
    if(!this.ready || this.muted) return;
    var self = this;
    [261.63, 329.63, 392.00, 523.25, 659.25].forEach(function(f, i){
      setTimeout(function(){
        self._osc('sine', f, 1.5, 0.11);
        self._osc('sine', f * 2, 1.2, 0.035);
      }, i * 110);
    });
  },

  /* 蓝屏 / 崩溃 */
  crash(){
    if(!this.ready || this.muted) return;
    this._noise(0.9, 0.28, 'lowpass', 900);
    var self = this;
    setTimeout(function(){ self._osc('sawtooth', 90, 1.4, 0.22); }, 60);
    setTimeout(function(){ self._osc('sawtooth', 60, 1.8, 0.18); }, 220);
  },

  /* 弹窗刷屏 */
  pop(i){
    if(!this.ready || this.muted) return;
    this._osc('square', 500 + (i || 0) * 55, 0.05, 0.1);
  },

  /* 蛋裂 / 孵化 */
  hatch(){
    if(!this.ready || this.muted) return;
    this._noise(0.2, 0.24, 'highpass', 1600);
    var self = this;
    setTimeout(function(){ self._noise(0.14, 0.2, 'highpass', 2400); }, 110);
    setTimeout(function(){ self._osc('triangle', 880, 0.35, 0.16); }, 230);
    setTimeout(function(){ self._osc('triangle', 1174, 0.45, 0.14); }, 330);
  },

  /* 谁osh 转场 */
  whoosh(dur){
    if(!this.ready || this.muted) return;
    dur = dur || 0.4;
    var t = this.ctx.currentTime;
    var src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf(dur);
    var f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(3200, t + dur * 0.7);
    f.frequency.exponentialRampToValueAtTime(400, t + dur);
    var g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.22, t + dur * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + dur + 0.05);
  },

  /* 硬币 / 得分 */
  coin(){
    if(!this.ready || this.muted) return;
    this._osc('square', 988, 0.07, 0.1);
    var self = this;
    setTimeout(function(){ self._osc('square', 1319, 0.2, 0.1); }, 65);
  },

  /* 清洁 / 刷墙 循环摩擦声 */
  scrub(){
    if(!this.ready || this.muted) return;
    this._noise(0.14, 0.1, 'bandpass', 2200, null, 2.5);
  },

  /* 传送带 */
  conveyor(){
    if(!this.ready || this.muted) return;
    this._osc('square', 110, 0.08, 0.05);
  },

  /* 心跳 */
  heartbeat(){
    if(!this.ready || this.muted) return;
    var t = this.ctx.currentTime;
    [0, 0.19].forEach(function(off, i){
      var o = K.Audio.ctx.createOscillator();
      var g = K.Audio.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(i ? 48 : 58, t + off);
      g.gain.setValueAtTime(0.0001, t + off);
      g.gain.linearRampToValueAtTime(i ? 0.3 : 0.4, t + off + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.22);
      o.connect(g); g.connect(K.Audio.sfxGain);
      o.start(t + off); o.stop(t + off + 0.26);
    });
  },

  /* 故障爆音 */
  glitchBurst(intensity){
    if(!this.ready || this.muted) return;
    intensity = intensity || 1;
    this._noise(0.09 * intensity, 0.2 * intensity, 'highpass', 900);
    this._osc('sawtooth', K.U.rand(60, 400), 0.07, 0.14 * intensity);
    if(Math.random() < 0.4){
      this._osc('square', K.U.rand(200, 1800), 0.045, 0.1);
    }
  },

  /* 跳吓尖啸 */
  scream(){
    if(!this.ready || this.muted) return;
    var t = this.ctx.currentTime;
    var self = this;
    /* 高频尖啸 */
    var o1 = this.ctx.createOscillator();
    var g1 = this.ctx.createGain();
    o1.type = 'sawtooth';
    o1.frequency.setValueAtTime(1800, t);
    o1.frequency.exponentialRampToValueAtTime(240, t + 0.85);
    g1.gain.setValueAtTime(0.34, t);
    g1.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
    o1.connect(g1); g1.connect(this.sfxGain);
    o1.start(t); o1.stop(t + 1.05);
    /* 低频撞击 */
    this._osc('sine', 62, 1.1, 0.4);
    /* 噪声爆 */
    this._noise(0.7, 0.34, 'highpass', 500);
    setTimeout(function(){ self._noise(0.5, 0.22, 'lowpass', 300); }, 90);
  },

  /* 低频轰鸣（压迫感） */
  rumble(dur){
    if(!this.ready || this.muted) return;
    dur = dur || 2;
    var t = this.ctx.currentTime;
    var o = this.ctx.createOscillator();
    var g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(38, t);
    o.frequency.linearRampToValueAtTime(30, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.3, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t + dur + 0.05);
  },

  /* ── 环境音（可开关） ─────────────────────── */
  startAmbient(kind){
    if(!this.ready) return;
    this.stopAmbient();
    var t = this.ctx.currentTime;
    var self = this;
    this.ambientGain.gain.cancelScheduledValues(t);
    this.ambientGain.gain.setValueAtTime(0.0001, t);
    this.ambientGain.gain.linearRampToValueAtTime(1, t + 1.2);

    if(kind === 'static' || kind === 'creep'){
      /* 白噪底 */
      var src = this.ctx.createBufferSource();
      src.buffer = this._noiseBuf(3);
      src.loop = true;
      var f = this.ctx.createBiquadFilter();
      f.type = kind === 'creep' ? 'lowpass' : 'highpass';
      f.frequency.value = kind === 'creep' ? 260 : 3000;
      var g = this.ctx.createGain();
      g.gain.value = kind === 'creep' ? 0.07 : 0.035;
      src.connect(f); f.connect(g); g.connect(this.ambientGain);
      src.start(t);
      this._ambientNodes.push(src);
    }
    if(kind === 'creep' || kind === 'dread'){
      /* 低频嗡鸣 */
      var o = this.ctx.createOscillator();
      var og = this.ctx.createGain();
      o.type = 'sine'; o.frequency.value = kind === 'dread' ? 44 : 55;
      og.gain.value = 0.09;
      o.connect(og); og.connect(this.ambientGain);
      o.start(t);
      this._ambientNodes.push(o);
      /* 缓慢颤动 */
      var lfo = this.ctx.createOscillator();
      var lg = this.ctx.createGain();
      lfo.type = 'sine'; lfo.frequency.value = 0.11;
      lg.gain.value = 6;
      lfo.connect(lg); lg.connect(o.frequency);
      lfo.start(t);
      this._ambientNodes.push(lfo);
    }
  },

  stopAmbient(){
    if(!this.ready) return;
    var t = this.ctx.currentTime;
    this.ambientGain.gain.cancelScheduledValues(t);
    this.ambientGain.gain.setTargetAtTime(0.0001, t, 0.4);
    var nodes = this._ambientNodes.slice();
    this._ambientNodes = [];
    setTimeout(function(){
      nodes.forEach(function(n){ try{ n.stop(); }catch(e){} });
    }, 1600);
  },

  /* ── 简易音乐（音序器） ───────────────────── */
  playMelody(notes, tempo, loop, dest){
    if(!this.ready) return;
    this.stopMelody();
    var self = this;
    var i = 0;
    var beat = 60000 / (tempo || 120);
    function step(){
      if(i >= notes.length){
        if(loop){ i = 0; }
        else { self._musicTimer = null; return; }
      }
      var n = notes[i];
      if(n && n.f){
        var d = (n.d || 1) * beat;
        self._osc(n.w || 'triangle', n.f, Math.min(d / 1000 * 0.92, 2.2),
                  (n.v == null ? 0.16 : n.v), dest || self.musicGain);
      }
      i++;
      self._musicTimer = setTimeout(step, (n && n.d ? n.d : 1) * beat);
    }
    step();
  },

  stopMelody(){
    if(this._musicTimer){ clearTimeout(this._musicTimer); this._musicTimer = null; }
  },

  /* 音乐盒旋律：好结局的可爱歌 */
  playEndingSong(){
    var N = {
      C4:261.63, D4:293.66, E4:329.63, F4:349.23, G4:392.00, A4:440.00, B4:493.88,
      C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99, A5:880.00
    };
    var mel = [
      {f:N.C5,d:0.5},{f:N.E5,d:0.5},{f:N.G5,d:1},{f:N.E5,d:0.5},{f:N.C5,d:1.5},
      {f:N.D5,d:0.5},{f:N.F5,d:0.5},{f:N.A5,d:1},{f:N.F5,d:0.5},{f:N.D5,d:1.5},
      {f:N.E5,d:0.5},{f:N.G5,d:0.5},{f:N.C5,d:1},{f:N.G4,d:0.5},{f:N.C5,d:2},
      {f:N.A4,d:0.5},{f:N.C5,d:0.5},{f:N.E5,d:1},{f:N.G5,d:1},{f:N.C5,d:2}
    ];
    this.playMelody(mel, 96, true, this.musicGain);
    /* 低音铺底 */
    var self = this;
    this._bassTimer = setInterval(function(){
      if(!self.ready) return;
      self._osc('sine', 130.81, 1.6, 0.09, self.musicGain);
    }, 2400);
  },

  stopEndingSong(){
    this.stopMelody();
    if(this._bassTimer){ clearInterval(this._bassTimer); this._bassTimer = null; }
  },

  /* 恐怖氛围音乐（捉迷藏） */
  playChaseMusic(){
    var N = { A2:110, C3:130.81, D3:146.83, E3:164.81, F3:174.61, G3:196, A3:220, C4:261.63 };
    var mel = [
      {f:N.A2,d:1,w:'sawtooth',v:0.1},{f:N.A2,d:1,w:'sawtooth',v:0.1},
      {f:N.C3,d:1,w:'sawtooth',v:0.11},{f:N.E3,d:1,w:'sawtooth',v:0.11},
      {f:N.G3,d:1,w:'sawtooth',v:0.12},{f:N.E3,d:1,w:'sawtooth',v:0.11},
      {f:N.F3,d:1,w:'sawtooth',v:0.11},{f:N.D3,d:1,w:'sawtooth',v:0.1},
      {f:N.A2,d:2,w:'sawtooth',v:0.13},{f:0,d:1},{f:N.A3,d:1,w:'square',v:0.07},
      {f:N.C4,d:2,w:'square',v:0.07}
    ];
    this.playMelody(mel, 150, true, this.musicGain);
  },

  /* 全静音 */
  silenceAll(){
    this.stopAmbient();
    this.stopMelody();
    this.stopEndingSong();
    if(this.master) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
  },
  unmuteAll(){
    if(this.master) this.master.gain.setTargetAtTime(0.75, this.ctx.currentTime, 0.3);
  }
};

/* ══════════════════════════════════════════════════════════════
   K.Voice — 用浏览器语音合成模拟 Kinito 的机械男声
   （原作使用微软 Sam TTS 的 Male #3 音色，这里用系统 TTS 逼近）
   ══════════════════════════════════════════════════════════════ */
K.Voice = {
  enabled: true,
  voice: null,
  rate: 0.94,
  pitch: 0.72,
  volume: 0.9,
  _supported: false,
  _current: null,

  init(){
    if(!('speechSynthesis' in window)){ this._supported = false; return; }
    this._supported = true;
    var self = this;
    function pick(){
      var vs = window.speechSynthesis.getVoices() || [];
      if(!vs.length) return;
      /* 优先英文男声 */
      var prefer = ['Microsoft David','Microsoft Mark','Google US English','Daniel',
                    'Alex','Microsoft Zira','Google UK English Male','Fred','Ralph'];
      for(var i = 0; i < prefer.length; i++){
        var found = vs.filter(function(v){ return v.name.indexOf(prefer[i]) >= 0; })[0];
        if(found){ self.voice = found; return; }
      }
      var en = vs.filter(function(v){ return /^en/i.test(v.lang); });
      self.voice = en[0] || vs[0];
    }
    pick();
    window.speechSynthesis.onvoiceschanged = pick;
  },

  get supported(){ return this._supported; },

  /* 说话。返回 Promise，说完 resolve */
  say(text, opts){
    opts = opts || {};
    var self = this;
    return new Promise(function(resolve){
      if(!self._supported || !self.enabled || !text){
        /* 无 TTS：按文本长度估算时间，让字幕节奏对得上 */
        var est = Math.max(700, String(text).length * 58);
        setTimeout(resolve, est);
        return;
      }
      try{
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(String(text));
        if(self.voice) u.voice = self.voice;
        u.lang = (self.voice && self.voice.lang) || 'en-US';
        u.rate = opts.rate != null ? opts.rate : self.rate;
        u.pitch = opts.pitch != null ? opts.pitch : self.pitch;
        u.volume = opts.volume != null ? opts.volume : self.volume;
        var done = false;
        function finish(){ if(done) return; done = true; resolve(); }
        u.onend = finish;
        u.onerror = finish;
        /* 兜底超时：某些浏览器不触发 onend */
        var guard = setTimeout(finish, Math.max(2500, String(text).length * 130));
        self._current = u;
        window.speechSynthesis.speak(u);
        u.onend = function(){ clearTimeout(guard); finish(); };
        u.onerror = function(){ clearTimeout(guard); finish(); };
      }catch(e){
        setTimeout(resolve, Math.max(700, String(text).length * 58));
      }
    });
  },

  shut(){
    try{ window.speechSynthesis.cancel(); }catch(e){}
    this._current = null;
  },

  /* 扭曲声音（恐怖段落用）：压低音高 + 放慢 */
  sayDistorted(text){
    return this.say(text, { pitch: 0.25, rate: 0.72, volume: 1 });
  },
  sayPanic(text){
    return this.say(text, { pitch: 1.35, rate: 1.42, volume: 1 });
  },
  saySoft(text){
    return this.say(text, { pitch: 0.85, rate: 0.86, volume: 0.75 });
  }
};
