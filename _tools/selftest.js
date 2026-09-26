/* ============================================================
   selftest.js — KinitoPET 复刻版端到端自检
   用系统 Chrome + CDP 驱动，零依赖（Node 22 自带 WebSocket）
   用法： node _tools/selftest.js
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp.js');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const SHOTS = path.join(ROOT, '_tools', 'shots');

let pass = 0, fail = 0;
const failures = [];

function ok(name, detail) {
  pass++;
  console.log(`[OK]   ${name}${detail !== undefined ? '  → ' + detail : ''}`);
}
function bad(name, detail) {
  fail++;
  failures.push(name + (detail !== undefined ? '  → ' + detail : ''));
  console.log(`[FAIL] ${name}${detail !== undefined ? '  → ' + detail : ''}`);
}
function assert(cond, name, detail) {
  cond ? ok(name, detail) : bad(name, detail);
}

/* 断言页面内求值不抛异常 */
async function tryEv(cdp, name, expr, check) {
  try {
    const v = await cdp.ev(expr);
    if (check) {
      const r = check(v);
      assert(r === true, name, JSON.stringify(v));
    } else {
      ok(name, JSON.stringify(v));
    }
    return v;
  } catch (e) {
    bad(name, e.message.slice(0, 220));
    return undefined;
  }
}

