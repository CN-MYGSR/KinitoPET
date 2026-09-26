/* ============================================================
   uitest.js — 可点击性回归测试
   专门抓「元素看得见、点不动」这一类 bug：
   程序化 el.click() 会绕过 pointer-events，所以这里全部用
   CDP Input.dispatchMouseEvent 派发**真实鼠标事件**。

   用法： node _tools/uitest.js
   ============================================================ */
'use strict';
const path = require('path');
const { launch, sleep } = require('./cdp.js');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/');

let pass = 0, fail = 0;
const failures = [];
function ok(n, d) { pass++; console.log(`[OK]   ${n}${d !== undefined ? '  → ' + d : ''}`); }
function bad(n, d) { fail++; failures.push(n + ' → ' + d); console.log(`[FAIL] ${n}  → ${d}`); }
function assert(c, n, d) { c ? ok(n, d) : bad(n, d); }

/* 真实鼠标点击（会走 hit-test，尊重 pointer-events） */
async function realClick(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x, y, button: 'none', clickCount: 0
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1
  });
  await sleep(40);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1
  });
}

/* 取元素中心点（视口坐标） */
async function centerOf(cdp, sel) {
  return await cdp.ev(`(function(){
    var e = document.querySelector(${JSON.stringify(sel)});
    if (!e) return null;
    var b = e.getBoundingClientRect();
    if (b.width < 1 || b.height < 1) return null;
    return { x: b.left + b.width/2, y: b.top + b.height/2 };
  })()`);
}

/* 通用审计：可见的可点击元素，中心点是否真的命中自己 */
async function auditClickable(cdp, selector, label) {
  const res = await cdp.ev(`(function(){
    var list = Array.prototype.slice.call(document.querySelectorAll(${JSON.stringify(selector)}));
    var bad = [];
    list.forEach(function(e){
      var b = e.getBoundingClientRect();
      if (b.width < 2 || b.height < 2) return;            /* 不可见/零尺寸，跳过 */
      var cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;
      var cx = b.left + b.width/2, cy = b.top + b.height/2;
      if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) return;
      var hit = document.elementFromPoint(cx, cy);
      if (!hit) { bad.push({ sel: e.className, why: 'elementFromPoint 返回 null' }); return; }
      /* 命中自己或自己的后代都算通过 */
      if (hit !== e && !e.contains(hit)) {
        bad.push({
          sel: (e.className || e.tagName) + ' :: ' + (e.textContent||'').trim().slice(0,16),
          why: '被 ' + (hit.className || hit.tagName) + ' 挡住'
        });
      }
    });
    return { total: list.length, bad: bad };
  })()`);
  assert(res && res.bad.length === 0,
    label + '（' + (res ? res.total : '?') + ' 个可见元素中心点可命中）',
    res && res.bad.length ? JSON.stringify(res.bad.slice(0, 6)) : '全部通过');
  return res;
}

