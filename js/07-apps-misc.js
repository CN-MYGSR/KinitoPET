/* ══════════════════════════════════════════════════════════════
   07-apps-misc.js — 邮件 / 记事本 / 画图 / CMD / 文件 / 相机 / 扫雷 / 弹珠台
   ══════════════════════════════════════════════════════════════ */
'use strict';

/* ══════════════ 邮件 ══════════════ */
K.Mail = {
  _seq: 0,
  add(msg){
    msg = msg || {};
    msg.id = msg.id || ('m' + (++this._seq));
    msg.time = msg.time || K.U.clock12();
    msg.unread = msg.unread !== false;
    K.State.mail.unshift(msg);
    K.Desktop.alertTask('mail', true);
    if(K.WM.wins['mail']) K.Apps.mail();
    return msg;
  },
  get(id){ return K.State.mail.filter(function(m){ return m.id === id; })[0]; },
  unreadCount(){ return K.State.mail.filter(function(m){ return m.unread; }).length; }
};

K.Apps = K.Apps || {};

K.Apps.mail = function(focusId){
  var body = K.U.el('div', { class: 'mailapp' });

  var bar = K.U.el('div', { class: 'appbar' });
  var refresh = K.U.el('button', { class: 'ab-btn', text: '\u21BB 刷新' });
  var markAll = K.U.el('button', { class: 'ab-btn', text: '全部标为已读' });
  bar.appendChild(refresh);
  bar.appendChild(K.U.el('div', { class: 'ab-sep' }));
  bar.appendChild(markAll);
  var cnt = K.U.el('span', { class: 'ab-label', style: { marginLeft: 'auto' } });
  bar.appendChild(cnt);
  body.appendChild(bar);

  var listWrap = K.U.el('div', { class: 'mail-list scroll' });
  var readWrap = K.U.el('div', { class: 'mail-read scroll hidden' });
  body.appendChild(listWrap);
  body.appendChild(readWrap);

  function updateCount(){
    var n = K.Mail.unreadCount();
    cnt.textContent = K.State.mail.length + ' 封邮件  ·  ' + n + ' 封未读';
    if(n === 0) K.Desktop.alertTask('mail', false);
  }

  function renderList(){
    listWrap.innerHTML = '';
    if(!K.State.mail.length){
      listWrap.appendChild(K.U.el('div', { style: {
        padding: '40px', textAlign: 'center', color: '#9aa0a8', fontSize: '13px'
      }, text: '收件箱是空的。' }));
    }
    K.State.mail.forEach(function(m){
      var row = K.U.el('div', { class: 'mail-row' + (m.unread ? ' unread' : '') +
                                     (m.alert ? ' alert' : '') });
      row.appendChild(K.U.el('div', { class: 'ml-dot' }));
      var b = K.U.el('div', { class: 'ml-body' });
      b.appendChild(K.U.el('div', { class: 'ml-from', text: m.from || 'KinitoPET' }));
      b.appendChild(K.U.el('div', { class: 'ml-sub', text: m.subject || '(无主题)' }));
      b.appendChild(K.U.el('div', { class: 'ml-prev',
        text: String(m.body || '').replace(/\n/g, ' ').slice(0, 70) }));
      row.appendChild(b);
      row.appendChild(K.U.el('div', { class: 'ml-time', text: m.time }));
      row.addEventListener('click', function(){ openMail(m.id); });
      listWrap.appendChild(row);
    });
    updateCount();
  }

  function openMail(id){
    var m = K.Mail.get(id);
    if(!m) return;
    m.unread = false;
    updateCount();
    listWrap.classList.add('hidden');
    readWrap.classList.remove('hidden');
    readWrap.innerHTML = '';

    var back = K.U.el('button', { class: 'ab-btn', text: '\u2190 返回收件箱',
      style: { marginBottom: '16px' } });
    back.addEventListener('click', function(){
      readWrap.classList.add('hidden');
      listWrap.classList.remove('hidden');
      renderList();
    });
    readWrap.appendChild(back);

    readWrap.appendChild(K.U.el('h2', { text: m.subject || '(无主题)' }));
    readWrap.appendChild(K.U.el('div', { class: 'mr-meta',
      text: '发件人：' + (m.from || 'KinitoPET') + '   ·   ' + m.time }));
    var bd = K.U.el('div', { class: 'mr-body' });
    readWrap.appendChild(bd);

    if(m.garble){
      bd.appendChild(K.U.el('div', { class: 'garble', text: m.garble }));
    }
    if(m.html){
      bd.innerHTML += m.html;
    }else{
      bd.appendChild(K.U.el('div', { text: m.body || '' }));
    }

    if(m.qr){
      var qr = K.U.el('div', { class: 'qr' });
      qr.innerHTML = K.SVG.qrCode ? K.SVG.qrCode() : K.U.el('div').outerHTML;
      bd.appendChild(qr);
      qr.addEventListener('click', function(){
        K.Bus.emit('mail:qr-click', m);
      });
    }
    if(m.after) m.after(bd);
    K.Bus.emit('mail:open', m);
  }

  refresh.addEventListener('click', function(){ renderList(); K.Audio.click(); });
  markAll.addEventListener('click', function(){
    K.State.mail.forEach(function(m){ m.unread = false; });
    renderList();
  });

  var rec = K.WM.open({
    id: 'mail', title: 'Mail', icon: 'mail', w: 700, h: 500, center: true,
    body: body, onOpen: function(){ renderList(); }
  });
  if(focusId) openMail(focusId);
  else renderList();
  K.Desktop.alertTask('mail', false);
  return rec;
};

