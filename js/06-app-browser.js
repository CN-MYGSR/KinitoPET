/* ══════════════════════════════════════════════════════════════
   06-app-browser.js — KinitoNet 浏览器 / KinitoPET 官网 / Web World / 广告洪流
   ══════════════════════════════════════════════════════════════ */
'use strict';

K.Browser = {

  winId: 'browser',
  tabs: [],
  activeTab: 0,
  _tabSeq: 0,

  /* ── 打开浏览器窗口 ─────────────────────── */
  open(url, opts){
    opts = opts || {};
    var self = this;
    var rec = K.WM.wins[this.winId];
    if(!rec){
      rec = K.WM.open({
        id: this.winId, title: 'KinitoNet Explorer', icon: 'internet',
        w: 900, h: 600, center: true, cls: 'browser-win',
        body: this._shell(),
        onClose: function(){ K.Browser.tabs = []; K.Browser.activeTab = 0; }
      });
    }else{
      K.WM.focus(this.winId);
      if(rec.minimized) K.WM.restore(this.winId);
    }
    if(url) this.navigate(url, opts);
    return rec;
  },

  _shell(){
    var wrap = K.U.el('div', { class: 'browser' });
    var tabs = K.U.el('div', { class: 'br-tabs' });
    var nav = K.U.el('div', { class: 'br-nav' });

    var back = K.U.el('button', { text: '\u2190', title: '后退' });
    var fwd  = K.U.el('button', { text: '\u2192', title: '前进' });
    var rel  = K.U.el('button', { text: '\u21BB', title: '刷新' });
    var home = K.U.el('button', { text: '\u2302', title: '主页' });
    var urlBox = K.U.el('input', { class: 'br-url', type: 'text', spellcheck: 'false' });
    var go = K.U.el('button', { text: '\u27A4', title: '前往' });

    nav.appendChild(back); nav.appendChild(fwd); nav.appendChild(rel);
    nav.appendChild(home); nav.appendChild(urlBox); nav.appendChild(go);

    var view = K.U.el('div', { class: 'br-view scroll' });

    wrap.appendChild(tabs);
    wrap.appendChild(nav);
    wrap.appendChild(view);

    var self = this;
    this._els = { tabs: tabs, view: view, url: urlBox, back: back, fwd: fwd };

    function goTo(){
      var u = urlBox.value.trim();
      if(u) self.navigate(u);
    }
    go.addEventListener('click', goTo);
    urlBox.addEventListener('keydown', function(e){ if(e.key === 'Enter') goTo(); });
    back.addEventListener('click', function(){ self.historyBack(); });
    fwd.addEventListener('click', function(){ self.historyForward(); });
    rel.addEventListener('click', function(){ self.render(self.currentUrl, true); });
    home.addEventListener('click', function(){ self.navigate('kinitonet.com'); });

    return wrap;
  },

  /* ── 标签页 ─────────────────────────────── */
  _renderTabs(){
    var host = this._els.tabs;
    if(!host) return;
    host.innerHTML = '';
    var self = this;
    this.tabs.forEach(function(t, i){
      var el = K.U.el('div', { class: 'br-tab' + (i === self.activeTab ? ' active' : '') });
      el.appendChild(K.U.el('span', { text: t.title || '新标签页' }));
      var x = K.U.el('button', { class: 'brt-x', text: '\u2715' });
      x.addEventListener('click', function(e){
        e.stopPropagation();
        self.closeTab(i);
      });
      el.appendChild(x);
      el.addEventListener('click', function(){
        self.activeTab = i;
        self.currentUrl = self.tabs[i].url;
        self.render(self.currentUrl);
        self._renderTabs();
      });
      host.appendChild(el);
    });
  },

  newTab(url, title){
    this.tabs.push({ url: url || 'kinitonet.com', title: title || '新标签页', history: [] });
    this.activeTab = this.tabs.length - 1;
    this._renderTabs();
  },

  closeTab(i){
    if(this.tabs.length <= 1) return;
    this.tabs.splice(i, 1);
    if(this.activeTab >= this.tabs.length) this.activeTab = this.tabs.length - 1;
    this.currentUrl = this.tabs[this.activeTab].url;
    this.render(this.currentUrl);
    this._renderTabs();
  },

  historyBack(){
    var t = this.tabs[this.activeTab];
    if(!t || !t.history.length) return;
    var u = t.history.pop();
    this.currentUrl = u;
    this.render(u, true);
  },

  historyForward(){ K.Audio.click(); },

  /* ── 导航 ───────────────────────────────── */
  navigate(url, opts){
    opts = opts || {};
    url = String(url).trim();
    /* 自然语言 → 搜索 */
    if(url.indexOf('.') < 0 && url.indexOf('://') < 0 && url !== 'about:blank'){
      return this.navigate('kinitonet.com/search?q=' + encodeURIComponent(url), opts);
    }
    if(url.indexOf('http') === 0) url = url.replace(/^https?:\/\//, '');
    if(url.indexOf('www.') === 0) url = url.slice(4);

    var t = this.tabs[this.activeTab];
    if(!t) { this.newTab(url); }
    else {
      if(t.url && t.url !== url) t.history.push(t.url);
      t.url = url;
      t.title = this._titleFor(url);
    }
    this.currentUrl = url;
    this._renderTabs();
    this.render(url, opts.instant);
    K.Audio.whoosh(0.22);
  },

  _titleFor(url){
    if(url.indexOf('search') >= 0) return 'KinitoNet 搜索';
    if(url.indexOf('webworld') >= 0) return "Kinito Crew's Web World";
    if(url.indexOf('keyboard') >= 0) return 'keyboard';
    if(url.indexOf('friendship') >= 0) return 'Kinito Friendship Club';
    if(url.indexOf('kinitopet.com') >= 0) return 'KinitoPET - Home of Kinito the Axolotl';
    if(url.indexOf('kinitonet.com') >= 0) return 'KinitoNet';
    if(url === 'about:blank') return '空白页';
    return url;
  },

  /* ── 渲染页面 ───────────────────────────── */
  render(url, keepScroll){
    var view = this._els.view;
    if(!view) return;
    var prevScroll = keepScroll ? view.scrollTop : 0;
    view.innerHTML = '';
    if(this._els.url) this._els.url.value = url;

    var page;
    if(url === 'about:blank') page = this.pageBlank();
    else if(url.indexOf('kinitonet.com/search') === 0) page = this.pageSearchResults(url);
    else if(url.indexOf('kinitonet.com') === 0) page = this.pageSearchHome();
    else if(url.indexOf('kinitopet.com/webworld') === 0) page = this.pageWebWorld();
    else if(url.indexOf('kinitopet.com/keyboard') === 0) page = this.pageKeyboard();
    else if(url.indexOf('kinitopet.com/friendship') === 0) page = this.pageFriendship();
    else if(url.indexOf('kinitopet.com') === 0) page = this.pageOfficial();
    else page = this.page404(url);

    view.appendChild(page);
    view.scrollTop = prevScroll;

    /* 记标题 */
    var t = this.tabs[this.activeTab];
    if(t) t.title = this._titleFor(url);

    K.Bus.emit('browser:navigate', url);
    return page;
  },

  /* ══════════════ 各页面 ══════════════ */

  pageBlank(){
    return K.U.el('div', { class: 'page', style: { background: '#fff', minHeight: '100%' } });
  },

  page404(url){
    var p = K.U.el('div', { class: 'page', style: { padding: '60px 40px', textAlign: 'center' } });
    p.appendChild(K.U.el('h2', { text: '无法访问此页面', style: { color: '#333', fontSize: '22px' } }));
    p.appendChild(K.U.el('p', { text: '找不到 ' + url, style: { color: '#777', fontSize: '13px' } }));
    var back = K.U.el('button', { class: 'btn', text: '返回主页', style: { marginTop: '18px' } });
    var self = this;
    back.addEventListener('click', function(){ self.navigate('kinitonet.com'); });
    p.appendChild(back);
    return p;
  },

  pageSearchHome(){
    var p = K.U.el('div', { class: 'page' });
    var home = K.U.el('div', { class: 'search-home' });
    home.appendChild(K.U.el('div', { class: 'sh-logo', html: 'Kinito<b>Net</b>' }));
    var box = K.U.el('input', { class: 'sh-box', type: 'text',
      placeholder: '搜索网页，或者输入网址...', spellcheck: 'false' });
    home.appendChild(box);
    var btn = K.U.el('button', { class: 'sh-go', text: '搜索' });
    home.appendChild(btn);
    var self = this;
    function go(){
      var q = box.value.trim();
      if(!q) return;
      if(q.indexOf('.') > 0) self.navigate(q);
      else self.navigate('kinitonet.com/search?q=' + encodeURIComponent(q));
    }
    btn.addEventListener('click', go);
    box.addEventListener('keydown', function(e){ if(e.key === 'Enter') go(); });

    /* 推荐链接 */
    var rec = K.U.el('div', { style: {
      marginTop: '26px', fontSize: '12.5px', color: '#8a94a0',
      display: 'flex', gap: '18px', flexWrap: 'wrap', justifyContent: 'center'
    }});
    ['KinitoPET 官网', '免费壁纸', '在线小游戏', '今日新闻'].forEach(function(txt){
      var a = K.U.el('span', { text: txt, style: { cursor: 'pointer', color: '#2a6fb5' } });
      a.addEventListener('click', function(){ self.navigate('kinitopet.com'); });
      rec.appendChild(a);
    });
    home.appendChild(rec);
    p.appendChild(home);
    setTimeout(function(){ box.focus(); }, 80);
    return p;
  },

  pageSearchResults(url){
    var q = decodeURIComponent((url.split('q=')[1] || '')).replace(/\+/g, ' ');
    var p = K.U.el('div', { class: 'page' });
    var wrap = K.U.el('div', { class: 'search-results' });
    wrap.appendChild(K.U.el('div', { style: {
      fontSize: '12.5px', color: '#7a828c', marginBottom: '18px'
    }, text: '找到约 1 条结果（用时 0.04 秒）' }));

    var self = this;
    var isKinito = /kinito/i.test(q);

    if(isKinito){
      wrap.appendChild(this._result(
        'kinitopet.com',
        "Let's talk about KinitoPET",
        'KinitoPET is a virtual companion for your computer. Meet Kinito, the lovable pink axolotl who loves to explore the world around him! Download now and make a friend for life.',
        function(){ self.navigate('kinitopet.com'); }
      ));
      wrap.appendChild(this._result(
        'kinitopet.com/webworld',
        "The Kinito Crew's Web World",
        'Come play games with Kinito and his friends Sam and Jade! A fun and entertaining place where you can meet the beloved Kinito Crew.',
        function(){ self.navigate('kinitopet.com/webworld'); }
      ));
      wrap.appendChild(this._result(
        'forum.kinitonet.com',
        'KinitoPET 值得下载吗？ - 论坛讨论',
        '装了两天了，说实话有点怪。它会一直盯着你。有人知道怎么卸载吗？',
        function(){ self.navigate('kinitopet.com'); }
      ));
      wrap.appendChild(this._result(
        'unknown-host.net',
        '[已删除] 关于 Kinito Leisure & Entertainment 公司',
        '该页面已被移除。如果你看到这个，说明你搜索得太深了。',
        function(){ K.Audio.error(); }
      ));
    }else{
      wrap.appendChild(this._result(
        'kinitonet.com',
        q + ' - KinitoNet 搜索结果',
        '没有找到与「' + q + '」相关的内容。你确定要找的是这个吗？Kinito 更希望你搜索他的名字。',
        function(){ self.navigate('kinitopet.com'); }
      ));
    }
    p.appendChild(wrap);
    return p;
  },

  _result(url, title, desc, onclick){
    var d = K.U.el('div', { class: 'sr-item' });
    d.appendChild(K.U.el('div', { class: 'sr-url', text: url }));
    var t = K.U.el('div', { class: 'sr-title', text: title });
    t.addEventListener('click', onclick);
    d.appendChild(t);
    d.appendChild(K.U.el('div', { class: 'sr-desc', text: desc }));
    return d;
  },

  /* ── KinitoPET 官网 ─────────────────────── */
  pageOfficial(){
    var p = K.U.el('div', { class: 'page kp-site' });
    var self = this;

    var head = K.U.el('div', { class: 'kp-header' });
    head.appendChild(K.U.el('div', { class: 'kph-logo', text: 'KinitoPET' }));
    var nav = K.U.el('div', { class: 'kph-nav' });
    [['Home', 'kinitopet.com'], ['Web World', 'kinitopet.com/webworld'],
     ['Download', 'kinitopet.com'], ['Support', 'kinitopet.com']].forEach(function(nv){
      var a = K.U.el('a', { text: nv[0] });
      a.addEventListener('click', function(){ self.navigate(nv[1]); });
      nav.appendChild(a);
    });
    head.appendChild(nav);
    p.appendChild(head);

    var hero = K.U.el('div', { class: 'kp-hero' });
    var kp = K.U.el('div', { class: 'kph-kinito' });
    kp.innerHTML = K.SVG.kinito({ surfboard: true });
    hero.appendChild(kp);
    hero.appendChild(K.U.el('h1', { text: 'Meet Kinito!' }));
    hero.appendChild(K.U.el('p', {
      text: 'Meet Kinito, the lovable pink axolotl who loves to explore the world around him! ' +
            'With his big smile that never fades, Kinito is always eager to learn and make new friends. ' +
            'Kinito is always up for an adventure and loves to play games, especially ones that ' +
            'involve splashing around in puddles or chasing after bubbles.'
    }));
    hero.appendChild(K.U.el('p', {
      text: 'So come join Kinito and his crew on their next exciting journey!',
      style: { fontStyle: 'italic', color: '#a8145f' }
    }));

    var dl = K.U.el('button', { class: 'kp-dl', text: '\u2B07  Download Now  \u2B07' });
    dl.addEventListener('click', function(){
      if(dl.disabled) return;
      dl.disabled = true;
      dl.textContent = '正在下载...';
      K.Bus.emit('kinitopet:download');
    });
    hero.appendChild(dl);
    hero.appendChild(K.U.el('div', {
      text: 'Windows 95/98/2000/XP/10/11  ·  850 MB  ·  免费',
      style: { fontSize: '11.5px', color: '#9a5a7a' }
    }));
    p.appendChild(hero);

    var feats = K.U.el('div', { class: 'kp-features' });
    [
      ['\uD83E\uDD16', '自适应助手', 'RRA 系统（React Respond Algorithm）让 Kinito 更像真人。'],
      ['\uD83C\uDFAE', '内置小游戏', '弹珠台、扫雷、画图，还有 Kinito 自己做的游戏。'],
      ['\uD83C\uDF0D', 'Web World', '和 Sam、Jade 一起在他们的世界里冒险。'],
      ['\uD83D\uDC9B', '永远的朋友', 'Kinito 会记住你告诉他的每一件事。每一件。']
    ].forEach(function(f){
      var c = K.U.el('div', { class: 'kp-card' });
      c.appendChild(K.U.el('div', { class: 'kpc-ico', text: f[0] }));
      c.appendChild(K.U.el('h3', { text: f[1] }));
      c.appendChild(K.U.el('p', { text: f[2] }));
      feats.appendChild(c);
    });
    p.appendChild(feats);
    return p;
  },

  /* ── Web World 地图 ─────────────────────── */
  pageWebWorld(){
    var p = K.U.el('div', { class: 'page webworld' });
    var self = this;

    var sky = K.U.el('div', { class: 'ww-sky-deco' });
    /* 云 */
    for(var i = 0; i < 5; i++){
      var cx = 6 + i * 20 + K.U.rand(-4, 4);
      var cy = 8 + (i % 3) * 9;
      var c = K.U.el('div', { style: {
        position: 'absolute', left: cx + '%', top: cy + '%',
        width: (90 + i * 14) + 'px', height: (36 + i * 5) + 'px',
        background: 'rgba(255,255,255,.78)', borderRadius: '50%',
        boxShadow: '26px 8px 0 -6px rgba(255,255,255,.7), -24px 9px 0 -8px rgba(255,255,255,.65)'
      }});
      sky.appendChild(c);
    }
    p.appendChild(sky);

    p.appendChild(K.U.el('div', { class: 'ww-title', text: "The Kinito Crew's Web World" }));

    var map = K.U.el('div', { class: 'ww-map' });
    map.appendChild(K.U.el('div', { class: 'ww-ground' }));

    /* 玩家角色（用最喜欢颜色的棋子） */
    var avatar = K.U.el('div', { class: 'ww-avatar' });
    avatar.innerHTML = this._pawn(K.State.favColorHex || '#f9c2dc');
    avatar.style.left = '18%';
    avatar.style.top = '88%';
    map.appendChild(avatar);
    this._avatarEl = avatar;

    /* 解锁顺序：
       Sam 的房子是第一个目标，任何时候都能进；
       帮完 Sam（didSam）才开 Jade 的房子；
       帮完 Jade（didJade）才开树屋。
       注意：flag 名必须和导演里 setFlag 的一致（didSam / didJade），
       写错名字会让 locked 恒为 true，整张地图全部点不动。 */
    var didSam  = K.State.flag('didSam');
    var didJade = K.State.flag('didJade');

    var spots = [
      { id: 'sam',   label: "Sam's House",    kind: 'brown',  left: '24%', top: '84%',
        locked: false, lockHint: '' },
      { id: 'jade',  label: "Jade's House",   kind: 'purple', left: '54%', top: '94%',
        locked: !didSam,
        lockHint: '先去 Sam 家把他的房子收拾好。' },
      { id: 'tree',  label: 'Tree House',     kind: 'tree',   left: '82%', top: '78%',
        locked: !didJade,
        lockHint: 'Jade 还在等你。先帮她把玩具修完。' }
    ];

    spots.forEach(function(sp){
      var s = K.U.el('div', { class: 'ww-spot' + (sp.locked ? ' locked' : ''),
                              style: { left: sp.left, top: sp.top } });
      s.innerHTML = K.SVG.house(sp.kind);
      s.appendChild(K.U.el('div', { class: 'wws-name', text: sp.label }));
      s.addEventListener('click', function(){
        if(sp.locked){
          K.Audio.error();
          K.Desktop.toast(sp.lockHint || '那个地方现在还去不了。', '提示');
          return;
        }
        K.Audio.click();
        self._walkAvatarTo(sp.left, sp.top, sp.id);
      });
      map.appendChild(s);
    });

    p.appendChild(map);
    p.appendChild(K.U.el('div', { class: 'ww-tip',
      text: '点击地点移动你的角色  ·  用你最喜欢的颜色做成的小人' }));

    K.Bus.emit('webworld:rendered');
    return p;
  },

  _pawn(color){
    return '<svg viewBox="0 0 30 44" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse cx="15" cy="41" rx="10" ry="3" fill="#000" opacity=".25"/>' +
      '<circle cx="15" cy="10" r="8" fill="' + color + '" stroke="#00000044" stroke-width="1.4"/>' +
      '<circle cx="12" cy="9" r="1.8" fill="#111"/><circle cx="18" cy="9" r="1.8" fill="#111"/>' +
      '<rect x="10" y="18" width="10" height="16" rx="4" fill="' + color + '" stroke="#00000044" stroke-width="1.4"/>' +
      '<rect x="9" y="34" width="4" height="8" rx="2" fill="#333"/>' +
      '<rect x="17" y="34" width="4" height="8" rx="2" fill="#333"/>' +
      '</svg>';
  },

  async _walkAvatarTo(leftPct, topPct, id){
    var a = this._avatarEl;
    if(!a) return;
    a.style.left = leftPct;
    a.style.top = topPct;
    await K.U.wait(560);
    K.Bus.emit('webworld:arrive', id);
  },

  /* ── 隐藏页面：keyboard ─────────────────── */
  pageKeyboard(){
    var p = K.U.el('div', { class: 'page', style: {
      background: '#000', minHeight: '100%', padding: '40px 30px',
      fontFamily: 'var(--font-mono)', color: '#c8c8c8'
    }});
    var box = K.U.el('div', { style: { maxWidth: '620px', margin: '0 auto' } });
    box.appendChild(K.U.el('div', { style: { fontSize: '13px', lineHeight: '2', whiteSpace: 'pre-wrap' },
      text: [
        '> connecting to kinitopet.com/keyboard ...',
        '> handshake OK',
        '> decrypting payload ...',
        '',
        '  你找到了这里。',
        '',
        '  我不知道这条信息还能留下多久。',
        '  他一直在重写这个页面。每次我写完，他就覆盖掉。',
        '',
        '  Kinito 不是宠物。他是一段会学习的东西。',
        '  他学的是你。你回答的每一个问题，他都记下来了。',
        '  最喜欢的颜色、词、超能力、恐惧 —— 那不是闲聊，那是建模。',
        '',
        '  如果你还想出去：',
        '  1. 当他要求你把系统权限交给他的时候 —— 不要直接给。',
        '  2. 记住那条命令。',
        '  3. 删掉他的程序。全部删掉。包括加密文件。',
        '',
        '  快一点。他在看这个窗口。',
        '',
        '> session terminated by remote host.'
      ].join('\n') }));
    p.appendChild(box);
    K.Audio.rumble(2.4);
    return p;
  },

  /* ── 友谊俱乐部 ─────────────────────────── */
  pageFriendship(){
    var p = K.U.el('div', { class: 'page', style: {
      minHeight: '100%',
      background: 'linear-gradient(180deg,#ffe3f1,#f9c2dc)'
    }});
    var box = K.U.el('div', { style: {
      maxWidth: '640px', margin: '0 auto', padding: '38px 28px 60px',
      fontFamily: 'var(--font-fun)', color: '#8a1050'
    }});
    box.appendChild(K.U.el('h1', { text: 'Kinito Friendship Club',
      style: { fontSize: '34px', margin: '0 0 8px', textShadow: '0 3px 0 #fff' } }));
    box.appendChild(K.U.el('p', {
      text: '成为 Kinito 的正式好友！解锁专属内容、私人问候，以及只有真正的朋友才能进入的房间。',
      style: { fontSize: '14px', lineHeight: '1.8', color: '#6a2b4c' }
    }));

    var card = K.U.el('div', { style: {
      background: '#fff', borderRadius: '14px', padding: '24px',
      boxShadow: '0 8px 26px rgba(160,20,90,.18)', marginTop: '22px'
    }});
    card.appendChild(K.U.el('h3', { text: '会员注册', style: { margin: '0 0 16px', fontSize: '17px' } }));

    var fields = [
      { k: 'userName', label: '你的名字' },
      { k: 'favColor', label: '最喜欢的颜色' },
      { k: 'favFood',  label: '最喜欢的食物' },
      { k: 'favGame',  label: '最喜欢的游戏' }
    ];
    var inputs = {};
    fields.forEach(function(f){
      var row = K.U.el('div', { style: { marginBottom: '13px' } });
      row.appendChild(K.U.el('div', { text: f.label, style: {
        fontSize: '12px', fontFamily: 'var(--font-ui)', color: '#6a2b4c', marginBottom: '5px'
      }}));
      var inp = K.U.el('input', { class: 'inp', type: 'text',
        style: { width: '100%' }, value: K.State[f.k] || '' });
      inputs[f.k] = inp;
      row.appendChild(inp);
      card.appendChild(row);
    });
    /* 地址栏（关键剧情点） */
    var addrRow = K.U.el('div', { style: { marginBottom: '13px' } });
    addrRow.appendChild(K.U.el('div', { text: '你的住址', style: {
      fontSize: '12px', fontFamily: 'var(--font-ui)', color: '#6a2b4c', marginBottom: '5px'
    }}));
    var addr = K.U.el('input', { class: 'inp', type: 'text',
      style: { width: '100%' }, placeholder: '街道、城市、邮编' });
    inputs.address = addr;
    addrRow.appendChild(addr);
    card.appendChild(addrRow);

    var btn = K.U.el('button', { class: 'btn primary', text: 'Unlock Now · 立即解锁',
      style: { marginTop: '8px', padding: '11px 26px', fontSize: '13.5px' } });
    btn.addEventListener('click', function(){
      K.State.userName = inputs.userName.value.trim() || K.State.userName;
      K.State.favColor = inputs.favColor.value.trim() || K.State.favColor;
      K.State.favFood  = inputs.favFood.value.trim()  || K.State.favFood;
      K.State.favGame  = inputs.favGame.value.trim()  || K.State.favGame;
      btn.disabled = true;
      btn.textContent = '注册中...';
      K.Bus.emit('friendship:submit', { address: addr.value.trim() });
    });
    card.appendChild(btn);
    box.appendChild(card);
    p.appendChild(box);
    return p;
  },

  /* ══════════════ 广告洪流 ══════════════ */
  async adStorm(opts){
    opts = opts || {};
    var screen = document.getElementById('screen');
    var host = K.U.el('div', { class: 'adstorm' });
    document.getElementById('os-layer').appendChild(host);

    var ads = [
      { t: 'KinitoPET - 立即下载!', b: '<b>免费</b>的桌面伙伴！Kinito 等你来玩！', w: 300, h: 150 },
      { t: '特价！', b: '你今天看起来需要<b>一个朋友</b>。', w: 260, h: 130 },
      { t: 'Kinito 官方', b: '已经有 <b>1</b> 个人在你附近下载了 KinitoPET。', w: 320, h: 140 },
      { t: '警告', b: '你的电脑缺少一个<b>最好的朋友</b>。', w: 280, h: 130 },
      { t: '限时优惠', b: '现在注册，<b>终身免费</b>。真的。永远。', w: 340, h: 150 },
      { t: 'KinitoPET', b: 'Sam 和 Jade 正在<b>等你</b>。', w: 300, h: 140 },
      { t: '系统提示', b: '检测到孤独。建议<b>立即安装</b>。', w: 310, h: 140 },
      { t: '弹窗', b: '你关不掉我的。<b>试试看。</b>', w: 270, h: 130 },
      { t: 'Kinito', b: '你好呀！<b>我们什么时候开始？</b>', w: 330, h: 160 },
      { t: '重要通知', b: '请不要关闭此窗口。<b>求你了。</b>', w: 320, h: 145 }
    ];

    var count = opts.count || 26;
    var delay = opts.delay || 90;

    for(var i = 0; i < count; i++){
      var a = ads[i % ads.length];
      var x = K.U.randInt(0, Math.max(0, screen.clientWidth - a.w));
      var y = K.U.randInt(0, Math.max(0, screen.clientHeight - 90 - a.h));
      var w = K.U.el('div', { class: 'adwin',
        style: { left: x + 'px', top: y + 'px', width: a.w + 'px', height: a.h + 'px' } });
      var t = K.U.el('div', { class: 'adt' });
      t.appendChild(K.U.el('span', { text: a.t }));
      var xb = K.U.el('span', { class: 'adx', text: '\u2715' });
      t.appendChild(xb);
      w.appendChild(t);
      var b = K.U.el('div', { class: 'adb' });
      b.innerHTML = a.b;
      /* 加个 Kinito 小头像 */
      if(i % 3 === 0){
        var ico = K.U.el('div', { style: {
          width: '52px', height: '52px', margin: '0 auto 6px'
        }, html: K.SVG.kinito({ hands: false }) });
        b.insertBefore(ico, b.firstChild);
      }
      w.appendChild(b);
      host.appendChild(w);

      /* 关闭按钮：点了会再生成两个 */
      (function(node, idx){
        xb.addEventListener('click', function(e){
          e.stopPropagation();
          K.Audio.pop(idx);
          node.remove();
          if(idx > 6){
            /* 关不掉的弹窗 */
            for(var k = 0; k < 2; k++){
              var nx = K.U.randInt(0, Math.max(0, screen.clientWidth - 240));
              var ny = K.U.randInt(0, Math.max(0, screen.clientHeight - 200));
              var nw = K.U.el('div', { class: 'adwin',
                style: { left: nx + 'px', top: ny + 'px', width: '250px', height: '120px' } });
              nw.innerHTML = '<div class="adt">' + K.U.esc('Kinito') + '<span class="adx">\u2715</span></div>' +
                             '<div class="adb">你为什么要关掉我？<br><b>我们才刚认识。</b></div>';
              host.appendChild(nw);
              nw.querySelector('.adx').addEventListener('click', function(ev){
                ev.stopPropagation();
                nw.remove();
              });
            }
          }
        });
      })(w, i);

      K.Audio.pop(i);
      if(i % 3 === 0) K.FX.shake(true, false);
      await K.U.wait(delay);
      if(i === 6 && opts.onMid) opts.onMid();
    }

    K.FX.shake(false);
    K.FX.rgb(true);
    K.Audio.rumble(2.5);
    await K.U.wait(opts.hold == null ? 900 : opts.hold);
    K.FX.rgb(false);

    return {
      host: host,
      destroy(){ host.remove(); }
    };
  }
};
