/* ============================================================
   make-media.js — 生成 VibeHub 商店素材（封面 + 6 张截图）
   直接截图真实运行中的游戏，不用任何手绘/外部素材。
   用法： node _tools/make-media.js
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp.js');

const ROOT = path.resolve(__dirname, '..');
const GAME = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const OUT = path.join(ROOT, 'dist', 'media');

const COVER_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1280px;height:720px;overflow:hidden;background:#07070b;
    font-family:"Segoe UI","Microsoft YaHei",sans-serif}
  .bg{position:absolute;inset:0;
    background:
      radial-gradient(ellipse 70% 60% at 24% 26%, rgba(249,194,220,.20), rgba(0,0,0,0) 62%),
      radial-gradient(ellipse 60% 50% at 82% 78%, rgba(216,27,122,.20), rgba(0,0,0,0) 62%),
      linear-gradient(160deg,#12121c 0%,#0a0a10 55%,#050508 100%);}
  .grid{position:absolute;inset:0;opacity:.16;
    background-image:linear-gradient(rgba(249,194,220,.28) 1px,transparent 1px),
                     linear-gradient(90deg,rgba(249,194,220,.28) 1px,transparent 1px);
    background-size:52px 52px;
    -webkit-mask-image:radial-gradient(ellipse 62% 62% at 50% 50%,#000 20%,transparent 78%);
            mask-image:radial-gradient(ellipse 62% 62% at 50% 50%,#000 20%,transparent 78%);}
  .scan{position:absolute;inset:0;pointer-events:none;
    background:repeating-linear-gradient(180deg,rgba(0,0,0,.30) 0 1px,rgba(0,0,0,0) 1px 3px);}
  .vig{position:absolute;inset:0;
    background:radial-gradient(ellipse 86% 82% at 50% 50%,rgba(0,0,0,0) 52%,rgba(0,0,0,.72) 100%);}
  .left{position:absolute;left:78px;top:0;height:100%;width:600px;
    display:flex;flex-direction:column;justify-content:center;gap:18px;z-index:5}
  .kicker{font-size:14px;letter-spacing:.42em;color:#e07aa8;text-transform:uppercase}
  h1{font-size:92px;line-height:.94;color:#fff;letter-spacing:-.02em;
    text-shadow:0 0 44px rgba(249,194,220,.55),0 6px 0 #8a1050}
  h1 b{color:#f9c2dc}
  .sub{font-size:21px;color:#c9b6c4;line-height:1.62;max-width:520px}
  .sub em{color:#ff6b6b;font-style:normal}
  .tags{display:flex;gap:9px;margin-top:6px;flex-wrap:wrap}
  .tags span{font-size:12.5px;color:#f9c2dc;border:1px solid rgba(249,194,220,.42);
    border-radius:20px;padding:5px 14px;background:rgba(249,194,220,.07)}
  .kinito{position:absolute;right:88px;bottom:0;width:410px;z-index:4;
    filter:drop-shadow(0 24px 60px rgba(0,0,0,.8))}
  .kinito svg{width:100%;height:auto;display:block;overflow:visible}
  .glow{position:absolute;right:120px;bottom:120px;width:460px;height:460px;z-index:3;
    background:radial-gradient(circle,rgba(249,194,220,.30),rgba(249,194,220,0) 68%)}
  .err{position:absolute;right:74px;top:70px;z-index:6;width:330px;
    background:#f0f0f0;border:2px solid #8b0f16;border-radius:5px;overflow:hidden;
    box-shadow:0 18px 50px rgba(0,0,0,.75);transform:rotate(1.6deg)}
  .err .t{background:linear-gradient(180deg,#b81c24,#7a0f16);color:#fff;
    padding:8px 12px;font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px}
  .err .t svg{width:15px;height:15px;flex:0 0 15px}
  .err .b{padding:15px 17px;font-size:14px;color:#2a1010;line-height:1.6;
    display:flex;gap:12px;align-items:center}
  .err .b svg{width:26px;height:26px;flex:0 0 26px}
</style></head><body>
  <div class="bg"></div><div class="grid"></div>
  <div class="glow"></div>
  <div class="left">
    <div class="kicker">Psychological Horror · Desktop Pet</div>
    <h1>Kinito<b>PET</b></h1>
    <div class="sub">他是你的桌面伙伴。<br>他会记住你告诉他的每一件事。<br><em>每一件。</em></div>
    <div class="tags"><span>心理恐怖</span><span>模拟</span><span>Meta</span><span>多结局</span><span>1:1 复刻</span></div>
  </div>
  <div class="err">
    <div class="t" id="errT">KinitoOS — 致命错误</div>
    <div class="b"><span id="errI"></span><div>I am inside.</div></div>
  </div>
  <div class="kinito" id="kinito"></div>
  <div class="scan"></div><div class="vig"></div>
  <script src="../js/00-core.js"></script>
  <script src="../js/00b-svg.js"></script>
  <script>
    var WARN = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M12 2 L23 21 L1 21 Z" fill="#ffd166" stroke="#8a5a00" stroke-width="1.4" ' +
      'stroke-linejoin="round"/>' +
      '<rect x="11" y="9" width="2.2" height="7" rx="1.1" fill="#3a2600"/>' +
      '<circle cx="12.1" cy="18.4" r="1.3" fill="#3a2600"/></svg>';
    document.getElementById('errT').insertAdjacentHTML('afterbegin', WARN);
    document.getElementById('errI').innerHTML = WARN;
    document.getElementById('kinito').innerHTML = K.SVG.kinito({ surfboard: false });
  </script>
</body></html>`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  /* ── 1. 封面 ── */
  const coverFile = path.join(ROOT, '_tools', 'cover.html');
  fs.writeFileSync(coverFile, COVER_HTML, 'utf8');

  let h = await launch({
    url: 'file:///' + coverFile.replace(/\\/g, '/'),
    windowSize: '1280,720', port: 9421
  });
  await sleep(1600);
  await h.cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 720, deviceScaleFactor: 1, mobile: false
  });
  await sleep(600);
  await h.cdp.shot(path.join(OUT, 'cover.png'));
  h.close();
  console.log('封面 → dist/media/cover.png');

  /* ── 2. 游戏内截图 ── */
  const shots = [
    {
      name: 'shot-1-desktop.png',
      setup: `(function(){
        K.Layers.only('os'); K.Desktop.mount(); K.Desktop.ensureControlMeter();
        K.State.userName = 'Player'; K.State.addControl(42);
        K.Kinito.spawn({ x: Math.round(K.Screen.w*0.58), grabbable: true });
        K.Kinito.setWidth(210, true);
        K.Kinito.say('你好呀！我是 Kinito。\\n\\n从今天开始，我们就是最好的朋友了。',
                     { voice: false, hold: false });
        return true;
      })()`, wait: 2200
    },
    {
      name: 'shot-2-webworld.png',
      setup: `(function(){
        K.WM.closeAll();
        K.Kinito.despawn(true);
        K.State.setFlag('didSam'); K.State.setFlag('didJade');
        K.State.favColorHex = '#f9c2dc';
        K.Apps.browser('kinitopet.com/webworld');
        return true;
      })()`, wait: 1500
    },
    {
      name: 'shot-3-readyrepair.png',
      setup: `(function(){
        K.WM.closeAll();
        K.Game.readyRepair({ onDone: function(){} });
        return true;
      })()`, wait: 1600
    },
    {
      name: 'shot-4-factory.png',
      setup: `(function(){
        K.WM.closeAll();
        K.Game.factoryFrenzy({ onDone: function(){} });
        return true;
      })()`, wait: 1800
    },
    {
      name: 'shot-5-analysis.png',
      setup: `(function(){
        K.WM.closeAll();
        K.Game.analysisHub({ questions: K.Script.hubQuestions(), onDone: function(){} });
        return true;
      })()`, wait: 1600
    },
    {
      name: 'shot-6-3d.png',
      setup: `(function(){
        K.WM.closeAll();
        K.Layers.only('stage');
        var st = document.getElementById('stage-layer');
        st.innerHTML = '';
        var box = document.createElement('div');
        box.className = 'stage3d';
        st.appendChild(box);
        box.appendChild(K.U.el('div',{class:'s3d-vignette'}));
        var rc = K.RC.create(box, { resolution: 2.6, hint: '', crosshair: false });
        rc.setMap(K.RC.dungeon(23,23), ['brick','bloodwall','concrete','wood']);
        rc.setPosition(3.5, 3.5, 0.7, 0.7);
        rc.setFog({ far: 9, strength: 1 });
        rc.setLight({ on: true, radius: 7.5, ambient: 0.2, color: [255,200,140] });
        rc.addSprite({ x: 7.5, y: 5.5, scale: 1.3, aspect: 0.62, vOffset: -0.1,
          noInteract: true, texSize: 160,
          draw: function(cc, S){ K.Sprite.kinito(cc, S,
            { mouth: true, glowingEyes: true, dark: true }); } });
        rc.start();
        window.__coverRc = rc;
        return true;
      })()`, wait: 1800
    }
  ];

  h = await launch({ url: GAME, windowSize: '1440,900', port: 9422 });
  const cdp = h.cdp;
  await sleep(1500);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 810, deviceScaleFactor: 1, mobile: false
  });
  await sleep(500);
  /* 跳过 CRT 开机 */
  await cdp.ev(`(function(){
    K.Layers.only('os'); K.Desktop.mount(); K.Desktop.ensureControlMeter();
    var b = document.getElementById('boot-layer'); if (b) b.classList.add('hidden');
    return true;
  })()`);

  for (const s of shots) {
    try {
      await cdp.ev(s.setup);
      await sleep(s.wait);
      await cdp.shot(path.join(OUT, s.name));
      console.log('截图 → dist/media/' + s.name);
    } catch (e) {
      console.log('[跳过] ' + s.name + ' : ' + e.message.slice(0, 140));
    }
  }

  h.close();
  fs.rmSync(coverFile, { force: true });

  console.log('\n产物：');
  fs.readdirSync(OUT).forEach(f => {
    const sz = fs.statSync(path.join(OUT, f)).size;
    console.log('  ' + f + '  ' + Math.round(sz / 1024) + ' KB');
  });
})().catch(e => { console.error(e); process.exitCode = 1; });