/* ══════════════ 记事本（任务提示） ══════════════ */
K.Apps.notes = function(){
  var body = K.U.el('div', { class: 'notesapp' });
  var bar = K.U.el('div', { class: 'appbar' });
  bar.appendChild(K.U.el('span', { class: 'ab-label', text: 'Notes  ·  你的进度记录' }));
  body.appendChild(bar);
  var nb = K.U.el('div', { class: 'notes-body scroll' });
  body.appendChild(nb);

  function render(){
    nb.innerHTML = '';
    var steps = K.Script ? K.Script.objectives() : [];
    if(!steps.length){
      nb.appendChild(K.U.el('div', { text: '暂无记录。' }));
    }
    steps.forEach(function(s){
      var cls = 'nstep' + (s.state === 'done' ? ' done' : '') +
                (s.state === 'now' ? ' now' : '') + (s.dark ? ' dark' : '');
      var n = K.U.el('div', { class: cls });
      n.appendChild(K.U.el('div', { text: s.text }));
      if(s.hint) n.appendChild(K.U.el('div', { text: s.hint,
        style: { fontSize: '11.5px', color: '#9a6a86', marginTop: '4px' } }));
      nb.appendChild(n);
    });
    if(K.State.flag('notesCorrupt')){
      nb.appendChild(K.U.el('div', { class: 'nstep dark',
        text: '他在重写这个文件。' }));
    }
  }

  var rec = K.WM.open({
    id: 'notes', title: 'Notes', icon: 'notes', w: 460, h: 520,
    x: 60, y: 70, body: body, onOpen: render
  });
  render();
  var off = K.Bus.on('objective', render);
  rec.opts.onClose = function(){ off(); };
  return rec;
};

