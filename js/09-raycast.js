/* ══════════════════════════════════════════════════════════════
   09-raycast.js — Canvas 2D 光线投射 3D 引擎
   支持：纹理墙 / 地板天花板 / 精灵公告板 / 距离雾 / 手电筒 /
         鼠标视角锁定 / WASD 移动 / 碰撞 / 交互
   ══════════════════════════════════════════════════════════════ */
'use strict';

K.RC = {

  /* ── 程序化纹理生成 ─────────────────────── */
  _texCache: {},

  makeTexture(kind, size){
    size = size || 64;
    var key = kind + '_' + size;
    if(this._texCache[key]) return this._texCache[key];
    var cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    var c = cv.getContext('2d');

    function noise(amount, base){
      var img = c.getImageData(0, 0, size, size);
      var d = img.data;
      for(var i = 0; i < d.length; i += 4){
        var n = (Math.random() - 0.5) * amount;
        d[i] = K.U.clamp(d[i] + n, 0, 255);
        d[i+1] = K.U.clamp(d[i+1] + n, 0, 255);
        d[i+2] = K.U.clamp(d[i+2] + n, 0, 255);
      }
      c.putImageData(img, 0, 0);
    }

    switch(kind){
      case 'brick':
        c.fillStyle = '#6a4a3a'; c.fillRect(0, 0, size, size);
        c.fillStyle = '#8a5a44';
        for(var row = 0; row < 8; row++){
          var off = (row % 2) * 8;
          for(var col = -1; col < 5; col++){
            c.fillRect(col * 16 + off + 1, row * 8 + 1, 14, 6);
          }
        }
        c.strokeStyle = 'rgba(40,24,16,.55)'; c.lineWidth = 1;
        for(var r2 = 0; r2 <= 8; r2++){
          c.beginPath(); c.moveTo(0, r2 * 8); c.lineTo(size, r2 * 8); c.stroke();
        }
        noise(26);
        break;
      case 'concrete':
        c.fillStyle = '#8a8a8e'; c.fillRect(0, 0, size, size);
        for(var i2 = 0; i2 < 26; i2++){
          c.fillStyle = 'rgba(120,120,126,' + K.U.rand(0.1, 0.4) + ')';
          c.beginPath();
          c.ellipse(K.U.rand(0, size), K.U.rand(0, size),
                    K.U.rand(3, 12), K.U.rand(2, 8), K.U.rand(0, 3), 0, Math.PI * 2);
          c.fill();
        }
        noise(30);
        break;
      case 'wood':
        c.fillStyle = '#7a5a3a'; c.fillRect(0, 0, size, size);
        c.strokeStyle = 'rgba(50,32,18,.6)';
        for(var x = 0; x < size; x += 16){
          c.lineWidth = 1.6;
          c.beginPath(); c.moveTo(x, 0); c.lineTo(x, size); c.stroke();
        }
        for(var k = 0; k < 30; k++){
          c.strokeStyle = 'rgba(90,64,36,' + K.U.rand(.2,.5) + ')';
          c.lineWidth = 1;
          var y = K.U.rand(0, size);
          c.beginPath();
          c.moveTo(0, y);
          c.bezierCurveTo(size/3, y + K.U.rand(-4,4), size*2/3, y + K.U.rand(-4,4), size, y);
          c.stroke();
        }
        noise(20);
        break;
      case 'bloodwall':
        c.fillStyle = '#2a1a1c'; c.fillRect(0, 0, size, size);
        for(var b = 0; b < 16; b++){
          c.fillStyle = 'rgba(139,15,22,' + K.U.rand(.25,.75) + ')';
          c.beginPath();
          c.ellipse(K.U.rand(0, size), K.U.rand(0, size),
                    K.U.rand(5, 18), K.U.rand(4, 14), K.U.rand(0, 3), 0, Math.PI * 2);
          c.fill();
        }
        /* 滴流 */
        for(var s = 0; s < 10; s++){
          c.fillStyle = 'rgba(110,10,16,.8)';
          var sx = K.U.rand(0, size);
          c.fillRect(sx, 0, K.U.rand(2, 4), K.U.rand(14, size));
        }
        noise(22);
        break;
      case 'tile':
        c.fillStyle = '#dfe6ea'; c.fillRect(0, 0, size, size);
        c.strokeStyle = '#a8b4bc'; c.lineWidth = 1.6;
        for(var t = 0; t <= 4; t++){
          c.beginPath(); c.moveTo(t * 16, 0); c.lineTo(t * 16, size); c.stroke();
          c.beginPath(); c.moveTo(0, t * 16); c.lineTo(size, t * 16); c.stroke();
        }
        noise(12);
        break;
      case 'kinito':
        c.fillStyle = '#f9c2dc'; c.fillRect(0, 0, size, size);
        c.fillStyle = '#eb8fb8';
        for(var p = 0; p < 12; p++){
          c.beginPath();
          c.ellipse(K.U.rand(0, size), K.U.rand(0, size),
                    K.U.rand(4, 11), K.U.rand(4, 9), K.U.rand(0,3), 0, Math.PI * 2);
          c.fill();
        }
        /* 两只眼 */
        c.fillStyle = '#0d0d12';
        c.beginPath(); c.ellipse(20, 30, 6, 8, 0, 0, Math.PI*2); c.fill();
        c.beginPath(); c.ellipse(44, 30, 6, 8, 0, 0, Math.PI*2); c.fill();
        c.fillStyle = '#fff';
        c.beginPath(); c.arc(18, 27, 2, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(42, 27, 2, 0, Math.PI*2); c.fill();
        noise(16);
        break;
      case 'grass':
        c.fillStyle = '#4a8a3a'; c.fillRect(0, 0, size, size);
        for(var g = 0; g < 130; g++){
          c.strokeStyle = 'rgba(' + K.U.randInt(60,130) + ',' + K.U.randInt(120,190) +
                          ',' + K.U.randInt(40,90) + ',.8)';
          c.lineWidth = 1.4;
          var gx = K.U.rand(0, size), gy = K.U.rand(0, size);
          c.beginPath(); c.moveTo(gx, gy);
          c.lineTo(gx + K.U.rand(-3,3), gy - K.U.rand(3,8));
          c.stroke();
        }
        noise(24);
        break;
      case 'snow':
        c.fillStyle = '#e8eef4'; c.fillRect(0, 0, size, size);
        for(var s2 = 0; s2 < 60; s2++){
          c.fillStyle = 'rgba(200,214,228,' + K.U.rand(.2,.6) + ')';
          c.beginPath();
          c.ellipse(K.U.rand(0,size), K.U.rand(0,size), K.U.rand(3,10), K.U.rand(2,6), 0, 0, Math.PI*2);
          c.fill();
        }
        noise(14);
        break;
      case 'forest':
        c.fillStyle = '#1f3a24'; c.fillRect(0, 0, size, size);
        for(var f = 0; f < 40; f++){
          c.strokeStyle = 'rgba(' + K.U.randInt(30,70) + ',' + K.U.randInt(70,120) +
                          ',' + K.U.randInt(35,75) + ',.85)';
          c.lineWidth = K.U.rand(1.6, 4);
          var fx = K.U.rand(0, size);
          c.beginPath();
          c.moveTo(fx, size);
          c.lineTo(fx + K.U.rand(-6,6), K.U.rand(0, size * 0.6));
          c.stroke();
        }
        noise(28);
        break;
      case 'door':
        c.fillStyle = '#6a4a2a'; c.fillRect(0, 0, size, size);
        c.fillStyle = '#5a3a1c';
        c.fillRect(6, 6, size - 12, size - 12);
        c.fillStyle = '#7a5a3a';
        c.fillRect(10, 10, size - 20, size * 0.42);
        c.fillRect(10, size * 0.56, size - 20, size * 0.38);
        c.fillStyle = '#e0c060';
        c.beginPath(); c.arc(size - 14, size / 2, 3.4, 0, Math.PI * 2); c.fill();
        noise(20);
        break;
      case 'dark':
      default:
        c.fillStyle = '#1a1a1e'; c.fillRect(0, 0, size, size);
        noise(18);
    }

    this._texCache[key] = cv;
    return cv;
  },

  /* ── 创建实例 ───────────────────────────── */
  create(container, opts){
    opts = opts || {};
    var self = this;

    var cv = document.createElement('canvas');
    container.appendChild(cv);
    var ctx = cv.getContext('2d', { alpha: false });

    var W = 0, H = 0;           /* 实际画布尺寸 */
    var RW = 0, RH = 0;         /* 渲染分辨率（较低，像素风） */
    var img = null, buf = null, data = null;
    var zbuf = null;
    var scale = opts.resolution || 2.4;   /* 每像素放大倍数 */

    /* 世界 */
    var world = {
      map: [],
      mapW: 0, mapH: 0,
      wallTex: [],            /* 2D 数组，纹理名 */
      floorTex: opts.floorTex || 'wood',
      ceilTex: opts.ceilTex || 'concrete',
      floorColor: opts.floorColor || [92, 74, 58],
      ceilColor: opts.ceilColor || [40, 40, 46]
    };

    var player = {
      x: 2.5, y: 2.5,
      dirX: 1, dirY: 0,
      planeX: 0, planeY: 0.66,
      fov: 0.66,
      height: 0.5,             /* 视角高度偏移（用于俯仰） */
      pitch: 0
    };

    var sprites = [];
    var fog = { color: [0, 0, 0], near: 1.4, far: 12, strength: 1 };
    var light = { on: false, radius: 9, ambient: 0.34, color: [255, 226, 170] };
    var running = false, rafStop = null;
    var keys = {};
    var speed = opts.speed || 2.6;
    var turnSpeed = 2.4;
    var bob = 0;

    var onUpdate = opts.onUpdate || null;
    var onInteract = opts.onInteract || null;
    var onTick = opts.onTick || null;
    var collide = opts.collide !== false;
    var showCross = opts.crosshair !== false;

    /* 交互提示元素 */
    var hintEl = null;
    if(opts.hintEl !== false){
      hintEl = K.U.el('div', { class: 's3d-hint', text: opts.hint || '' });
      if(!opts.hint) hintEl.classList.add('hidden');
      container.appendChild(hintEl);
    }

    /* ── 尺寸 ── */
    function resize(){
      var w = container.clientWidth || 800;
      var h = container.clientHeight || 600;
      W = Math.max(320, Math.floor(w));
      H = Math.max(240, Math.floor(h));
      cv.width = W; cv.height = H;
      cv.style.width = '100%';
      cv.style.height = '100%';
      RW = Math.max(160, Math.floor(W / scale));
      RH = Math.max(120, Math.floor(H / scale));
      img = ctx.createImageData(RW, RH);
      buf = new Uint32Array(img.data.buffer);
      data = img.data;
      zbuf = new Float32Array(RW);
    }
    resize();
    window.addEventListener('resize', resize);

    /* ── 地图 ── */
    function setMap(grid, texNames){
      world.map = grid.map(function(row){ return row.slice(); });
      world.mapH = world.map.length;
      world.mapW = world.map[0].length;
      world.wallTex = texNames || [];
    }

    function tileAt(x, y){
      var mx = Math.floor(x), my = Math.floor(y);
      if(mx < 0 || my < 0 || mx >= world.mapW || my >= world.mapH) return 1;
      return world.map[my][mx];
    }

    function texFor(v){
      if(v <= 0) return 'concrete';
      return world.wallTex[v - 1] || 'brick';
    }

    /* ── 颜色工具 ── */
    function packRGB(r, g, b){
      return (255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
    }

    function texSample(canvas, tx, ty){
      /* 用缓存的像素数据加速 */
      var key = canvas._pxKey;
      if(!key){
        var c2 = canvas.getContext('2d');
        canvas._px = c2.getImageData(0, 0, canvas.width, canvas.height).data;
        canvas._pxKey = canvas.width;
      }
      tx = K.U.clamp(tx | 0, 0, canvas.width - 1);
      ty = K.U.clamp(ty | 0, 0, canvas.height - 1);
      var i = (ty * canvas.width + tx) * 4;
      return canvas._px;
    }

    /* ── 渲染一帧 ── */
    function render(){
      if(!data) return;
      var horizon = (RH / 2) + player.pitch * RH * 0.5;

      /* ── 天花板与地板：标准透视贴图投射 ── */
      var ceilR = world.ceilColor[0], ceilG = world.ceilColor[1], ceilB = world.ceilColor[2];
      var floR = world.floorColor[0], floG = world.floorColor[1], floB = world.floorColor[2];

      var ceilTexCv = opts.ceilTexture !== false ? self.makeTexture(world.ceilTex, 64) : null;
      var floorTexCv = opts.floorTexture !== false ? self.makeTexture(world.floorTex, 64) : null;
      if(ceilTexCv && !ceilTexCv._px) texSample(ceilTexCv, 0, 0);
      if(floorTexCv && !floorTexCv._px) texSample(floorTexCv, 0, 0);

      var rayDirX0 = player.dirX - player.planeX;
      var rayDirY0 = player.dirY - player.planeY;
      var rayDirX1 = player.dirX + player.planeX;
      var rayDirY1 = player.dirY + player.planeY;
      var posZ = 0.5 * RH;
      var invRW = 1 / RW;
      var amb = light.on ? light.ambient : 0.62;

      for(var y = 0; y < RH; y++){
        var isCeil = y < horizon;
        var pRow = isCeil ? (horizon - y) : (y - horizon);
        if(pRow < 0.5) pRow = 0.5;
        var rowDist = posZ / pRow;
        if(rowDist > 60) rowDist = 60;

        var shade = K.U.clamp(1 - (rowDist / fog.far) * fog.strength, 0, 1);
        shade = K.U.clamp(shade + amb * 0.55, 0, 1);

        var stepX = rowDist * (rayDirX1 - rayDirX0) * invRW;
        var stepY = rowDist * (rayDirY1 - rayDirY0) * invRW;
        var fx = player.x + rowDist * rayDirX0;
        var fy = player.y + rowDist * rayDirY0;

        var texCv = isCeil ? ceilTexCv : floorTexCv;
        var texPx = texCv ? texCv._px : null;
        var texW = texCv ? texCv.width : 64;
        var baseR = isCeil ? ceilR : floR;
        var baseG = isCeil ? ceilG : floG;
        var baseB = isCeil ? ceilB : floB;
        var rowStart = y * RW;

        /* 手电筒在行方向的系数（只与 y 有关，提到行外） */
        var cyNorm = (y / RH - 0.5) * 2;
        var lampRow = light.on ? Math.max(0, 1 - cyNorm * cyNorm * 0.62) : 0;
        var attRow = light.on ? Math.max(0, 1 - rowDist / light.radius) : 0;
        var addBase = light.on ? lampRow * attRow * 0.62 : 0;

        for(var x = 0; x < RW; x++){
          var r, g, b;
          if(texPx){
            var tx = ((fx * texW) | 0) & (texW - 1);
            var ty = ((fy * texW) | 0) & (texW - 1);
            if(tx < 0) tx += texW;
            if(ty < 0) ty += texW;
            var ti = (ty * texW + tx) << 2;
            r = texPx[ti]; g = texPx[ti + 1]; b = texPx[ti + 2];
          }else{
            var stripe = ((x + y) & 7) < 1 ? 0.92 : 1;
            r = baseR * stripe; g = baseG * stripe; b = baseB * stripe;
          }
          r *= shade; g *= shade; b *= shade;

          if(light.on){
            var cxNorm = (x * invRW - 0.5) * 2;
            var lamp = lampRow * Math.max(0, 1 - cxNorm * cxNorm * 0.55);
            var add = (lamp * 0.6 + addBase) * 0.5;
            r = r * (1 - add * 0.32) + light.color[0] * add * 0.46;
            g = g * (1 - add * 0.32) + light.color[1] * add * 0.46;
            b = b * (1 - add * 0.32) + light.color[2] * add * 0.46;
          }

          fx += stepX; fy += stepY;

          buf[rowStart + x] = packRGB(
            K.U.clamp(r, 0, 255) | 0,
            K.U.clamp(g, 0, 255) | 0,
            K.U.clamp(b, 0, 255) | 0
          );
        }
      }

      /* 墙体 DDA */
      for(var sx = 0; sx < RW; sx++){
        var camX = 2 * sx / RW - 1;
        var rayX = player.dirX + player.planeX * camX;
        var rayY = player.dirY + player.planeY * camX;

        var mapX = Math.floor(player.x), mapY = Math.floor(player.y);
        var deltaX = rayX === 0 ? 1e30 : Math.abs(1 / rayX);
        var deltaY = rayY === 0 ? 1e30 : Math.abs(1 / rayY);
        var stepX, stepY, sideDistX, sideDistY;

        if(rayX < 0){ stepX = -1; sideDistX = (player.x - mapX) * deltaX; }
        else { stepX = 1; sideDistX = (mapX + 1 - player.x) * deltaX; }
        if(rayY < 0){ stepY = -1; sideDistY = (player.y - mapY) * deltaY; }
        else { stepY = 1; sideDistY = (mapY + 1 - player.y) * deltaY; }

        var hit = 0, side = 0, guard = 0;
        while(!hit && guard++ < 200){
          if(sideDistX < sideDistY){
            sideDistX += deltaX; mapX += stepX; side = 0;
          }else{
            sideDistY += deltaY; mapY += stepY; side = 1;
          }
          if(mapX < 0 || mapY < 0 || mapX >= world.mapW || mapY >= world.mapH){ hit = 1; break; }
          if(world.map[mapY][mapX] > 0) hit = world.map[mapY][mapX];
        }

        var perp = side === 0 ? (sideDistX - deltaX) : (sideDistY - deltaY);
        perp = Math.max(0.02, perp);
        zbuf[sx] = perp;

        var lineH = Math.floor(RH / perp);
        var drawStart = Math.floor(-lineH / 2 + horizon);
        var drawEnd = Math.floor(lineH / 2 + horizon);

        /* 纹理横坐标 */
        var wallX = side === 0 ? (player.y + perp * rayY) : (player.x + perp * rayX);
        wallX -= Math.floor(wallX);

        var texCv = self.makeTexture(texFor(hit), 64);
        var texX = Math.floor(wallX * texCv.width);
        if((side === 0 && rayX > 0) || (side === 1 && rayY < 0)) texX = texCv.width - texX - 1;

        /* 距离衰减 */
        var shade = K.U.clamp(1 - (perp / fog.far) * fog.strength, 0, 1);
        shade = K.U.clamp(shade + (light.on ? light.ambient * 0.5 : 0.5) * 0.55, 0.03, 1);
        if(side === 1) shade *= 0.74;

        /* 手电筒锥形 */
        var lampFactor = 1;
        if(light.on){
          var ccx = (sx / RW - 0.5) * 2;
          lampFactor = Math.max(0, 1 - ccx * ccx * 0.62) * 0.92 + 0.08;
          var att = Math.max(0, 1 - perp / light.radius);
          shade = K.U.clamp(shade + lampFactor * att * 0.55, 0.03, 1.25);
        }

        var step = texCv.height / lineH;
        var texPos = (drawStart - horizon + lineH / 2) * step;
        var texPxW = texCv._px;
        if(!texPxW){ texSample(texCv, 0, 0); texPxW = texCv._px; }
        var texMask = texCv.height - 1;
        var tX = texX & texMask;
        var shadeR = shade, lightOn = light.on;
        var lcR = light.color[0], lcG = light.color[1], lcB = light.color[2];
        var lampK = lightOn ? lampFactor : 0;

        for(var y2 = drawStart; y2 < drawEnd; y2++){
          if(y2 < 0 || y2 >= RH){ texPos += step; continue; }
          var texY = (texPos | 0) & texMask;
          texPos += step;
          var ti = (texY * texCv.height + tX) << 2;
          var r2 = texPxW[ti] * shadeR, g2 = texPxW[ti + 1] * shadeR, b2 = texPxW[ti + 2] * shadeR;
          if(lightOn){
            r2 = r2 * (1 - lampK * 0.3) + lcR * lampK * 0.36;
            g2 = g2 * (1 - lampK * 0.3) + lcG * lampK * 0.36;
            b2 = b2 * (1 - lampK * 0.3) + lcB * lampK * 0.36;
          }
          buf[y2 * RW + sx] = packRGB(
            K.U.clamp(r2, 0, 255) | 0,
            K.U.clamp(g2, 0, 255) | 0,
            K.U.clamp(b2, 0, 255) | 0
          );
        }
      }

      /* 精灵（公告板） */
      var vis = [];
      for(var i = 0; i < sprites.length; i++){
        var sp = sprites[i];
        if(sp.hidden) continue;
        sp._dist = (player.x - sp.x) * (player.x - sp.x) + (player.y - sp.y) * (player.y - sp.y);
        vis.push(sp);
      }
      vis.sort(function(a, b){ return b._dist - a._dist; });

      var invDet = 1 / (player.planeX * player.dirY - player.dirX * player.planeY);
      for(var s = 0; s < vis.length; s++){
        var o = vis[s];
        var spx = o.x - player.x, spy = o.y - player.y;
        var transX = invDet * (player.dirY * spx - player.dirX * spy);
        var transY = invDet * (-player.planeY * spx + player.planeX * spy);
        if(transY <= 0.12) continue;

        var screenX = Math.floor((RW / 2) * (1 + transX / transY));
        var spH = Math.abs(Math.floor(RH / transY)) * (o.scale || 1);
        var spW = spH * (o.aspect || 1);
        var vMove = (o.vOffset || 0) * RH / transY;
        var vStart = Math.floor(-spH / 2 + horizon + vMove);
        var vEnd = Math.floor(spH / 2 + horizon + vMove);
        var uStart = Math.floor(-spW / 2 + screenX);
        var uEnd = Math.floor(spW / 2 + screenX);

        var shade2 = K.U.clamp(1 - (transY / fog.far) * fog.strength, 0, 1);
        shade2 = K.U.clamp(shade2 + (light.on ? 0.16 : 0.46) * 0.6, 0.04, 1.2);
        if(light.on){
          var att2 = Math.max(0, 1 - transY / light.radius);
          var ccx2 = (screenX / RW - 0.5) * 2;
          shade2 = K.U.clamp(shade2 + Math.max(0, 1 - ccx2 * ccx2 * 0.7) * att2 * 0.6, 0.04, 1.3);
        }

        var u0 = Math.max(0, uStart), u1 = Math.min(RW, uEnd);
        var v0 = Math.max(0, vStart), v1 = Math.min(RH, vEnd);
        var S = o._texSize || 64;
        var texData = o._tex;
        if(!texData) continue;      /* 没有贴图的精灵跳过，避免读空 */
        var uScale = S / spW, vScale = S / spH;
        var shade3 = shade2;
        var oR = 1, oG = 1, oB = 1;

        for(var u = u0; u < u1; u++){
          if(transY >= zbuf[u]) continue;
          var tu = ((u - uStart) * uScale) | 0;
          if(tu < 0) tu = 0; else if(tu >= S) tu = S - 1;
          var colBase = tu;
          for(var v = v0; v < v1; v++){
            var tv = ((v - vStart) * vScale) | 0;
            if(tv < 0) tv = 0; else if(tv >= S) tv = S - 1;
            var idx = ((tv * S + colBase) << 2);
            var a = texData[idx + 3];
            if(a < 12) continue;
            var rr = texData[idx] * shade3 * oR;
            var gg = texData[idx + 1] * shade3 * oG;
            var bb = texData[idx + 2] * shade3 * oB;
            buf[v * RW + u] = packRGB(
              K.U.clamp(rr, 0, 255) | 0,
              K.U.clamp(gg, 0, 255) | 0,
              K.U.clamp(bb, 0, 255) | 0
            );
          }
        }
      }

      /* 输出 */
      ctx.putImageData(img, 0, 0);
      if(scale !== 1){
        /* 用 drawImage 放大（保持像素感） */
        ctx.imageSmoothingEnabled = false;
        var tmp = document.createElement('canvas');
        tmp.width = RW; tmp.height = RH;
        tmp.getContext('2d').putImageData(img, 0, 0);
        ctx.drawImage(tmp, 0, 0, RW, RH, 0, 0, W, H);
      }
    }

    /* ── 输入 ── */
    function onKey(e, down){
      var k = e.key.toLowerCase();
      keys[k] = down;
      if(down && (k === 'e' || k === ' ')){
        var t = pickSprite();
        if(t && onInteract) onInteract(t);
      }
      if(['arrowup','arrowdown','arrowleft','arrowright',' '].indexOf(k) >= 0) e.preventDefault();
    }
    var kd = function(e){ onKey(e, true); };
    var ku = function(e){ onKey(e, false); };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    /* 鼠标视角 */
    var locked = false;
    function onMouseMove(e){
      if(!locked) return;
      var dx = e.movementX || 0;
      rotate(dx * 0.0022);
      player.pitch = K.U.clamp(player.pitch - (e.movementY || 0) * 0.0012, -0.55, 0.55);
    }
    function requestLock(){
      if(opts.mouseLock === false) return;
      if(cv.requestPointerLock) cv.requestPointerLock();
    }
    document.addEventListener('pointerlockchange', function(){
      locked = (document.pointerLockElement === cv);
      K.Bus.emit('rc:lock', locked);
    });
    document.addEventListener('mousemove', onMouseMove);
    cv.addEventListener('click', function(){
      requestLock();
      var t = pickSprite();
      if(t && onInteract) onInteract(t);
    });

    /* 无鼠标锁定时用方向键转向 */
    function rotate(a){
      var c = Math.cos(a), s = Math.sin(a);
      var nx = player.dirX * c - player.dirY * s;
      var ny = player.dirX * s + player.dirY * c;
      player.dirX = nx; player.dirY = ny;
      player.planeX = -player.dirY * player.fov;
      player.planeY = player.dirX * player.fov;
    }

    /* ── 碰撞移动 ── */
    function tryMove(nx, ny){
      var r = 0.24;
      if(!collide){
        player.x = nx; player.y = ny; return;
      }
      var canX = tileAt(nx + Math.sign(nx - player.x) * r, player.y) === 0;
      var canY = tileAt(player.x, ny + Math.sign(ny - player.y) * r) === 0;
      if(canX) player.x = nx;
      if(canY) player.y = ny;
      /* 也试试斜向 */
      if(!canX && !canY && tileAt(nx, ny) === 0){ player.x = nx; player.y = ny; }
    }

    /* ── 拾取前方精灵 ── */
    function pickSprite(){
      var best = null, bestD = 2.2;
      for(var i = 0; i < sprites.length; i++){
        var sp = sprites[i];
        if(sp.hidden || sp.noInteract) continue;
        var dx = sp.x - player.x, dy = sp.y - player.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if(d > (sp.reach || 1.9)) continue;
        var dot = (dx * player.dirX + dy * player.dirY) / (d || 1);
        if(dot < 0.55) continue;
        if(d < bestD){ bestD = d; best = sp; }
      }
      return best;
    }

    /* ── 主循环 ── */
    var last = performance.now();
    var interactCooldown = 0;

    function loop(now){
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      /* 移动 */
      var fwd = 0, strafe = 0;
      if(keys['w'] || keys['arrowup']) fwd += 1;
      if(keys['s'] || keys['arrowdown']) fwd -= 1;
      if(keys['a']) strafe -= 1;
      if(keys['d']) strafe += 1;
      if(keys['arrowleft'] && !locked) rotate(-turnSpeed * dt);
      if(keys['arrowright'] && !locked) rotate(turnSpeed * dt);

      if(opts.freeze !== true && (fwd || strafe)){
        var len = Math.hypot(fwd, strafe) || 1;
        var mv = speed * dt;
        var nx = player.x + (player.dirX * fwd + (-player.dirY) * strafe) / len * mv;
        var ny = player.y + (player.dirY * fwd + (player.dirX) * strafe) / len * mv;
        tryMove(nx, ny);
        bob += dt * 9;
      }

      /* 头部起伏 */
      var bobY = Math.sin(bob) * 0.012 * (fwd || strafe ? 1 : 0);
      var baseH = player.height;
      player.height = baseH + bobY;

      /* 交互提示 */
      if(hintEl){
        var t = pickSprite();
        if(t && t.hint){
          hintEl.textContent = t.hint;
          hintEl.classList.remove('hidden');
        }else{
          hintEl.classList.add('hidden');
        }
      }

      if(onTick) onTick(dt, api);
      if(onUpdate) onUpdate(dt, api);
      render();
      rafStop = requestAnimationFrame(loop);
    }

    /* ── API ── */
    var api = {
      canvas: cv, ctx: ctx,
      player: player,
      get map(){ return world.map; },
      setMap: setMap,
      resize: resize,
      rotate: rotate,
      requestLock: requestLock,
      releaseLock(){ if(document.exitPointerLock) document.exitPointerLock(); },
      get locked(){ return locked; },
      keys: keys,

      setPosition(x, y, dirX, dirY){
        player.x = x; player.y = y;
        if(dirX !== undefined){
          var len = Math.hypot(dirX, dirY) || 1;
          player.dirX = dirX / len; player.dirY = dirY / len;
          player.planeX = -player.dirY * player.fov;
          player.planeY = player.dirX * player.fov;
        }
      },
      setPitch(p){ player.pitch = K.U.clamp(p, -0.55, 0.55); },
      setFog(o){
        if(o.color) fog.color = o.color;
        if(o.near != null) fog.near = o.near;
        if(o.far != null) fog.far = o.far;
        if(o.strength != null) fog.strength = o.strength;
      },
      setLight(o){
        if(o.on != null) light.on = o.on;
        if(o.radius != null) light.radius = o.radius;
        if(o.ambient != null) light.ambient = o.ambient;
        if(o.color) light.color = o.color;
      },
      setAmbientColors(floorRGB, ceilRGB){
        if(floorRGB) world.floorColor = floorRGB;
        if(ceilRGB) world.ceilColor = ceilRGB;
      },
      setSpeed(v){ speed = v; },
      setFreeze(v){ opts.freeze = v; },

      /* ── 精灵 ── */
      addSprite(def){
        var tex = null;
        var sp = {
          x: def.x, y: def.y,
          scale: def.scale || 1,
          aspect: def.aspect || 1,
          vOffset: def.vOffset || 0,
          hint: def.hint || null,
          reach: def.reach || 1.9,
          noInteract: !!def.noInteract,
          hidden: !!def.hidden,
          tag: def.tag || null,
          data: def.data || null,
          _tex: null,
          sample: def.sample || null
        };
        if(def.draw && !sp.sample){
          /* 用离屏 canvas 预渲染精灵图 */
          var S = def.texSize || 128;
          var c = document.createElement('canvas');
          c.width = S; c.height = S;
          var cc = c.getContext('2d');
          def.draw(cc, S);
          sp._tex = cc.getImageData(0, 0, S, S).data;
          sp._texSize = S;
          sp.sample = function(tu, tv, shade, dist){
            tu = K.U.clamp(tu | 0, 0, S - 1);
            tv = K.U.clamp(tv | 0, 0, S - 1);
            var i = (tv * S + tu) * 4;
            var a = sp._tex[i + 3];
            if(a < 12) return null;
            var r = sp._tex[i] * shade, g = sp._tex[i+1] * shade, b = sp._tex[i+2] * shade;
            return packRGB(K.U.clamp(r,0,255)|0, K.U.clamp(g,0,255)|0, K.U.clamp(b,0,255)|0);
          };
        }
        sprites.push(sp);
        return sp;
      },
      removeSprite(sp){
        var i = sprites.indexOf(sp);
        if(i >= 0) sprites.splice(i, 1);
      },
      clearSprites(){ sprites = []; },
      get sprites(){ return sprites; },
      pickSprite: pickSprite,

      setHint(t){
        if(!hintEl) return;
        if(t){ hintEl.textContent = t; hintEl.classList.remove('hidden'); }
        else hintEl.classList.add('hidden');
      },

      start(){
        if(running) return;
        running = true;
        last = performance.now();
        rafStop = requestAnimationFrame(loop);
      },
      stop(){
        running = false;
        if(rafStop) cancelAnimationFrame(rafStop);
        rafStop = null;
      },
      destroy(){
        api.stop();
        api.releaseLock();
        window.removeEventListener('resize', resize);
        window.removeEventListener('keydown', kd);
        window.removeEventListener('keyup', ku);
        document.removeEventListener('mousemove', onMouseMove);
        cv.remove();
        if(hintEl) hintEl.remove();
      }
    };

    return api;
  },

  /* ══════════════════════════════════════════
     常用地图生成
     ══════════════════════════════════════════ */

  /* 地牢迷宫（捉迷藏） */
  dungeon(w, h, seed){
    w = w || 21; h = h || 21;
    var g = [];
    for(var y = 0; y < h; y++){
      var row = [];
      for(var x = 0; x < w; x++){
        row.push((x === 0 || y === 0 || x === w - 1 || y === h - 1) ? 1 : 0);
      }
      g.push(row);
    }
    /* 柱子 / 隔墙 */
    var rnd = K.U.rand;
    for(var i = 0; i < Math.floor(w * h * 0.16); i++){
      var px = 2 + Math.floor(rnd(0, w - 4));
      var py = 2 + Math.floor(rnd(0, h - 4));
      if(g[py][px] === 0) g[py][px] = 2;
    }
    /* 一些长墙 */
    for(var k = 0; k < 8; k++){
      var sx = 1 + Math.floor(rnd(0, w - 2));
      var sy = 1 + Math.floor(rnd(0, h - 2));
      var len = 2 + Math.floor(rnd(0, 6));
      var horiz = rnd(0, 1) < 0.5;
      for(var j = 0; j < len; j++){
        var cx = sx + (horiz ? j : 0);
        var cy = sy + (horiz ? 0 : j);
        if(cx > 0 && cy > 0 && cx < w - 1 && cy < h - 1) g[cy][cx] = 1;
      }
    }
    /* 保证起点周围通畅 */
    g[1][1] = 0; g[1][2] = 0; g[2][1] = 0;
    return g;
  },

  /* 卧室（黑暗屋） */
  bedroom(){
    return [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,3,3,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,3,3,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,2,1,1,1,1,1,1,1]
    ];
  },

  /* 嘉年华（Your World） */
  carnival(){
    var w = 31, h = 31;
    var g = [];
    for(var y = 0; y < h; y++){
      var row = [];
      for(var x = 0; x < w; x++){
        var edge = (x === 0 || y === 0 || x === w - 1 || y === h - 1);
        row.push(edge ? 1 : 0);
      }
      g.push(row);
    }
    /* 摊位 */
    var stalls = [[6,6],[14,5],[22,7],[7,15],[23,16],[13,24],[20,23]];
    stalls.forEach(function(s){
      for(var dy = 0; dy < 2; dy++){
        for(var dx = 0; dx < 3; dx++){
          if(g[s[1]+dy] && g[s[1]+dy][s[0]+dx] !== undefined) g[s[1]+dy][s[0]+dx] = 2;
        }
      }
    });
    return g;
  },

  /* 雪林 / 森林（结局世界） */
  forestWorld(kind){
    var w = 41, h = 41;
    var g = [];
    for(var y = 0; y < h; y++){
      var row = [];
      for(var x = 0; x < w; x++){
        row.push(0);
      }
      g.push(row);
    }
    /* 树（不可穿） */
    for(var i = 0; i < 300; i++){
      var tx = 2 + Math.floor(K.U.rand(0, w - 4));
      var ty = 2 + Math.floor(K.U.rand(0, h - 4));
      if(g[ty][tx] === 0 && (Math.abs(tx - 20) > 3 || Math.abs(ty - 30) > 3)){
        g[ty][tx] = 1;
      }
    }
    /* 外围 */
    for(var e = 0; e < w; e++){ g[0][e] = 2; g[h-1][e] = 2; }
    for(var e2 = 0; e2 < h; e2++){ g[e2][0] = 2; g[e2][w-1] = 2; }
    return g;
  },

  /* 室内（个性化房子） */
  houseInterior(){
    return [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,4,4,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,4,4,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,3,3,3,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,3,3,3,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,5,5,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,5,5,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1]
    ];
  }
};