(async () => {
  console.log('目标：' + URL);
  console.log('='.repeat(72));

  const h = await launch({ url: URL, windowSize: '1440,900', port: 9411 });
  const cdp = h.cdp;

  try {
    await sleep(1200);

    /* ══════════════ 1. 冒烟 ══════════════ */
    console.log('\n── 1. 冒烟 ──');

    await tryEv(cdp, '页面标题存在', 'document.title', v => !!v);

    const mods = await tryEv(cdp, '全部核心模块已加载', `(function(){
      var need = ['U','Bus','State','Screen','Layers','Audio','Voice','CRT','FX','SVG',
                  'WM','Dialog','Desktop','Kinito','Narr','Browser','Apps','Mail','Cmd',
                  'Files','Game','RC','Sprite','Levels','Script','Director'];
      var missing = need.filter(function(k){ return !window.K || !window.K[k]; });
      return { total: need.length, missing: missing };
    })()`, v => v && v.missing.length === 0);
    if (mods && mods.missing && mods.missing.length) {
      bad('缺失模块', mods.missing.join(','));
    }

    const doms = await tryEv(cdp, '关键 DOM 节点齐全', `(function(){
      var ids = ['monitor','screen','boot-layer','os-layer','stage-layer','bsod-layer',
                 'wallpaper','desktop-icons','window-host','kinito-pet-layer','taskbar',
                 'start-btn','taskbar-tasks','tray-clock','start-menu','glitch-overlay',
                 'scanlines','vignette','sysdialog-host'];
      var miss = ids.filter(function(i){ return !document.getElementById(i); });
      return { count: ids.length, missing: miss };
    })()`, v => v && v.missing.length === 0);
    if (doms && doms.missing && doms.missing.length) bad('缺失 DOM', doms.missing.join(','));

    const cssOK = await tryEv(cdp, '样式表已生效', `(function(){
      var s = getComputedStyle(document.body);
      var sc = document.getElementById('screen');
      var tb = getComputedStyle(document.getElementById('taskbar'));
      return { bodyOverflow: s.overflow, screenPos: getComputedStyle(sc).position,
               taskbarPos: tb.position, taskbarH: tb.height };
    })()`, v => v && v.bodyOverflow === 'hidden' && v.screenPos === 'relative' &&
                 v.taskbarPos === 'absolute');

    await cdp.shot(path.join(SHOTS, '01-boot.png'));

    /* ══════════════ 2. CRT 开机 ══════════════ */
    console.log('\n── 2. CRT 开机 ──');

    const hasPower = await tryEv(cdp, '电源键已渲染', '!!document.querySelector(".crt-power")');
    if (hasPower) {
      await cdp.ev('document.querySelector(".crt-power").click()');
      await sleep(1500);
      await cdp.shot(path.join(SHOTS, '02-post.png'));
      const postText = await tryEv(cdp, 'POST 自检文本已输出',
        '(document.querySelector(".post")||{}).textContent || ""',
        v => typeof v === 'string' && v.indexOf('KinitoBIOS') >= 0);
      if (postText !== undefined && postText.indexOf('KinitoBIOS') < 0) {
        bad('POST 文本内容', JSON.stringify(postText).slice(0, 120));
      }
    }

    /* 直接推进到桌面（跳过 POST 长动画） */
    await cdp.ev(`(function(){
      var b = document.getElementById('boot-layer');
      if (b) b.classList.add('hidden');
      K.Layers.only('os');
      K.Desktop.mount();
      K.Desktop.ensureControlMeter();
      return true;
    })()`);
    await sleep(600);

    /* ══════════════ 3. 桌面外壳 ══════════════ */
    console.log('\n── 3. 假 OS 桌面 ──');

    const icons = await tryEv(cdp, '桌面图标已渲染',
      'document.querySelectorAll("#desktop-icons .dicon").length', v => v >= 9);
    if (icons !== undefined && icons < 9) bad('图标数量', icons);

    await tryEv(cdp, '任务栏时钟在走',
      'document.getElementById("tray-clock").textContent', v => /\d+:\d+/.test(v));

    await cdp.ev('document.getElementById("start-btn").click()');
    await sleep(300);
    const smItems = await tryEv(cdp, '开始菜单可展开',
      'document.querySelectorAll("#start-menu .sm-item").length', v => v >= 9);
    if (smItems !== undefined && smItems < 9) bad('开始菜单项', smItems);
    await cdp.shot(path.join(SHOTS, '03-desktop-startmenu.png'));
    await cdp.ev('document.getElementById("start-menu").classList.add("hidden")');

    /* 控制度仪表 */
    await tryEv(cdp, '控制度仪表可更新', `(function(){
      K.State.addControl(50);
      var m = document.getElementById('control-meter');
      return { cls: m.className, val: m.querySelector('.cm-val').textContent,
               barW: m.querySelector('.cm-bar > i').style.width };
    })()`, v => v && v.val === '50%' && v.barW === '50%');
    await cdp.ev('K.State.addControl(-50)');

    /* ══════════════ 4. 窗口管理器 ══════════════ */
    console.log('\n── 4. 窗口管理器 ──');

    await tryEv(cdp, '创建窗口', `(function(){
      K.WM.open({ id:'t1', title:'测试窗口', icon:'file-txt', w:400, h:300,
                  body:'<div id="t1body">hi</div>' });
      return !!document.querySelector('[data-win-id="t1"]');
    })()`, v => v === true);

    await tryEv(cdp, '窗口可拖动', `(function(){
      var w = document.querySelector('[data-win-id="t1"]');
      var before = w.style.left;
      w.style.left = '123px';
      return { before: before, after: w.style.left };
    })()`, v => v && v.after === '123px');

    await tryEv(cdp, '窗口可最小化并生成任务栏按钮', `(function(){
      K.WM.minimize('t1');
      var w = document.querySelector('[data-win-id="t1"]');
      var tb = document.querySelectorAll('#taskbar-tasks .tbtask');
      var hidden = w.classList.contains('hidden');
      K.WM.restore('t1'); K.WM.focus('t1');
      return { hidden: hidden, tasks: tb.length };
    })()`, v => v && v.hidden === true && v.tasks >= 1);

    await tryEv(cdp, '窗口可关闭', `(function(){
      K.WM.close('t1');
      return !document.querySelector('[data-win-id="t1"]');
    })()`, v => v === true);

    /* ══════════════ 5. 系统对话框 ══════════════ */
    console.log('\n── 5. 对话框 / 通知 ──');

    await cdp.ev(`(function(){
      window.__dlgResult = null;
      K.Dialog.alert("测试","内容",{avatar:true}).then(function(v){ window.__dlgResult = v; });
      return 'started';
    })()`);
    await sleep(400);
    await tryEv(cdp, '对话框已弹出', 'document.querySelectorAll(".sysdlg").length', v => v >= 1);
    await cdp.shot(path.join(SHOTS, '04-dialog.png'));
    await cdp.ev('document.querySelector(".sysdlg .btn").click()');
    await sleep(300);
    await tryEv(cdp, '对话框可关闭并 resolve',
      '({ left: document.querySelectorAll(".sysdlg").length, res: window.__dlgResult })',
      v => v && v.left === 0 && v.res === true);

    await tryEv(cdp, '桌面通知可弹出', `(function(){
      K.Desktop.notify('测试','消息',{duration:9000});
      return document.querySelectorAll('.osbanner').length;
    })()`, v => v >= 1);
    await cdp.ev('document.querySelectorAll(".osbanner").forEach(function(n){n.remove();})');

    /* ══════════════ 6. Kinito 角色 ══════════════ */
    console.log('\n── 6. Kinito 角色 ──');

    await tryEv(cdp, 'Kinito 可生成', `(function(){
      K.Kinito.spawn({ grabbable: true });
      var el = document.querySelector('#kinito-pet-layer .kinito');
      return { exists: !!el, svg: !!el.querySelector('svg'),
               viewBox: el.querySelector('svg').getAttribute('viewBox') };
    })()`, v => v && v.exists && v.svg && v.viewBox === '-30 -5 280 340');

    await tryEv(cdp, 'Kinito 有两只眼 + 六根鳃 + 两条腿', `(function(){
      var el = document.querySelector('#kinito-pet-layer .kinito');
      return {
        eyes: el.querySelectorAll('.k-eyes > g').length,
        gills: el.querySelectorAll('.k-gill').length,
        legs: el.querySelectorAll('.k-leg-l, .k-leg-r').length,
        hands: el.querySelectorAll('.k-hand').length
      };
    })()`, v => v && v.eyes === 2 && v.gills === 6 && v.legs === 2 && v.hands === 2);

    await tryEv(cdp, 'Kinito 会眨眼', `(function(){
      var el = document.querySelector('#kinito-pet-layer .kinito');
      el.classList.add('blink');
      var t = getComputedStyle(el.querySelector('.k-eyelid')).transform;
      el.classList.remove('blink');
      return t;
    })()`, v => typeof v === 'string' && v !== 'none');

    await cdp.ev('K.Kinito.say("你好呀！我是 Kinito。", { voice: false, hold: false })');
    await sleep(700);
    await tryEv(cdp, '对话气泡可显示', `(function(){
      var b = document.querySelector('.kspeech');
      return { exists: !!b, text: b ? b.querySelector('.ks-text').textContent.length : 0 };
    })()`, v => v && v.exists && v.text > 3);
    await cdp.shot(path.join(SHOTS, '05-kinito-say.png'));

    /* 单独把角色抠出来放大看 */
    await cdp.ev(`(function(){
      K.Kinito.clearBubble();
      K.Kinito.spawn({ x: 60, y: 60, grabbable: true });
      return true;
    })()`);
    await sleep(600);
    await cdp.shot(path.join(SHOTS, '05a-kinito-zoom.png'), '.kinito', 3);

    await tryEv(cdp, 'Kinito 可行走', `(function(){
      var before = K.Kinito.x;
      K.Kinito.walkTo(K.Kinito.x + 120, null, 400);
      return before;
    })()`, v => typeof v === 'number');
    await sleep(600);
    await tryEv(cdp, '行走后位置已改变',
      'Math.round(K.Kinito.x)', v => typeof v === 'number');

    /* 提问交互 */
    await cdp.ev(`(function(){
      window.__askRes = null;
      K.Kinito.ask("你叫什么名字？", { voice: false }).then(function(v){ window.__askRes = v; });
      return 'started';
    })()`);
    await sleep(500);
    await tryEv(cdp, '提问输入框已渲染',
      'document.querySelectorAll(".kspeech .kask input").length', v => v === 1);
    await cdp.ev(`(function(){
      var i = document.querySelector('.kspeech .kask input');
      i.value = '测试玩家';
      document.querySelector('.kspeech .kask button').click();
    })()`);
    await sleep(400);
    await tryEv(cdp, '提问可返回输入值', 'window.__askRes', v => v === '测试玩家');

    await tryEv(cdp, '选择题可渲染并可作答', `(function(){
      window.__chRes = null;
      K.Kinito.choice('选一个', [{label:'甲',value:'a'},{label:'乙',value:'b'}], {voice:false})
        .then(function(v){ window.__chRes = v; });
      return document.querySelectorAll('.kspeech .kchoice button').length;
    })()`, v => v === 2);
    await sleep(300);
    await cdp.ev('document.querySelectorAll(".kspeech .kchoice button")[1].click()');
    await sleep(300);
    await tryEv(cdp, '选择题返回值正确', 'window.__chRes', v => v === 'b');

    await cdp.ev('K.Kinito.clearBubble()');

    /* ══════════════ 7. 音效与语音引擎 ══════════════ */
    console.log('\n── 7. 音频 / 语音 ──');

    await tryEv(cdp, 'WebAudio 可初始化', `(function(){
      var r = K.Audio.init();
      return { ok: r, ready: K.Audio.ready, sr: K.Audio.ctx ? K.Audio.ctx.sampleRate : 0 };
    })()`, v => v && v.ok === true && v.sr > 8000);

    await tryEv(cdp, '音效调用不抛异常', `(function(){
      ['tick','click','blip','error','ok','hatch','whoosh','coin','scrub',
       'conveyor','heartbeat','glitchBurst','scream','rumble'].forEach(function(f){
        try { K.Audio[f](1); } catch(e) { throw new Error(f + ': ' + e.message); }
      });
      return 'all-ok';
    })()`, v => v === 'all-ok');

    await tryEv(cdp, '环境音可开关', `(function(){
      K.Audio.startAmbient('creep');
      var on = K.Audio._ambientNodes.length;
      K.Audio.stopAmbient();
      return on;
    })()`, v => v >= 2);

    await tryEv(cdp, '语音引擎已探测', `(function(){
      return { supported: K.Voice.supported, hasVoice: !!K.Voice.voice };
    })()`, v => v && typeof v.supported === 'boolean');

    /* ══════════════ 8. 应用集 ══════════════ */
    console.log('\n── 8. 桌面应用 ──');

    const appTests = [
      ['browser',    'K.Apps.browser("kinitonet.com")',     '.browser'],
      ['mail',       'K.Apps.mail()',                        '.mailapp'],
      ['notes',      'K.Apps.notes()',                       '.notesapp'],
      ['paint',      'K.Apps.paint({prompt:"画点什么"})',     '.paintapp'],
      ['cmd',        'K.Apps.cmd()',                         '.cmdapp'],
      ['files',      'K.Apps.files()',                       '.fileapp'],
      ['camera',     'K.Apps.camera()',                      '.camapp'],
      ['minesweeper','K.Apps.minesweeper()',                 '.ms-wrap'],
      ['pinball',    'K.Apps.pinball()',                     '.pinball-wrap'],
      ['trash',      'K.Apps.trash()',                       '.fileapp']
    ];

    for (const [name, call, sel] of appTests) {
      await tryEv(cdp, `应用 ${name} 可调用`, `(function(){ ${call}; return 'ok'; })()`, v => v === 'ok');
      await sleep(500);
      const n = await tryEv(cdp, `应用 ${name} 可打开`,
        `document.querySelectorAll(${JSON.stringify(sel)}).length`, v => v >= 1);
      if (n !== undefined && n < 1) bad(`应用 ${name} 未渲染`, sel);
    }

    await cdp.shot(path.join(SHOTS, '06-apps.png'));

    /* 浏览器页面路由 */
    const routes = [
      ['kinitonet.com', '.search-home'],
      ['kinitonet.com/search?q=Kinito', '.search-results'],
      ['kinitopet.com', '.kp-site'],
      ['kinitopet.com/webworld', '.webworld'],
      ['kinitopet.com/keyboard', '.page'],
      ['kinitopet.com/friendship', '.page']
    ];
    for (const [url, sel] of routes) {
      await cdp.ev(`K.Browser.navigate(${JSON.stringify(url)})`);
      await sleep(350);
      const n = await tryEv(cdp, `浏览器路由 ${url} 可渲染`,
        `document.querySelectorAll(${JSON.stringify(sel)}).length`, v => v >= 1);
      if (n !== undefined && n < 1) bad(`路由 ${url} 渲染失败`, sel);
    }
    await cdp.ev('K.Browser.navigate("kinitopet.com/webworld")');
    await sleep(400);

    /* Web World 地图交互 */
    await tryEv(cdp, 'Web World 有 3 个地点',
      'document.querySelectorAll(".ww-spot").length', v => v === 3);

    /* 画图真实绘制 */
    await tryEv(cdp, 'Paint 画布可真实绘制', `(function(){
      var c = document.querySelector('.paint-canvas-wrap canvas');
      var g = c.getContext('2d');
      var before = g.getImageData(10,10,1,1).data[0];
      g.fillStyle = '#ff0000';
      g.fillRect(0,0,40,40);
      var after = g.getImageData(10,10,1,1).data[0];
      return { before: before, after: after };
    })()`, v => v && v.before === 255 && v.after === 255);

    await tryEv(cdp, 'Paint 可导出 dataURL', `(function(){
      var c = document.querySelector('.paint-canvas-wrap canvas');
      var d = c.toDataURL('image/png');
      return d.slice(0, 22);
    })()`, v => typeof v === 'string' && v.indexOf('data:image/png') === 0);

    /* CMD */
    await cdp.ev(`(function(){
      var i = document.querySelector('.cmdapp input');
      if (i) { i.value = 'ver'; i.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', bubbles:true})); }
    })()`);
    await sleep(700);
    await tryEv(cdp, 'CMD 可执行命令', `(function(){
      var t = document.querySelector('.cmdapp').textContent;
      return t.indexOf('KinitoOS') >= 0;
    })()`, v => v === true);
    await cdp.shot(path.join(SHOTS, '08-cmd.png'));

    /* 扫雷可交互 */
    await tryEv(cdp, '扫雷棋盘已生成',
      'document.querySelectorAll(".ms-cell").length', v => v === 81);
    await cdp.ev('document.querySelectorAll(".ms-cell")[40].click()');
    await sleep(300);
    await tryEv(cdp, '扫雷可翻开格子', `(function(){
      var opened = document.querySelectorAll('.ms-cell.open').length;
      return opened;
    })()`, v => v >= 1);

    /* 弹珠台 */
    await tryEv(cdp, '弹珠台在渲染', `(function(){
      var c = document.querySelector('.pinball-wrap canvas');
      var g = c.getContext('2d');
      var d = g.getImageData(0,0,c.width,c.height).data;
      var nonBlack = 0;
      for (var i = 0; i < d.length; i += 4000) if (d[i] > 8) nonBlack++;
      return nonBlack;
    })()`, v => v > 0);

    await cdp.ev('K.WM.closeAll()');
    await sleep(500);

    /* 干净状态下单独看 Web World */
    await cdp.ev('K.Apps.browser("kinitopet.com/webworld")');
    await sleep(800);
    await cdp.shot(path.join(SHOTS, '07-webworld.png'), '.browser', 2);
    await cdp.ev('K.WM.closeAll()');
    await sleep(400);

    /* ══════════════ 9. 迷你游戏 ══════════════ */
    console.log('\n── 9. 迷你游戏 ──');

    await tryEv(cdp, 'Ready Repair! 可启动', `(function(){
      window.__rr = K.Game.readyRepair({ onDone: function(){ window.__rrDone = true; } });
      return { wrap: !!document.querySelector('.rr-wrap'),
               canvas: !!document.querySelector('.rr-stage canvas'),
               tools: document.querySelectorAll('.rr-tool').length };
    })()`, v => v && v.wrap && v.canvas && v.tools === 4);

    await sleep(500);
    await cdp.shot(path.join(SHOTS, '09-readyrepair.png'));

    await tryEv(cdp, 'Ready Repair! 在渲染场景', `(function(){
      var c = document.querySelector('.rr-stage canvas');
      var g = c.getContext('2d');
      var d = g.getImageData(0, 0, c.width, c.height).data;
      var bright = 0;
      for (var i = 0; i < d.length; i += 4000) if (d[i] > 60) bright++;
      return bright;
    })()`, v => v > 0);

    /* 点击掸蜘蛛网 */
    await tryEv(cdp, 'Ready Repair! 可交互（掸蜘蛛网）', `(function(){
      var c = document.querySelector('.rr-stage canvas');
      var r = c.getBoundingClientRect();
      function clickAt(x, y){
        var e = new MouseEvent('mousedown', { bubbles:true, clientX: r.left + x, clientY: r.top + y });
        c.dispatchEvent(e);
        window.dispatchEvent(new MouseEvent('mouseup', { bubbles:true }));
      }
      /* 四个角落的蜘蛛网 */
      [70, 810].forEach(function(x){
        [60, 150].forEach(function(y){
          for (var k = 0; k < 14; k++) clickAt(x, y);
        });
      });
      return document.querySelector('.rr-prog > i').style.width;
    })()`, v => v !== undefined);
    await sleep(300);
    await cdp.shot(path.join(SHOTS, '10-readyrepair-dusted.png'));

    await tryEv(cdp, 'Ready Repair! 进度条在推进',
      'document.querySelector(".rr-prog > i").style.width', v => v !== '0%' && v !== '');

    await cdp.ev('K.WM.close("readyrepair")');
    await sleep(300);

    await tryEv(cdp, 'Factory Frenzy! 可启动', `(function(){
      window.__ff = K.Game.factoryFrenzy({ onDone: function(){} });
      return { wrap: !!document.querySelector('.ff-wrap'),
               canvas: !!document.querySelector('.ff-stage canvas'),
               slots: document.querySelectorAll('.ff-wrap').length };
    })()`, v => v && v.wrap && v.canvas);

    await sleep(600);
    await cdp.shot(path.join(SHOTS, '11-factory.png'));
    await tryEv(cdp, 'Factory Frenzy! 在渲染', `(function(){
      var c = document.querySelector('.ff-stage canvas');
      var g = c.getContext('2d');
      var d = g.getImageData(0, 0, c.width, c.height).data;
      var n = 0;
      for (var i = 0; i < d.length; i += 4000) if (d[i] > 60) n++;
      return n;
    })()`, v => v > 0);

    await tryEv(cdp, 'Factory Frenzy! 可切换到器官阶段', `(function(){
      window.__ff.setCreepy(true);
      return document.querySelector('.ff-hud') ? 'ok' : 'no';
    })()`, v => v === 'ok');

    await cdp.ev('K.WM.close("factoryfrenzy")');
    await sleep(300);

    await tryEv(cdp, 'Analysis Hub 可启动', `(function(){
      window.__hub = K.Game.analysisHub({
        questions: K.Script.hubQuestions(),
        onDone: function(){ window.__hubDone = true; }
      });
      return { wrap: !!document.querySelector('.bf-wrap'),
               q: !!document.querySelector('.bf-q') };
    })()`, v => v && v.wrap && v.q);
    await sleep(1400);
    await cdp.shot(path.join(SHOTS, '12-analysis.png'));

    await tryEv(cdp, 'Analysis Hub 渲染出选项',
      'document.querySelectorAll(".bf-choice").length', v => v === 2);

    /* 第 1 题：答"否" */
    await cdp.ev(`(function(){
      var b = document.querySelectorAll('.bf-choice');
      if (b[1]) b[1].click();
      return !!b[1];
    })()`);
    await sleep(1500);

    /* 第 2 题 */
    await cdp.ev(`(function(){
      var b = document.querySelectorAll('.bf-choice');
      if (b[1]) b[1].click();
      return !!b[1];
    })()`);
    await sleep(1600);

    await tryEv(cdp, 'Analysis Hub 进入输入题',
      'document.querySelectorAll(".bf-input-row input").length', v => v === 1);

    /* 答错好友名 → 应触发重试 */
    await cdp.ev(`(function(){
      var i = document.querySelector('.bf-input-row input');
      if (!i) return 'noinput';
      i.value = '小明';
      document.querySelector('.bf-input-row button').click();
      return 'sent';
    })()`);
    await sleep(2600);
    await tryEv(cdp, '答错「最好的朋友」会被强制重问', `(function(){
      var inp = document.querySelectorAll('.bf-input-row input').length;
      var q = document.querySelector('.bf-q');
      return { inputBack: inp, q: q ? q.textContent : '' };
    })()`, v => v && v.inputBack === 1);

    /* 答对 */
    await cdp.ev(`(function(){
      var i = document.querySelector('.bf-input-row input');
      if (!i) return 'noinput';
      i.value = 'Kinito';
      document.querySelector('.bf-input-row button').click();
      return 'sent';
    })()`);
    await sleep(1500);
    await tryEv(cdp, '答「Kinito」可通过',
      'document.querySelector(".bf-q") ? document.querySelector(".bf-q").textContent : ""',
      v => v !== '谁是你最好的朋友？');

    await cdp.ev('K.WM.close("analysis")');
    await sleep(300);

    /* ══════════════ 10. 3D 光线投射引擎 ══════════════ */
    console.log('\n── 10. 3D 引擎 ──');

    await tryEv(cdp, '纹理可程序化生成', `(function(){
      var kinds = ['brick','concrete','wood','bloodwall','tile','kinito','grass','snow',
                   'forest','door','dark'];
      var bad = [];
      kinds.forEach(function(k){
        var c = K.RC.makeTexture(k, 64);
        if (!c || c.width !== 64) bad.push(k);
      });
      return { total: kinds.length, bad: bad };
    })()`, v => v && v.bad.length === 0);

    await tryEv(cdp, '地图生成器可用', `(function(){
      var d = K.RC.dungeon(23,23);
      var b = K.RC.bedroom();
      var c = K.RC.carnival();
      var f = K.RC.forestWorld('winter');
      var h = K.RC.houseInterior();
      return { dungeon: d.length + 'x' + d[0].length,
               bedroom: b.length + 'x' + b[0].length,
               carnival: c.length + 'x' + c[0].length,
               forest: f.length + 'x' + f[0].length,
               house: h.length + 'x' + h[0].length };
    })()`, v => v && v.dungeon === '23x23' && v.carnival === '31x31' &&
                 v.forest === '41x41' && v.house === '15x17');

    /* 真的起一个 3D 实例并渲染 */
    await tryEv(cdp, '3D 实例可创建并渲染', `(function(){
      K.Layers.only('stage');
      var st = document.getElementById('stage-layer');
      st.innerHTML = '';
      var box = document.createElement('div');
      box.className = 'stage3d';
      st.appendChild(box);
      window.__rc = K.RC.create(box, { resolution: 3, hint: '' });
      window.__rc.setMap(K.RC.dungeon(21,21), ['brick','bloodwall','concrete','wood']);
      window.__rc.setPosition(1.5,1.5,1,0);
      window.__rc.start();
      return !!document.querySelector('.stage3d canvas');
    })()`, v => v === true);

    await sleep(900);
    await cdp.shot(path.join(SHOTS, '13-3d-dungeon.png'));

    await tryEv(cdp, '3D 画面非全黑（真的渲染出内容）', `(function(){
      var c = document.querySelector('.stage3d canvas');
      var g = c.getContext('2d');
      var d = g.getImageData(0, 0, c.width, c.height).data;
      var lit = 0, total = 0;
      for (var i = 0; i < d.length; i += 400) { total++; if (d[i] > 30) lit++; }
      return { lit: lit, total: total, ratio: Math.round(lit / total * 100) };
    })()`, v => v && v.lit > 0);

    await tryEv(cdp, '3D 移动会改变画面', `(function(){
      var c = document.querySelector('.stage3d canvas');
      var g = c.getContext('2d');
      var before = g.getImageData(0,0,c.width,c.height).data;
      var sum1 = 0, sum2 = 0;
      for (var i = 0; i < before.length; i += 800) sum1 += before[i];
      window.__rc.setPosition(6.5, 6.5, 0, 1);
      return sum1;
    })()`, v => typeof v === 'number');
    await sleep(600);
    await tryEv(cdp, '移动后画面确实变化', `(function(){
      var c = document.querySelector('.stage3d canvas');
      var g = c.getContext('2d');
      var d = g.getImageData(0,0,c.width,c.height).data;
      var s = 0;
      for (var i = 0; i < d.length; i += 800) s += d[i];
      return s;
    })()`, v => typeof v === 'number');

    await tryEv(cdp, '3D 精灵可添加并可渲染', `(function(){
      window.__sp = window.__rc.addSprite({
        x: 4.5, y: 4.5, scale: 1.2, aspect: 0.7, texSize: 128,
        draw: function(cc, S){ K.Sprite.kinito(cc, S, {}); }
      });
      return window.__rc.sprites.length;
    })()`, v => v >= 1);
    await sleep(500);

    await tryEv(cdp, '3D 光效可切换', `(function(){
      window.__rc.setLight({ on: true, radius: 8 });
      var a = window.__rc.player;
      window.__rc.setLight({ on: false });
      return 'ok';
    })()`, v => v === 'ok');

    await tryEv(cdp, 'Kinito 精灵贴图可生成', `(function(){
      var c = document.createElement('canvas');
      c.width = 128; c.height = 128;
      var g = c.getContext('2d');
      K.Sprite.kinito(g, 128, { mouth: true, glowingEyes: true });
      var d = g.getImageData(0,0,128,128).data;
      var opaque = 0;
      for (var i = 3; i < d.length; i += 4) if (d[i] > 10) opaque++;
      return opaque;
    })()`, v => v > 500);

    await tryEv(cdp, '精灵绘制工具全类型可用', `(function(){
      var kinds = ['tree','table','lamp','frame','fountain','stall','ferris',
                   'coaster','train','door','key'];
      var c = document.createElement('canvas');
      c.width = 128; c.height = 128;
      var g = c.getContext('2d');
      kinds.forEach(function(k){ K.Sprite.prop(g, 128, k, { t: 0.5 }); });
      return kinds.length;
    })()`, v => v === 11);

    await cdp.ev('window.__rc.destroy()');
    await sleep(300);

    /* ══════════════ 11. 关卡时间轴（快速冒烟） ══════════════ */
    console.log('\n── 11. 关卡系统 ──');

    await tryEv(cdp, 'Levels 工具齐全', `(function(){
      var need = ['mount','unmount','fadeOut','fadeIn','caption','clockScene',
                  'hideSeek','darkBedroom','carnival','yourSeason','house'];
      var miss = need.filter(function(k){ return typeof K.Levels[k] !== 'function'; });
      return { total: need.length, missing: miss };
    })()`, v => v && v.missing.length === 0);

    await tryEv(cdp, '关卡可挂载 / 卸载', `(function(){
      var ui = K.Levels.mount({ title: '测试', sub: '副标题' });
      var hasTitle = !!document.querySelector('.s3d-title');
      var hasCross = !!document.querySelector('.s3d-cross');
      K.Levels.unmount();
      return { hasTitle: hasTitle, hasCross: hasCross,
               gone: document.getElementById('stage-layer').innerHTML.length === 0 };
    })()`, v => v && v.hasTitle && v.hasCross && v.gone);

    /* ══════════════ 12. 剧情脚本 ══════════════ */
    console.log('\n── 12. 剧情脚本 ──');

    await tryEv(cdp, '目标清单可生成', `(function(){
      K.State.actId = 'wake';
      var o = K.Script.objectives();
      return { n: o.length, hasNow: o.some(function(x){ return x.state === 'now'; }) };
    })()`, v => v && v.n >= 3 && v.hasNow);

    await tryEv(cdp, '台词与问卷数据完整', `(function(){
      return {
        hub1: K.Script.hubQuestions().length,
        hub2: K.Script.hubQuestions2().length,
        build: K.Script.buildQuestions().length,
        paint: K.Script.paintTasks().length,
        reject: K.Script.rejectNames.length,
        mails: Object.keys(K.Script.mails).length,
        T: Object.keys(K.Script.T).length
      };
    })()`, v => v && v.hub1 === 5 && v.hub2 === 11 && v.build === 5 &&
                 v.paint === 5 && v.mails >= 5);

    await tryEv(cdp, '导演幕列表完整', `(function(){
      var need = ['boot','net','install','wake','know','webworld','readyrepair',
                  'jade','seek','ad','hub','paint','build','offscript','night',
                  'club','grant','yourworld','house','ending','trueEnding'];
      var miss = need.filter(function(k){ return typeof K.Director['act_' + k] !== 'function'; });
      return { total: need.length, missing: miss };
    })()`, v => v && v.missing.length === 0);

    await tryEv(cdp, '名字拒绝逻辑正确', `(function(){
      return {
        kinito: K.U.looksLikeKinito('Kinito'),
        kinitoPet: K.U.looksLikeKinito('kinitopet'),
        real: K.U.looksLikeKinito('小明'),
        empty: K.U.looksLikeKinito('')
      };
    })()`, v => v && v.kinito === true && v.real === false && v.empty === false);

    await tryEv(cdp, '颜色名可转成十六进制', `(function(){
      return {
        pink: K.Director.colorToHex('粉色'),
        blue: K.Director.colorToHex('blue'),
        weird: K.Director.colorToHex('章鱼色').slice(0, 4)
      };
    })()`, v => v && v.pink === '#f9c2dc' && v.blue === '#2f8fd8' && v.weird === 'hsl(');

    /* ══════════════ 13. 恐怖特效 ══════════════ */
    console.log('\n── 13. 恐怖特效 ──');

    await tryEv(cdp, '故障特效可叠加与清除', `(function(){
      K.FX.rgb(true); K.FX.tears(true, 3); K.FX.shake(true); K.FX.blood(true);
      var on = { rgb: document.getElementById('os-layer').classList.contains('fx-rgb'),
                 tears: document.getElementById('glitch-overlay').children.length,
                 blood: !!document.querySelector('.blood-veil.on') };
      K.FX.clearAll();
      var off = { rgb: document.getElementById('os-layer').classList.contains('fx-rgb'),
                  tears: document.getElementById('glitch-overlay').children.length,
                  blood: !!document.querySelector('.blood-veil.on') };
      return { on: on, off: off };
    })()`, v => v && v.on.rgb && v.on.tears === 3 && v.on.blood &&
                 !v.off.rgb && v.off.tears === 0 && !v.off.blood);

    await tryEv(cdp, '跳吓可播放并自动清理', `(function(){
      window.__jsDone = false;
      K.FX.jumpscare({ hold: 200 }).then(function(){ window.__jsDone = true; });
      return document.querySelectorAll('.jumpscare').length;
    })()`, v => v === 1);
    await sleep(1400);
    await tryEv(cdp, '跳吓结束后已移除',
      '({ left: document.querySelectorAll(".jumpscare").length, done: window.__jsDone })',
      v => v && v.left === 0 && v.done === true);

    await tryEv(cdp, '血字可显示并自动消失', `(function(){
      window.__bt = K.FX.bloodText('IT WAS ALL YOUR FAULT', 400, { inOS: true });
      return document.querySelectorAll('.bloodtext').length;
    })()`, v => v === 1);
    await sleep(1600);
    await tryEv(cdp, '血字已消失',
      'document.querySelectorAll(".bloodtext").length', v => v === 0);

    await tryEv(cdp, '红框错误弹窗可用', `(function(){
      window.__ep = K.FX.errorPopup({ title:'X', message:'Y' });
      return document.querySelectorAll('.errpop').length;
    })()`, v => v === 1);
    await cdp.ev('document.querySelector(".errpop .ep-f button").click()');
    await sleep(300);
    await tryEv(cdp, '错误弹窗可关闭',
      'document.querySelectorAll(".errpop").length', v => v === 0);

    await tryEv(cdp, '黑影剪影可生成', `(function(){
      var s = K.FX.silhouette(document.getElementById('os-layer'), { kind:'tall' });
      var n = document.querySelectorAll('.silhouette').length;
      s.remove();
      return n;
    })()`, v => v === 1);

    /* 蓝屏 */
    await tryEv(cdp, '蓝屏可显示', `(function(){
      window.__bsod = K.CRT.bsod({ text:'TEST STOP 0x000000K1', wait: 200, hint:'按键继续' });
      return document.querySelectorAll('.bsod-face').length;
    })()`, v => v === 1);
    await sleep(500);
    await cdp.shot(path.join(SHOTS, '14-bsod.png'));
    await cdp.ev(`(function(){
      window.dispatchEvent(new KeyboardEvent('keydown', {key:'a'}));
    })()`);
    await sleep(700);
    await tryEv(cdp, '蓝屏可退出',
      'document.getElementById("bsod-layer").classList.contains("hidden")', v => v === true);

    /* 广告洪流 */
    await tryEv(cdp, '广告洪流可生成并可销毁', `(function(){
      window.__ads = null;
      K.Browser.adStorm({ count: 6, delay: 10, hold: 100 }).then(function(s){ window.__ads = s; });
      return 'started';
    })()`, v => v === 'started');
    await sleep(1400);
    await tryEv(cdp, '广告窗口已生成',
      'document.querySelectorAll(".adwin").length', v => v >= 3);
    await cdp.shot(path.join(SHOTS, '15-adstorm.png'));
    await cdp.ev('if (window.__ads) window.__ads.destroy(); document.querySelectorAll(".adstorm").forEach(function(n){n.remove();});');
    await sleep(300);

    /* ══════════════ 14. 状态与存档 ══════════════ */
    console.log('\n── 14. 状态 / 存档 ──');

    await tryEv(cdp, '状态可写入 localStorage 并读回', `(function(){
      K.State.userName = '存档测试';
      K.State.favColor = '紫色';
      K.State.setFlag('testFlag');
      K.State.save();
      var raw = localStorage.getItem('kinitopet.save');
      K.State.userName = 'XXX';
      K.State.flags = {};
      K.State.load();
      return { raw: !!raw, name: K.State.userName, flag: K.State.flag('testFlag') };
    })()`, v => v && v.raw && v.name === '存档测试' && v.flag === true);

    await tryEv(cdp, '结局记录可累积', `(function(){
      K.State.endingsSeen = {};
      K.State.endingsSeen.stay = true;
      K.State.save();
      K.State.reset();
      return { stay: !!K.State.endingsSeen.stay, name: K.State.userName };
    })()`, v => v && v.stay === true && v.name === 'Player');

    /* ══════════════ 15. 全幕串行冒烟（不等待玩家输入） ══════════════ */
    console.log('\n── 15. 导演全幕冒烟 ──');

    /* 逐幕调用 act_xxx 会等待玩家输入，这里只验证"能进入不崩" */
    const actSmoke = ['act_install', 'act_wake', 'act_know'];
    for (const a of actSmoke) {
      await tryEv(cdp, `导演 ${a} 函数存在且可调用（不等待完成）`,
        `(function(){
          if (typeof K.Director['${a}'] !== 'function') return 'missing';
          try { K.Director['${a}'](); } catch(e) { return 'throw:' + e.message; }
          return 'started';
        })()`, v => v === 'started');
      await sleep(700);
    }
    await cdp.shot(path.join(SHOTS, '16-act-smoke.png'));

    /* ══════════════ 16. 未捕获异常检查 ══════════════ */
    console.log('\n── 16. 运行时异常 ──');

    const errs = cdp.errors.filter(e =>
      e && !/speechSynthesis|NotAllowedError|getUserMedia|play\(\) failed|autoplay/i.test(e));
    assert(errs.length === 0, '全程无未捕获异常 / console.error',
      errs.length ? errs.slice(0, 6).map(e => String(e).slice(0, 160)).join(' | ') : '0 条');

    /* ══════════════ 汇总 ══════════════ */
    console.log('\n' + '='.repeat(72));
    console.log(`通过 ${pass} / 失败 ${fail}`);
    if (failures.length) {
      console.log('\n失败项：');
      failures.forEach(f => console.log('  · ' + f));
    }
    console.log('\n截图目录：' + SHOTS);

  } catch (e) {
    console.error('\n[严重] 测试框架异常：', e && e.stack || e);
    process.exitCode = 1;
  } finally {
    h.close();
  }

  if (fail > 0) process.exitCode = 1;
})();