/* ══════════════ 画图 Paint ══════════════ */
K.Apps.paint = function(opts){
  opts = opts || {};
  var body = K.U.el('div', { class: 'paintapp' });

  var tools = K.U.el('div', { class: 'paint-tools' });
  var current = { tool: 'brush', color: '#000000', size: 4 };
  var toolDefs = [
    { id: 'brush', glyph: '\uD83D\uDD8C', title: '画笔' },
    { id: 'eraser', glyph: '\u25A1', title: '橡皮' },
    { id: 'line', glyph: '\u2571', title: '直线' },
    { id: 'fill', glyph: '\uD83E\uDEA3', title: '填充' }
  ];
  var toolBtns = {};
  toolDefs.forEach(function(t){
    var b = K.U.el('button', { class: 'ptool' + (t.id === 'brush' ? ' active' : ''),
      title: t.title });
    b.innerHTML = '<span>' + t.glyph + '</span>';
    b.addEventListener('click', function(){
      current.tool = t.id;
      Object.keys(toolBtns).forEach(function(k){ toolBtns[k].classList.remove('active'); });
      b.classList.add('active');
      K.Audio.click();
    });
    toolBtns[t.id] = b;
    tools.appendChild(b);
  });

  tools.appendChild(K.U.el('div', { class: 'ab-sep' }));

  var colors = ['#000000','#7f7f7f','#880015','#ed1c24','#ff7f27','#fff200','#22b14c',
                '#00a2e8','#3f48cc','#a349a4','#ffffff','#c3c3c3','#b97a57','#ffaec9',
                '#ffc90e','#efe4b0','#b5e61d','#99d9ea','#7092be','#c8bfe7'];
  var pal = K.U.el('div', { class: 'palette' });
  var colBtns = {};
  colors.forEach(function(c){
    var b = K.U.el('button', { class: 'pcol' + (c === '#000000' ? ' active' : ''),
      style: { background: c }, title: c });
    b.addEventListener('click', function(){
      current.color = c;
      Object.keys(colBtns).forEach(function(k){ colBtns[k].classList.remove('active'); });
      b.classList.add('active');
    });
    colBtns[c] = b;
    pal.appendChild(b);
  });
  tools.appendChild(pal);

  tools.appendChild(K.U.el('div', { class: 'ab-sep' }));
  var sizeLbl = K.U.el('span', { class: 'ab-label', text: '粗细' });
  var size = K.U.el('input', { type: 'range', min: '1', max: '40', value: '4',
    style: { width: '90px' } });
  size.addEventListener('input', function(){ current.size = parseInt(size.value, 10); });
  tools.appendChild(sizeLbl); tools.appendChild(size);

  var clearBtn = K.U.el('button', { class: 'ab-btn', text: '清空', style: { marginLeft: 'auto' } });
  tools.appendChild(clearBtn);
  body.appendChild(tools);

  var wrap = K.U.el('div', { class: 'paint-canvas-wrap' });
  var cv = K.U.el('canvas', { width: 640, height: 400 });
  wrap.appendChild(cv);
  body.appendChild(wrap);

  var prompt = K.U.el('div', { class: 'paint-prompt', text: opts.prompt || '' });
  if(!opts.prompt) prompt.classList.add('hidden');
  body.appendChild(prompt);

  var ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  var drawing = false, lastX = 0, lastY = 0, snap = null;

  function pos(e){
    var r = cv.getBoundingClientRect();
    var p = e.touches ? e.touches[0] : e;
    return {
      x: (p.clientX - r.left) * (cv.width / r.width),
      y: (p.clientY - r.top) * (cv.height / r.height)
    };
  }

  function down(e){
    drawing = true;
    var p = pos(e);
    lastX = p.x; lastY = p.y;
    snap = ctx.getImageData(0, 0, cv.width, cv.height);
    ctx.strokeStyle = current.tool === 'eraser' ? '#ffffff' : current.color;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = current.size;
    if(current.tool === 'brush' || current.tool === 'eraser'){
      ctx.beginPath();
      ctx.arc(p.x, p.y, current.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    if(current.tool === 'fill'){
      floodFill(Math.round(p.x), Math.round(p.y), current.color);
      drawing = false;
    }
    e.preventDefault();
  }

  function move(e){
    if(!drawing) return;
    var p = pos(e);
    if(current.tool === 'line'){
      ctx.putImageData(snap, 0, 0);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }else if(current.tool === 'brush' || current.tool === 'eraser'){
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      lastX = p.x; lastY = p.y;
      if(Math.random() < 0.25) K.Audio.scrub();
    }
    e.preventDefault();
  }

  function up(){ drawing = false; }

  cv.addEventListener('mousedown', down);
  cv.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
  cv.addEventListener('touchstart', down, { passive: false });
  cv.addEventListener('touchmove', move, { passive: false });
  window.addEventListener('touchend', up);

  /* 油漆桶 */
  function floodFill(x, y, hex){
    var img = ctx.getImageData(0, 0, cv.width, cv.height);
    var d = img.data;
    var W = cv.width, H = cv.height;
    if(x < 0 || y < 0 || x >= W || y >= H) return;
    var idx = (y * W + x) * 4;
    var target = [d[idx], d[idx+1], d[idx+2], d[idx+3]];
    var rgb = hexToRgb(hex);
    if(Math.abs(target[0]-rgb[0])<6 && Math.abs(target[1]-rgb[1])<6 && Math.abs(target[2]-rgb[2])<6) return;
    var stack = [[x, y]];
    var seen = 0;
    while(stack.length && seen < 400000){
      var pt = stack.pop();
      var px = pt[0], py = pt[1];
      if(px < 0 || py < 0 || px >= W || py >= H) continue;
      var i = (py * W + px) * 4;
      if(Math.abs(d[i]-target[0])>24 || Math.abs(d[i+1]-target[1])>24 ||
         Math.abs(d[i+2]-target[2])>24) continue;
      d[i] = rgb[0]; d[i+1] = rgb[1]; d[i+2] = rgb[2]; d[i+3] = 255;
      seen++;
      stack.push([px+1,py],[px-1,py],[px,py+1],[px,py-1]);
    }
    ctx.putImageData(img, 0, 0);
    K.Audio.click();
  }
  function hexToRgb(h){
    h = h.replace('#','');
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  }

  clearBtn.addEventListener('click', function(){
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cv.width, cv.height);
    K.Audio.click();
  });

  var api = {
    canvas: cv,
    ctx: ctx,
    setPrompt(t){ prompt.textContent = t; prompt.classList.remove('hidden'); },
    clear(){
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, cv.width, cv.height);
    },
    dataURL(){ return cv.toDataURL('image/png'); },
    /* 程序自动作画（Kinito 抢笔） */
    async autoDraw(strokes, speed){
      speed = speed || 18;
      for(var i = 0; i < strokes.length; i++){
        var st = strokes[i];
        ctx.strokeStyle = st.color || '#000';
        ctx.lineWidth = st.size || 4;
        ctx.beginPath();
        var pts = st.pts;
        ctx.moveTo(pts[0][0], pts[0][1]);
        for(var j = 1; j < pts.length; j++){
          ctx.lineTo(pts[j][0], pts[j][1]);
          ctx.stroke();
          await K.U.wait(speed);
        }
      }
    }
  };

  var rec = K.WM.open({
    id: 'paint', title: 'Paint', icon: 'paint', w: 760, h: 620, center: true,
    body: body
  });
  rec.api = api;
  K.Apps._paintApi = api;
  return rec;
};

