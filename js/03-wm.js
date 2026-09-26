/* ══════════════════════════════════════════════════════════════
   03-wm.js — 窗口管理器（拖动 / 缩放 / 最小化 / 层级 / 任务栏）
   ══════════════════════════════════════════════════════════════ */
'use strict';

K.WM = {
  wins: {},
  order: [],
  z: 100,
  _cascade: 0,

  host(){ return document.getElementById('window-host'); },

  /* ── 创建窗口 ─────────────────────────────
     opts: { id, title, icon, w, h, x, y, resizable, closable,
             minimizable, body(HTMLElement|string), onClose, onOpen,
             modal, noTaskbar, cls, center }
  ─────────────────────────────────────────── */
  open(opts){
    opts = opts || {};
    var id = opts.id || K.U.uid();
    if(this.wins[id]){
      this.focus(id);
      if(opts.reuseBody === false) return this.wins[id];
      return this.wins[id];
    }

    var screen = document.getElementById('screen');
    var SW = screen.clientWidth, SH = screen.clientHeight;

    var w = opts.w || 620;
    var h = opts.h || 440;
    w = Math.min(w, SW - 40);
    h = Math.min(h, SH - 90);

    var x, y;
    if(opts.center || opts.x == null){
      this._cascade = (this._cascade + 1) % 8;
      x = Math.round((SW - w) / 2 + this._cascade * 22 - 70);
      y = Math.round((SH - h) / 2 + this._cascade * 18 - 60);
    }else{ x = opts.x; y = opts.y; }
    x = K.U.clamp(x, 4, Math.max(4, SW - w - 4));
    y = K.U.clamp(y, 4, Math.max(4, SH - h - 46));

    var win = K.U.el('div', {
      class: 'win ' + (opts.cls || ''),
      style: { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', zIndex: ++this.z }
    });
    win.dataset.winId = id;

    /* 标题栏 */
    var tb = K.U.el('div', { class: 'win-titlebar' });
    var ico = K.U.el('div', { class: 'wt-icon', html: K.SVG.icon(opts.icon || 'file-txt') });
    var txt = K.U.el('div', { class: 'wt-text', text: opts.title || '窗口' });
    var btns = K.U.el('div', { class: 'win-btns' });
    tb.appendChild(ico); tb.appendChild(txt); tb.appendChild(btns);

    if(opts.minimizable !== false){
      var bMin = K.U.el('button', { class: 'wb-min', title: '最小化', text: '\u2013' });
      bMin.addEventListener('click', function(e){ e.stopPropagation(); K.WM.minimize(id); });
      btns.appendChild(bMin);
    }
    if(opts.resizable !== false){
      var bMax = K.U.el('button', { class: 'wb-max', title: '最大化', text: '\u25A1' });
      bMax.addEventListener('click', function(e){ e.stopPropagation(); K.WM.toggleMax(id); });
      btns.appendChild(bMax);
    }
    if(opts.closable !== false){
      var bClose = K.U.el('button', { class: 'wb-close', title: '关闭', text: '\u2715' });
      bClose.addEventListener('click', function(e){
        e.stopPropagation();
        K.WM.close(id);
      });
      btns.appendChild(bClose);
    }

    /* 主体 */
    var body = K.U.el('div', { class: 'win-body' });
    if(opts.body){
      if(typeof opts.body === 'string') body.innerHTML = opts.body;
      else body.appendChild(opts.body);
    }

    win.appendChild(tb);
    win.appendChild(body);

    if(opts.resizable !== false){
      var rz = K.U.el('div', { class: 'win-resize' });
      win.appendChild(rz);
      this._makeResizable(win, rz, id);
    }

    this.host().appendChild(win);

    var rec = {
      id: id, el: win, body: body, titlebar: tb, titleEl: txt, iconEl: ico,
      opts: opts, minimized: false, maximized: false, prev: null,
      taskbarEl: null, closed: false
    };
    this.wins[id] = rec;
    this.order.push(id);

    this._makeDraggable(win, tb, id);
    win.addEventListener('mousedown', function(){ K.WM.focus(id); }, true);

    if(opts.noTaskbar !== true) this._addTaskbar(rec);

    if(opts.center) this.center(id);

    K.Audio.click();
    K.Bus.emit('win:open', id);
    if(typeof opts.onOpen === 'function') opts.onOpen(rec);
    this.focus(id);
    return rec;
  },

  /* ── 关闭 ───────────────────────────────── */
  close(id){
    var rec = this.wins[id];
    if(!rec) return;
    if(typeof rec.opts.onClose === 'function'){
      var r = rec.opts.onClose(rec);
      if(r === false) return;
    }
    rec.closed = true;
    rec.el.remove();
    if(rec.taskbarEl) rec.taskbarEl.remove();
    delete this.wins[id];
    var i = this.order.indexOf(id);
    if(i >= 0) this.order.splice(i, 1);
    K.Audio.click();
    K.Bus.emit('win:close', id);
  },

  closeAll(exceptIds){
    var self = this;
    exceptIds = exceptIds || [];
    Object.keys(this.wins).forEach(function(id){
      if(exceptIds.indexOf(id) < 0) self.close(id);
    });
  },

  /* ── 聚焦 / 层级 ────────────────────────── */
  focus(id){
    var rec = this.wins[id];
    if(!rec) return;
    if(rec.minimized) this.restore(id);
    rec.el.style.zIndex = ++this.z;
    Object.keys(this.wins).forEach(function(k){
      K.WM.wins[k].el.classList.toggle('inactive', k !== id);
    });
    this.activeId = id;
    K.Bus.emit('win:focus', id);
  },

  get active(){ return this.wins[this.activeId]; },

  /* ── 最小化 / 还原 ──────────────────────── */
  minimize(id){
    var rec = this.wins[id];
    if(!rec) return;
    rec.minimized = true;
    rec.el.classList.add('hidden');
    if(rec.taskbarEl) rec.taskbarEl.classList.add('min');
    K.Bus.emit('win:minimize', id);
  },

  restore(id){
    var rec = this.wins[id];
    if(!rec) return;
    rec.minimized = false;
    rec.el.classList.remove('hidden');
    if(rec.taskbarEl) rec.taskbarEl.classList.remove('min');
  },

  toggleMinimize(id){
    var rec = this.wins[id];
    if(!rec) return;
    if(rec.minimized) { this.restore(id); this.focus(id); }
    else this.minimize(id);
  },

  /* ── 最大化 ─────────────────────────────── */
  toggleMax(id){
    var rec = this.wins[id];
    if(!rec) return;
    var screen = document.getElementById('screen');
    if(rec.maximized){
      Object.assign(rec.el.style, rec.prev);
      rec.maximized = false;
    }else{
      rec.prev = { left: rec.el.style.left, top: rec.el.style.top,
                   width: rec.el.style.width, height: rec.el.style.height };
      Object.assign(rec.el.style, {
        left: '0px', top: '0px',
        width: screen.clientWidth + 'px',
        height: (screen.clientHeight - 40) + 'px'
      });
      rec.maximized = true;
    }
  },

  center(id){
    var rec = this.wins[id];
    if(!rec) return;
    var screen = document.getElementById('screen');
    var r = rec.el.getBoundingClientRect();
    rec.el.style.left = Math.max(4, Math.round((screen.clientWidth - r.width) / 2)) + 'px';
    rec.el.style.top = Math.max(4, Math.round((screen.clientHeight - 40 - r.height) / 2)) + 'px';
  },

  setTitle(id, t){
    var rec = this.wins[id];
    if(!rec) return;
    rec.titleEl.textContent = t;
    if(rec.taskbarEl) rec.taskbarEl.querySelector('.tbl').textContent = t;
  },

  setIcon(id, name){
    var rec = this.wins[id];
    if(!rec) return;
    rec.iconEl.innerHTML = K.SVG.icon(name);
    if(rec.taskbarEl) rec.taskbarEl.querySelector('.tbi').innerHTML = K.SVG.icon(name);
  },

  /* ── 拖动 ───────────────────────────────── */
  _makeDraggable(win, handle, id){
    var sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
    var screen = document.getElementById('screen');

    function down(e){
      if(e.target.closest('.win-btns')) return;
      var rec = K.WM.wins[id];
      if(rec && rec.maximized) return;
      dragging = true;
      var p = e.touches ? e.touches[0] : e;
      sx = p.clientX; sy = p.clientY;
      ox = parseInt(win.style.left, 10) || 0;
      oy = parseInt(win.style.top, 10) || 0;
      handle.style.cursor = 'grabbing';
      e.preventDefault();
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
      window.addEventListener('touchmove', move, { passive: false });
      window.addEventListener('touchend', up);
    }
    function move(e){
      if(!dragging) return;
      var p = e.touches ? e.touches[0] : e;
      var nx = ox + (p.clientX - sx);
      var ny = oy + (p.clientY - sy);
      nx = K.U.clamp(nx, -win.offsetWidth + 90, screen.clientWidth - 90);
      ny = K.U.clamp(ny, 0, screen.clientHeight - 74);
      win.style.left = nx + 'px';
      win.style.top = ny + 'px';
      if(e.cancelable && e.touches) e.preventDefault();
    }
    function up(){
      dragging = false;
      handle.style.cursor = 'grab';
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    }
    handle.addEventListener('mousedown', down);
    handle.addEventListener('touchstart', down, { passive: false });
  },

  /* ── 缩放 ───────────────────────────────── */
  _makeResizable(win, grip, id){
    var sx = 0, sy = 0, ow = 0, oh = 0, on = false;
    function down(e){
      var rec = K.WM.wins[id];
      if(rec && rec.maximized) return;
      on = true;
      var p = e.touches ? e.touches[0] : e;
      sx = p.clientX; sy = p.clientY;
      ow = win.offsetWidth; oh = win.offsetHeight;
      e.preventDefault(); e.stopPropagation();
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    }
    function move(e){
      if(!on) return;
      var p = e.touches ? e.touches[0] : e;
      var rec = K.WM.wins[id];
      var nw = Math.max(rec && rec.opts.minW || 260, ow + (p.clientX - sx));
      var nh = Math.max(rec && rec.opts.minH || 160, oh + (p.clientY - sy));
      win.style.width = nw + 'px';
      win.style.height = nh + 'px';
      K.Bus.emit('win:resize', id);
    }
    function up(){
      on = false;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    }
    grip.addEventListener('mousedown', down);
    grip.addEventListener('touchstart', down, { passive: false });
  },

  /* ── 任务栏按钮 ─────────────────────────── */
  _addTaskbar(rec){
    var host = document.getElementById('taskbar-tasks');
    var btn = K.U.el('div', { class: 'tbtask', title: rec.opts.title || '' });
    btn.appendChild(K.U.el('span', { class: 'tbi', html: K.SVG.icon(rec.opts.icon || 'file-txt') }));
    btn.appendChild(K.U.el('span', { class: 'tbl', text: rec.opts.title || '窗口' }));
    btn.addEventListener('click', function(){
      var r = K.WM.wins[rec.id];
      if(!r) return;
      if(r.minimized) { K.WM.restore(rec.id); K.WM.focus(rec.id); }
      else if(K.WM.activeId === rec.id) K.WM.minimize(rec.id);
      else K.WM.focus(rec.id);
    });
    host.appendChild(btn);
    rec.taskbarEl = btn;
  },

  /* ── 让窗口"抽搐"（恐怖段落） ───────────── */
  jitter(id, ms){
    var rec = this.wins[id];
    if(!rec) return;
    rec.el.classList.add('shake-hard');
    setTimeout(function(){ rec.el.classList.remove('shake-hard'); }, ms || 500);
  },

  /* ── 全部窗口抖动 ───────────────────────── */
  jitterAll(ms){
    var self = this;
    Object.keys(this.wins).forEach(function(id){ self.jitter(id, ms); });
  },

  /* ── 强行把一个窗口拖到指定位置（Kinito 接管） ── */
  moveTo(id, x, y, ms){
    var rec = this.wins[id];
    if(!rec) return;
    rec.el.style.transition = 'left ' + (ms || 600) + 'ms cubic-bezier(.3,1.1,.4,1), top ' +
                              (ms || 600) + 'ms cubic-bezier(.3,1.1,.4,1)';
    rec.el.style.left = x + 'px';
    rec.el.style.top = y + 'px';
    setTimeout(function(){ rec.el.style.transition = ''; }, (ms || 600) + 60);
  },

  /* ── 闪烁提示（有窗口时提醒去看） ───────── */
  alertTask(id, on){
    var rec = this.wins[id];
    if(!rec || !rec.taskbarEl) return;
    rec.taskbarEl.classList.toggle('alert', on !== false);
  }
};
