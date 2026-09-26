/* ============================================================
   flowtest.js — 剧情流程端到端测试
   真的从"按电源键"开始玩，自动帮玩家点击，验证导演层能推进。
   用法： node _tools/flowtest.js
   ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp.js');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
const SHOTS = path.join(ROOT, '_tools', 'shots-flow');

let pass = 0, fail = 0;
const failures = [];
function ok(n, d) { pass++; console.log(`[OK]   ${n}${d !== undefined ? '  → ' + d : ''}`); }
function bad(n, d) { fail++; failures.push(n + ' → ' + d); console.log(`[FAIL] ${n}  → ${d}`); }
function assert(c, n, d) { c ? ok(n, d) : bad(n, d); }

/* 轮询直到条件成立 */
async function until(cdp, label, expr, timeoutMs, tick) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      const v = await cdp.ev(expr);
      if (v) return v;
    } catch (e) { /* 页面可能在跳转，忽略 */ }
    if (tick) { try { await tick(cdp); } catch (e) {} }
    await sleep(400);
  }
  return null;
}

/* 自动帮玩家点击（幂等，多按几次没关系） */
async function autopilot(cdp) {
  await cdp.ev(`(function(){
    /* 1. 桌面图标 */
    var egg = document.querySelector('.dicon.egg');
    var kp = document.querySelector('[data-icon-id="kinitopet"]');
    var net = document.querySelector('[data-icon-id="internet"]');
    var live = [net, kp, egg].filter(Boolean)[0];
    if (live && !live.__clicked) { live.__clicked = true; live.click(); }

    /* 2. 官网下载按钮 */
    var dl = document.querySelector('.kp-dl');
    if (dl && !dl.disabled) dl.click();

    /* 3. Kinito 气泡里的按钮/输入 */
    var bubble = document.querySelector('.kspeech');
    if (bubble) {
      var inp = bubble.querySelector('.kask input');
      var btn = bubble.querySelector('.kask button');
      if (inp && btn && !inp.value) {
        inp.value = ['小明','粉色','星星','飞行','塞尔达','拉面'][
          Math.floor(Math.random()*6)];
        btn.click();
      }
      var ch = bubble.querySelectorAll('.kchoice button');
      if (ch.length) ch[0].click();
      /* 只有"点击继续"没有按钮时，点气泡本身 */
      if (!inp && !ch.length && bubble.querySelector('.ks-next')) bubble.click();
    }

    /* 4. Web World 地点 */
    var spot = document.querySelectorAll('.ww-spot:not(.locked)');
    if (spot.length && !window.__spotClicked) { window.__spotClicked = true; spot[0].click(); }

    /* 5. Ready Repair 的"下一步" */
    var next = document.querySelector('.rr-next');
    if (next && !next.disabled) next.click();

    /* 6. 横幅上的"画好了" */
    var pb = Array.prototype.slice.call(document.querySelectorAll('.osbanner'))
      .filter(function(b){ return b.textContent.indexOf('画好了') >= 0; })[0];
    if (pb) pb.querySelector('.btn').click();

    /* 7. 分析中心 */
    var bc = document.querySelectorAll('.bf-choice');
    if (bc.length) bc[0].click();
    var bi = document.querySelector('.bf-input-row input');
    if (bi && !bi.__done) { bi.__done = true; bi.value = 'Kinito';
      document.querySelector('.bf-input-row button').click(); }

    /* 8. 对话框 / 错误弹窗 */
    var dlgBtn = document.querySelector('.sysdlg-foot .btn, .errpop .ep-f button');
    if (dlgBtn) dlgBtn.click();

    /* 9. 蓝屏：等待"任意键 / 任意点击" */
    var bsod = document.getElementById('bsod-layer');
    if (bsod && !bsod.classList.contains('hidden')) {
      window.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    }

    return true;
  })()`);
}