/* ══════════════ 命令提示符 ══════════════ */
K.Apps.cmd = function(opts){
  opts = opts || {};
  var body = K.U.el('div', { class: 'cmdapp scroll' });
  var hist = [];
  var histIdx = -1;

  function line(text, cls){
    var n = K.U.el('div', { class: 'cl ' + (cls || ''), text: text });
    body.appendChild(n);
    body.scrollTop = body.scrollHeight;
    return n;
  }

  function promptLine(){
    var row = K.U.el('div', { class: 'prompt-line' });
    row.appendChild(K.U.el('span', { text: 'C:\\Users\\' + (K.State.userName || 'Player') + '> ' }));
    var inp = K.U.el('input', { type: 'text', spellcheck: 'false', autocomplete: 'off' });
    row.appendChild(inp);
    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
    setTimeout(function(){ inp.focus(); }, 40);

    inp.addEventListener('keydown', async function(e){
      if(e.key === 'Enter'){
        var v = inp.value;
        inp.disabled = true;
        row.replaceChildren(K.U.el('span', {
          text: 'C:\\Users\\' + (K.State.userName || 'Player') + '> ' + v
        }));
        hist.push(v); histIdx = hist.length;
        await K.Cmd.handle(v, api);
        if(!api.locked) promptLine();
      }else if(e.key === 'ArrowUp'){
        if(histIdx > 0){ histIdx--; inp.value = hist[histIdx]; }
        e.preventDefault();
      }else if(e.key === 'ArrowDown'){
        if(histIdx < hist.length - 1){ histIdx++; inp.value = hist[histIdx]; }
        else { histIdx = hist.length; inp.value = ''; }
        e.preventDefault();
      }
    });
  }

  var api = {
    el: body,
    locked: false,
    line: line,
    write(t, cls){ return line(t, cls); },
    async type(t, cls, speed){
      var n = line('', cls);
      await K.U.typeInto(n, t, speed || 12);
      body.scrollTop = body.scrollHeight;
      return n;
    },
    blood(on){
      body.classList.toggle('blood', !!on);
      body.classList.toggle('redbg', !!on);
    },
    focus(){ var i = body.querySelector('input'); if(i) i.focus(); }
  };

  var rec = K.WM.open({
    id: 'cmd', title: 'C:\\WINDOWS\\system32\\cmd.exe', icon: 'cmd',
    w: 700, h: 420, center: true, body: body,
    onOpen: function(){ line('KinitoOS [Version 5.1.2600]'); line('(C) 1999 Kinito Leisure & Entertainment Co.'); line(''); promptLine(); }
  });
  rec.api = api;
  K.Apps._cmdApi = api;
  return rec;
};

K.Cmd = {
  async handle(cmd, api){
    var c = String(cmd).trim();
    var low = c.toLowerCase();
    var name = (K.State.userName || 'Player');

    if(!c){ return; }

    if(low === 'help' || low === '?'){
      await api.type('可用命令：');
      await api.type('  dir            列出当前目录');
      await api.type('  whoami         显示当前用户');
      await api.type('  ver            显示系统版本');
      await api.type('  kinitopet      运行 KinitoPET');
      await api.type('  cls            清屏');
      return;
    }
    if(low === 'cls'){ api.el.innerHTML = ''; return; }
    if(low === 'ver'){
      await api.type('KinitoOS [Version 5.1.2600]');
      await api.type('RRA System build 1999.04.12');
      return;
    }
    if(low === 'whoami'){
      await api.type('kinitoos\\' + name);
      await api.type('（正在被观察的用户）', '');
      return;
    }
    if(low === 'dir'){
      await api.type(' 驱动器 C 中的卷是 KINITO');
      await api.type(' 卷的序列号是 1999-2024');
      await api.type('');
      await api.type(' C:\\Users\\' + name + ' 的目录');
      await api.type('');
      await api.type(' 2024/01/09  03:14    <DIR>          .');
      await api.type(' 2024/01/09  03:14    <DIR>          ..');
      await api.type(' 2024/01/09  03:14    <DIR>          Desktop');
      await api.type(' 2024/01/09  03:14    <DIR>          Documents');
      await api.type(' 2024/01/09  03:14    <DIR>          Pictures');
      await api.type(' 2024/01/09  03:15         1,204,992 kinitopet.exe');
      await api.type(' 2024/01/09  03:15    <DIR>          kinitopet_data');
      await api.type(' 2024/01/09  03:16             8,192 .friend');
      await api.type('              2 个文件      1,213,184 字节');
      return;
    }
    if(low.indexOf('kinitopet') === 0){
      await api.type('正在启动 kinitopet.exe ...');
      await K.U.wait(500);
      K.Bus.emit('cmd:run-kinitopet');
      return;
    }
    if(low.indexOf('del ') === 0 || low.indexOf('delete ') === 0){
      K.Bus.emit('cmd:delete', c);
      return;
    }
    if(low.indexOf('grant') === 0){
      K.Bus.emit('cmd:grant', c);
      return;
    }
    if(low.indexOf('echo ') === 0){
      await api.type(c.slice(5));
      return;
    }
    /* 未知命令 */
    await api.type("'" + c.split(' ')[0] + "' 不是内部或外部命令，也不是可运行的程序或批处理文件。");
    if(K.State.controlLevel > 40){
      await api.type('（但你其实知道该输入什么，对吧？）');
    }
  }
};

