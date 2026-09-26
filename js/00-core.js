/* ══════════════════════════════════════════════════════════════
   00-core.js — 全局命名空间 / 状态 / 存档 / 工具 / 事件总线
   ══════════════════════════════════════════════════════════════ */
'use strict';

var K = window.K || {};
window.K = K;

K.VERSION = '1.0.0';

/* ── 工具 ───────────────────────────────────────────────── */
K.U = {
  $(sel, root){ return (root||document).querySelector(sel); },
  $$(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); },

  el(tag, opts, children){
    var n = document.createElement(tag);
    opts = opts || {};
    Object.keys(opts).forEach(function(k){
      var v = opts[k];
      if(k === 'class') n.className = v;
      else if(k === 'html') n.innerHTML = v;
      else if(k === 'text') n.textContent = v;
      else if(k === 'style' && typeof v === 'object') Object.assign(n.style, v);
      else if(k === 'data' && typeof v === 'object'){
        Object.keys(v).forEach(function(dk){ n.dataset[dk] = v[dk]; });
      }
      else if(k.slice(0,2) === 'on' && typeof v === 'function'){
        n.addEventListener(k.slice(2).toLowerCase(), v);
      }
      else if(v !== null && v !== undefined && v !== false) n.setAttribute(k, v);
    });
    if(children){
      (Array.isArray(children) ? children : [children]).forEach(function(c){
        if(c === null || c === undefined || c === false) return;
        n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return n;
  },

  svg(markup){ return '<svg xmlns="http://www.w3.org/2000/svg" ' + markup; },

  clamp(v, a, b){ return v < a ? a : (v > b ? b : v); },
  lerp(a, b, t){ return a + (b - a) * t; },
  rand(a, b){ return a + Math.random() * (b - a); },
  randInt(a, b){ return Math.floor(K.U.rand(a, b + 1)); },
  pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; },
  chance(p){ return Math.random() < p; },
  uid(){ return 'u' + (K.U._n = (K.U._n || 0) + 1); },
  esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  },
  wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); },
  nextFrame(){ return new Promise(function(r){ requestAnimationFrame(function(){ r(); }); }); },
  raf(fn){
    var id = 0, stop = false;
    function loop(t){
      if(stop) return;
      /* 首次是同步调用，t 为 undefined —— 必须补一个有效时间戳，
         否则 fn 里算 (t - last) 会得到 NaN，并污染后续所有帧。 */
      fn(t === undefined ? performance.now() : t);
      id = requestAnimationFrame(loop);
    }
    loop(performance.now());
    return function(){ stop = true; cancelAnimationFrame(id); };
  },
  shuffle(a){
    for(var i = a.length - 1; i > 0; i--){
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  },
  range(n){ var r = []; for(var i = 0; i < n; i++) r.push(i); return r; },

  /* 打字机 */
  async typeInto(node, text, speed, shouldStop){
    speed = speed || 32;
    node.textContent = '';
    for(var i = 0; i < text.length; i++){
      if(shouldStop && shouldStop()) return false;
      node.textContent += text.charAt(i);
      var ch = text.charAt(i);
      var d = speed;
      if(ch === '.' || ch === '!' || ch === '?') d = speed * 7;
      else if(ch === ',') d = speed * 3;
      else if(ch === '\n') d = speed * 4;
      if(!K.Audio.silent) K.Audio.tick(ch);
      await K.U.wait(d);
    }
    return true;
  },

  /* 格式化时间 */
  clock(d){
    d = d || new Date();
    var h = d.getHours(), m = d.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  },
  clock12(d){
    d = d || new Date();
    var h = d.getHours() % 12; if(h === 0) h = 12;
    var m = d.getMinutes();
    return h + ':' + (m < 10 ? '0' : '') + m;
  },

  /* 字符串相似度（用于"最好朋友"判定） */
  norm(s){
    return String(s == null ? '' : s).toLowerCase()
      .replace(/[\s\u3000]+/g,'')
      .replace(/[^\w\u4e00-\u9fa5]/g,'');
  },
  looksLikeKinito(s){
    var n = K.U.norm(s);
    if(!n) return false;
    return n.indexOf('kinito') >= 0 || n.indexOf('奇尼托') >= 0 ||
           n.indexOf('基尼托') >= 0 || n.indexOf('kinitopet') >= 0 ||
           n.indexOf('阿灯') >= 0 && n.length <= 4;
  },
  looksLikeKinitoStrict(s){
    var n = K.U.norm(s);
    return n === 'kinito' || n === 'kinitopet' || n.indexOf('kinito') >= 0;
  }
};

/* ── 事件总线 ───────────────────────────────────────────── */
K.Bus = {
  _m: {},
  on(ev, fn){
    (this._m[ev] = this._m[ev] || []).push(fn);
    return function(){ K.Bus.off(ev, fn); };
  },
  off(ev, fn){
    if(!this._m[ev]) return;
    var i = this._m[ev].indexOf(fn);
    if(i >= 0) this._m[ev].splice(i, 1);
  },
  emit(ev, payload){
    var list = this._m[ev];
    if(!list) return;
    list.slice().forEach(function(fn){
      try{ fn(payload); }
      catch(e){ console.error('[Bus:' + ev + ']', e); }
    });
  }
};