(async () => {
  console.log('流程测试：' + URL);
  console.log('='.repeat(72));

  const h = await launch({ url: URL, windowSize: '1440,900', port: 9412 });
  const cdp = h.cdp;

  try {
    await sleep(1500);

    /* ── 1. 开机 ── */
    console.log('\n── 1. 开机 ──');
    const power = await cdp.ev('!!document.querySelector(".crt-power")');
    assert(power, '电源键已出现');
    await cdp.ev('document.querySelector(".crt-power").click()');

    /* POST + 启动 logo 大约 3 + 3 秒 */
    const desktopUp = await until(cdp, 'desktop',
      `(function(){
         var os = document.getElementById('os-layer');
         return !os.classList.contains('hidden') &&
                document.querySelectorAll('#desktop-icons .dicon').length > 0;
       })()`, 30000);
    assert(!!desktopUp, '开机后进入桌面');
    if (!desktopUp) throw new Error('没能进入桌面，后续无法继续');

    await cdp.shot(path.join(SHOTS, 'f01-desktop.png'));
    const act0 = await cdp.ev('K.State.actId');
    ok('当前幕', act0);

    /* ── 2. 上网 → 蓝屏 → 重启 ── */
    console.log('\n── 2. 上网 / 蓝屏 / 重启 ──');

    let sawAds = false, sawBsod = false;
    const netDone = await until(cdp, 'net', `(function(){
      if (document.querySelectorAll('.adwin').length > 3) window.__sawAds = true;
      if (!document.getElementById('bsod-layer').classList.contains('hidden'))
        window.__sawBsod = true;
      return K.State.flag('didNet');
    })()`, 120000, async (c) => {
      await autopilot(c);
      if (!sawAds) {
        const a = await c.ev('!!window.__sawAds');
        if (a) { sawAds = true; await c.shot(path.join(SHOTS, 'f02-adstorm.png')); }
      }
      if (!sawBsod) {
        const b = await c.ev('!!window.__sawBsod');
        if (b) { sawBsod = true; await c.shot(path.join(SHOTS, 'f03-bsod.png')); }
      }
    });
    assert(!!netDone, '第二幕「上网」完成（didNet）');
    assert(sawAds, '中途出现了病毒广告洪流');
    assert(sawBsod, '中途触发了蓝屏');

    /* ── 3. 下载安装 ── */
    console.log('\n── 3. 下载安装 ──');
    const installDone = await until(cdp, 'install', 'K.State.flag("didInstall")',
      60000, autopilot);
    assert(!!installDone, '第三幕「安装」完成（didInstall）');

    const hasEgg = await cdp.ev('!!document.querySelector(".dicon.egg")');
    assert(hasEgg, '桌面上出现了蛋');
    await cdp.shot(path.join(SHOTS, 'f04-egg.png'));

    const hasMail = await cdp.ev('K.State.mail.length');
    assert(hasMail >= 1, '收到了欢迎邮件', hasMail + ' 封');

    /* ── 4. 唤醒 Kinito ── */
    console.log('\n── 4. 唤醒 Kinito ──');
    const woke = await until(cdp, 'wake', 'K.State.flag("didWake")', 60000, autopilot);
    assert(!!woke, '第四幕「唤醒」完成（didWake）');

    const kinitoUp = await cdp.ev(`(function(){
      var el = document.querySelector('#kinito-pet-layer .kinito');
      return { exists: !!el, visible: K.Kinito.visible };
    })()`);
    assert(kinitoUp && kinitoUp.exists, 'Kinito 出现在桌面上');
    await cdp.shot(path.join(SHOTS, 'f05-kinito.png'));

    /* ── 5. 互相了解 ── */
    console.log('\n── 5. 互相了解 ──');
    const knowDone = await until(cdp, 'know', 'K.State.flag("didKnow")', 90000, autopilot);
    assert(!!knowDone, '第五幕「互相了解」完成（didKnow）');

    const profile = await cdp.ev(`({
      name: K.State.userName, color: K.State.favColor,
      word: K.State.favWord, power: K.State.superPower,
      control: K.State.controlLevel
    })`);
    assert(profile && profile.name && profile.name !== 'Player',
      '玩家名字已被记录', profile && profile.name);
    assert(profile && profile.control > 0, 'Kinito 控制度已上升', profile && profile.control);
    await cdp.shot(path.join(SHOTS, 'f06-know.png'));

    /* ── 6. Web World ── */
    console.log('\n── 6. Web World ──');
    const samDone = await until(cdp, 'sam', 'K.State.flag("didSam")', 150000, autopilot);
    assert(!!samDone, '第六/七幕「Web World + Ready Repair」完成（didSam）');
    await cdp.shot(path.join(SHOTS, 'f07-after-sam.png'));

    /* ── 7. Jade ── */
    console.log('\n── 7. Jade / Factory Frenzy ──');
    const jadeDone = await until(cdp, 'jade', 'K.State.flag("didJade")', 180000, autopilot);
    assert(!!jadeDone, '第八幕「Factory Frenzy」完成（didJade）');
    await cdp.shot(path.join(SHOTS, 'f08-after-jade.png'));

    /* ── 8. 捉迷藏（3D） ── */
    console.log('\n── 8. 捉迷藏（3D 关卡） ──');
    const inSeek = await until(cdp, 'seek-3d',
      `(function(){
         var c = document.querySelector('.stage3d canvas');
         return !!c && !document.getElementById('stage-layer').classList.contains('hidden');
       })()`, 90000, autopilot);
    assert(!!inSeek, '3D 捉迷藏关卡已启动');
    if (inSeek) {
      await sleep(2500);
      await cdp.shot(path.join(SHOTS, 'f09-hideseek.png'));
      const lit = await cdp.ev(`(function(){
        var c = document.querySelector('.stage3d canvas');
        if (!c) return -1;
        var d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
        var n = 0;
        for (var i = 0; i < d.length; i += 400) if (d[i] > 25) n++;
        return n;
      })()`);
      assert(lit > 100, '捉迷藏 3D 画面已渲染出内容', lit + ' 个亮像素采样');
    }

    const seekDone = await until(cdp, 'seek', 'K.State.flag("didSeek")', 120000, autopilot);
    assert(!!seekDone, '第九幕「捉迷藏」完成（didSeek）');

    /* ── 9. 广告 + 邮件 ── */
    console.log('\n── 9. 广告 / 独眼 / 邮件 ──');
    const adDone = await until(cdp, 'ad', 'K.State.flag("didAd")', 90000, autopilot);
    assert(!!adDone, '第十幕「广告 + 独眼黑影」完成（didAd）');
    await cdp.shot(path.join(SHOTS, 'f10-after-ad.png'));

    /* ── 10. 挚友分析中心 ── */
    console.log('\n── 10. 挚友分析中心 ──');
    const hubDone = await until(cdp, 'hub', 'K.State.flag("didHub")', 120000, autopilot);
    assert(!!hubDone, '第十一幕「挚友分析中心」完成（didHub）');
    assert(await cdp.ev('K.State.bestFriend === "Kinito"'), '「最好的朋友」被固定为 Kinito');
    await cdp.shot(path.join(SHOTS, 'f11-after-hub.png'));

    /* ── 11. 绘画 ── */
    console.log('\n── 11. 绘画任务 ──');
    const paintDone = await until(cdp, 'paint', 'K.State.flag("didPaint")', 150000, autopilot);
    assert(!!paintDone, '第十二幕「绘画任务」完成（didPaint）');
    const nDrawings = await cdp.ev('Object.keys(K.State.drawings).length');
    assert(nDrawings >= 4, '玩家的画作被保存', nDrawings + ' 张');
    await cdp.shot(path.join(SHOTS, 'f12-after-paint.png'));

    /* ── 12. 建房问卷 ── */
    console.log('\n── 12. 建一个世界 ──');
    const buildDone = await until(cdp, 'build', 'K.State.flag("didBuild")', 120000, autopilot);
    assert(!!buildDone, '第十三幕「建一个世界」完成（didBuild）');
    const world = await cdp.ev(`({
      home: K.State.homeType, pet: K.State.petType, petName: K.State.petName,
      season: K.State.season, food: K.State.favFood
    })`);
    assert(world && world.home && world.pet && world.season,
      '世界参数已收集', JSON.stringify(world));

    /* ── 13. 脱稿逼问 + 黑暗卧室 ── */
    console.log('\n── 13. 脱稿逼问 / 黑暗卧室 ──');
    const nightDone = await until(cdp, 'night', 'K.State.flag("didNight")', 180000, autopilot);
    assert(!!nightDone, '第十四/十五幕「脱稿 + 黑暗卧室」完成（didNight）');
    await cdp.shot(path.join(SHOTS, 'f13-after-night.png'));

    /* ── 14. 友谊俱乐部 + 授权 ── */
    console.log('\n── 14. 友谊俱乐部 / 系统授权 ──');
    const clubDone = await until(cdp, 'club', 'K.State.flag("didClub")', 150000, autopilot);
    assert(!!clubDone, '第十六幕「友谊俱乐部」完成（didClub）');

    /* 授权界面：点"打开命令提示符"，然后在 CMD 里输入命令 */
    const grantDone = await until(cdp, 'grant', 'K.State.flag("didGrant")', 180000,
      async (c) => {
        await autopilot(c);
        await c.ev(`(function(){
          var allow = document.querySelector('.grant-card .gc-f button.allow');
          if (allow) allow.click();
          var i = document.querySelector('.cmdapp input');
          if (i && !i.__sent) {
            i.__sent = true;
            i.value = 'grant kinitopet.exe system.access';
            i.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
          }
          return true;
        })()`);
      });
    assert(!!grantDone, '第十七幕「系统授权」完成（didGrant）');
    await cdp.shot(path.join(SHOTS, 'f14-after-grant.png'));

    /* ── 15. YourWorld.exe ── */
    console.log('\n── 15. YourWorld.exe ──');
    const worldDone = await until(cdp, 'world', 'K.State.flag("didWorld")', 180000,
      async (c) => {
        await autopilot(c);
        /* 嘉年华里按 E 互动 */
        await c.ev(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'e'}))`);
      });
    assert(!!worldDone, '第十八幕「YourWorld.exe」完成（didWorld）');
    await cdp.shot(path.join(SHOTS, 'f15-yourworld.png'));

    /* ── 16. 房子 + 结局 ── */
    console.log('\n── 16. 个性化房子 / 结局 ──');
    const houseDone = await until(cdp, 'house', 'K.State.flag("didHouse")', 240000,
      async (c) => {
        await autopilot(c);
        await c.ev(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'e'}))`);
      });
    assert(!!houseDone, '第十九幕「个性化房子」完成（didHouse）');

    const ended = await until(cdp, 'ending',
      'Object.keys(K.State.endingsSeen).length > 0', 90000, autopilot);
    assert(!!ended, '达成结局');
    const endings = await cdp.ev('JSON.stringify(K.State.endingsSeen)');
    ok('已记录结局', endings);
    await cdp.shot(path.join(SHOTS, 'f16-ending.png'));

    /* ── 17. 全程无异常 ── */
    console.log('\n── 17. 运行时异常 ──');
    const errs = cdp.errors.filter(e =>
      e && !/speechSynthesis|NotAllowedError|getUserMedia|play\(\) failed|autoplay|fullscreen/i.test(e));
    assert(errs.length === 0, '全流程无未捕获异常',
      errs.length ? errs.slice(0, 8).map(e => String(e).slice(0, 150)).join(' | ') : '0 条');

  } catch (e) {
    console.error('\n[严重] 流程测试异常：', e && e.stack || e);
    fail++;
    failures.push('框架异常: ' + (e && e.message));
    try { await cdp.shot(path.join(SHOTS, 'zz-crash.png')); } catch (x) {}
  } finally {
    h.close();
  }

  console.log('\n' + '='.repeat(72));
  console.log(`通过 ${pass} / 失败 ${fail}`);
  if (failures.length) {
    console.log('\n失败项：');
    failures.forEach(f => console.log('  · ' + f));
  }
  console.log('\n截图目录：' + SHOTS);
  if (fail > 0) process.exitCode = 1;
})();