/* ══════════════ 文件资源管理器 ══════════════ */
K.Apps.files = function(){
  var body = K.U.el('div', { class: 'fileapp' });
  var bar = K.U.el('div', { class: 'appbar' });
  bar.appendChild(K.U.el('span', { class: 'ab-label', text: '\uD83D\uDCC1 C:\\Users\\' +
    (K.State.userName || 'Player') }));
  body.appendChild(bar);
  var grid = K.U.el('div', { class: 'file-grid scroll' });
  body.appendChild(grid);
  var status = K.U.el('div', { class: 'statusbar' });
  body.appendChild(status);

  function render(){
    grid.innerHTML = '';
    var files = K.State.files.length ? K.State.files : K.Files.default();
    files.forEach(function(f){
      var it = K.U.el('div', { class: 'fitem' + (f.corrupt ? ' corrupt' : '') });
      it.appendChild(K.U.el('div', { class: 'fi-img', html: K.SVG.icon(f.icon || 'file-txt') }));
      it.appendChild(K.U.el('div', { class: 'fi-name' + (f.corruptText ? ' corrupt-txt' : ''),
        text: f.name }));
      it.addEventListener('click', function(){
        K.U.$$('.fitem').forEach(function(n){ n.classList.remove('selected'); });
        it.classList.add('selected');
        status.textContent = f.name + '   ·   ' + (f.size || '—');
      });
      it.addEventListener('dblclick', function(){
        K.Audio.click();
        if(f.open) f.open();
        else K.Dialog.alert('文件资源管理器', '无法打开「' + f.name + '」。\n\n文件可能已损坏或正在被其他程序占用。');
      });
      grid.appendChild(it);
    });
    status.textContent = (K.State.files.length ? K.State.files : K.Files.default()).length +
                         ' 个对象';
  }

  var rec = K.WM.open({
    id: 'files', title: 'My Computer', icon: 'files', w: 720, h: 480,
    center: true, body: body, onOpen: render
  });
  rec.render = render;
  K.Apps._filesRender = render;
  return rec;
};

K.Files = {
  default(){
    return [
      { name: 'Desktop',      icon: 'folder', size: '文件夹' },
      { name: 'Documents',    icon: 'folder', size: '文件夹' },
      { name: 'Pictures',     icon: 'folder', size: '文件夹' },
      { name: 'Music',        icon: 'folder', size: '文件夹' },
      { name: 'kinitopet.exe',icon: 'file-exe', size: '1,204,992 字节',
        open: function(){ K.Bus.emit('files:run-kinitopet'); } },
      { name: 'the_cycle_repeats.mp4', icon: 'file-mp4', size: '42,918 字节',
        open: function(){ K.Bus.emit('files:play-video'); } },
      { name: 'readme.txt',   icon: 'file-txt', size: '1,024 字节',
        open: function(){
          K.Dialog.alert('readme.txt',
            '感谢您安装 KinitoPET！\n\n' +
            'Kinito 会陪伴您度过每一天。请经常和他说话 —— 他喜欢被关注。\n\n' +
            '注意事项：\n' +
            '· 不要试图删除 kinitopet.exe\n' +
            '· 不要关闭摄像头权限\n' +
            '· 不要告诉 Kinito 你要离开\n\n' +
            '祝您玩得开心！\n—— Kinito Leisure & Entertainment Co.', { avatar: true });
        } }
    ];
  },
  add(f){
    K.State.files.push(f);
    if(K.Apps._filesRender) K.Apps._filesRender();
  }
};

