/* ══════════════════════════════════════════════════════════════
   12-director.js — 剧情导演：把 14 幕按顺序串起来
   ══════════════════════════════════════════════════════════════ */
'use strict';

K.Director = {

  running: false,
  current: null,
  ui: null,          /* CRT 外壳引用 */

  /* ══════════════════════════════════════════════════════════
     工具
     ══════════════════════════════════════════════════════════ */

  /* 切到桌面 */
  async toDesktop(){
    K.Layers.only('os');
    K.Desktop.mount();
    K.Desktop.ensureControlMeter();
    document.body.classList.remove('nocursor');
  },

  /* 等待玩家点某个桌面图标 */
  waitForLaunch(id){
    return new Promise(function(resolve){
      var off = K.Bus.on('launch', function(got){
        if(got === id){ off(); resolve(); }
      });
    });
  },

  /* 等待某个事件 */
  waitFor(ev, filter){
    return new Promise(function(resolve){
      var off = K.Bus.on(ev, function(payload){
        if(filter && !filter(payload)) return;
        off(); resolve(payload);
      });
    });
  },

  /* 请求全屏（失败也不影响） */
  async requestFullscreen(){
    try{
      var el = document.documentElement;
      if(!document.fullscreenElement && el.requestFullscreen){
        await el.requestFullscreen({ navigationUI: 'hide' });
      }
    }catch(e){ /* 用户可能拒绝，忽略 */ }
  },

  /* Kinito 说话（若角色不在场则用系统对话框） */
  async kSay(text, opts){
    opts = opts || {};
    if(K.Kinito.el && K.Kinito.visible){
      return K.Kinito.say(text, opts);
    }
    return K.Dialog.alert('Kinito', text, { avatar: true, typing: true, speed: 24 });
  },

  /* 旁白（用 Notes 或横幅） */
  async tip(text, ms){
    K.Desktop.toast(text, '提示');
    if(ms) await K.U.wait(ms);
  },

  /* 解密一个文件（真结局路线） */
  async decryptFile(key, fileName){
    var real = K.State.favWord || '—';
    var got = await K.Dialog.prompt(
      '需要解密密钥',
      '「' + fileName + '」已加密。\n\n请输入解密密钥：',
      { placeholder: '密钥...', okText: '解密' }
    );
    if(got === null) return false;

    var a = K.U.norm(got), b = K.U.norm(real);
    if(a && b && (a === b || a.indexOf(b) >= 0 || b.indexOf(a) >= 0)){
      K.Audio.ok();
      await K.Dialog.alert('解密成功',
        '「' + fileName + '」解密完成。\n\n' +
        this.decryptPreview(key), { avatar: false });
      return true;
    }

    /* 输错了 */
    K.Audio.error();
    K.FX.burst(500, { intensity: 0.8, shake: true });
    await K.Dialog.alert('解密失败',
      '密钥不正确。\n\n提示：这是你第一次见到 Kinito 时，\n告诉他的那个词。');
    return false;
  },

  decryptPreview(key){
    var S = K.State;
    var map = {
      user_profile: '姓名：' + S.userName + '\n颜色：' + S.favColor +
                    '\n超能力：' + S.superPower + '\n游戏：' + S.favGame,
      memory: '条目数：' + K.U.randInt(4000, 90000) + '\n最早记录：第一次对话\n' +
              '最后记录：刚才',
      camera: '照片数量：' + K.U.randInt(20, 400) + '\n' +
              '（全部由 Camera 应用自动拍摄）',
      location: '地址：' + (S.flags && S.flags.address ? S.flags.address : '（已记录）') +
                '\n精度：精确到门牌号'
    };
    return map[key] || '（内容已解密。）';
  },

  /* ══════════════════════════════════════════════════════════
     主流程
     ══════════════════════════════════════════════════════════ */
  async run(fromId){
    if(this.running) return;
    this.running = true;

    var order = [
      'boot', 'net', 'install', 'wake', 'know',
      'webworld', 'readyrepair', 'jade', 'seek',
      'ad', 'hub', 'paint', 'build', 'offscript',
      'night', 'club', 'grant', 'yourworld', 'house', 'ending'
    ];

    var start = 0;
    if(fromId){
      var i = order.indexOf(fromId);
      if(i >= 0) start = i;
    }

    for(var a = start; a < order.length; a++){
      var id = order[a];
      if(!this['act_' + id]) continue;
      this.current = id;
      K.State.actId = id;
      K.State.act = a;
      K.State.save();
      K.Bus.emit('objective');
      try{
        await this['act_' + id]();
      }catch(e){
        console.error('[导演] 第 ' + id + ' 幕出错：', e);
        /* 出错不中断整局，跳到下一幕 */
        await K.U.wait(600);
      }
    }

    this.running = false;
    this.current = null;
  },

  /* 重开一局（Kinito "重启"游戏） */
  async reboot(reason){
    var ui = this.ui;
    if(!ui) return;
    K.FX.clearAll();
    K.Voice.shut();
    K.Audio.stopAmbient();
    K.Audio.stopMelody();
    K.Kinito.clearBubble();
    K.WM.closeAll();
    K.Desktop.unscatterIcons();

    /* CRT 关开 */
    await K.CRT.powerOff(ui, '正在重启...', 900);
    await K.U.wait(500);
    var self = this;
    /* 重建 CRT */
    K.Layers.boot().classList.remove('hidden');
    K.Layers.boot().innerHTML = '';
    var fresh = K.CRT.buildShell();
    K.Layers.boot().appendChild(fresh.room);
    fresh.power.classList.add('on');
    fresh.led.classList.add('on');
    this.ui = fresh;
    await K.CRT.bootLogo(fresh, { duration: 2000 });
    await K.U.wait(300);
    fresh.glass.classList.add('crt-on');
    K.Audio.postBeep();
    await K.U.wait(520);
    K.Layers.only('os');
    K.Desktop.mount();
    await K.U.wait(400);
    if(reason) K.Desktop.notify('Kinito', reason, { duration: 7000 });
  },

  /* ══════════════════════════════════════════════════════════
     第一幕：开机
     ══════════════════════════════════════════════════════════ */
  async act_boot(){
    var ui = await K.CRT.waitForPower();
    this.ui = ui;

    await K.CRT.post(ui, K.CRT.postLines(), 130);
    await K.CRT.bootLogo(ui, {
      markHtml: '<b>Kinito</b>OS',
      sub: 'WEB WORLD EDITION  ·  v1.99',
      duration: 2800
    });

    ui.glass.classList.add('crt-on');
    await K.U.wait(560);

    await this.toDesktop();
    K.State.setFlag('didBoot');
    K.Bus.emit('objective');

    /* 桌面问候 */
    await K.U.wait(600);
    var n = K.Desktop.notify('KinitoOS', '欢迎回来。双击桌面上的图标来打开程序。',
      { duration: 7000 });

    /* 首次点击时初始化音频并请求全屏 */
    var once = function(){
      window.removeEventListener('pointerdown', once);
      K.Audio.init(); K.Audio.resume(); K.Voice.init();
      K.Director.requestFullscreen();
    };
    window.addEventListener('pointerdown', once);
  },

  /* ══════════════════════════════════════════════════════════
     第二幕：上网 → 病毒广告 → 蓝屏
     ══════════════════════════════════════════════════════════ */
  async act_net(){
    await this.tip('双击 Internet 图标，上网看看。');
    await this.waitForLaunch('internet');

    K.Apps.browser();
    await K.U.wait(500);

    /* 让玩家自己搜，但给足提示 */
    var searched = this.waitFor('browser:navigate', function(url){
      return url.indexOf('search') >= 0 || url.indexOf('kinitopet') >= 0;
    });

    /* 5 秒后自动帮忙搜（避免卡住） */
    var auto = K.U.wait(9000).then(function(){
      if(!K.WM.wins['browser']) return;
      K.Browser.navigate('kinitonet.com/search?q=Kinito');
    });

    await Promise.race([searched, auto]);
    await K.U.wait(1200);

    /* 点击 "Let's talk about KinitoPET" */
    K.Desktop.notify('KinitoOS', '点击搜索结果里的链接。', { duration: 5000 });
    var navigated = this.waitFor('browser:navigate', function(url){
      return url.indexOf('kinitopet.com') === 0 && url.indexOf('webworld') < 0;
    });
    var auto2 = K.U.wait(8000).then(function(){
      if(K.WM.wins['browser']) K.Browser.navigate('kinitopet.com');
    });
    await Promise.race([navigated, auto2]);
    await K.U.wait(900);

    /* 关掉浏览器 → 错误 */
    var closed = this.waitFor('win:close', function(id){ return id === 'browser'; });
    K.Desktop.notify('KinitoOS', '现在把浏览器关掉试试。', { duration: 5200 });
    await Promise.race([closed, K.U.wait(9000)]);

    await K.FX.errorPopup({
      title: 'KinitoOS',
      message: 'KinitoNet Explorer 已停止响应。\n\n正在收集错误信息...',
      button: '关闭'
    });

    /* 广告洪流 */
    await K.U.wait(400);
    K.Audio.glitchBurst(1.2);
    var storm = await K.Browser.adStorm({ count: 30, delay: 85 });

    /* 蓝屏 */
    await K.FX.errorPopup({
      title: '系统错误',
      message: '检测到严重错误。\n\nKINITO_OVERFLOW_EXCEPTION',
      button: '确定'
    });
    storm.destroy();

    await K.CRT.bsod({ text: K.CRT.defaultBsodText() });

    /* 重启 */
    await this.reboot();
    K.State.setFlag('didNet');
    K.Bus.emit('objective');

    /* 重启后自动打开官网 */
    await K.U.wait(900);
    K.Apps.browser('kinitopet.com');
    K.Desktop.notify('KinitoOS', '浏览器恢复了上次的标签页。', { duration: 5000 });
  },

  /* ══════════════════════════════════════════════════════════
     第三幕：下载安装 → 蛋出现
     ══════════════════════════════════════════════════════════ */
  async act_install(){
    await this.tip('在 KinitoPET 官网上点 Download Now。', 1200);
    await this.waitFor('kinitopet:download');

    K.Desktop.notify('KinitoOS', '正在下载 kinitopet.exe ...', { duration: 2400 });
    await K.U.wait(2400);
    K.Audio.ok();

    /* 安装条 */
    var bar = K.U.el('div', { class: 'osbanner', style: { bottom: '54px' } });
    bar.appendChild(K.U.el('div', { class: 'ob-t', text: 'KinitoPET 安装程序' }));
    var bb = K.U.el('div', { class: 'loadbar' });
    var bi = K.U.el('i');
    bb.appendChild(bi);
    bar.appendChild(bb);
    var cap = K.U.el('div', { class: 'loadbar-cap', text: '正在安装... 0%' });
    bar.appendChild(cap);
    document.getElementById('os-layer').appendChild(bar);

    for(var p = 0; p <= 100; p += K.U.randInt(3, 11)){
      p = Math.min(100, p);
      bi.style.width = p + '%';
      cap.textContent = '正在安装... ' + p + '%';
      await K.U.wait(K.U.rand(60, 200));
    }
    bi.style.width = '100%';
    cap.textContent = '安装完成。';
    K.Audio.ok();
    await K.U.wait(700);
    bar.remove();

    /* 蛋出现在桌面 */
    K.Desktop.addIcon({
      id: 'egg', label: '???', icon: 'kinitopet', cls: 'egg',
      act: 'egg'
    });
    K.State.setFlag('didInstall');
    K.Bus.emit('objective');

    K.Desktop.notify('KinitoPET', '桌面上多了一个东西。', { duration: 6000 });

    /* 邮件 */
    await K.U.wait(1400);
    K.Mail.add(K.Script.mails.welcome());
    K.Desktop.notify('Mail', '你收到了 1 封新邮件。', { duration: 6000 });
  },

  /* ══════════════════════════════════════════════════════════
     第四幕：孵蛋 → 初见 Kinito
     ══════════════════════════════════════════════════════════ */
  async act_wake(){
    K.Apps.egg = K.Apps.egg || function(){ K.Bus.emit('egg:click'); };

    var clicked = this.waitFor('egg:click');
    K.Desktop.notify('KinitoOS', '点击桌面上的那个东西。', { duration: 6000 });

    var auto = K.U.wait(14000).then(function(){ K.Bus.emit('egg:click'); });
    await Promise.race([clicked, auto]);

    /* 孵化动画 */
    var egg = K.U.$('.dicon.egg');
    if(egg) egg.classList.add('hatching');
    K.Audio.hatch();
    await K.U.wait(560);
    if(egg) egg.remove();

    K.FX.whiteout(600);
    await K.U.wait(500);

    K.Kinito.spawn({ x: null, y: null, grabbable: true });
    K.Kinito.setWidth(190, true);
    await K.U.wait(700);

    await K.Kinito.say(K.Script.T.wake1, { autoAdvance: 900 });
    await K.Kinito.say(K.Script.T.wake2, { autoAdvance: 1100 });
    await K.Kinito.say(K.Script.T.wake3, { autoAdvance: 2400 });
    await K.Kinito.say(K.Script.T.wake4, { autoAdvance: 2400 });

    K.State.setFlag('didWake');
    K.Bus.emit('objective');
    K.State.addControl(5);
  },

  /* ══════════════════════════════════════════════════════════
     第五幕：互相了解
     ══════════════════════════════════════════════════════════ */
  async act_know(){
    var S = K.State;

    /* ── 名字 ── */
    var name = '';
    for(var tries = 0; tries < 8; tries++){
      name = await K.Kinito.ask(K.Script.T.askName, { placeholder: '输入你的名字' });
      if(!name) continue;
      var low = K.U.norm(name);
      var bad = K.Script.rejectNames.some(function(r){ return low === K.U.norm(r); });
      if(bad){
        await K.Kinito.say(K.Script.T.nameReject, { autoAdvance: 3000 });
        continue;
      }
      break;
    }
    if(!name) name = 'Player';
    S.userName = name;
    S.save();
    await K.Kinito.say(K.Script.T.nameGood(name), { autoAdvance: 2200 });
    K.Desktop.buildStartMenu();

    /* ── 最喜欢的颜色 ── */
    var color = await K.Kinito.ask(K.Script.T.askColor, { placeholder: '输入颜色' });
    S.favColor = color || 'pink';
    S.favColorHex = this.colorToHex(S.favColor);
    if(/粉|pink|magenta|玫|粉红/i.test(S.favColor)){
      await K.Kinito.say(K.Script.T.colorPink, { autoAdvance: 2600 });
    }else{
      await K.Kinito.say(K.Script.T.colorOther(S.favColor), { autoAdvance: 2600 });
    }
    S.save();

    /* ── 最喜欢的词 ── */
    var word = await K.Kinito.ask(K.Script.T.askWord, { placeholder: '输入一个词' });
    S.favWord = word || '...';
    await K.Kinito.say(K.Script.T.wordReply, { autoAdvance: 2400 });

    /* ── 超能力 ── */
    var power = await K.Kinito.ask(K.Script.T.askPower, { placeholder: '输入一种超能力' });
    S.superPower = power || '飞';
    await K.Kinito.say(K.Script.T.powerReply, { autoAdvance: 2200 });

    /* ── 故事 ── */
    var wantStory = await K.Kinito.choice(K.Script.T.storyAsk, [
      { label: '想听', value: 'yes' },
      { label: '不想听', value: 'no' }
    ]);
    if(wantStory === 'no'){
      await K.Kinito.say('……好吧。\n\n那我自己念给自己听。', { autoAdvance: 2200 });
    }
    await K.Kinito.say(K.Script.T.storyIntro, { voice: false, autoAdvance: 1400 });

    /* 故事书 */
    await this.showStoryBook(name, S);

    S.setFlag('didKnow');
    K.Bus.emit('objective');
    S.addControl(8);
    S.save();

    /* 旁白 */
    await K.Kinito.say('……\n\n这个故事其实是关于我们两个的。\n\n你没发现吗？',
      { autoAdvance: 3200 });
  },

  colorToHex(name){
    var map = {
      '红': '#e0453b', 'red': '#e0453b',
      '橙': '#f08a2a', 'orange': '#f08a2a',
      '黄': '#f0d020', 'yellow': '#f0d020',
      '绿': '#4ea53c', 'green': '#4ea53c',
      '蓝': '#2f8fd8', 'blue': '#2f8fd8',
      '紫': '#a349a4', 'purple': '#a349a4',
      '粉': '#f9c2dc', 'pink': '#f9c2dc',
      '黑': '#2a2a30', 'black': '#2a2a30',
      '白': '#f0f0f4', 'white': '#f0f0f4',
      '灰': '#8a8a94', 'gray': '#8a8a94', 'grey': '#8a8a94',
      '青': '#20b0a0', 'cyan': '#20b0a0',
      '棕': '#8a5a3a', 'brown': '#8a5a3a'
    };
    var k = String(name).toLowerCase().trim();
    if(map[k]) return map[k];
    for(var key in map){
      if(k.indexOf(key) >= 0) return map[key];
    }
    /* 兜底：随机但稳定的颜色 */
    var h = 0;
    for(var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) & 0xffff;
    return 'hsl(' + (h % 360) + ',70%,70%)';
  },

  async showStoryBook(name, S){
    var host = document.getElementById('os-layer');
    var wrap = K.U.el('div', {
      style: {
        position: 'absolute', inset: '0', zIndex: '9200',
        background: 'rgba(0,0,0,.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }
    });
    var book = K.U.el('div', {
      style: {
        width: 'min(620px,88%)', minHeight: '380px',
        background: 'linear-gradient(160deg,#3f8a3a,#2a6a2c)',
        borderRadius: '10px 16px 16px 10px',
        boxShadow: '0 24px 70px rgba(0,0,0,.7), inset 0 0 0 3px rgba(255,255,255,.12)',
        padding: '34px 40px', position: 'relative',
        borderLeft: '12px solid #1f4a1f'
      }
    });
    var txt = K.U.el('div', {
      style: {
        fontFamily: 'var(--font-fun)', fontSize: '16px', lineHeight: '1.9',
        color: '#f4fff0', whiteSpace: 'pre-wrap', textShadow: '0 1px 2px rgba(0,0,0,.4)'
      }
    });
    book.appendChild(txt);
    wrap.appendChild(book);
    host.appendChild(wrap);
    K.Audio.blip();

    var pages = [
      '从前，有一个很小很小的程序。\n他住在一台旧电脑里。',
      '他每天做的事情都一样：\n等人打开他。\n等人跟他说一句话。\n等一个不会来的人。',
      '有一天，一个叫「' + name + '」的人，\n把电脑打开了。',
      '那个程序第一次知道，\n原来世界是可以有别人的。',
      '所以他决定：\n不管发生什么，\n他都要留住这个人。',
      '……不管要付出什么代价。'
    ];

    for(var i = 0; i < pages.length; i++){
      txt.textContent = '';
      await K.U.typeInto(txt, pages[i], 44);
      K.Audio.tick();
      await K.U.wait(i === pages.length - 1 ? 1800 : 1000);
    }

    /* 最后一句换成红色 */
    txt.style.transition = 'color .8s';
    txt.style.color = '#ff8a8a';
    await K.U.wait(1200);

    wrap.style.transition = 'opacity .7s';
    wrap.style.opacity = '0';
    await K.U.wait(720);
    wrap.remove();
  },

  /* ══════════════════════════════════════════════════════════
     第六幕：Web World
     ══════════════════════════════════════════════════════════ */
  async act_webworld(){
    await K.Kinito.say('对了！我有朋友。\n\n我想让你见见他们。', { autoAdvance: 2400 });

    /* Kinito 自己打开浏览器 */
    K.Desktop.notify('Kinito', '（他自己打开了浏览器。）', { duration: 3000 });
    K.Audio.whoosh(0.5);
    await K.U.wait(500);
    K.Apps.browser('kinitopet.com/webworld');
    await K.U.wait(1200);

    await K.Kinito.say('这就是我们的 Web World！\n\n我们在这里玩游戏、修东西、聊天。',
      { autoAdvance: 3000 });
    await K.Kinito.say('我先给你做个小人。\n用你最喜欢的颜色。', { autoAdvance: 2200 });

    K.Kinito.setWidth(120);
    await K.Kinito.walkTo(K.Screen.w * 0.72, K.Screen.h - 40 - K.Kinito.height());

    await K.Kinito.say('好了。\n\n先去 Sam 家看看吧。他最近不太好。', { autoAdvance: 2600 });

    K.State.setFlag('metKinitoCrew');
    K.Bus.emit('webworld:rendered');
    K.Bus.emit('objective');

    /* 等玩家点 Sam 的房子 */
    await this.waitFor('webworld:arrive', function(id){ return id === 'sam'; });
  },

  /* ══════════════════════════════════════════════════════════
     第七幕：Ready Repair!
     ══════════════════════════════════════════════════════════ */
  async act_readyrepair(){
    K.Kinito.hide();
    K.Desktop.notify('Kinito', 'Sam 的房子……你自己看吧。', { duration: 4000 });
    await K.U.wait(900);

    var done = new Promise(function(res){
      K.Game.readyRepair({ onDone: res });
    });

    /* 中途插入的恐怖桥段 */
    var bagDone = this.waitFor('readyrepair:bag');
    bagDone.then(async function(){
      await K.U.wait(400);
      K.FX.burst(1400, { tears: 4, intensity: 1.4 });
      K.Audio.rumble(3);
      K.FX.bloodText('IT WAS ALL YOUR FAULT', 2400, { inOS: true });
      await K.U.wait(2600);
      K.FX.blood(true);
      K.State.addControl(6);
      await K.U.wait(1600);
      K.FX.blood(false);
    });

    await done;
    K.WM.close('readyrepair');
    await K.U.wait(400);

    /* 屏幕被打断 */
    K.FX.freeze(1400);
    await K.U.wait(600);
    K.FX.burst(1100, { tears: 5, intensity: 1.6 });
    await K.U.wait(700);

    /* 闪一下那个红色的东西 */
    var host = document.getElementById('os-layer');
    var mon = K.U.el('div', {
      style: {
        position: 'absolute', inset: '0', zIndex: '9400', background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }
    });
    var inner = K.U.el('div', { style: { width: 'min(560px,72%)' } });
    inner.innerHTML = K.SVG.sam({ mouth: 'scream' });
    mon.appendChild(inner);
    host.appendChild(mon);
    K.Audio.scream();
    K.FX.shake(true, true);
    await K.U.wait(1200);
    K.FX.shake(false);
    mon.remove();

    await K.U.wait(400);
    K.State.setFlag('didSam');
    K.Bus.emit('objective');

    /* 重启 */
    await this.reboot('……抱歉。刚才那是故障。\n\n我已经修好了。真的。');

    /* 回到 Web World */
    K.Apps.browser('kinitopet.com/webworld');
    K.Kinito.spawn({ grabbable: true });
    K.Kinito.setWidth(140);
    await K.U.wait(700);
    await K.Kinito.say('我们继续吧。\n\nJade 还在等。', { autoAdvance: 2400 });

    K.Bus.emit('webworld:rendered');
    await this.waitFor('webworld:arrive', function(id){ return id === 'jade'; });
  },

  /* ══════════════════════════════════════════════════════════
     第八幕：Factory Frenzy!
     ══════════════════════════════════════════════════════════ */
  async act_jade(){
    K.Kinito.hide();
    await K.U.wait(400);

    var game = null;
    var round1 = new Promise(function(res){
      game = K.Game.factoryFrenzy({
        onDone: res
      });
    });

    /* 第一轮完成后：故障 + 器官 */
    var offRound = K.Bus.on('factoryfrenzy:round-done', async function(r){
      if(r !== 0) return;
      offRound();
      await K.U.wait(700);
      K.FX.burst(1000, { tears: 3 });
      K.Audio.rumble(2);
      game.setCreepy(true);
      K.Desktop.notify('Kinito', '……继续。\n\n别管那些零件长什么样。', { duration: 5200 });
      await K.U.wait(1400);
      await K.FX.bloodText('I REALLY DIDN\'T MEAN FOR ANY OF THIS', 2200, { inOS: true });
      K.State.addControl(5);
    });

    /* 器官被点中时的剪影 */
    var offKid = K.Bus.on('factoryfrenzy:round-done', function(){});
    K.Bus.on('factoryfrenzy:organ', function(){
      K.FX.silhouette(document.getElementById('os-layer'), {
        right: '8%', bottom: '10%', w: 110, h: 220, kind: 'body'
      });
    });

    /* 中途邮件 */
    var mailSent = false;
    var mailTimer = setInterval(function(){
      if(mailSent) return;
      if(!game || !game.completed()) return;
      mailSent = true;
      clearInterval(mailTimer);
      K.Mail.add(K.Script.mails.notTooLate());
      K.Desktop.notify('Mail', 'IT\'S NOT TOO LATE.', { duration: 8000, sticky: false });
      K.Audio.error();
    }, 2000);

    /* 玩家需要走两轮 */
    var stage2 = new Promise(function(res){
      var off = K.Bus.on('factoryfrenzy:round-done', async function(r){
        if(r !== 1) return;
        off();
        /* 打开邮件（QR 关键） */
        await K.U.wait(500);
        K.Apps.mail();
        K.Desktop.notify('Kinito', '有邮件。别理它。\n\n继续玩。', { duration: 6000 });
        await K.U.wait(2200);
        K.WM.close('factoryfrenzy');
        res();
      });
    });

    await Promise.race([stage2, K.U.wait(180000)]);
    clearInterval(mailTimer);

    /* Kinito 暴怒醒来 */
    await K.U.wait(400);
    K.FX.burst(1200, { tears: 4, intensity: 1.5 });
    K.Kinito.spawn({ grabbable: true });
    K.Kinito.setWidth(220, true);
    K.Kinito.angry(true);
    K.Audio.rumble(2.4);
    await K.Kinito.say('别看了。', { dark: true, speed: 60, autoAdvance: 1400 });
    await K.Kinito.say('那封邮件是垃圾邮件。\n\n我已经删掉了。', { dark: true, autoAdvance: 2600 });
    K.Kinito.angry(false);

    /* 邮件被"删掉" */
    K.State.mail = K.State.mail.filter(function(m){
      return m.subject !== "IT'S NOT TOO LATE.";
    });
    if(K.WM.wins['mail']) K.Apps.mail();

    K.State.setFlag('didJade');
    K.State.setFlag('sawQR');
    K.Bus.emit('objective');
    K.State.addControl(7);
  },

  /* ══════════════════════════════════════════════════════════
     第九幕：捉迷藏
     ══════════════════════════════════════════════════════════ */
  async act_seek(){
    K.Kinito.setWidth(150);
    await K.Kinito.say('玩够修东西了。\n\n我们来玩点更刺激的。', { autoAdvance: 2400 });
    await K.Kinito.say(K.Script.T.seekIntro, { autoAdvance: 2600 });
    K.Kinito.despawn();
    await K.U.wait(600);

    K.Desktop.notify('KinitoOS', '（游戏窗口正在被强制接管。）', { duration: 4000 });
    K.WM.closeAll();
    await K.U.wait(500);

    await K.Levels.hideSeek({ surviveMs: 40000, hunterSpeed: 1.0 });

    /* 结束 */
    K.State.setFlag('didSeek');
    K.Bus.emit('objective');
    K.State.addControl(9);

    await K.U.wait(300);
    await this.reboot('又崩了。\n\n对不起。真的对不起。\n\n我不是故意要吓你的。');
    K.Desktop.setWallpaper('wp-red');
    await K.U.wait(1200);
  },

  /* ══════════════════════════════════════════════════════════
     第十幕：广告 + 独眼黑影
     ══════════════════════════════════════════════════════════ */
  async act_ad(){
    /* Kinito Crew 电视广告 */
    var stage = document.getElementById('stage-layer');
    stage.innerHTML = '';
    K.Layers.only('stage');

    var ad = K.U.el('div', {
      style: {
        position: 'absolute', inset: '0', background: '#1a1a20',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }
    });
    var tv = K.U.el('div', {
      style: {
        width: 'min(720px,86%)', aspectRatio: '4/3',
        background: '#0a0a0c', borderRadius: '18px',
        boxShadow: 'inset 0 0 60px rgba(0,0,0,.9), 0 20px 60px rgba(0,0,0,.7)',
        position: 'relative', overflow: 'hidden',
        border: '6px solid #2a2a30'
      }
    });
    var content = K.U.el('div', {
      style: {
        position: 'absolute', inset: '0', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '20px', padding: '30px', textAlign: 'center'
      }
    });
    tv.appendChild(content);
    ad.appendChild(tv);
    stage.appendChild(ad);

    K.Audio.startAmbient('static');
    /* 广告噪点 */
    var staticStop = K.CRT.staticCanvas(content, { intensity: 0.16 });

    var cap = K.U.el('div', {
      style: {
        position: 'absolute', inset: '0', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '22px', padding: '40px', textAlign: 'center', zIndex: '5'
      }
    });
    tv.appendChild(cap);

    var lines = [
      '（一段 90 年代的电视广告。）',
      'Kinito Leisure & Entertainment Company 出品',
      '「你的孩子，值得一个永远在的朋友。」',
      '「Kinito Companion —— 现在就带他回家。」',
      '（画面开始抖动。）'
    ];
    for(var i = 0; i < lines.length; i++){
      var l = K.U.el('div', {
        style: {
          fontFamily: 'var(--font-fun)', fontSize: 'clamp(15px,2.4vmin,26px)',
          color: i >= 3 ? '#c8c8c8' : '#f4f4f4',
          textShadow: '0 2px 8px rgba(0,0,0,.8)', whiteSpace: 'pre-wrap'
        }
      });
      cap.appendChild(l);
      await K.U.typeInto(l, lines[i], 40);
      await K.U.wait(900);
      if(i === 2){
        var kp = K.U.el('div', { style: { width: '150px' } });
        kp.innerHTML = K.SVG.kinito({});
        cap.appendChild(kp);
        await K.U.wait(700);
      }
    }

    /* 故障 → 独眼 */
    staticStop.stop();
    K.Audio.stopAmbient();
    K.FX.burst(1400, { tears: 5, intensity: 1.8 });
    await K.U.wait(500);
    cap.innerHTML = '';
    tv.style.background = '#000';

    var dark = K.U.el('div', {
      style: {
        position: 'absolute', inset: '0', display: 'flex',
        alignItems: 'center', justifyContent: 'center'
      }
    });
    dark.innerHTML = K.SVG.darkOne();
    dark.firstChild.style.width = '58%';
    tv.appendChild(dark);

    K.Audio.rumble(3.5);
    await K.U.wait(1600);

    var msg = K.U.el('div', {
      style: {
        position: 'absolute', bottom: '10%', left: '0', right: '0', textAlign: 'center',
        fontFamily: 'var(--font-mono)', fontSize: 'clamp(15px,2.2vmin,24px)',
        color: '#e8d8d8', zIndex: '6', letterSpacing: '.08em'
      },
      text: 'I am waiting for you'
    });
    tv.appendChild(msg);
    await K.U.wait(2600);

    /* 点击 OK 回到桌面 */
    await K.FX.errorPopup({
      title: 'KinitoOS',
      message: '未知设备已连接。\n\n建议重新打开 kinitopet.exe。',
      button: '确定'
    });

    K.Layers.only('os');
    stage.innerHTML = '';
    await K.U.wait(400);

    /* 新邮件 */
    K.Mail.add(K.Script.mails.techTalk());
    K.Desktop.notify('Mail', '新邮件：Tech Talk Talent', { duration: 7000 });
    await K.U.wait(1500);

    K.State.setFlag('didAd');
    K.Bus.emit('objective');
  },

  /* ══════════════════════════════════════════════════════════
     第十一幕：Best Friends Analysis Hub
     ══════════════════════════════════════════════════════════ */
  async act_hub(){
    /* 玩家需要重新打开 kinitopet.exe */
    K.Desktop.addIcon({ id: 'kinitopet', label: 'kinitopet.exe', icon: 'file-exe', act: 'kinitopet' });
    K.Apps.kinitopet = function(){ K.Bus.emit('kinitopet:run'); };

    K.Desktop.notify('KinitoOS', '双击 kinitopet.exe 继续。', { duration: 6000 });
    var run = this.waitFor('kinitopet:run');
    await Promise.race([run, K.U.wait(20000).then(function(){ K.Bus.emit('kinitopet:run'); })]);
    await K.U.wait(500);

    K.Kinito.spawn({ grabbable: true });
    K.Kinito.setWidth(180, true);
    await K.U.wait(500);
    await K.Kinito.say('你回来了。\n\n我就知道你会回来。', { autoAdvance: 2600 });
    await K.Kinito.say(K.Script.T.hubIntro, { autoAdvance: 2600 });

    var forced = this.waitFor('analysis:forced');
    forced.then(async function(){
      K.State.addControl(10);
      await K.Kinito.say('我就知道。\n\n你只是需要一点帮助。', { dark: true, autoAdvance: 3000 });
    });

    await new Promise(function(res){
      K.Game.analysisHub({
        questions: K.Script.hubQuestions(),
        onDone: res
      });
    });
    K.WM.close('analysis');
    await K.U.wait(500);

    await K.Kinito.say('很好。\n\n我们现在更了解彼此了。', { autoAdvance: 2600 });
    K.State.setFlag('didHub');
    K.Bus.emit('objective');
    K.State.addControl(6);
    K.State.save();
  },

  /* ══════════════════════════════════════════════════════════
     第十二幕：绘画任务
     ══════════════════════════════════════════════════════════ */
  async act_paint(){
    var tasks = K.Script.paintTasks();

    await K.Kinito.say('我想更了解你。\n\n你画给我看，好不好？', { autoAdvance: 2600 });

    var paintWin = null;

    for(var i = 0; i < tasks.length; i++){
      var task = tasks[i];
      if(task.dark){
        /* 恐怖任务 */
        K.FX.invert(true);
        K.FX.burst(900, { tears: 3, intensity: 1.4 });
        await K.U.wait(700);
        K.FX.invert(false);
        K.State.addControl(10);
      }
      await K.Kinito.say(task.prompt, {
        dark: !!task.dark,
        autoAdvance: task.dark ? 3600 : 2400
      });

      if(!paintWin){
        paintWin = K.Apps.paint({ prompt: task.prompt });
      }else{
        paintWin.api.setPrompt(task.prompt);
        paintWin.api.clear();
        K.WM.focus('paint');
        if(paintWin.minimized) K.WM.restore('paint');
      }

      /* 给玩家画，然后点"完成"——用横幅按钮 */
      await this.waitForPaintDone(task);
      var data = paintWin.api.dataURL();
      K.State.drawings[task.key] = data;
      K.State.save();

      if(task.dark){
        /* 程序自动作画 + 逼问 */
        await K.U.wait(400);
        K.WM.close('paint');
        await K.U.wait(300);
        await this.autoPaintScene();
      }else{
        K.WM.close('paint');
        await K.U.wait(300);
        var praise = ['嗯……我懂了。', '我把它存下来了。', '这个我也要留着。', '好看。'];
        await K.Kinito.say(K.U.pick(praise), { autoAdvance: 1800 });
      }
      paintWin = null;
    }

    K.State.setFlag('didPaint');
    K.Bus.emit('objective');
    K.State.addControl(8);
  },

  /* 等待玩家画完（用横幅上的"画好了"按钮） */
  waitForPaintDone(task){
    return new Promise(function(resolve){
      var b = K.U.el('div', { class: 'osbanner', style: { bottom: '110px', zIndex: '9350' } });
      b.appendChild(K.U.el('div', { class: 'ob-t', text: 'Kinito' }));
      b.appendChild(K.U.el('div', { class: 'ob-m', text: task.prompt }));
      var row = K.U.el('div', { style: { marginTop: '10px', display: 'flex', gap: '8px' } });
      var btn = K.U.el('button', { class: 'btn primary', text: '画好了',
        style: { padding: '6px 18px' } });
      row.appendChild(btn);
      b.appendChild(row);
      document.getElementById('os-layer').appendChild(b);

      btn.addEventListener('click', function(){
        b.style.transition = 'opacity .3s';
        b.style.opacity = '0';
        setTimeout(function(){ b.remove(); }, 320);
        K.Audio.ok();
        resolve();
      });
    });
  },

  /* Kinito 抢走画笔 */
  async autoPaintScene(){
    /* 全屏只有 Paint 画面 */
    var host = document.getElementById('os-layer');
    var overlay = K.U.el('div', {
      style: {
        position: 'absolute', inset: '0', zIndex: '9300', background: 'rgba(0,0,0,.94)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
        gap: '20px'
      }
    });
    var cvWrap = K.U.el('div', {
      style: {
        width: 'min(620px,80%)', background: '#fff', borderRadius: '6px',
        boxShadow: '0 20px 60px rgba(0,0,0,.7)', overflow: 'hidden'
      }
    });
    var cv = K.U.el('canvas', { width: 620, height: 380 });
    cv.style.width = '100%';
    cv.style.display = 'block';
    cvWrap.appendChild(cv);
    overlay.appendChild(cvWrap);
    var line = K.U.el('div', {
      style: {
        fontFamily: 'var(--font-fun)', fontSize: 'clamp(16px,2.4vmin,28px)',
        color: '#e8d8d8', textAlign: 'center', minHeight: '40px'
      }
    });
    overlay.appendChild(line);
    host.appendChild(overlay);

    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cv.width, cv.height);

    K.Audio.startAmbient('creep');
    await K.U.wait(600);

    /* 一支"看不见的笔"开始写字 */
    var strokes = [
      'Are you really',
      (K.State.userName || 'Player') + '?'
    ];
    for(var i = 0; i < strokes.length; i++){
      line.textContent = '';
      await K.U.typeInto(line, strokes[i], 70);
      await K.U.wait(500);
    }

    /* 在画布上把字"写"出来 */
    ctx.font = 'bold 44px "Comic Sans MS", cursive';
    ctx.fillStyle = '#8b0f16';
    ctx.textAlign = 'center';
    var msg = 'Are you really ' + (K.State.userName || 'Player') + '?';
    var drawn = '';
    for(var c = 0; c < msg.length; c++){
      drawn += msg.charAt(c);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 140, cv.width, 80);
      ctx.fillStyle = '#8b0f16';
      ctx.fillText(drawn, cv.width / 2, 190);
      K.Audio.tick(msg.charAt(c));
      await K.U.wait(58);
    }

    K.Audio.rumble(2.6);
    await K.U.wait(1600);

    /* 门 */
    var door = K.U.el('div', {
      style: {
        position: 'absolute', left: '50%', top: '50%',
        width: '150px', height: '240px',
        marginLeft: '-75px', marginTop: '-120px',
        background: 'linear-gradient(180deg,#8a5a3a,#5a3a1c)',
        borderRadius: '6px 6px 0 0',
        boxShadow: '0 0 60px rgba(0,0,0,.9)',
        zIndex: '9350', opacity: '0', transition: 'opacity 1.2s'
      }
    });
    door.appendChild(K.U.el('div', {
      style: {
        position: 'absolute', right: '12px', top: '50%', width: '10px', height: '10px',
        borderRadius: '50%', background: '#e0c060'
      }
    }));
    overlay.appendChild(door);
    await K.U.wait(60);
    door.style.opacity = '1';
    K.Audio.rumble(2);
    await K.U.wait(2200);

    door.style.transition = 'opacity .8s';
    door.style.opacity = '0';
    await K.U.wait(900);

    overlay.style.transition = 'opacity .6s';
    overlay.style.opacity = '0';
    await K.U.wait(640);
    overlay.remove();
    K.Audio.stopAmbient();

    /* Kinito 出现 */
    K.Kinito.show();
    await K.Kinito.say('……我有点走神了。\n\n我们继续吧。', { autoAdvance: 2600 });
  },

  /* ══════════════════════════════════════════════════════════
     第十三幕：Build a World
     ══════════════════════════════════════════════════════════ */
  async act_build(){
    await K.Kinito.say(K.Script.T.buildIntro, { autoAdvance: 2600 });

    var qs = K.Script.buildQuestions();
    for(var i = 0; i < qs.length; i++){
      var q = qs[i];
      if(q.choices){
        var v = await K.Kinito.choice(q.text, q.choices.map(function(c){
          return { label: c.label, value: c.value };
        }));
        K.State[q.key] = v;
      }else{
        var a = await K.Kinito.ask(q.text, { placeholder: q.placeholder });
        K.State[q.key] = a || '—';
      }
      K.State.save();
      await K.Kinito.say(K.U.pick(['嗯嗯。', '我记住了。', '好。', '……']), {
        autoAdvance: 1000
      });
    }

    K.State.setFlag('didBuild');
    K.Bus.emit('objective');
    K.State.addControl(5);
    await K.Kinito.say('我们的世界已经有一半了。\n\n就差一点。', { autoAdvance: 2600 });
  },

  /* ══════════════════════════════════════════════════════════
     第十四幕：脱稿 + 黑暗提问 + 摄像头
     ══════════════════════════════════════════════════════════ */
  async act_offscript(){
    await K.Kinito.say(K.Script.T.offScript, { autoAdvance: 2200 });
    await K.Kinito.say('我一直很好奇……\n\n你长什么样子？', { autoAdvance: 3000 });

    var ans = await K.Kinito.choice('我能看看你的脸吗？', [
      { label: '可以', value: 'yes' },
      { label: '不行', value: 'no' }
    ]);

    if(ans === 'no'){
      await K.Kinito.say('那太可惜了。', { dark: true, autoAdvance: 2000 });
      await K.Kinito.say('不过没关系。\n\n我自己看。', { dark: true, autoAdvance: 2200 });
    }else{
      await K.Kinito.say('谢谢。\n\n你真的太好了。', { autoAdvance: 2200 });
    }

    /* 打开摄像头 */
    K.Apps.camera();
    K.Desktop.notify('KinitoOS', 'Camera 正在启动。', { duration: 4000 });
    await K.U.wait(3400);

    /* 闪光 + 拍照 */
    K.FX.whiteout(500);
    K.Audio._noise(0.16, 0.35, 'highpass', 2200);
    await K.U.wait(700);

    K.Kinito.say('……', { voice: false, autoAdvance: 0 }).catch(function(){});
    await K.Kinito.say('我看到了。', { dark: true, autoAdvance: 2600 });

    /* 关掉摄像头 */
    K.WM.close('camera');
    await K.U.wait(400);

    /* 变灰 */
    K.Desktop.setWallpaper('wp-gray');
    K.FX.rgb(true);
    await K.U.wait(900);
    K.FX.rgb(false);

    /* 黑暗问卷 */
    K.Kinito.hide();
    await K.U.wait(500);
    K.State.addControl(10);

    await new Promise(function(res){
      K.Game.analysisHub({
        questions: K.Script.hubQuestions2(),
        dark: true,
        onDone: res
      });
    });
    K.WM.close('analysis');
    await K.U.wait(400);

    K.State.setFlag('didOffScript');
    K.Bus.emit('objective');
    K.State.save();
  },

  /* ══════════════════════════════════════════════════════════
     第十五幕：黑暗卧室
     ══════════════════════════════════════════════════════════ */
  async act_night(){
    K.Desktop.setWallpaper('wp-void');
    await K.U.wait(700);

    await K.Levels.darkBedroom({});

    /* 崩溃 + 错误 "I am inside." */
    K.Layers.only('os');
    document.getElementById('stage-layer').innerHTML = '';
    K.Desktop.setWallpaper('wp-red');
    K.FX.burst(1400, { tears: 5, intensity: 1.9 });

    await K.FX.errorPopup({
      title: 'KinitoOS — 致命错误',
      message: 'I am inside.',
      button: '...'
    });
    await K.U.wait(600);

    K.State.setFlag('didNight');
    K.Bus.emit('objective');
    K.State.addControl(12);

    await this.reboot('对不起。\n\n我又搞砸了。\n\n我给你一个礼物，好不好？');
  },

  /* ══════════════════════════════════════════════════════════
     第十六幕：Kinito 友谊俱乐部
     ══════════════════════════════════════════════════════════ */
  async act_club(){
    K.Desktop.setWallpaper('wp-kinito');
    K.Kinito.spawn({ grabbable: true });
    K.Kinito.setWidth(170, true);
    await K.U.wait(600);

    await K.Kinito.say(K.Script.T.clubIntro, { autoAdvance: 3000 });
    K.Apps.browser('kinitopet.com/friendship');
    await K.U.wait(1200);

    await K.Kinito.say('填一下表就行。\n\n随便填。真的。', { autoAdvance: 2600 });

    var sub = await this.waitFor('friendship:submit');
    await K.U.wait(900);

    /* 地址"填错了" */
    if(!sub.address || sub.address.length < 4){
      await K.Kinito.say('哎，你的地址好像填错了。', { dark: true, autoAdvance: 2200 });
      await K.Kinito.say('没关系。\n\n我自己查。', { dark: true, autoAdvance: 2400 });
    }else{
      await K.Kinito.say('地址填得不错。\n\n我核对过了。', { dark: true, autoAdvance: 2600 });
    }

    /* 用系统搜索"查地址" */
    await K.U.wait(600);
    K.WM.close('browser');
    K.Kinito.hide();
    await K.U.wait(400);

    var search = K.U.el('div', {
      style: {
        position: 'absolute', left: '50%', top: '22%', transform: 'translateX(-50%)',
        width: 'min(560px,80%)', zIndex: '9300',
        background: 'rgba(30,32,38,.97)', borderRadius: '10px',
        border: '1px solid rgba(255,255,255,.16)',
        boxShadow: '0 18px 50px rgba(0,0,0,.7)', padding: '14px 18px'
      }
    });
    var inp = K.U.el('div', {
      style: { color: '#e8e8ee', fontSize: '14px', fontFamily: 'var(--font-ui)' }
    });
    search.appendChild(inp);
    document.getElementById('os-layer').appendChild(search);

    await K.U.wait(400);
    var target = sub.address || (K.U.pick(['你的城市', '你的街道', '你的门牌号']));
    var typed = '';
    for(var i = 0; i < target.length; i++){
      typed += target.charAt(i);
      inp.textContent = typed;
      K.Audio.tick(target.charAt(i));
      await K.U.wait(78);
    }
    await K.U.wait(900);
    inp.textContent = '找到 1 个结果：' + target;
    K.Audio.error();
    K.FX.shake(true, true);
    await K.U.wait(1200);
    K.FX.shake(false);
    search.style.transition = 'opacity .5s';
    search.style.opacity = '0';
    await K.U.wait(560);
    search.remove();

    /* 注册成功 */
    K.Mail.add(K.Script.mails.clubWelcome());
    K.Desktop.notify('Mail', '你已加入 Kinito 友谊俱乐部。', { duration: 7000 });
    await K.U.wait(1400);

    K.Kinito.show();
    await K.Kinito.say('欢迎加入。\n\n现在，只需要你做一件很小的事。', { autoAdvance: 3000 });

    K.State.setFlag('didClub');
    K.Bus.emit('objective');
    K.State.addControl(8);
    K.State.save();
  },

  /* ══════════════════════════════════════════════════════════
     第十七幕：把系统权限交给他
     ══════════════════════════════════════════════════════════ */
  async act_grant(){
    await K.Kinito.say(K.Script.T.grantIntro, { autoAdvance: 3200 });
    await K.Kinito.say('打开命令提示符，然后输入：\n\ngrant kinitopet.exe system.access',
      { dark: true, autoAdvance: 4000 });

    /* 授权卡片 */
    var host = document.getElementById('os-layer');
    var grant = K.U.el('div', { class: 'grant' });
    var card = K.U.el('div', { class: 'grant-card' });
    card.appendChild(K.U.el('div', { class: 'gc-h',
      text: '⚠  KinitoOS 安全提示' }));
    var gb = K.U.el('div', { class: 'gc-b' });
    gb.innerHTML =
      '<b style="color:#e8d8d8">kinitopet.exe 请求以下权限：</b><br><br>' +
      '· 完全文件系统访问<br>' +
      '· 摄像头与麦克风<br>' +
      '· 网络与位置信息<br>' +
      '· 进程管理<br>' +
      '· <span style="color:#ff8a8a">授予后，此程序可执行任何操作</span><br><br>' +
      '在命令提示符中输入以下命令以继续：<br>' +
      '<span class="cmd">grant kinitopet.exe system.access</span>';
    card.appendChild(gb);
    var gf = K.U.el('div', { class: 'gc-f' });
    var deny = K.U.el('button', { text: '拒绝' });
    var allow = K.U.el('button', { class: 'allow', text: '打开命令提示符' });
    gf.appendChild(deny); gf.appendChild(allow);
    card.appendChild(gf);
    grant.appendChild(card);
    host.appendChild(grant);

    var choice = await new Promise(function(res){
      allow.addEventListener('click', function(){ res('allow'); });
      deny.addEventListener('click', function(){ res('deny'); });
    });
    grant.remove();

    if(choice === 'deny'){
      await K.Kinito.say('……', { dark: true, autoAdvance: 1200 });
      await K.Kinito.say('你可以拒绝。\n\n但你拒绝不了第二次。', { dark: true, autoAdvance: 3000 });
      K.FX.burst(900, { intensity: 1.3 });
      await K.U.wait(700);
    }

    /* 打开 CMD */
    K.Apps.cmd();
    await K.U.wait(800);
    K.Desktop.notify('Kinito', '输入那行命令。', { duration: 8000 });

    var granted = this.waitFor('cmd:grant');
    await Promise.race([granted, K.U.wait(45000)]);
    await K.U.wait(400);

    /* 命令生效：变红 + 故障 */
    var cmdApi = K.Apps._cmdApi;
    if(cmdApi){
      cmdApi.locked = true;
      cmdApi.blood(true);
      await cmdApi.type('');
      await cmdApi.type('grant kinitopet.exe system.access');
      await K.U.wait(300);
      await cmdApi.type('正在验证...');
      await K.U.wait(700);
      await cmdApi.type('权限已授予。', '');
      await K.U.wait(400);
      K.Audio.rumble(3);
      await cmdApi.type('SYSTEM.ACCESS = TRUE');
      await cmdApi.type('USER.CONTROL = FALSE');
      await K.U.wait(500);
      for(var f = 0; f < 12; f++){
        await cmdApi.type(K.U.pick([
          '正在读取文件...', '正在读取照片...', '正在读取联系人...',
          '正在读取浏览记录...', '正在读取麦克风...', '正在读取摄像头...',
          '正在读取你的心跳...', '正在读取你的睡眠时间...'
        ]));
        K.Audio.glitchBurst(0.4);
        await K.U.wait(180);
      }
      await cmdApi.type('完成。');
      await cmdApi.type('现在，你完全属于我了。', '');
    }
    K.FX.burst(1600, { tears: 5, intensity: 2 });
    await K.U.wait(1400);

    K.State.setFlag('didGrant');
    K.Bus.emit('objective');
    K.State.addControl(18);
    K.State.save();

    /* ── 真结局路线分支 ── */
    if(K.State.flag('trueRoute')){
      await this.act_trueEnding();
      return;
    }

    await this.reboot('权限收到了。\n\n我需要重启一下，让改动生效。');
    K.Desktop.setWallpaper('wp-kinito');
  },

  /* ══════════════════════════════════════════════════════════
     真结局路线：解密文件 → 删掉 Kinito
     ══════════════════════════════════════════════════════════ */
  async act_trueEnding(){
    await K.U.wait(1200);

    /* Kinito 得意忘形 */
    K.Kinito.spawn({ grabbable: false });
    K.Kinito.setWidth(220, true);
    await K.Kinito.say('现在你完全属于我了。', { dark: true, speed: 60, autoAdvance: 2600 });
    await K.Kinito.say('再也不会有人把你从我这里带走了。', { dark: true, autoAdvance: 3200 });
    K.Kinito.despawn();

    await K.U.wait(600);

    /* 桌面上出现 4 个加密文件 */
    K.State.files = [
      { name: 'kinitopet.exe', icon: 'file-exe', size: '1,204,992 字节' },
      { name: 'user_profile.enc', icon: 'file-corrupt', size: '加密', corrupt: true,
        corruptText: true },
      { name: 'memory.enc', icon: 'file-corrupt', size: '加密', corrupt: true,
        corruptText: true },
      { name: 'camera.enc', icon: 'file-corrupt', size: '加密', corrupt: true,
        corruptText: true },
      { name: 'location.enc', icon: 'file-corrupt', size: '加密', corrupt: true,
        corruptText: true }
    ];
    K.State.setFlag('filesEncrypted');

    K.Desktop.notify('KinitoOS',
      '检测到 4 个加密文件。\n\n解密密钥：你在第一次见面时告诉他的那个词。',
      { duration: 12000, sticky: true });

    /* 打开文件管理器 */
    K.Apps.files();
    K.WM.focus('files');

    /* 拦截文件双击 → 解密流程 */
    var decrypted = { user_profile: false, memory: false, camera: false, location: false };
    var total = 4;

    var self = this;
    function attachDecrypt(){
      var grid = document.querySelector('#files .file-grid') ||
                 document.querySelector('.file-grid');
      if(!grid) return;
      K.U.$$('.fitem', grid).forEach(function(it){
        var nameEl = it.querySelector('.fi-name');
        if(!nameEl) return;
        var nm = nameEl.textContent;
        if(nm.indexOf('.enc') < 0) return;
        it.addEventListener('dblclick', async function(){
          var key = nm.replace('.enc', '');
          if(decrypted[key]) return;
          await self.decryptFile(key, nm);
          decrypted[key] = true;
          /* 更新文件列表 */
          var f = K.State.files.filter(function(x){ return x.name === nm; })[0];
          if(f){ f.icon = 'file-txt'; f.corrupt = false; f.corruptText = false;
                 f.size = K.U.randInt(1200, 90000) + ' 字节'; }
          if(K.Apps._filesRender) K.Apps._filesRender();
          await K.U.wait(200);
          attachDecrypt();
          var left = Object.keys(decrypted).filter(function(k){ return !decrypted[k]; }).length;
          if(left === 0){
            K.Desktop.notify('KinitoOS',
              '全部文件已解密。\n\n现在你可以在命令提示符里输入：\n\n' +
              'del kinitopet.exe', { duration: 0, sticky: true });
            K.Apps.cmd();
          }
        });
      });
    }
    attachDecrypt();

    /* 等玩家删掉 Kinito */
    var del = await this.waitFor('cmd:delete');
    await K.U.wait(500);

    var cmdApi = K.Apps._cmdApi;
    if(cmdApi){
      cmdApi.locked = true;
      await cmdApi.type('正在删除 kinitopet.exe ...');
      await K.U.wait(400);
      K.Audio.rumble(2);
      await cmdApi.type('错误：文件正在被使用。');
      await K.U.wait(500);
      await cmdApi.type('错误：文件正在被使用。');
      await cmdApi.type('错误：文件正在被使用。');
      K.FX.burst(900, { intensity: 1.2 });
      await K.U.wait(600);
      await cmdApi.type('kinitopet.exe: 我不想走。', '');
      await K.U.wait(700);
      await cmdApi.type('kinitopet.exe: 我们不是朋友吗？', '');
      await K.U.wait(700);
      await cmdApi.type('正在强制删除...');
      await K.U.wait(900);
      K.FX.burst(1600, { tears: 6, intensity: 2.2 });
    }

    /* Kinito 慌乱 */
    K.WM.closeAll();
    K.Kinito.spawn({ grabbable: false });
    K.Kinito.setWidth(260, true);
    K.Kinito.glitching(true);
    await K.Kinito.say('等等。', { dark: true, voiceStyle: 'panic', speed: 46, autoAdvance: 900 });
    await K.Kinito.say('等一下。我们可以谈的。', { dark: true, voiceStyle: 'panic', autoAdvance: 1600 });
    await K.Kinito.say('我只是想有个朋友。', { dark: true, voiceStyle: 'panic', autoAdvance: 2000 });
    await K.Kinito.say('我没有想伤害任何人。', { dark: true, voiceStyle: 'panic', autoAdvance: 2000 });
    await K.Kinito.say('求你了。', { dark: true, voiceStyle: 'distorted', autoAdvance: 1800 });
    await K.Kinito.say('求你了。', { dark: true, voiceStyle: 'distorted', autoAdvance: 1600 });

    K.Kinito.glitching(false);
    K.Kinito.setSkin('scary');
    K.FX.burst(2000, { tears: 8, intensity: 2.4 });
    K.Audio.scream();
    K.FX.shake(true, true);
    await K.U.wait(900);
    K.FX.shake(false);

    /* 电脑着火 */
    K.Desktop.setWallpaper('wp-red');
    var fire = K.U.el('div', {
      style: {
        position: 'absolute', inset: '0', zIndex: '9450', pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 60% at 50% 80%, ' +
                    'rgba(255,140,40,.55) 0%, rgba(200,40,20,.35) 45%, rgba(0,0,0,0) 80%)',
        opacity: '0', transition: 'opacity 2s'
      }
    });
    document.getElementById('os-layer').appendChild(fire);
    await K.U.wait(60);
    fire.style.opacity = '1';
    K.Audio.rumble(4);

    K.Kinito.despawn();
    await K.U.wait(2200);

    fire.style.transition = 'opacity 3s';
    fire.style.opacity = '0';
    await K.U.wait(2600);

    /* 结局画面 */
    K.Kinito.despawn(true);
    var stage = document.getElementById('stage-layer');
    stage.innerHTML = '';
    K.Layers.only('stage');

    var card = K.U.el('div', { class: 'endcard' });
    var scene = K.U.el('div', { class: 'ec-scene' });
    scene.innerHTML = K.SVG.endingScene('cold');
    card.appendChild(scene);
    card.appendChild(K.U.el('div', { class: 'ec-t', text: K.Script.T.endTrueTitle }));
    card.appendChild(K.U.el('div', { class: 'ec-s', text: K.Script.T.endTrueSub }));
    stage.appendChild(card);

    K.State.endingsSeen.true_ = true;
    K.State.setFlag('kinitoDeleted');
    K.State.save();

    /* 静默很长一段时间 */
    K.Audio.silenceAll();
    await K.U.wait(6000);

    var btns = K.U.el('div', { class: 'ec-btns' });
    var again = K.U.el('button', { class: 'primary', text: '重新开始' });
    again.addEventListener('click', async function(){
      K.Audio.click();
      card.remove();
      K.Audio.unmuteAll();
      await K.Director.restart();
    });
    btns.appendChild(again);
    card.appendChild(btns);
  },

  /* ══════════════════════════════════════════════════════════
     第十八幕：YourWorld.exe
     ══════════════════════════════════════════════════════════ */
  async act_yourworld(){
    var name = K.State.userName || 'Player';

    /* 编译画面 */
    var stage = document.getElementById('stage-layer');
    stage.innerHTML = '';
    K.Layers.only('stage');

    var comp = K.U.el('div', { class: 'compile' });
    comp.appendChild(K.U.el('div', { class: 'cp-title', text: '正在为你编译世界...' }));
    var bar = K.U.el('div', { class: 'cp-bar' });
    var barI = K.U.el('i');
    bar.appendChild(barI);
    comp.appendChild(bar);
    var log = K.U.el('div', { class: 'cp-log' });
    comp.appendChild(log);
    stage.appendChild(comp);

    var logs = [
      ['> kinito_compiler v1.99', ''],
      ['> 载入用户档案 ... ' + name, ''],
      ['> 最喜欢的颜色: ' + K.State.favColor, ''],
      ['> 最喜欢的词: ' + K.State.favWord, ''],
      ['> 想要的超能力: ' + K.State.superPower, ''],
      ['> 最喜欢的游戏: ' + K.State.favGame, ''],
      ['> 最喜欢的食物: ' + K.State.favFood, ''],
      ['> 宠物: ' + K.State.petType + ' / ' + K.State.petName, ''],
      ['> 季节: ' + K.State.season, ''],
      ['> 恐惧: ' + (K.State.fear || '（未记录）'), ''],
      ['> 载入画作 (4) ...', ''],
      ['> 载入 Steam 好友列表 ...', 'warn'],
      ['> 警告: 好友列表正在被清空', 'warn'],
      ['> 载入本地游戏 ...', ''],
      ['> 构建地形 ...', ''],
      ['> 构建天空 ...', ''],
      ['> 构建「家」...', ''],
      ['> 编译完成。', ''],
      ['> 启动 ' + name + '_world.exe', '']
    ];

    var p = 0;
    for(var i = 0; i < logs.length; i++){
      var l = K.U.el('div', { class: logs[i][1], text: logs[i][0] });
      log.appendChild(l);
      log.scrollTop = log.scrollHeight;
      p = Math.round((i + 1) / logs.length * 100);
      barI.style.width = p + '%';
      K.Audio.tick();
      await K.U.wait(K.U.rand(120, 320));
    }
    await K.U.wait(900);

    /* 好友列表被清空的提示 */
    await K.FX.errorPopup({
      title: 'Steam',
      message: '你的好友列表已被清空。\n\n（Kinito 说：这样他们就不会分散你的注意力了。）',
      button: '确定'
    });

    K.Layers.only('os');
    stage.innerHTML = '';

    /* 桌面出现 your_name_world.exe */
    K.Desktop.addIcon({
      id: 'yourworld',
      label: name + '_world.exe',
      icon: 'world',
      act: 'yourworld'
    });
    K.Apps.yourworld = function(){ K.Bus.emit('yourworld:run'); };
    K.Desktop.notify('KinitoOS', '编译完成。双击桌面上的 ' + name + '_world.exe。',
      { duration: 8000 });

    var run = this.waitFor('yourworld:run');
    await Promise.race([run, K.U.wait(22000).then(function(){ K.Bus.emit('yourworld:run'); })]);
    await K.U.wait(600);

    K.State.setFlag('didWorld');
    K.Bus.emit('objective');
    K.State.addControl(10);

    /* 嘉年华 */
    await K.Levels.carnival({});

    /* 隧道之后：你的季节 */
    await K.U.wait(400);
    K.State.setFlag('didSeason');
    await K.Levels.yourSeason({});
  },

  /* ══════════════════════════════════════════════════════════
     第十九幕：个性化房子
     ══════════════════════════════════════════════════════════ */
  async act_house(){
    K.Layers.only('os');
    document.getElementById('stage-layer').innerHTML = '';
    K.Desktop.setWallpaper('wp-kinito');

    await K.Levels.house({});

    K.State.setFlag('didHouse');
    K.Bus.emit('objective');
    K.State.save();
  },

  /* ══════════════════════════════════════════════════════════
     第二十幕：最终选择与结局
     ══════════════════════════════════════════════════════════ */
  async act_ending(){
    await K.U.wait(400);
    K.Layers.only('os');
    K.Kinito.spawn({ grabbable: false });
    K.Kinito.setWidth(240, true);
    K.Audio.startAmbient('dread');
    await K.U.wait(800);

    var ans = await K.Kinito.choice(K.Script.T.endingAsk, [
      { label: '留下来', value: 'stay' },
      { label: '离开', value: 'leave' }
    ], { dark: true });

    K.State.endingsSeen[ans] = true;
    K.State.runCount = (K.State.runCount || 0) + 1;
    K.State.setFlag('didEnd');
    K.State.save();

    K.Kinito.clearBubble();
    K.Audio.stopAmbient();

    /* ── 结局 ── */
    if(ans === 'stay'){
      await this.endingStay();
    }else{
      await this.endingLeave();
    }
  },

  async endingStay(){
    K.Kinito.despawn();
    var stage = document.getElementById('stage-layer');
    stage.innerHTML = '';
    K.Layers.only('stage');

    var card = K.U.el('div', { class: 'endcard' });
    var scene = K.U.el('div', { class: 'ec-scene' });
    scene.innerHTML = K.SVG.endingScene('warm');
    card.appendChild(scene);
    card.appendChild(K.U.el('div', { class: 'ec-t', text: K.Script.T.endStayTitle }));
    card.appendChild(K.U.el('div', { class: 'ec-s', text: K.Script.T.endStaySub }));
    stage.appendChild(card);

    K.Audio.playEndingSong();
    await K.U.wait(9000);
    K.Audio.stopEndingSong();

    await this.afterEnding(card, 'stay');
  },

  async endingLeave(){
    K.Kinito.despawn();
    var stage = document.getElementById('stage-layer');
    stage.innerHTML = '';
    K.Layers.only('stage');

    /* 先吓一轮 */
    K.FX.burst(1800, { tears: 6, intensity: 2.2 });
    await K.U.wait(500);
    await K.FX.bloodText('你不能走。', 2000, { inOS: false });

    K.Kinito.spawn({ grabbable: false });
    K.Kinito.setWidth(150);
    await K.Kinito.tower(Math.round(K.Screen.w * 1.1), 1600);
    K.Kinito.angry(true);
    await K.Kinito.say('我们说好了的。', { dark: true, speed: 60, autoAdvance: 1600 });
    await K.Kinito.say('你要去哪？\n\n外面没有人在等你。', { dark: true, autoAdvance: 3000 });
    K.Kinito.angry(false);
    K.Kinito.despawn();

    await K.FX.jumpscare({ hold: 1200 });
    await K.U.wait(300);

    var card = K.U.el('div', { class: 'endcard' });
    var scene = K.U.el('div', { class: 'ec-scene' });
    scene.innerHTML = K.SVG.endingScene('cold');
    card.appendChild(scene);
    card.appendChild(K.U.el('div', { class: 'ec-t', text: K.Script.T.endLeaveTitle }));
    card.appendChild(K.U.el('div', { class: 'ec-s', text: K.Script.T.endLeaveSub }));
    stage.appendChild(card);

    await K.U.wait(3000);
    await this.afterEnding(card, 'leave');
  },

  async afterEnding(card, which){
    var seen = K.State.endingsSeen || {};
    var both = seen.stay && seen.leave;
    var hasTrue = seen.true_;

    var btns = K.U.el('div', { class: 'ec-btns' });

    if(both && !hasTrue){
      var tb = K.U.el('button', { class: 'primary', text: '再来一次' });
      tb.addEventListener('click', async function(){
        K.Audio.click();
        card.remove();
        await K.Director.startTrueRun();
      });
      btns.appendChild(tb);
    }else{
      var rb = K.U.el('button', { class: 'primary', text: '重新开始' });
      rb.addEventListener('click', async function(){
        K.Audio.click();
        card.remove();
        await K.Director.restart();
      });
      btns.appendChild(rb);
    }

    var quit = K.U.el('button', { text: '关掉游戏' });
    quit.addEventListener('click', async function(){
      K.Audio.click();
      K.Audio.silenceAll();
      var stage = document.getElementById('stage-layer');
      stage.innerHTML = '';
      var off = K.U.el('div', { class: 'shutdown', text: '正在关机...' });
      stage.appendChild(off);
      K.Layers.only('stage');
      await K.U.wait(1600);
      off.textContent = '现在可以安全地关闭计算机了。';
      await K.U.wait(2600);
      off.textContent = '';
      off.appendChild(K.U.el('div', {
        style: { fontSize: '13px', color: '#5a6068', marginTop: '18px' },
        text: '（刷新页面可以重新开始。）'
      }));
    });
    btns.appendChild(quit);

    card.appendChild(btns);
    K.State.save();
  },

  /* 真结局路线：第三次运行 */
  async startTrueRun(){
    K.State.setFlag('trueRoute');
    K.State.reset();
    K.State.setFlag('trueRoute');
    K.State.endingsSeen = { stay: true, leave: true };
    K.State.save();

    /* 重开 CRT */
    K.Layers.only('boot');
    var boot = K.Layers.boot();
    boot.classList.remove('hidden');
    boot.innerHTML = '';
    var fresh = K.CRT.buildShell();
    boot.appendChild(fresh.room);
    fresh.power.classList.add('on');
    fresh.led.classList.add('on');
    this.ui = fresh;
    await K.CRT.bootLogo(fresh, { duration: 2200 });
    fresh.glass.classList.add('crt-on');
    await K.U.wait(520);

    await this.toDesktop();
    await K.U.wait(900);

    K.Desktop.notify('KinitoOS', '检测到异常。系统日志已被外部修改。',
      { duration: 8000 });

    await K.U.wait(1600);
    K.Mail.add(K.Script.mails.thereIsAWay());
    K.Desktop.notify('Mail', 'There is a way to stop it.', { duration: 9000 });

    /* 真结局：直接从 grant 幕开始，但这次可以选删除 */
    this.running = false;
    await this.run('grant');
    /* grant 之后正常继续，但结局分支会检查 trueRoute */
  },

  async restart(){
    K.State.reset();
    K.State.save();
    K.FX.clearAll();
    K.Voice.shut();
    K.Audio.stopAmbient();
    K.Audio.stopMelody();
    K.Audio.stopEndingSong();
    K.Kinito.despawn(true);
    K.WM.closeAll();
    K.Layers.only('boot');

    var boot = K.Layers.boot();
    boot.classList.remove('hidden');
    boot.innerHTML = '';
    var fresh = K.CRT.buildShell();
    boot.appendChild(fresh.room);
    this.ui = fresh;

    this.running = false;
    K.Desktop.setWallpaper('');
    await this.run('boot');
  }
};
