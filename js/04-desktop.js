/* ══════════════════════════════════════════════════════════════
   04-desktop.js — 桌面 / 图标 / 任务栏 / 开始菜单 / 系统对话框 / 通知
   ══════════════════════════════════════════════════════════════ */
'use strict';

/* ── 系统对话框 ─────────────────────────────────────────── */
K.Dialog = {
  _stack: [],

  _base(opts){
    var host = document.getElementById('sysdialog-host');
    var dlg = K.U.el('div', { class: 'sysdlg' });
    Object.assign(dlg.style, { position: 'relative', marginBottom: '10px' });
    if(opts.width) dlg.style.width = opts.width + 'px';
    var title = K.U.el('div', { class: 'sysdlg-title' });
    if(opts.icon) title.appendChild(K.U.el('span', { class: 'wt-icon', html: K.SVG.icon(opts.icon) }));
    title.appendChild(K.U.el('span', { text: opts.title || 'KinitoOS' }));
    dlg.appendChild(title);
    return { host: host, dlg: dlg };
  },

  alert(title, msg, opts){
    opts = opts || {};
    var b = this._base({ title: title, icon: opts.icon });
    var body = K.U.el('div', { class: 'sysdlg-body' });
    if(opts.avatar){
      body.appendChild(K.U.el('div', { class: 'dlg-ico', html: K.SVG.kinitoAvatar(34) }));
    }
    var msgEl = K.U.el('div', { class: 'dlg-msg' });
    body.appendChild(msgEl);
    b.dlg.appendChild(body);
    var foot = K.U.el('div', { class: 'sysdlg-foot' });
    var ok = K.U.el('button', { class: 'btn primary', text: opts.button || '确定' });
    foot.appendChild(ok);
    b.dlg.appendChild(foot);
    b.host.appendChild(b.dlg);
    K.Audio.blip();

    return new Promise(function(resolve){
      ok.addEventListener('click', function(){
        b.dlg.remove();
        resolve(true);
      });
      if(opts.typing){
        K.U.typeInto(msgEl, msg, opts.speed || 22);
      }else{
        msgEl.textContent = msg;
      }
      setTimeout(function(){ ok.focus(); }, 30);
    });
  },

  confirm(title, msg, opts){
    opts = opts || {};
    var b = this._base({ title: title, icon: opts.icon });
    var body = K.U.el('div', { class: 'sysdlg-body' });
    if(opts.avatar) body.appendChild(K.U.el('div', { class: 'dlg-ico', html: K.SVG.kinitoAvatar(34) }));
    body.appendChild(K.U.el('div', { class: 'dlg-msg', text: msg }));
    b.dlg.appendChild(body);
    var foot = K.U.el('div', { class: 'sysdlg-foot' });
    var yes = K.U.el('button', { class: 'btn primary', text: opts.yesText || '是' });
    var no = K.U.el('button', { class: 'btn', text: opts.noText || '否' });
    foot.appendChild(yes); foot.appendChild(no);
    b.dlg.appendChild(foot);
    b.host.appendChild(b.dlg);
    K.Audio.blip();

    return new Promise(function(resolve){
      yes.addEventListener('click', function(){ b.dlg.remove(); resolve(true); });
      no.addEventListener('click', function(){ b.dlg.remove(); resolve(false); });
    });
  },

  prompt(title, msg, opts){
    opts = opts || {};
    var b = this._base({ title: title, icon: opts.icon });
    var body = K.U.el('div', { class: 'sysdlg-body' });
    var wrap = K.U.el('div', { class: 'dlg-msg' });
    wrap.appendChild(K.U.el('div', { text: msg }));
    var inp = K.U.el('input', { class: 'inp', type: 'text',
      placeholder: opts.placeholder || '', maxlength: opts.maxlength || 60 });
    if(opts.value) inp.value = opts.value;
    wrap.appendChild(inp);
    body.appendChild(wrap);
    b.dlg.appendChild(body);
    var foot = K.U.el('div', { class: 'sysdlg-foot' });
    var ok = K.U.el('button', { class: 'btn primary', text: opts.okText || '确定' });
    var cancel = K.U.el('button', { class: 'btn', text: opts.cancelText || '取消' });
    foot.appendChild(ok); foot.appendChild(cancel);
    b.dlg.appendChild(foot);
    b.host.appendChild(b.dlg);
    K.Audio.blip();
    setTimeout(function(){ inp.focus(); }, 60);

    return new Promise(function(resolve){
      function done(v){ b.dlg.remove(); resolve(v); }
      ok.addEventListener('click', function(){ done(inp.value); });
      cancel.addEventListener('click', function(){ done(null); });
      inp.addEventListener('keydown', function(e){
        if(e.key === 'Enter') done(inp.value);
        if(e.key === 'Escape') done(null);
      });
    });
  }
};