/* ── 游戏状态 ───────────────────────────────────────────── */
K.State = {
  /* 玩家信息 */
  userName: 'Player',
  favColor: 'pink',
  favColorHex: '#f9c2dc',
  favWord: '',
  superPower: '',
  favGame: '',
  favFood: '',
  petName: '',
  petType: '',
  season: 'winter',
  homeType: 'forest',
  fear: '',
  bestFriend: 'Kinito',
  drawings: {},          /* 各绘画任务的 dataURL */

  /* 进度 */
  act: 0,
  actId: 'boot',
  flags: {},
  mail: [],
  files: [],
  notes: [],
  endingsSeen: {},
  runCount: 0,
  controlLevel: 0,       /* 0..100 Kinito 控制度 */
  seen: {},              /* 已看过的剧情点 */

  reset(){
    var keepEndings = this.endingsSeen;
    var keepRuns = this.runCount;
    this.userName = 'Player';
    this.favColor = 'pink';
    this.favColorHex = '#f9c2dc';
    this.favWord = '';
    this.superPower = '';
    this.favGame = '';
    this.favFood = '';
    this.petName = '';
    this.petType = '';
    this.season = 'winter';
    this.homeType = 'forest';
    this.fear = '';
    this.bestFriend = 'Kinito';
    this.drawings = {};
    this.act = 0;
    this.actId = 'boot';
    this.flags = {};
    this.mail = [];
    this.files = [];
    this.notes = [];
    this.controlLevel = 0;
    this.seen = {};
    this.endingsSeen = keepEndings;
    this.runCount = keepRuns;
  },

  setFlag(k, v){ this.flags[k] = (v === undefined ? true : v); },
  flag(k){ return !!this.flags[k]; },

  addControl(n){
    this.controlLevel = K.U.clamp(this.controlLevel + n, 0, 100);
    K.Bus.emit('control', this.controlLevel);
  },

  /* 存档 */
  save(){
    try{
      var data = {
        v: K.VERSION,
        userName: this.userName, favColor: this.favColor, favColorHex: this.favColorHex,
        favWord: this.favWord, superPower: this.superPower, favGame: this.favGame,
        favFood: this.favFood, petName: this.petName, petType: this.petType,
        season: this.season, homeType: this.homeType, fear: this.fear,
        bestFriend: this.bestFriend,
        act: this.act, actId: this.actId, flags: this.flags,
        endingsSeen: this.endingsSeen, runCount: this.runCount,
        controlLevel: this.controlLevel
      };
      localStorage.setItem('kinitopet.save', JSON.stringify(data));
      localStorage.setItem('kinitopet.drawings', JSON.stringify(this.drawings));
    }catch(e){ /* 隐私模式等忽略 */ }
  },

  load(){
    try{
      var raw = localStorage.getItem('kinitopet.save');
      if(raw){
        var d = JSON.parse(raw);
        Object.keys(d).forEach(function(k){
          if(k !== 'v') K.State[k] = d[k];
        });
      }
      var dr = localStorage.getItem('kinitopet.drawings');
      if(dr) this.drawings = JSON.parse(dr) || {};
    }catch(e){}
    return this;
  },

  wipe(){
    try{
      localStorage.removeItem('kinitopet.save');
      localStorage.removeItem('kinitopet.drawings');
    }catch(e){}
  }
};

/* ── 屏幕尺寸辅助 ───────────────────────────────────────── */
K.Screen = {
  get w(){ return document.getElementById('screen').clientWidth; },
  get h(){ return document.getElementById('screen').clientHeight; },
  get rect(){ return document.getElementById('screen').getBoundingClientRect(); }
};

/* ── 简易遮罩管理器 ─────────────────────────────────────── */
K.Layers = {
  boot(){ return document.getElementById('boot-layer'); },
  os(){ return document.getElementById('os-layer'); },
  stage(){ return document.getElementById('stage-layer'); },
  bsod(){ return document.getElementById('bsod-layer'); },
  glitch(){ return document.getElementById('glitch-overlay'); },
  show(node){
    if(typeof node === 'string') node = document.getElementById(node);
    if(node) node.classList.remove('hidden');
  },
  hide(node){
    if(typeof node === 'string') node = document.getElementById(node);
    if(node) node.classList.add('hidden');
  },
  only(name){
    ['boot-layer','os-layer','stage-layer','bsod-layer'].forEach(function(id){
      var n = document.getElementById(id);
      if(!n) return;
      if(id === name + '-layer' || id === name) n.classList.remove('hidden');
      else n.classList.add('hidden');
    });
  }
};

/* ── 全局错误兜底（避免一处报错整屏死掉） ───────────────── */
window.addEventListener('error', function(e){
  console.error('[KinitoPET 未捕获错误]', e.message, e.filename, e.lineno);
});
window.addEventListener('unhandledrejection', function(e){
  console.error('[KinitoPET 未处理的 Promise 拒绝]', e.reason);
});

K.log = function(){
  if(K.DEBUG) console.log.apply(console, ['[K]'].concat(Array.prototype.slice.call(arguments)));
};
K.DEBUG = false;