/* ══════════════ 相机 ══════════════ */
K.Apps.camera = function(opts){
  opts = opts || {};
  var body = K.U.el('div', { class: 'camapp' });
  var view = K.U.el('div', { class: 'cam-view' });
  var flash = K.U.el('div', { class: 'cam-flash' });
  view.appendChild(flash);
  body.appendChild(view);

  var bar = K.U.el('div', { class: 'cam-bar' });
  var shoot = K.U.el('button', { class: 'cam-shoot' });
  bar.appendChild(shoot);
  body.appendChild(bar);

  var stream = null, video = null, active = false;

  function fallback(){
    var fb = K.U.el('div', { class: 'cam-fallback' });
    fb.appendChild(K.U.el('div', { text: '[ 摄像头信号 ]' }));
    fb.appendChild(K.U.el('div', { text: '正在捕获...', style: { color: '#7a7a7a' } }));
    var cv = K.U.el('canvas', { width: 480, height: 320 });
    view.appendChild(cv);
    var ctx = cv.getContext('2d');
    var stop = K.U.raf(function(){
      var img = ctx.createImageData(cv.width, cv.height);
      var d = img.data;
      for(var i = 0; i < d.length; i += 4){
        var v = Math.random() * 90;
        d[i] = v + 20; d[i+1] = v; d[i+2] = v + 30; d[i+3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      if(Math.random() < 0.15){
        ctx.fillStyle = 'rgba(255,255,255,.25)';
        ctx.fillRect(0, Math.random() * cv.height, cv.width, 3);
      }
    });
    fb.appendChild(K.U.el('div', { text: '（没有权限 / 无可用设备）',
      style: { color: '#555', fontSize: '11px' } }));
    view.appendChild(fb);
    return function(){ stop(); };
  }

  async function start(){
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      K.Apps._camStop = fallback();
      return;
    }
    try{
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      video = K.U.el('video', { autoplay: true, playsinline: true, muted: true });
      view.insertBefore(video, flash);
      video.srcObject = stream;
      active = true;
    }catch(e){
      K.Apps._camStop = fallback();
    }
  }

  shoot.addEventListener('click', function(){
    flash.classList.remove('fire');
    void flash.offsetWidth;
    flash.classList.add('fire');
    K.Audio._noise(0.12, 0.3, 'highpass', 2000);
    setTimeout(function(){ K.Bus.emit('camera:shot'); }, 220);
  });

  var rec = K.WM.open({
    id: 'camera', title: 'Camera', icon: 'camera', w: 620, h: 500, center: true,
    body: body,
    onOpen: function(){ start(); },
    onClose: function(){
      if(stream) stream.getTracks().forEach(function(t){ t.stop(); });
      if(K.Apps._camStop) K.Apps._camStop();
      active = false;
    }
  });
  rec.isLive = function(){ return active; };
  return rec;
};

/* ══════════════ 扫雷 ══════════════ */
K.Apps.minesweeper = function(){
  var W = 9, H = 9, MINES = 10;
  var body = K.U.el('div', { class: 'ms-wrap' });
  var head = K.U.el('div', { class: 'ms-head' });
  var led = K.U.el('div', { class: 'ms-led', text: '010' });
  var face = K.U.el('button', { class: 'ms-face', text: '\uD83D\uDE42' });
  var time = K.U.el('div', { class: 'ms-led', text: '000' });
  head.appendChild(led); head.appendChild(face); head.appendChild(time);
  body.appendChild(head);

  var grid = K.U.el('div', { class: 'ms-grid' });
  body.appendChild(grid);
  var hint = K.U.el('div', { style: { fontSize: '11.5px', color: '#6a6a6a', textAlign: 'center' },
    text: '左键翻开 · 右键插旗' });
  body.appendChild(hint);

  var cells = [], first = true, over = false, flags = 0, opened = 0, timer = null, secs = 0;

  function reset(){
    grid.innerHTML = '';
    cells = []; first = true; over = false; flags = 0; opened = 0; secs = 0;
    led.textContent = '010'; time.textContent = '000';
    face.textContent = '\uD83D\uDE42';
    if(timer) clearInterval(timer);
    timer = null;
    grid.style.gridTemplateColumns = 'repeat(' + W + ', 26px)';
    for(var y = 0; y < H; y++){
      for(var x = 0; x < W; x++){
        var c = { x: x, y: y, mine: false, open: false, flag: false, n: 0, el: null };
        var el = K.U.el('button', { class: 'ms-cell' });
        c.el = el;
        (function(cc){
          el.addEventListener('click', function(){ dig(cc); });
          el.addEventListener('contextmenu', function(e){
            e.preventDefault(); toggleFlag(cc);
          });
        })(c);
        grid.appendChild(el);
        cells.push(c);
      }
    }
  }

  function neighbors(c){
    var r = [];
    for(var dy = -1; dy <= 1; dy++){
      for(var dx = -1; dx <= 1; dx++){
        if(!dx && !dy) continue;
        var nx = c.x + dx, ny = c.y + dy;
        if(nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        r.push(cells[ny * W + nx]);
      }
    }
    return r;
  }

  function plant(safe){
    var pool = cells.filter(function(c){
      return !(Math.abs(c.x - safe.x) <= 1 && Math.abs(c.y - safe.y) <= 1);
    });
    K.U.shuffle(pool);
    pool.slice(0, MINES).forEach(function(c){ c.mine = true; });
    cells.forEach(function(c){
      c.n = neighbors(c).filter(function(n){ return n.mine; }).length;
    });
    timer = setInterval(function(){
      secs++;
      time.textContent = ('00' + Math.min(999, secs)).slice(-3);
    }, 1000);
  }

  function paint(c){
    var el = c.el;
    if(c.open){
      el.classList.add('open');
      if(c.mine){ el.textContent = '\uD83D\uDCA3'; el.classList.add('mine'); }
      else if(c.n){ el.textContent = c.n; el.classList.add('ms-' + c.n); }
      else el.textContent = '';
    }else{
      el.classList.remove('open');
      el.textContent = c.flag ? '\uD83D\uDEA9' : '';
      el.classList.toggle('flag', c.flag);
    }
  }

  function dig(c){
    if(over || c.open || c.flag) return;
    if(first){ plant(c); first = false; }
    c.open = true;
    opened++;
    paint(c);
    if(c.mine){ lose(); return; }
    K.Audio.click();
    if(c.n === 0){
      neighbors(c).forEach(function(n){
        if(!n.open && !n.flag) dig(n);
      });
    }
    if(opened === W * H - MINES) win();
  }

  function toggleFlag(c){
    if(over || c.open) return;
    c.flag = !c.flag;
    flags += c.flag ? 1 : -1;
    led.textContent = ('00' + Math.max(0, MINES - flags)).slice(-3);
    paint(c);
    K.Audio.tick();
  }

  function lose(){
    over = true;
    if(timer) clearInterval(timer);
    face.textContent = '\uD83D\uDE35';
    cells.forEach(function(c){ if(c.mine && !c.open){ c.open = true; paint(c); } });
    K.Audio.error();
    K.FX.shake(true, true);
    setTimeout(function(){ K.FX.shake(false); }, 500);
    K.Bus.emit('minesweeper:lose');
  }

  function win(){
    over = true;
    if(timer) clearInterval(timer);
    face.textContent = '\uD83D\uDE0E';
    K.Audio.ok();
    K.Bus.emit('minesweeper:win');
  }

  face.addEventListener('click', function(){ reset(); K.Audio.click(); });

  reset();
  K.WM.open({
    id: 'minesweeper', title: 'Minesweeper', icon: 'mine', w: 320, h: 420,
    center: true, resizable: false, body: body
  });
  return { reset: reset };
};

/* ══════════════ 弹珠台 ══════════════ */
K.Apps.pinball = function(){
  var body = K.U.el('div', { class: 'pinball-wrap' });
  var cv = K.U.el('canvas', { width: 380, height: 560 });
  body.appendChild(cv);
  var hud = K.U.el('div', { class: 'pb-hud' });
  body.appendChild(hud);

  var ctx = cv.getContext('2d');
  var W = cv.width, H = cv.height;
  var ball = { x: W / 2, y: 80, vx: 0, vy: 0, r: 8 };
  var flippers = [
    { x: 105, y: H - 70, len: 62, ang: 0.34, dir: -1, up: false, key: 'ArrowLeft' },
    { x: W - 105, y: H - 70, len: 62, ang: Math.PI - 0.34, dir: 1, up: false, key: 'ArrowRight' }
  ];
  var bumpers = [
    { x: W/2, y: 190, r: 22, score: 100 },
    { x: W/2 - 80, y: 270, r: 18, score: 75 },
    { x: W/2 + 80, y: 270, r: 18, score: 75 },
    { x: W/2, y: 350, r: 16, score: 50 }
  ];
  var score = 0, balls = 3, running = true, launchCharge = 0, launched = false;
  var glow = [];

  function resetBall(){
    ball.x = W / 2; ball.y = 80;
    ball.vx = 0; ball.vy = 0;
    launched = false; launchCharge = 0;
  }

  function update(dt){
    if(!running) return;
    /* 重力 */
    ball.vy += 780 * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    /* 墙 */
    if(ball.x - ball.r < 12){ ball.x = 12 + ball.r; ball.vx = Math.abs(ball.vx) * 0.86; }
    if(ball.x + ball.r > W - 12){ ball.x = W - 12 - ball.r; ball.vx = -Math.abs(ball.vx) * 0.86; }
    if(ball.y - ball.r < 12){ ball.y = 12 + ball.r; ball.vy = Math.abs(ball.vy) * 0.86; }

    /* 弹柱 */
    bumpers.forEach(function(b){
      var dx = ball.x - b.x, dy = ball.y - b.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if(d < b.r + ball.r && d > 0.01){
        var nx = dx / d, ny = dy / d;
        ball.x = b.x + nx * (b.r + ball.r);
        ball.y = b.y + ny * (b.r + ball.r);
        var sp = Math.max(340, Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) * 1.06);
        ball.vx = nx * sp; ball.vy = ny * sp;
        score += b.score;
        glow.push({ x: b.x, y: b.y, t: 1, r: b.r });
        K.Audio._osc('square', 520 + Math.random() * 260, 0.06, 0.1);
      }
    });

    /* 挡板 */
    flippers.forEach(function(f){
      var a = f.ang + (f.up ? f.dir * -0.55 : 0);
      var tipX = f.x + Math.cos(a) * f.len;
      var tipY = f.y + Math.sin(a) * f.len;
      /* 简化：用线段最近点碰撞 */
      var t = K.U.clamp(((ball.x - f.x) * (tipX - f.x) + (ball.y - f.y) * (tipY - f.y)) /
                        ((tipX - f.x) ** 2 + (tipY - f.y) ** 2), 0, 1);
      var cx = f.x + (tipX - f.x) * t;
      var cy = f.y + (tipY - f.y) * t;
      var dx = ball.x - cx, dy = ball.y - cy;
      var d = Math.sqrt(dx * dx + dy * dy);
      if(d < ball.r + 7 && d > 0.01){
        var nx = dx / d, ny = dy / d;
        ball.x = cx + nx * (ball.r + 7);
        ball.y = cy + ny * (ball.r + 7);
        var power = f.up ? 620 : 260;
        ball.vx = nx * power * 0.9 + (f.up ? 0 : 0);
        ball.vy = ny * power - (f.up ? 240 : 40);
        if(f.up) K.Audio._osc('square', 300, 0.06, 0.12);
      }
    });

    /* 掉底 */
    if(ball.y > H + 30){
      balls--;
      if(balls <= 0){ running = false; K.Bus.emit('pinball:gameover', score); }
      else resetBall();
    }

    /* 发射 */
    if(!launched && launchCharge > 0){
      ball.vy = -launchCharge * 900;
      ball.vx = K.U.rand(-60, 60);
      launched = true;
    }

    glow.forEach(function(g){ g.t -= dt * 2.4; });
    glow = glow.filter(function(g){ return g.t > 0; });
  }

  function draw(){
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, W, H);

    /* 边框 */
    ctx.strokeStyle = '#2a3a5a'; ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, W - 20, H - 20);

    /* 弹柱光晕 */
    glow.forEach(function(g){
      var grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r * 2.4);
      grad.addColorStop(0, 'rgba(126,200,255,' + (g.t * 0.6) + ')');
      grad.addColorStop(1, 'rgba(126,200,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(g.x, g.y, g.r * 2.4, 0, Math.PI * 2); ctx.fill();
    });

    /* 弹柱 */
    bumpers.forEach(function(b){
      var grad = ctx.createRadialGradient(b.x - b.r * .3, b.y - b.r * .3, 2, b.x, b.y, b.r);
      grad.addColorStop(0, '#ffe9a8'); grad.addColorStop(1, '#c08a10');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#7a5a00'; ctx.lineWidth = 2; ctx.stroke();
    });

    /* 挡板 */
    flippers.forEach(function(f){
      var a = f.ang + (f.up ? f.dir * -0.55 : 0);
      ctx.strokeStyle = f.up ? '#7fffa8' : '#4ea53c';
      ctx.lineWidth = 11; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.lineTo(f.x + Math.cos(a) * f.len, f.y + Math.sin(a) * f.len);
      ctx.stroke();
    });

    /* 球 */
    var bg = ctx.createRadialGradient(ball.x - 3, ball.y - 3, 1, ball.x, ball.y, ball.r);
    bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#8a94a0');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();

    /* 发射条 */
    if(!launched){
      ctx.fillStyle = 'rgba(126,200,255,.7)';
      ctx.fillRect(W - 26, H - 20 - launchCharge * 200, 12, launchCharge * 200);
      ctx.fillStyle = '#8a94a0';
      ctx.font = '11px monospace';
      ctx.fillText('按住空格蓄力', W / 2 - 42, H - 14);
    }

    hud.innerHTML = '得分 ' + score + '<br>剩余球 ' + balls;
  }

  var keys = {};
  function onDown(e){
    if(e.key === 'ArrowLeft'){ flippers[0].up = true; e.preventDefault(); }
    if(e.key === 'ArrowRight'){ flippers[1].up = true; e.preventDefault(); }
    if(e.key === ' '){ keys.space = true; e.preventDefault(); }
  }
  function onUp(e){
    if(e.key === 'ArrowLeft') flippers[0].up = false;
    if(e.key === 'ArrowRight') flippers[1].up = false;
    if(e.key === ' '){ keys.space = false; }
  }
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);

  var last = performance.now();
  var stop = K.U.raf(function(now){
    var dt = Math.min(0.032, (now - last) / 1000);
    last = now;
    if(keys.space && !launched){
      launchCharge = Math.min(1, launchCharge + dt * 1.8);
    }else if(!keys.space && !launched && launchCharge > 0.1){
      /* 松手发射 */
    }
    if(!keys.space && !launched && launchCharge > 0.15){ /* 保持，等下一次按下 */ }
    update(dt);
    draw();
  });

  var rec = K.WM.open({
    id: 'pinball', title: 'Kinito Pinball', icon: 'pinball',
    w: 420, h: 660, center: true, resizable: false, body: body,
    onClose: function(){
      stop();
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    }
  });

  /* 用点击代替空格蓄力（更好操作） */
  cv.addEventListener('mousedown', function(){
    if(!launched) launchCharge = Math.min(1, launchCharge + 0.25);
    if(launchCharge >= 0.9 && !launched){
      ball.vy = -launchCharge * 900;
      ball.vx = K.U.rand(-60, 60);
      launched = true;
    }
  });

  return rec;
};