/* ── 桌面 ───────────────────────────────────────────────── */
K.Desktop = {
  _icons: [],
  _clockTimer: null,

  mount(){
    var self = this;
    this.renderIcons();
    this.startClock();
    this.bindStart();
    this.bindGlobalClicks();
    /* 右键菜单 */
    document.getElementById('os-layer').addEventListener('contextmenu', function(e){
      if(e.target.closest('.dicon') || e.target.id === 'wallpaper'){
        e.preventDefault();
        self.showContextMenu(e.clientX, e.clientY);
      }
    });
    K.Bus.on('control', function(v){
      var m = document.getElementById('control-meter');
      if(!m) return;
      m.classList.toggle('on', v > 8);
      m.classList.toggle('high', v >= 65);
      m.querySelector('.cm-bar > i').style.width = v + '%';
      m.querySelector('.cm-val').textContent = Math.round(v) + '%';
    });
  },

  /* ── 图标定义 ───────────────────────────── */
  defaultIcons(){
    return [
      { id: 'internet', label: 'Internet',   icon: 'internet', act: 'browser' },
      { id: 'mail',     label: 'Mail',       icon: 'mail',     act: 'mail' },
      { id: 'notes',    label: 'Notes',      icon: 'notes',    act: 'notes' },
      { id: 'paint',    label: 'Paint',      icon: 'paint',    act: 'paint' },
      { id: 'pinball',  label: 'Pinball',    icon: 'pinball',  act: 'pinball' },
      { id: 'mine',     label: 'Minesweeper',icon: 'mine',     act: 'minesweeper' },
      { id: 'cmd',      label: 'Command Prompt', icon: 'cmd',  act: 'cmd' },
      { id: 'files',    label: 'My Computer',icon: 'files',    act: 'files' },
      { id: 'trash',    label: 'Recycle Bin',icon: 'trash',    act: 'trash' }
    ];
  },

  icons: null,

  renderIcons(){
    var host = document.getElementById('desktop-icons');
    host.innerHTML = '';
    var list = this.icons || (this.icons = this.defaultIcons());
    var self = this;
    list.forEach(function(def){
      if(def.hidden) return;
      var node = K.U.el('div', {
        class: 'dicon' + (def.cls ? ' ' + def.cls : ''),
        data: { iconId: def.id }
      });
      node.appendChild(K.U.el('div', { class: 'di-img', html: K.SVG.icon(def.icon) }));
      node.appendChild(K.U.el('div', { class: 'di-label', text: def.label }));
      node.addEventListener('dblclick', function(){
        self.launch(def.id);
      });
      /* 单击也响应（触屏/低耐心玩家），但双击仍优先 */
      node.addEventListener('click', function(){
        K.U.$$('.dicon').forEach(function(n){ n.classList.remove('selected'); });
        node.classList.add('selected');
        clearTimeout(node._t);
        node._t = setTimeout(function(){
          if(def.singleClick !== false) self.launch(def.id);
        }, 260);
      });
      node.addEventListener('dblclick', function(e){
        e.preventDefault();
        clearTimeout(node._t);
      });
      host.appendChild(node);
    });
  },

  addIcon(def){
    if(!this.icons) this.icons = this.defaultIcons();
    var exist = this.icons.filter(function(d){ return d.id === def.id; })[0];
    if(exist) Object.assign(exist, def);
    else this.icons.push(def);
    this.renderIcons();
  },

  removeIcon(id){
    if(!this.icons) return;
    this.icons = this.icons.filter(function(d){ return d.id !== id; });
    this.renderIcons();
  },

  hideIcon(id){ this.addIcon({ id: id, hidden: true }); },

  getIcon(id){
    var list = this.icons || (this.icons = this.defaultIcons());
    return list.filter(function(d){ return d.id === id; })[0];
  },

  launch(id){
    var def = this.getIcon(id);
    if(!def) return;
    if(def.act === 'none'){ K.Audio.error(); return; }
    K.Bus.emit('launch', id);
    if(K.Apps && K.Apps[def.act]) K.Apps[def.act]();
    else K.Audio.error();
  },

  /* ── 壁纸 ───────────────────────────────── */
  setWallpaper(cls){
    var wp = document.getElementById('wallpaper');
    wp.className = cls || '';
  },

  /* ── 时钟 ───────────────────────────────── */
  startClock(){
    var el = document.getElementById('tray-clock');
    function tick(){ el.textContent = K.U.clock12(); }
    tick();
    if(this._clockTimer) clearInterval(this._clockTimer);
    this._clockTimer = setInterval(tick, 8000);
  },

  /* ── 开始菜单 ───────────────────────────── */
  bindStart(){
    var btn = document.getElementById('start-btn');
    var menu = document.getElementById('start-menu');
    var self = this;
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      self.toggleStart();
    });
    document.addEventListener('click', function(e){
      if(!menu.classList.contains('hidden') &&
         !e.target.closest('#start-menu') && !e.target.closest('#start-btn')){
        menu.classList.add('hidden');
      }
      K.Desktop.hideContextMenu();
    });
  },

  toggleStart(){
    var menu = document.getElementById('start-menu');
    if(menu.classList.contains('hidden')){
      this.buildStartMenu();
      menu.classList.remove('hidden');
      K.Audio.click();
    }else{
      menu.classList.add('hidden');
    }
  },

  buildStartMenu(){
    var menu = document.getElementById('start-menu');
    menu.innerHTML = '';
    var name = K.State.userName || 'Player';
    var head = K.U.el('div', { class: 'sm-head' });
    head.appendChild(K.U.el('div', { class: 'sm-av',
      text: (name.charAt(0) || 'P').toUpperCase() }));
    var info = K.U.el('div');
    info.appendChild(K.U.el('div', { class: 'sm-name', text: name }));
    info.appendChild(K.U.el('div', { class: 'sm-sub', text: 'KinitoOS  ·  Web World Edition' }));
    head.appendChild(info);
    menu.appendChild(head);

    var list = K.U.el('div', { class: 'sm-list' });
    var self = this;
    var items = (this.icons || this.defaultIcons()).filter(function(d){ return !d.hidden; });
    items.forEach(function(def){
      var it = K.U.el('div', { class: 'sm-item' });
      it.appendChild(K.U.el('span', { class: 'smi', html: K.SVG.icon(def.icon) }));
      it.appendChild(K.U.el('span', { text: def.label }));
      it.addEventListener('click', function(){
        menu.classList.add('hidden');
        self.launch(def.id);
      });
      list.appendChild(it);
    });
    list.appendChild(K.U.el('div', { class: 'sm-sep' }));
    var shutdown = K.U.el('div', { class: 'sm-item danger' });
    shutdown.appendChild(K.U.el('span', { class: 'smi', html: K.SVG.icon('cmd') }));
    shutdown.appendChild(K.U.el('span', { text: '关机' }));
    shutdown.addEventListener('click', function(){
      menu.classList.add('hidden');
      K.Bus.emit('shutdown');
    });
    list.appendChild(shutdown);
    menu.appendChild(list);
  },

  /* ── 右键菜单 ───────────────────────────── */
  showContextMenu(x, y){
    this.hideContextMenu();
    var menu = K.U.el('div', { class: 'ctxmenu' });
    var items = [
      { t: '刷新', fn: function(){ K.Desktop.renderIcons(); K.Audio.click(); } },
      { t: '排列图标', fn: function(){ K.Desktop.renderIcons(); K.Audio.click(); } },
      { sep: true },
      { t: '新建文件夹', fn: function(){ K.Dialog.alert('KinitoOS', '此操作不可用。'); } },
      { sep: true },
      { t: '显示设置', fn: function(){ K.Apps.notes(); } }
    ];
    var self = this;
    items.forEach(function(it){
      if(it.sep){ menu.appendChild(K.U.el('div', { class: 'csep' })); return; }
      var n = K.U.el('div', { class: 'ci', text: it.t });
      n.addEventListener('click', function(){ self.hideContextMenu(); it.fn(); });
      menu.appendChild(n);
    });
    var screen = document.getElementById('screen');
    menu.style.left = Math.min(x, screen.clientWidth - 200) + 'px';
    menu.style.top = Math.min(y, screen.clientHeight - menu.offsetHeight - 50) + 'px';
    document.getElementById('os-layer').appendChild(menu);
    this._ctx = menu;
  },

  hideContextMenu(){
    if(this._ctx){ this._ctx.remove(); this._ctx = null; }
  },

  bindGlobalClicks(){
    document.getElementById('wallpaper').addEventListener('mousedown', function(){
      K.U.$$('.dicon').forEach(function(n){ n.classList.remove('selected'); });
    });
  },

  /* ── 桌面通知 ───────────────────────────── */
  notify(title, msg, opts){
    opts = opts || {};
    var host = document.getElementById('os-layer');
    var b = K.U.el('div', { class: 'osbanner' });
    if(opts.y) b.style.bottom = opts.y + 'px';
    var t = K.U.el('div', { class: 'ob-t' });
    t.appendChild(K.U.el('span', { html: K.SVG.kinitoAvatar(16) }));
    t.appendChild(K.U.el('span', { text: title }));
    b.appendChild(t);
    b.appendChild(K.U.el('div', { class: 'ob-m', text: msg }));
    var close = K.U.el('button', { class: 'ob-close', text: '\u2715' });
    b.appendChild(close);
    host.appendChild(b);
    K.Audio.blip();
    var kill = function(){
      b.style.transition = 'opacity .3s, transform .3s';
      b.style.opacity = '0';
      b.style.transform = 'translateX(30px)';
      setTimeout(function(){ b.remove(); }, 320);
    };
    close.addEventListener('click', kill);
    if(opts.sticky !== true) setTimeout(kill, opts.duration || 6000);
    return { el: b, close: kill };
  },

  toast(msg, kind){
    var host = document.getElementById('os-layer');
    var hostBox = host.querySelector('.toast-host');
    if(!hostBox){
      hostBox = K.U.el('div', { class: 'toast-host' });
      host.appendChild(hostBox);
    }
    var t = K.U.el('div', { class: 'toast ' + (kind || '') });
    if(kind) t.appendChild(K.U.el('div', { class: 'tt', text: kind === 'danger' ? '警告' : '提示' }));
    t.appendChild(K.U.el('div', { text: msg }));
    hostBox.appendChild(t);
    setTimeout(function(){
      t.style.transition = 'opacity .3s, transform .3s';
      t.style.opacity = '0'; t.style.transform = 'translateX(24px)';
      setTimeout(function(){ t.remove(); }, 320);
    }, 4200);
  },

  /* ── 控制度仪表 ─────────────────────────── */
  ensureControlMeter(){
    if(document.getElementById('control-meter')) return;
    var m = K.U.el('div', { id: 'control-meter' });
    m.appendChild(K.U.el('div', { class: 'cm-t' }));
    m.querySelector('.cm-t').innerHTML =
      '<span>COMPANION LINK</span><b class="cm-val">0%</b>';
    var bar = K.U.el('div', { class: 'cm-bar' });
    bar.appendChild(K.U.el('i'));
    m.appendChild(bar);
    document.getElementById('screen').appendChild(m);
  },

  /* ── 任务栏按钮闪烁（转发到窗口管理器） ──── */
  alertTask(id, on){ K.WM.alertTask(id, on); },

  /* ── 桌面图标"逃跑"（恐怖段落） ─────────── */
  scatterIcons(){
    K.U.$$('.dicon').forEach(function(n, i){
      n.classList.add('fleeing');
      n.style.transform = 'translate(' + K.U.rand(-60, 60) + 'px,' +
                          K.U.rand(-40, 40) + 'px) rotate(' + K.U.rand(-14, 14) + 'deg)';
    });
  },
  unscatterIcons(){
    K.U.$$('.dicon').forEach(function(n){
      n.classList.remove('fleeing');
      n.style.transform = '';
    });
  }
};
