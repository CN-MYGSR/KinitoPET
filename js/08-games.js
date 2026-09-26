/* ══════════════════════════════════════════════════════════════
   08-games.js — Ready Repair! / Factory Frenzy! / Best Friends Analysis Hub
   ══════════════════════════════════════════════════════════════ */
'use strict';

/* ══════════════════════════════════════════════════════════════
   Ready Repair!  —— 帮 Sam 修房子
   四段：掸蜘蛛网 → 海绵拖地 → 滚筒刷墙 → 装饰房间（含尸体袋）
   ══════════════════════════════════════════════════════════════ */
K.Game = K.Game || {};

K.Game.readyRepair = function(opts){
  opts = opts || {};
  var W = 880, H = 500;

  var wrap = K.U.el('div', { class: 'rr-wrap' });
  var top = K.U.el('div', { class: 'rr-top' });
  top.appendChild(K.U.el('div', { class: 'rrt-title', text: 'Ready Repair!' }));
  top.appendChild(K.U.el('div', { class: 'rrt-sub', text: '帮 Sam 把房子收拾干净' }));
  var stepLbl = K.U.el('div', { class: 'rrt-step', text: '第 1 步 / 4' });
  top.appendChild(stepLbl);
  wrap.appendChild(top);

  var toolBar = K.U.el('div', { class: 'rr-tools' });
  wrap.appendChild(toolBar);

  var stage = K.U.el('div', { class: 'rr-stage' });
  var cv = K.U.el('canvas', { width: W, height: H });
  stage.appendChild(cv);
  var hud = K.U.el('div', { class: 'rr-hud' });
  var hudText = K.U.el('div', { style: { flex: '0 0 auto' } });
  var prog = K.U.el('div', { class: 'rr-prog' });
  var progBar = K.U.el('i');
  prog.appendChild(progBar);
  var nextBtn = K.U.el('button', { class: 'rr-next', text: '下一步', disabled: true });
  hud.appendChild(hudText); hud.appendChild(prog); hud.appendChild(nextBtn);
  stage.appendChild(hud);
  wrap.appendChild(stage);

  var ctx = cv.getContext('2d');

  /* ── 场景数据 ── */
  var scene = {
    cobwebs: [],
    dirt: [],
    paintPatches: [],
    placed: [],
    bodyBag: null,
    bloodLevel: 0,
    blackout: 0,
    glitchT: 0
  };

  var steps = [
    { id: 'dust',  label: '掸掉蜘蛛网', tool: { id: 'duster', glyph: '\uD83E\uDEB9', name: '羽毛掸子' },
      hint: '用羽毛掸子扫掉墙角的蜘蛛网' },
    { id: 'mop',   label: '擦干净地板', tool: { id: 'sponge', glyph: '\uD83E\uDDFD', name: '海绵' },
      hint: '用海绵把地板上的污渍擦掉' },
    { id: 'paint', label: '粉刷墙壁',   tool: { id: 'roller', glyph: '\uD83D\uDD8C', name: '滚筒刷' },
      hint: '用滚筒刷把墙上的旧漆盖住' },
    { id: 'deco',  label: '装饰房间',   tool: { id: 'hand',   glyph: '\u270B', name: '摆放' },
      hint: '点击下方家具，把它放进房间' }
  ];

  var curStep = 0;
  var activeTool = steps[0].tool.id;
  var onDone = opts.onDone || function(){};
  var currentRun = null;

  /* ── 初始化场景 ── */
  function initScene(){
    scene.cobwebs = [];
    var corners = [[70, 60, 1], [W - 70, 60, -1], [70, 150, 1], [W - 70, 150, -1]];
    corners.forEach(function(c){
      scene.cobwebs.push({ x: c[0], y: c[1], dir: c[2], r: 54, dirt: 1, dead: false });
    });

    scene.dirt = [];
    for(var i = 0; i < 16; i++){
      scene.dirt.push({
        x: K.U.rand(60, W - 60),
        y: K.U.rand(H * 0.66, H - 60),
        r: K.U.rand(22, 46),
        dirt: 1, dead: false
      });
    }

    scene.paintPatches = [];
    for(var j = 0; j < 12; j++){
      scene.paintPatches.push({
        x: K.U.rand(50, W - 50),
        y: K.U.rand(70, H * 0.62),
        r: K.U.rand(30, 62),
        dirt: 1, dead: false
      });
    }
    scene.placed = [];
    scene.bodyBag = null;
    scene.bloodLevel = 0;
  }

  /* ── 绘制 ── */
  function drawRoom(){
    /* 天花板 */
    ctx.fillStyle = '#e8dcc8';
    ctx.fillRect(0, 0, W, 46);
    ctx.fillStyle = '#d4c6ae';
    ctx.fillRect(0, 42, W, 6);

    /* 墙 */
    var wallGrad = ctx.createLinearGradient(0, 46, 0, H * 0.66);
    wallGrad.addColorStop(0, '#f2e6d0');
    wallGrad.addColorStop(1, '#e0d0b4');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 46, W, H * 0.66 - 46);

    /* 未刷的旧漆斑块 */
    scene.paintPatches.forEach(function(p){
      if(p.dead) return;
      ctx.save();
      ctx.globalAlpha = 0.82 * p.dirt;
      ctx.fillStyle = '#9a8a6e';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r, p.r * 0.68, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5 * p.dirt;
      ctx.fillStyle = '#6a5a44';
      ctx.beginPath();
      ctx.ellipse(p.x + 6, p.y + 4, p.r * 0.62, p.r * 0.44, 0, 0, Math.PI * 2);
      ctx.fill();
      /* 剥落边缘 */
      ctx.globalAlpha = 0.45 * p.dirt;
      ctx.strokeStyle = '#5a4a34';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r, p.r * 0.68, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    /* 地板 */
    var floorY = H * 0.66;
    var floorGrad = ctx.createLinearGradient(0, floorY, 0, H);
    floorGrad.addColorStop(0, '#c9a878');
    floorGrad.addColorStop(1, '#a8875a');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorY, W, H - floorY);

    /* 地板木纹 */
    ctx.strokeStyle = 'rgba(90,60,30,.22)';
    ctx.lineWidth = 1.4;
    for(var y = floorY + 14; y < H; y += 22){
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(W, y);
      ctx.stroke();
    }
    for(var x = 0; x < W; x += 78){
      ctx.beginPath();
      ctx.moveTo(x, floorY); ctx.lineTo(x + 26, H);
      ctx.stroke();
    }

    /* 踢脚线 */
    ctx.fillStyle = '#8a6a48';
    ctx.fillRect(0, floorY - 8, W, 10);

    /* 污渍 */
    scene.dirt.forEach(function(d){
      if(d.dead) return;
      ctx.save();
      ctx.globalAlpha = 0.62 * d.dirt;
      ctx.fillStyle = '#5a4028';
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.r, d.r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.35 * d.dirt;
      ctx.fillStyle = '#3a2a18';
      ctx.beginPath();
      ctx.ellipse(d.x + 5, d.y + 3, d.r * 0.55, d.r * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    /* 蜘蛛网 */
    scene.cobwebs.forEach(function(c){
      if(c.dead) return;
      ctx.save();
      ctx.globalAlpha = Math.min(1, 0.95 * c.dirt);
      var cx = c.x, cy = c.y;
      /* 先描一层深色，保证在浅色墙上也看得见 */
      for(var pass = 0; pass < 2; pass++){
        ctx.strokeStyle = pass === 0 ? 'rgba(90,80,66,.55)' : '#fbfbf6';
        ctx.lineWidth = pass === 0 ? 2.6 : 1.5;
        for(var k = 0; k < 9; k++){
          var a = (k / 8) * (Math.PI / 2);
          var ax = cx + (c.dir > 0 ? Math.cos(a) : -Math.cos(a)) * c.r;
          var ay = cy + Math.sin(a) * c.r;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ax, ay); ctx.stroke();
        }
        for(var ring = 1; ring <= 3; ring++){
          ctx.beginPath();
          for(var k2 = 0; k2 <= 8; k2++){
            var a2 = (k2 / 8) * (Math.PI / 2);
            var rr = (ring / 3) * c.r;
            var px = cx + (c.dir > 0 ? Math.cos(a2) : -Math.cos(a2)) * rr;
            var py = cy + Math.sin(a2) * rr;
            if(k2 === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
      /* 挂在网上的灰 */
      ctx.globalAlpha = 0.5 * c.dirt;
      ctx.fillStyle = '#8a8070';
      for(var d2 = 0; d2 < 5; d2++){
        var ang = (d2 / 5) * (Math.PI / 2) + 0.3;
        var rr2 = c.r * (0.4 + (d2 % 3) * 0.2);
        ctx.beginPath();
        ctx.arc(cx + (c.dir > 0 ? Math.cos(ang) : -Math.cos(ang)) * rr2,
                cy + Math.sin(ang) * rr2, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    /* 已摆放的家具 */
    scene.placed.forEach(function(f){ drawFurniture(f); });

    /* 尸体袋 */
    if(scene.bodyBag) drawBodyBag(scene.bodyBag);

    /* 血迹 */
    if(scene.bloodLevel > 0){
      ctx.save();
      ctx.globalAlpha = Math.min(0.85, scene.bloodLevel);
      var bg = ctx.createLinearGradient(0, floorY - 40, 0, H);
      bg.addColorStop(0, 'rgba(139,15,22,0)');
      bg.addColorStop(1, 'rgba(139,15,22,.75)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, floorY - 40, W, H - floorY + 40);
      ctx.restore();
    }

    /* 黑幕 */
    if(scene.blackout > 0){
      ctx.fillStyle = 'rgba(0,0,0,' + scene.blackout + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawFurniture(f){
    ctx.save();
    ctx.translate(f.x, f.y);
    var t = f.type;
    if(t === 'sofa'){
      ctx.fillStyle = '#8a5a8a';
      ctx.beginPath(); ctx.roundRect(-48, -34, 96, 40, 8); ctx.fill();
      ctx.fillStyle = '#a06aa0';
      ctx.beginPath(); ctx.roundRect(-48, -50, 96, 20, 8); ctx.fill();
      ctx.fillStyle = '#6a426a';
      ctx.fillRect(-42, 6, 12, 10); ctx.fillRect(30, 6, 12, 10);
    }else if(t === 'table'){
      ctx.fillStyle = '#a8784a';
      ctx.beginPath(); ctx.roundRect(-42, -26, 84, 14, 4); ctx.fill();
      ctx.fillRect(-36, -12, 9, 26); ctx.fillRect(27, -12, 9, 26);
    }else if(t === 'lamp'){
      ctx.fillStyle = '#e0c060';
      ctx.beginPath(); ctx.moveTo(-20, -50); ctx.lineTo(20, -50); ctx.lineTo(12, -20); ctx.lineTo(-12, -20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8a8078';
      ctx.fillRect(-3, -20, 6, 44);
      ctx.beginPath(); ctx.ellipse(0, 26, 20, 6, 0, 0, Math.PI * 2); ctx.fill();
      var g = ctx.createRadialGradient(0, -34, 2, 0, -34, 56);
      g.addColorStop(0, 'rgba(255,233,168,.5)'); g.addColorStop(1, 'rgba(255,233,168,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, -34, 56, 0, Math.PI * 2); ctx.fill();
    }else if(t === 'plant'){
      ctx.fillStyle = '#8a5a3a';
      ctx.beginPath(); ctx.moveTo(-16, 24); ctx.lineTo(16, 24); ctx.lineTo(11, -6); ctx.lineTo(-11, -6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4ea53c';
      for(var i = 0; i < 5; i++){
        var a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 16, -22 + Math.sin(a) * 12, 15, 9, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }else if(t === 'frame'){
      ctx.fillStyle = '#7a5a3a';
      ctx.fillRect(-30, -44, 60, 44);
      ctx.fillStyle = '#bfe0f0';
      ctx.fillRect(-25, -39, 50, 34);
      ctx.fillStyle = '#f9c2dc';
      ctx.beginPath(); ctx.arc(0, -22, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0d0d12';
      ctx.beginPath(); ctx.arc(-3, -23, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -23, 1.8, 0, Math.PI * 2); ctx.fill();
    }else if(t === 'bag'){
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.ellipse(0, 0, 78, 26, -0.08, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1c1c1c';
      ctx.beginPath(); ctx.ellipse(-52, -4, 22, 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(-14, -14, 30, 26);
      /* 黑色方块 */
      ctx.fillStyle = '#000';
      ctx.fillRect(-22, -22, 46, 44);
      ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 1.4;
      ctx.strokeRect(-22, -22, 46, 44);
    }
    ctx.restore();
  }

  function drawBodyBag(b){
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot || 0);
    ctx.fillStyle = '#0e0e10';
    ctx.beginPath(); ctx.ellipse(0, 0, 86, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#16161a';
    ctx.beginPath(); ctx.ellipse(-58, -5, 24, 20, 0, 0, Math.PI * 2); ctx.fill();
    /* 黑方块 */
    ctx.fillStyle = '#000';
    ctx.fillRect(-26, -26, 52, 52);
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1.6;
    ctx.strokeRect(-26, -26, 52, 52);
    ctx.restore();
  }

  /* ── 工具条 ── */
  function buildTools(){
    toolBar.innerHTML = '';
    steps.forEach(function(s, i){
      var b = K.U.el('div', { class: 'rr-tool' + (i === curStep ? ' active' : '') +
                                     (i > curStep ? ' locked' : '') });
      b.appendChild(K.U.el('div', { class: 'rti', text: s.tool.glyph }));
      b.appendChild(K.U.el('div', { text: s.tool.name }));
      b.addEventListener('click', function(){
        if(i > curStep) return;
        curStep = i;
        activeTool = s.tool.id;
        buildTools();
        updateHud();
        K.Audio.click();
      });
      toolBar.appendChild(b);
    });
    /* 装饰阶段：家具面板 */
    if(curStep === 3){
      toolBar.appendChild(K.U.el('div', { class: 'ab-sep' }));
      var furn = [
        { t: 'sofa',  g: '\uD83D\uDECB' },
        { t: 'table', g: '\uD83E\uDE91' },
        { t: 'lamp',  g: '\uD83D\uDCA1' },
        { t: 'plant', g: '\uD83E\uDEB4' },
        { t: 'frame', g: '\uD83D\uDDBC' }
      ];
      furn.forEach(function(f){
        var b = K.U.el('div', { class: 'rr-tool' });
        b.appendChild(K.U.el('div', { class: 'rti', text: f.g }));
        b.appendChild(K.U.el('div', { text: '放置' }));
        b.addEventListener('click', function(){
          pendingFurniture = f.t;
          K.Audio.click();
          hudText.textContent = '点击房间里的位置放下家具';
        });
        toolBar.appendChild(b);
      });
      /* 那个不该存在的物品 */
      var bagBtn = K.U.el('div', { class: 'rr-tool',
        style: { borderColor: '#5a0f14', color: '#8b0f16', background: '#140a0c' } });
      bagBtn.appendChild(K.U.el('div', { class: 'rti', text: '\u25A0' }));
      bagBtn.appendChild(K.U.el('div', { text: '???' }));
      bagBtn.addEventListener('click', function(){
        pendingFurniture = 'bag';
        K.Audio.click();
      });
      toolBar.appendChild(bagBtn);
    }
  }

  var pendingFurniture = null;

  /* ── 交互 ── */
  function evPos(e){
    var r = cv.getBoundingClientRect();
    var p = e.touches ? e.touches[0] : e;
    return {
      x: (p.clientX - r.left) * (W / r.width),
      y: (p.clientY - r.top) * (H / r.height)
    };
  }

  var isDown = false;

  function act(p){
    var changed = false;
    if(curStep === 0){
      scene.cobwebs.forEach(function(c){
        var d = Math.hypot(p.x - c.x, p.y - c.y);
        if(d < c.r + 26 && c.dirt > 0){
          c.dirt = Math.max(0, c.dirt - 0.11);
          changed = true;
          if(c.dirt <= 0){ c.dead = true; K.Audio.scrub(); }
        }
      });
      if(changed && Math.random() < 0.3) K.Audio.scrub();
    }else if(curStep === 1){
      scene.dirt.forEach(function(d){
        var dd = Math.hypot(p.x - d.x, p.y - d.y);
        if(dd < d.r + 18 && d.dirt > 0){
          d.dirt = Math.max(0, d.dirt - 0.10);
          changed = true;
          if(d.dirt <= 0){ d.dead = true; }
        }
      });
      if(changed && Math.random() < 0.25) K.Audio.scrub();
    }else if(curStep === 2){
      scene.paintPatches.forEach(function(pp){
        var dd = Math.hypot(p.x - pp.x, p.y - pp.y);
        if(dd < pp.r + 14 && pp.dirt > 0){
          pp.dirt = Math.max(0, pp.dirt - 0.09);
          changed = true;
          if(pp.dirt <= 0){ pp.dead = true; }
        }
      });
      if(changed && Math.random() < 0.25) K.Audio.scrub();
    }else if(curStep === 3 && pendingFurniture){
      if(pendingFurniture === 'bag'){
        scene.bodyBag = { x: p.x, y: p.y, rot: K.U.rand(-0.2, 0.2) };
        K.Audio.error();
        K.FX.shake(true, true);
        setTimeout(function(){ K.FX.shake(false); }, 620);
        pendingFurniture = null;
        K.Bus.emit('readyrepair:bag');
        return;
      }
      scene.placed.push({ x: p.x, y: p.y, type: pendingFurniture });
      K.Audio.ok();
      pendingFurniture = null;
      changed = true;
    }
    if(changed) updateHud();
  }

  cv.addEventListener('mousedown', function(e){ isDown = true; act(evPos(e)); e.preventDefault(); });
  cv.addEventListener('mousemove', function(e){ if(isDown) act(evPos(e)); });
  window.addEventListener('mouseup', function(){ isDown = false; });
  cv.addEventListener('touchstart', function(e){ isDown = true; act(evPos(e)); e.preventDefault(); }, { passive: false });
  cv.addEventListener('touchmove', function(e){ if(isDown) act(evPos(e)); e.preventDefault(); }, { passive: false });
  window.addEventListener('touchend', function(){ isDown = false; });

  /* ── 进度 ── */
  function progress(){
    if(curStep === 0){
      var total = scene.cobwebs.length;
      var done = scene.cobwebs.filter(function(c){ return c.dead; }).length;
      return { done: done, total: total };
    }
    if(curStep === 1){
      var t1 = scene.dirt.length;
      var d1 = scene.dirt.filter(function(c){ return c.dead; }).length;
      return { done: d1, total: t1 };
    }
    if(curStep === 2){
      var t2 = scene.paintPatches.length;
      var d2 = scene.paintPatches.filter(function(c){ return c.dead; }).length;
      return { done: d2, total: t2 };
    }
    return { done: Math.min(scene.placed.length, 5), total: 5 };
  }

  function updateHud(){
    var pr = progress();
    hudText.textContent = steps[curStep].hint + '   (' + pr.done + '/' + pr.total + ')';
    progBar.style.width = Math.round(pr.done / pr.total * 100) + '%';
    stepLbl.textContent = '第 ' + (curStep + 1) + ' 步 / 4';
    nextBtn.disabled = pr.done < pr.total;
  }

  nextBtn.addEventListener('click', async function(){
    nextBtn.disabled = true;
    K.Audio.ok();
    if(curStep === 1 && !scene._glitched){
      /* 第一次拖完地后插入故障 */
      scene._glitched = true;
      await K.U.wait(200);
      K.FX.burst(900, { tears: 3 });
      await K.U.wait(600);
      scene.blackout = 1;
      draw();
      await K.U.wait(900);
      K.FX.bloodText('IT WAS ALL YOUR FAULT', 1600, { inOS: false });
      await K.U.wait(1900);
      scene.blackout = 0;
      scene.bloodLevel = 0.35;
      K.Audio.rumble(2);
    }
    curStep++;
    if(curStep >= steps.length){
      onDone();
      return;
    }
    activeTool = steps[curStep].tool.id;
    buildTools();
    updateHud();
    K.Bus.emit('readyrepair:step', curStep);
  });

  /* ── 渲染循环 ── */
  var stopRaf = K.U.raf(function(){
    drawRoom();
    if(scene.glitchT > 0){
      scene.glitchT--;
      ctx.globalAlpha = 0.5;
      ctx.drawImage(cv, K.U.rand(-6, 6), K.U.rand(-4, 4));
      ctx.globalAlpha = 1;
    }
  });

  var rec = K.WM.open({
    id: 'readyrepair', title: 'Ready Repair!', icon: 'webworld',
    w: 940, h: 660, center: true, body: wrap,
    onClose: function(){ stopRaf(); }
  });

  initScene();
  buildTools();
  updateHud();

  return {
    rec: rec,
    setBlood(v){ scene.bloodLevel = v; },
    blackout(v){ scene.blackout = v; },
    glitch(){ scene.glitchT = 30; },
    spawnBag(){
      scene.bodyBag = { x: W / 2, y: H * 0.8, rot: 0.05 };
    },
    bodyBagEl(){ return scene.bodyBag; }
  };
};

/* ══════════════════════════════════════════════════════════════
   Factory Frenzy! —— 帮 Jade 修玩具
   传送带上的零件 → 拖到对应剪影上；中途混入人体器官
   ══════════════════════════════════════════════════════════════ */
K.Game.factoryFrenzy = function(opts){
  opts = opts || {};
  var W = 880, H = 500;
  var wrap = K.U.el('div', { class: 'ff-wrap' });
  var top = K.U.el('div', { class: 'ff-top' });
  top.appendChild(K.U.el('div', { text: '\uD83C\uDFED Factory Frenzy!', style: { fontWeight: '700' } }));
  var ffStep = K.U.el('div', { style: { marginLeft: 'auto', fontSize: '12px' },
    text: '把零件拖到对应的剪影上' });
  top.appendChild(ffStep);
  wrap.appendChild(top);

  var stage = K.U.el('div', { class: 'ff-stage' });
  var cv = K.U.el('canvas', { width: W, height: H });
  stage.appendChild(cv);
  var hud = K.U.el('div', { class: 'ff-hud' });
  var hudText = K.U.el('div');
  var prog = K.U.el('div', { class: 'rr-prog' });
  var progBar = K.U.el('i');
  prog.appendChild(progBar);
  hud.appendChild(hudText); hud.appendChild(prog);
  stage.appendChild(hud);
  wrap.appendChild(stage);

  var ctx = cv.getContext('2d');

  var ROUNDS = [
    { items: ['car', 'bike'],        label: '拼好小汽车和自行车' },
    { items: ['teddy', 'robot'],     label: '拼好泰迪熊和机器人' }
  ];

  var round = 0;
  var onDone = opts.onDone || function(){};
  var creepy = false;              /* 是否已进入器官阶段 */

  var belt = { y: H - 110, speed: 62, offset: 0 };
  var slots = [];                  /* 目标剪影 */
  var parts = [];                  /* 传送带上的零件 */
  var dragging = null;
  var placed = 0;
  var spawnTimer = 0;
  var completed = false;

  function itemShape(type){
    switch(type){
      case 'car':   return { w: 88, h: 44, kind: 'car' };
      case 'bike':  return { w: 74, h: 50, kind: 'bike' };
      case 'teddy': return { w: 60, h: 70, kind: 'teddy' };
      case 'robot': return { w: 56, h: 72, kind: 'robot' };
      case 'heart': return { w: 46, h: 42, kind: 'heart' };
      case 'lung':  return { w: 52, h: 46, kind: 'lung' };
      case 'eye':   return { w: 50, h: 34, kind: 'eye' };
      case 'hand':  return { w: 46, h: 50, kind: 'hand' };
      default:      return { w: 50, h: 50, kind: 'car' };
    }
  }

  function setupRound(){
    slots = [];
    parts = [];
    placed = 0;
    var list = ROUNDS[round].items.slice();
    list.forEach(function(t, i){
      slots.push({
        type: t,
        x: 180 + i * 260,
        y: 160,
        shape: itemShape(t),
        filled: false
      });
    });
    /* 传送带上的零件（打乱，含干扰项） */
    var pool = [];
    ROUNDS[round].items.forEach(function(t){ pool.push(t); });
    if(creepy){
      pool = pool.concat(['heart', 'lung', 'eye', 'hand']);
    }else{
      pool = pool.concat(['heart', 'eye']);
    }
    K.U.shuffle(pool);
    pool.forEach(function(t, i){
      parts.push({
        type: t, shape: itemShape(t),
        x: 100 + i * 150, y: belt.y,
        onBelt: true, taken: false
      });
    });
  }

  /* ── 绘制零件 ── */
  function drawPart(ctx, type, x, y, scale, opts){
    scale = scale || 1;
    opts = opts || {};
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    var fill = opts.silhouette ? (opts.color || '#5a7a9a') : '#f4f8ff';
    var line = opts.silhouette ? null : '#2a5a8a';
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = line || fill;
    ctx.fillStyle = fill;

    function shape(fn){ ctx.beginPath(); fn(); if(opts.silhouette) ctx.fill(); else { ctx.fill(); ctx.stroke(); } }

    if(type === 'car'){
      shape(function(){
        ctx.moveTo(-44, 8); ctx.lineTo(-40, -8); ctx.lineTo(-16, -10);
        ctx.lineTo(-4, -24); ctx.lineTo(22, -24); ctx.lineTo(32, -8);
        ctx.lineTo(44, -4); ctx.lineTo(44, 12); ctx.lineTo(-44, 12);
        ctx.closePath();
      });
      if(!opts.silhouette){
        ctx.fillStyle = '#2a3a4a';
        ctx.beginPath(); ctx.arc(-26, 14, 9, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(26, 14, 9, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#8fd0ff';
        ctx.fillRect(-2, -21, 20, 12);
      }
    }else if(type === 'bike'){
      ctx.lineWidth = 4;
      shape(function(){
        ctx.arc(-24, 12, 15, 0, Math.PI*2);
      });
      ctx.stroke();
      ctx.beginPath(); ctx.arc(24, 12, 15, 0, Math.PI*2);
      if(opts.silhouette) ctx.fill(); else ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-24, 12); ctx.lineTo(-4, -12); ctx.lineTo(16, -12);
      ctx.lineTo(24, 12); ctx.moveTo(-4, -12); ctx.lineTo(8, 12);
      if(opts.silhouette){ ctx.lineWidth = 5; ctx.strokeStyle = fill; ctx.stroke(); }
      else ctx.stroke();
    }else if(type === 'teddy'){
      shape(function(){
        ctx.arc(-16, -26, 10, 0, Math.PI*2);
      });
      ctx.beginPath(); ctx.arc(16, -26, 10, 0, Math.PI*2); ctx.fill(); if(!opts.silhouette) ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, 22, 26, 0, 0, Math.PI*2); ctx.fill(); if(!opts.silhouette) ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 30, 18, 12, 0, 0, Math.PI*2); ctx.fill(); if(!opts.silhouette) ctx.stroke();
      if(!opts.silhouette){
        ctx.fillStyle = '#2a1a10';
        ctx.beginPath(); ctx.arc(-8, -4, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, -4, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, 8, 5, 3.5, 0, 0, Math.PI*2); ctx.fill();
      }
    }else if(type === 'robot'){
      ctx.beginPath(); ctx.rect(-18, -30, 36, 26);
      ctx.fill(); if(!opts.silhouette) ctx.stroke();
      ctx.beginPath(); ctx.rect(-22, 0, 44, 30);
      ctx.fill(); if(!opts.silhouette) ctx.stroke();
      ctx.beginPath(); ctx.rect(-6, -40, 12, 10);
      ctx.fill(); if(!opts.silhouette) ctx.stroke();
      if(!opts.silhouette){
        ctx.fillStyle = '#e0453b';
        ctx.beginPath(); ctx.arc(-8, -18, 4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, -18, 4, 0, Math.PI*2); ctx.fill();
      }
    }else if(type === 'heart'){
      shape(function(){
        ctx.moveTo(0, 16);
        ctx.bezierCurveTo(-26, -4, -18, -24, 0, -12);
        ctx.bezierCurveTo(18, -24, 26, -4, 0, 16);
      });
      if(!opts.silhouette){ ctx.fillStyle = '#8b0f16'; ctx.fill(); }
    }else if(type === 'lung'){
      shape(function(){
        ctx.moveTo(-2, -20); ctx.lineTo(-2, 10);
        ctx.bezierCurveTo(-30, 14, -28, -12, -2, -20);
        ctx.closePath();
      });
      ctx.beginPath();
      ctx.moveTo(2, -20); ctx.lineTo(2, 10);
      ctx.bezierCurveTo(30, 14, 28, -12, 2, -20);
      ctx.closePath();
      if(opts.silhouette){ ctx.fill(); } else { ctx.fillStyle = '#c0707a'; ctx.fill(); ctx.stroke(); }
    }else if(type === 'eye'){
      shape(function(){
        ctx.moveTo(-24, 0);
        ctx.quadraticCurveTo(0, -22, 24, 0);
        ctx.quadraticCurveTo(0, 22, -24, 0);
      });
      if(!opts.silhouette){
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.fillStyle = '#1a1a22';
        ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-3, -3, 3, 0, Math.PI*2); ctx.fill();
      }
    }else if(type === 'hand'){
      shape(function(){
        ctx.moveTo(-14, 22); ctx.lineTo(-14, -6);
        ctx.lineTo(-6, -6); ctx.lineTo(-6, -22); ctx.lineTo(2, -22);
        ctx.lineTo(2, -6); ctx.lineTo(10, -6); ctx.lineTo(10, -18);
        ctx.lineTo(18, -18); ctx.lineTo(18, 22);
        ctx.closePath();
      });
      if(!opts.silhouette){ ctx.fillStyle = '#e8c0b0'; ctx.fill(); ctx.stroke(); }
    }
    ctx.restore();
  }

  function draw(){
    /* 厂房背景 */
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#dceaf8');
    g.addColorStop(0.62, '#c2ddf2');
    g.addColorStop(0.63, '#a8c4dc');
    g.addColorStop(1, '#8aa8c2');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    /* 厂房结构线 */
    ctx.strokeStyle = 'rgba(60,100,140,.25)';
    ctx.lineWidth = 2;
    for(var x = 0; x < W; x += 110){
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 40, H * 0.62); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(0, H * 0.62); ctx.lineTo(W, H * 0.62); ctx.stroke();
    /* 顶部灯 */
    for(var i = 0; i < 4; i++){
      var lx = 130 + i * 210;
      ctx.fillStyle = '#fff8d8';
      ctx.beginPath(); ctx.ellipse(lx, 34, 34, 12, 0, 0, Math.PI * 2); ctx.fill();
      var lg = ctx.createRadialGradient(lx, 34, 4, lx, 34, 150);
      lg.addColorStop(0, 'rgba(255,248,216,.42)');
      lg.addColorStop(1, 'rgba(255,248,216,0)');
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.arc(lx, 34, 150, 0, Math.PI * 2); ctx.fill();
    }

    /* 目标剪影 */
    slots.forEach(function(s){
      ctx.save();
      drawPart(ctx, s.type, s.x, s.y, 1.25, {
        silhouette: true,
        color: s.filled ? '#4ea53c' : (creepy ? '#8a2a34' : '#5a7a9a')
      });
      ctx.restore();
      if(!s.filled){
        ctx.strokeStyle = creepy ? 'rgba(139,15,22,.7)' : 'rgba(90,122,154,.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 6]);
        ctx.strokeRect(s.x - s.shape.w * 0.7, s.y - s.shape.h * 0.7,
                       s.shape.w * 1.4, s.shape.h * 1.4);
        ctx.setLineDash([]);
      }else{
        ctx.fillStyle = '#2a7a3a';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('\u2713 完成', s.x, s.y + s.shape.h * 0.85 + 18);
      }
    });

    /* 传送带 */
    ctx.fillStyle = '#4a5a6a';
    ctx.fillRect(0, belt.y + 34, W, 46);
    ctx.fillStyle = '#3a4a5a';
    for(var bx = (belt.offset % 40) - 40; bx < W; bx += 40){
      ctx.fillRect(bx, belt.y + 34, 22, 46);
    }
    ctx.fillStyle = '#5a6a7a';
    ctx.fillRect(0, belt.y + 28, W, 8);
    /* 滚轮 */
    for(var rx = 40; rx < W; rx += 120){
      ctx.fillStyle = '#2a3a4a';
      ctx.beginPath(); ctx.arc(rx, belt.y + 80, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5a6a7a'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(rx - 6, belt.y + 80); ctx.lineTo(rx + 6, belt.y + 80);
      ctx.stroke();
    }

    /* 传送带上的零件 */
    parts.forEach(function(p){
      if(p.taken) return;
      drawPart(ctx, p.type, p.x, p.y, 1, {});
    });

    /* 正在拖的零件 */
    if(dragging){
      drawPart(ctx, dragging.type, dragging.x, dragging.y, 1.06, {});
      ctx.strokeStyle = 'rgba(47,143,216,.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(dragging.x, dragging.y);
      ctx.lineTo(dragging.ox, dragging.oy);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  /* ── 交互 ── */
  function evPos(e){
    var r = cv.getBoundingClientRect();
    var p = e.touches ? e.touches[0] : e;
    return { x: (p.clientX - r.left) * (W / r.width), y: (p.clientY - r.top) * (H / r.height) };
  }

  function down(e){
    var p = evPos(e);
    for(var i = parts.length - 1; i >= 0; i--){
      var part = parts[i];
      if(part.taken) continue;
      if(Math.abs(p.x - part.x) < part.shape.w * 0.75 &&
         Math.abs(p.y - part.y) < part.shape.h * 0.75){
        dragging = { part: part, type: part.type, x: p.x, y: p.y, ox: part.x, oy: part.y };
        part.taken = true;
        K.Audio.click();
        break;
      }
    }
    e.preventDefault();
  }

  function move(e){
    if(!dragging) return;
    var p = evPos(e);
    dragging.x = p.x; dragging.y = p.y;
  }

  async function up(e){
    if(!dragging) return;
    var d = dragging;
    dragging = null;

    var target = null;
    slots.forEach(function(s){
      if(s.filled) return;
      if(Math.abs(d.x - s.x) < s.shape.w * 0.9 && Math.abs(d.y - s.y) < s.shape.h * 0.9){
        target = s;
      }
    });

    if(target && target.type === d.type){
      target.filled = true;
      placed++;
      K.Audio.coin();
      updateHud();
      if(placed >= slots.length){
        completed = true;
        K.Audio.ok();
        await K.U.wait(400);
        K.Bus.emit('factoryfrenzy:round-done', round);
      }
    }else if(target && target.type !== d.type){
      /* 放错了 */
      d.part.taken = false;
      K.Audio.error();
      if(creepy){
        K.FX.burst(300, { intensity: 0.5, shake: false });
      }
    }else{
      d.part.taken = false;
    }
  }

  cv.addEventListener('mousedown', down);
  cv.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
  cv.addEventListener('touchstart', down, { passive: false });
  cv.addEventListener('touchmove', move, { passive: false });
  window.addEventListener('touchend', up);

  function updateHud(){
    hudText.textContent = ROUNDS[round].label + '   (' + placed + '/' + slots.length + ')';
    progBar.style.width = Math.round(placed / Math.max(1, slots.length) * 100) + '%';
  }

  /* ── 主循环 ── */
  var last = performance.now();
  var stopRaf = K.U.raf(function(now){
    var dt = Math.min(0.04, (now - last) / 1000);
    last = now;
    belt.offset += belt.speed * dt;

    /* 零件随传送带移动 */
    parts.forEach(function(p){
      if(p.taken) return;
      p.x += belt.speed * dt;
      if(p.x > W + 60){
        p.x = -60;
        if(Math.random() < 0.3) K.Audio.conveyor();
      }
    });

    draw();
  });

  var rec = K.WM.open({
    id: 'factoryfrenzy', title: 'Factory Frenzy!', icon: 'webworld',
    w: 940, h: 640, center: true, body: wrap,
    onClose: function(){ stopRaf(); }
  });

  setupRound();
  updateHud();

  return {
    rec: rec,
    setCreepy(v){ creepy = !!v; setupRound(); updateHud(); },
    nextRound(){ round = Math.min(ROUNDS.length - 1, round + 1); setupRound(); updateHud(); },
    get round(){ return round; },
    completed(){ return completed; }
  };
};

/* ══════════════════════════════════════════════════════════════
   Best Friends Analysis Hub —— 挚友分析中心
   ══════════════════════════════════════════════════════════════ */
K.Game.analysisHub = function(opts){
  opts = opts || {};
  var questions = opts.questions || [];
  var onDone = opts.onDone || function(){};

  var wrap = K.U.el('div', { class: 'bf-wrap' + (opts.dark ? ' dark' : '') });
  var top = K.U.el('div', { class: 'bf-top' });
  top.appendChild(K.U.el('span', { text: 'Best Friends Analysis Hub' }));
  top.appendChild(K.U.el('span', { class: 'bft-badge', text: 'v1.0  ·  仅限真正的朋友' }));
  var counter = K.U.el('span', { style: { marginLeft: 'auto', fontSize: '11.5px', opacity: '.85' } });
  top.appendChild(counter);
  wrap.appendChild(top);

  var pbar = K.U.el('div', { class: 'bf-progress' });
  var pbarI = K.U.el('i');
  pbar.appendChild(pbarI);
  wrap.appendChild(pbar);

  var body = K.U.el('div', { class: 'bf-body scroll' });
  wrap.appendChild(body);

  var idx = 0;
  var wrongFriendTries = 0;

  function setDark(on){
    wrap.classList.toggle('dark', !!on);
  }

  function progress(){
    counter.textContent = (idx + 1) + ' / ' + questions.length;
    pbarI.style.width = Math.round((idx / questions.length) * 100) + '%';
  }

  async function renderQuestion(){
    body.innerHTML = '';
    progress();
    var q = questions[idx];
    if(!q){ finish(); return; }

    var qEl = K.U.el('div', { class: 'bf-q' });
    body.appendChild(qEl);
    if(q.sub) body.appendChild(K.U.el('div', { class: 'bf-sub', text: q.sub }));

    if(opts.voice !== false && K.Voice.supported){
      K.Voice.say(q.text, { pitch: q.dark ? 0.35 : 0.72, rate: q.dark ? 0.78 : 0.94 });
    }

    /* 打字 */
    await K.U.typeInto(qEl, q.text, 26);

    if(q.type === 'yesno'){
      var row = K.U.el('div', { class: 'bf-choices' });
      var got = await new Promise(function(resolve){
        [['是', 'yes'], ['否', 'no']].forEach(function(o){
          var b = K.U.el('button', { class: 'bf-choice ' + o[1], text: o[0] });
          b.addEventListener('click', function(){
            K.Audio.click();
            resolve(o[1]);
          });
          row.appendChild(b);
        });
        body.appendChild(row);
      });
      q.answer = got;
      await advance(q);
      return;
    }

    if(q.type === 'input'){
      var irow = K.U.el('div', { class: 'bf-input-row' });
      var inp = K.U.el('input', { type: 'text', placeholder: q.placeholder || '在这里输入...',
        maxlength: 60 });
      var ok = K.U.el('button', { text: '提交' });
      irow.appendChild(inp); irow.appendChild(ok);
      body.appendChild(irow);
      setTimeout(function(){ inp.focus(); }, 80);

      var val = await new Promise(function(resolve){
        function go(){
          var v = inp.value.trim();
          if(!v){ K.Audio.error(); return; }
          resolve(v);
        }
        ok.addEventListener('click', go);
        inp.addEventListener('keydown', function(e){ if(e.key === 'Enter') go(); });
      });
      q.answer = val;
      await advance(q);
      return;
    }

    if(q.type === 'info'){
      var btn = K.U.el('button', { class: 'bf-choice', text: q.okText || '继续' });
      body.appendChild(btn);
      await new Promise(function(r){ btn.addEventListener('click', function(){ K.Audio.click(); r(); }); });
      await advance(q);
      return;
    }
  }

  async function advance(q){
    if(q.validate){
      var r = await q.validate(q.answer, { tries: wrongFriendTries, setDark: setDark });
      if(r === 'retry'){
        wrongFriendTries++;
        body.innerHTML = '';
        var nq = K.U.el('div', { class: 'bf-q', text: q.text });
        body.appendChild(nq);
        /* 音量升高 + 变黑 + 抖动 */
        K.FX.shake(true, true);
        setDark(true);
        K.Audio.rumble(1.2);
        K.Audio.setVolume(1.6 + wrongFriendTries * 0.35);
        await K.U.wait(700);
        K.FX.shake(false);
        await K.U.wait(600);
        if(q.forceAfter && wrongFriendTries >= q.forceAfter){
          K.State.bestFriend = 'Kinito';
          K.Bus.emit('analysis:forced');
          K.Audio.setVolume(0.75);
          setDark(false);
          idx++;
          renderQuestion();
          return;
        }
        renderQuestion();
        return;
      }
    }
    K.Audio.setVolume(0.75);
    setDark(false);
    idx++;
    if(idx >= questions.length){ finish(); return; }
    renderQuestion();
  }

  function finish(){
    pbarI.style.width = '100%';
    body.innerHTML = '';
    K.Audio.ok();
    onDone();
  }

  var rec = K.WM.open({
    id: 'analysis', title: 'Best Friends Analysis Hub', icon: 'notes',
    w: 780, h: 580, center: true, body: wrap, closable: false, minimizable: false
  });

  renderQuestion();

  return {
    rec: rec,
    get answers(){ return questions; }
  };
};