/* ══════════════ 回收站 ══════════════ */
K.Apps.trash = function(){
  var body = K.U.el('div', { class: 'fileapp' });
  var bar = K.U.el('div', { class: 'appbar' });
  bar.appendChild(K.U.el('span', { class: 'ab-label', text: '回收站' }));
  var empty = K.U.el('button', { class: 'ab-btn', text: '清空回收站', style: { marginLeft: 'auto' } });
  bar.appendChild(empty);
  body.appendChild(bar);
  var grid = K.U.el('div', { class: 'file-grid scroll' });
  body.appendChild(grid);

  var items = K.State.flag('kinitoDeleted')
    ? [{ name: 'kinitopet.exe', icon: 'file-corrupt' },
       { name: 'kinito_data/', icon: 'folder' }]
    : [];

  function render(){
    grid.innerHTML = '';
    if(!items.length){
      grid.appendChild(K.U.el('div', { style: {
        padding: '40px', color: '#9aa0a8', fontSize: '13px'
      }, text: '回收站是空的。' }));
      return;
    }
    items.forEach(function(f){
      var it = K.U.el('div', { class: 'fitem' });
      it.appendChild(K.U.el('div', { class: 'fi-img', html: K.SVG.icon(f.icon) }));
      it.appendChild(K.U.el('div', { class: 'fi-name', text: f.name }));
      grid.appendChild(it);
    });
  }

  empty.addEventListener('click', function(){
    if(!items.length) return;
    items = [];
    render();
    K.Audio.ok();
    K.Bus.emit('trash:empty');
  });

  K.WM.open({ id: 'trash', title: '回收站', icon: 'trash', w: 560, h: 380,
    center: true, body: body, onOpen: render });
  render();
  return { render: render };
};