(async () => {
  console.log('可点击性回归测试：' + URL);
  console.log('='.repeat(72));

  const h = await launch({ url: URL, windowSize: '1440,900', port: 9441 });
  const cdp = h.cdp;

  try {
    await sleep(1400);

    /* ── 1. 开机电源键（真实点击） ── */
    console.log('\n── 1. 电源键 ──');
    const pw = await centerOf(cdp, '.crt-power');
    assert(!!pw, '电源键有可点击区域');
    if (pw) {
      await realClick(cdp, pw.x, pw.y);
      await sleep(1600);
      const started = await cdp.ev(`(function(){
        var p = document.querySelector('.crt-power');
        return !!(p && p.classList.contains('on'));
      })()`);
      assert(started === true, '真实点击电源键后机器已启动（.on）');
    }

    /* 直接推到桌面 */
    await cdp.ev(`(function(){
      var b = document.getElementById('boot-layer'); if (b) b.classList.add('hidden');
      K.Layers.only('os'); K.Desktop.mount(); K.Desktop.ensureControlMeter();
      return true;
    })()`);
    await sleep(700);

    /* ── 2. 全桌面可点击性审计 ── */
    console.log('\n── 2. 桌面元素可点击性审计 ──');
    await auditClickable(cdp, '.dicon', '桌面图标');
    await auditClickable(cdp, '#taskbar button, .tbtask', '任务栏按钮');
    await auditClickable(cdp, '.dicon .di-img', '桌面图标图形区');

    /* ── 3. 【本 bug 的回归点】错误弹窗真实点击 ── */
    console.log('\n── 3. 错误弹窗（回归点） ──');

    const pointerEvents = await cdp.ev(`(function(){
      K.FX.errorPopup({ title:'KinitoOS', message:'KinitoNet Explorer 已停止响应。\\n\\n正在收集错误信息...', button:'关闭' });
      return 'shown';
    })()`);
    await sleep(500);

    const peCheck = await cdp.ev(`(function(){
      var pop = document.querySelector('.errpop');
      if (!pop) return null;
      var btn = pop.querySelector('.ep-f button');
      var host = document.getElementById('sysdialog-host');
      return {
        hostPE: getComputedStyle(host).pointerEvents,
        popPE: getComputedStyle(pop).pointerEvents,
        btnPE: getComputedStyle(btn).pointerEvents,
        btnRect: (function(){ var b = btn.getBoundingClientRect();
          return { x: Math.round(b.left+b.width/2), y: Math.round(b.top+b.height/2),
                   w: Math.round(b.width), h: Math.round(b.height) }; })()
      };
    })()`);
    assert(peCheck && peCheck.popPE === 'auto',
      '错误弹窗 pointer-events 已开启', peCheck && ('pop=' + peCheck.popPE + ' host=' + peCheck.hostPE));
    assert(peCheck && peCheck.btnRect.w > 10 && peCheck.btnRect.h > 10,
      '关闭按钮有实际尺寸', peCheck && JSON.stringify(peCheck.btnRect));

    /* hit-test：中心点必须命中按钮本身 */
    const hitTest = await cdp.ev(`(function(){
      var btn = document.querySelector('.errpop .ep-f button');
      var b = btn.getBoundingClientRect();
      var hit = document.elementFromPoint(b.left + b.width/2, b.top + b.height/2);
      return { isSelf: hit === btn, hitTag: hit ? (hit.tagName + '.' + hit.className) : 'null' };
    })()`);
    assert(hitTest && hitTest.isSelf, '关闭按钮中心点 hit-test 命中自己',
      hitTest && hitTest.hitTag);

    /* 真实鼠标点击 */
    if (peCheck && peCheck.btnRect) {
      await realClick(cdp, peCheck.btnRect.x, peCheck.btnRect.y);
      await sleep(500);
      const left = await cdp.ev('document.querySelectorAll(".errpop").length');
      assert(left === 0, '真实点击「关闭」后弹窗消失', '剩余 ' + left + ' 个');
    }

    /* ── 4. 系统对话框真实点击 ── */
    console.log('\n── 4. 系统对话框 ──');
    await cdp.ev(`(function(){
      window.__dlgOK = false;
      K.Dialog.alert('KinitoOS', '测试内容', { avatar: true }).then(function(){ window.__dlgOK = true; });
      return true;
    })()`);
    await sleep(500);
    await auditClickable(cdp, '.sysdlg .btn', '对话框按钮');
    const dlgBtn = await centerOf(cdp, '.sysdlg .btn');
    if (dlgBtn) {
      await realClick(cdp, dlgBtn.x, dlgBtn.y);
      await sleep(500);
      const r = await cdp.ev('({ left: document.querySelectorAll(".sysdlg").length, ok: window.__dlgOK })');
      assert(r.left === 0 && r.ok === true, '真实点击后对话框关闭且 Promise 已 resolve', JSON.stringify(r));
    }

    /* ── 5. 桌面图标真实双击启动应用 ── */
    console.log('\n── 5. 桌面图标真实点击 ──');
    const iconC = await centerOf(cdp, '[data-icon-id="internet"]');
    if (iconC) {
      await realClick(cdp, iconC.x, iconC.y);
      await sleep(900);   /* 单击 260ms 后触发 launch */
      const opened = await cdp.ev('document.querySelectorAll(".browser").length');
      assert(opened >= 1, '真实点击 Internet 图标后浏览器打开', opened + ' 个');
    }
    await cdp.ev('K.WM.closeAll()');
    await sleep(400);

    /* ── 6. 窗口标题栏按钮真实点击 ── */
    console.log('\n── 6. 窗口按钮 ──');
    await cdp.ev(`(function(){
      K.Apps.notes();
      return true;
    })()`);
    await sleep(600);
    await auditClickable(cdp, '.win-btns button', '窗口标题栏按钮');
    const minC = await centerOf(cdp, '[data-win-id="notes"] .wb-min');
    if (minC) {
      await realClick(cdp, minC.x, minC.y);
      await sleep(400);
      const min = await cdp.ev('!!document.querySelector("[data-win-id=\\"notes\\"]").classList.contains("hidden")');
      assert(min === true, '真实点击最小化后窗口隐藏');
    }
    const closeC = await centerOf(cdp, '[data-win-id="notes"] .wb-close');
    if (closeC) {
      await realClick(cdp, closeC.x, closeC.y);
      await sleep(400);
      const gone = await cdp.ev('!document.querySelector("[data-win-id=\\"notes\\"]")');
      assert(gone === true, '真实点击关闭后窗口被移除');
    }

    /* ── 7. 开始菜单真实点击 ── */
    console.log('\n── 7. 开始菜单 ──');
    const sb = await centerOf(cdp, '#start-btn');
    if (sb) {
      await realClick(cdp, sb.x, sb.y);
      await sleep(400);
      const open = await cdp.ev('!document.getElementById("start-menu").classList.contains("hidden")');
      assert(open === true, '真实点击 Start 后菜单展开');
      await auditClickable(cdp, '#start-menu .sm-item', '开始菜单项');
      await cdp.ev('document.getElementById("start-menu").classList.add("hidden")');
    }

    /* ── 8. 蓝屏「任意键继续」真实鼠标点击 ── */
    console.log('\n── 8. 蓝屏 ──');
    await cdp.ev(`(function(){
      window.__bsodDone = false;
      K.CRT.bsod({ text:'TEST STOP', wait: 200 }).then(function(){ window.__bsodDone = true; });
      return true;
    })()`);
    await sleep(900);
    const bsodVis = await cdp.ev('!document.getElementById("bsod-layer").classList.contains("hidden")');
    assert(bsodVis === true, '蓝屏已显示');
    await realClick(cdp, 400, 300);
    await sleep(900);
    const bsodGone = await cdp.ev('({ hidden: document.getElementById("bsod-layer").classList.contains("hidden"), done: window.__bsodDone })');
    assert(bsodGone.hidden === true && bsodGone.done === true,
      '真实鼠标点击后蓝屏退出', JSON.stringify(bsodGone));

    /* ── 9. 第二幕全流程（真实点击驱动） ── */
    console.log('\n── 9. 第二幕「上网」真实点击闭环 ──');
    await cdp.ev(`(function(){
      K.State.reset();
      K.WM.closeAll();
      K.Layers.only('os'); K.Desktop.mount(); K.Desktop.ensureControlMeter();
      K.Director.running = false;
      window.__netErr = null;
      K.Director.act_net().catch(function(e){ window.__netErr = String(e); });
      return true;
    })()`);
    await sleep(2500);

    let netOK = false, guard = 0;
    /* act_net 内部本身有多段"等玩家 / 超时兜底"（9s+8s+9s），总共约 35~40 秒。
       这里给足预算，别把它当成产品回归。 */
    while (guard++ < 180) {
      /* 每一步都用真实鼠标点掉挡住流程的弹窗 */
      const btn = await cdp.ev(`(function(){
        var cands = [
          '.errpop .ep-f button',
          '.sysdlg .btn',
          '.kp-dl'
        ];
        for (var i = 0; i < cands.length; i++){
          var e = document.querySelector(cands[i]);
          if (!e) continue;
          var b = e.getBoundingClientRect();
          if (b.width < 2) continue;
          if (e.disabled) continue;
          return { sel: cands[i], x: b.left+b.width/2, y: b.top+b.height/2 };
        }
        var bsod = document.getElementById('bsod-layer');
        if (bsod && !bsod.classList.contains('hidden')) return { sel:'bsod', x:400, y:300 };
        return null;
      })()`);
      if (btn) await realClick(cdp, btn.x, btn.y);
      else {
        /* 没有弹窗时，点一下桌面 Internet 图标 */
        const ic = await centerOf(cdp, '[data-icon-id="internet"]');
        if (ic) await realClick(cdp, ic.x, ic.y);
      }
      await sleep(450);
      const done = await cdp.ev('K.State.flag("didNet")');
      if (done) { netOK = true; break; }
    }
    assert(netOK, '仅靠真实鼠标点击即可走完第二幕（didNet）',
      netOK ? '已到达' : guard + ' 轮后仍未完成');
    const netErr = await cdp.ev('window.__netErr');
    if (netErr) bad('第二幕内部异常', String(netErr).slice(0, 200));

    /* ── 9b. Web World 地图解锁与点击（回归点） ── */
    console.log('\n── 9b. Web World 地图 ──');
    /* act_net 在 didNet 之后还有收尾（约 900ms 后会把浏览器导航回官网），
       必须等它彻底跑完，否则会把下面刚渲染的地图覆盖掉。 */
    await sleep(2800);
    await cdp.ev(`(function(){
      K.WM.closeAll();
      K.State.reset();
      K.State.setFlag('didBoot');
      K.State.userName = 'Player';
      K.Bus.__arrived = null;
      K.Bus.on('webworld:arrive', function(id){ K.Bus.__arrived = id; });
      K.Apps.browser('kinitopet.com/webworld');
      return true;
    })()`);
    await sleep(1200);

    const locks0 = await cdp.ev(`(function(){
      var out = {};
      Array.prototype.forEach.call(document.querySelectorAll('.ww-spot'), function(s){
        var name = s.querySelector('.wws-name').textContent.trim();
        out[name] = s.classList.contains('locked');
      });
      return out;
    })()`);
    assert(locks0 && locks0["Sam's House"] === false,
      '未通关时 Sam 的房子可进入', JSON.stringify(locks0));
    assert(locks0 && locks0["Jade's House"] === true,
      '未通关时 Jade 的房子是锁的', JSON.stringify(locks0));

    /* 真实点击 Sam 的房子 */
    const samSpot = await centerOf(cdp, '.ww-spot:not(.locked)');
    assert(!!samSpot, '存在可点击的地点');
    if (samSpot) {
      await realClick(cdp, samSpot.x, samSpot.y);
      await sleep(1200);
      const arrived = await cdp.ev('K.Bus.__arrived');
      assert(arrived === 'sam', '真实点击 Sam 的房子后触发 webworld:arrive', arrived);
    }

    /* 通关 Sam 后 Jade 解锁 */
    const locks1 = await cdp.ev(`(function(){
      K.State.setFlag('didSam');
      K.Apps.browser('kinitopet.com/webworld');
      return true;
    })()`);
    await sleep(1000);
    const l1 = await cdp.ev(`(function(){
      var out = {};
      Array.prototype.forEach.call(document.querySelectorAll('.ww-spot'), function(s){
        out[s.querySelector('.wws-name').textContent.trim()] = s.classList.contains('locked');
      });
      return out;
    })()`);
    assert(l1 && l1["Jade's House"] === false, '完成 Sam 后 Jade 的房子解锁', JSON.stringify(l1));

    /* 通关 Jade 后树屋解锁 */
    await cdp.ev(`(function(){
      K.State.setFlag('didJade');
      K.Apps.browser('kinitopet.com/webworld');
      return true;
    })()`);
    await sleep(1000);
    const l2 = await cdp.ev(`(function(){
      var out = {};
      Array.prototype.forEach.call(document.querySelectorAll('.ww-spot'), function(s){
        out[s.querySelector('.wws-name').textContent.trim()] = s.classList.contains('locked');
      });
      return out;
    })()`);
    assert(l2 && l2['Tree House'] === false, '完成 Jade 后树屋解锁', JSON.stringify(l2));

    /* 地图上不该有"锁着但提示文案为空"的地点 */
    const hintAudit = await cdp.ev(`(function(){
      var bad = [];
      Array.prototype.forEach.call(document.querySelectorAll('.ww-spot.locked'), function(s){
        if (!s.classList.contains('locked')) return;
        bad.push(s.querySelector('.wws-name').textContent.trim());
      });
      return bad;
    })()`);
    ok('当前锁定地点', JSON.stringify(hintAudit));

    await cdp.ev('K.WM.closeAll()');
    await sleep(400);

    /* ── 10. 全程异常 ── */
    console.log('\n── 10. 运行时异常 ──');
    const errs = cdp.errors.filter(e =>
      e && !/speechSynthesis|NotAllowedError|getUserMedia|play\(\) failed|autoplay|fullscreen/i.test(e));
    assert(errs.length === 0, '全程无未捕获异常',
      errs.length ? errs.slice(0, 6).map(e => String(e).slice(0, 160)).join(' | ') : '0 条');

  } catch (e) {
    console.error('\n[严重] 测试异常：', e && e.stack || e);
    fail++; failures.push('框架异常: ' + (e && e.message));
  } finally {
    h.close();
  }

  console.log('\n' + '='.repeat(72));
  console.log(`通过 ${pass} / 失败 ${fail}`);
  if (failures.length) { console.log('\n失败项：'); failures.forEach(f => console.log('  · ' + f)); }
  if (fail > 0) process.exitCode = 1;
})();
