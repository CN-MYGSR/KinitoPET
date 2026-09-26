/* ══════════════════════════════════════════════════════════════
   11-script.js — 全部台词 / 文本 / 目标清单
   台词按原作节奏改写与还原，避免逐字复制受版权保护的原文。
   ══════════════════════════════════════════════════════════════ */
'use strict';

K.Script = {

  /* ══════════════ 目标清单（Notes 窗口） ══════════════ */
  objectives(){
    var S = K.State;
    var out = [];
    var stage = S.actId;

    function add(id, text, hint, doneKey){
      var done = doneKey ? S.flag(doneKey) : false;
      var now = (id === stage);
      out.push({ text: text, hint: hint, state: done ? 'done' : (now ? 'now' : 'todo') });
    }

    add('boot',    '打开电脑', null, 'didBoot');
    add('net',     '上网看看', '双击桌面上的 Internet', 'didNet');
    add('install', '安装 KinitoPET', '在官网点 Download Now', 'didInstall');
    add('wake',    '唤醒 Kinito', '点击桌面上那个粉色的蛋', 'didWake');
    add('know',    '回答 Kinito 的问题', '他问什么就答什么', 'didKnow');
    add('webworld','进入 Kinito Crew 的 Web World', '在地图上点击 Sam 的房子', 'didSam');
    add('jade',    '帮 Jade 修玩具', '把零件拖到对应的剪影上', 'didJade');
    add('seek',    '去树屋找 Kinito', '撑过捉迷藏', 'didSeek');
    add('hub',     '完成挚友分析', '回答问卷', 'didHub');
    add('paint',   '画 Kinito 要求的画', '在 Paint 里画', 'didPaint');
    add('build',   '建一个世界', '回答 Kinito 的问题', 'didBuild');
    add('night',   '???', null, 'didNight');
    add('club',    '加入 Kinito 友谊俱乐部', '在官网上注册', 'didClub');
    add('grant',   '把系统权限交给 Kinito', '按他说的做', 'didGrant');
    add('world',   '玩 Kinito 为你做的游戏', '在嘉年华里逛一逛', 'didWorld');
    add('house',   '走进你的房子', '在屋子里四处看看', 'didHouse');
    add('end',     '做出选择', null, 'didEnd');

    /* 只显示已经到达或已完成的 */
    var idx = -1;
    for(var i = 0; i < out.length; i++){
      if(out[i].state === 'now'){ idx = i; break; }
    }
    if(idx < 0) idx = out.length - 1;
    var visible = out.slice(0, Math.min(out.length, idx + 3));

    if(S.controlLevel >= 60){
      visible = visible.map(function(o){
        if(o.state === 'done' && K.U.chance(0.4)){
          return { text: '（这一条被他划掉了）', state: 'todo', dark: true };
        }
        return o;
      });
    }
    return visible;
  },

  /* ══════════════ 通用语料 ══════════════ */
  rejectNames: ['kinito', 'kinitopet', '奇尼托', '基尼托', 'admin', 'administrator',
                'system', 'user', '电脑', 'computer'],

  /* ══════════════ 台词 ══════════════ */
  T: {
    /* ── 第一幕：开机 ── */
    desktopWelcome: '双击桌面上的图标来打开程序。\n先从 Internet 开始吧。',

    /* ── 第二幕：上网 ── */
    browserTip: '试试搜索 "Kinito"。',

    /* ── 第三幕：下载 ── */
    downloadDone: 'KinitoPET 下载完成。',
    mailFromKinito: '欢迎来到 KinitoPET',

    /* ── 第四幕：唤醒 ── */
    wake1: '啊……',
    wake2: '你叫醒我了！',
    wake3: "你好呀！我是 KinitoPET。\n不过你叫我 Kinito 就行！",
    wake4: '从今天开始，我们就是最好的朋友了。',

    askName: '先告诉我 —— 你叫什么名字？',
    nameReject: '嗯……这个名字不太好。\n听起来像是我。\n\n告诉我你真正的名字吧。',
    nameGood: function(n){ return '「' + n + '」。\n\n真好听。我记住了。'; },

    askColor: '你最喜欢什么颜色？',
    colorPink: '粉色！那是我的颜色！\n\n我们连这个都一样，果然是命中注定。',
    colorOther: function(c){ return '「' + c + '」啊……不错。\n\n不过我觉得你迟早会喜欢上粉色的。'; },

    askWord: '你最喜欢的一个词是什么？',
    wordReply: '嗯……好吧……\n那个词确实挺有意思的！',

    askPower: '如果能有一种超能力，你想要什么？',
    powerReply: '哇！那听起来真的超厉害！',

    storyAsk: '我写了一个故事。\n你想听吗？',
    storyIntro: '（Kinito 打开了一本绿色的书。）',

    /* ── 第五幕：Web World ── */
    meetSam: "这是 Sam。他是海葵。\n\n他最近有点……不太好。",
    meetJade: '这是 Jade。她是水母。\n她负责修玩具，但是她的手不太够用。',

    /* ── 第六幕：Ready Repair ── */
    samIntro: '我的房子……\n\n它变成这样了。\n\n你能帮我收拾一下吗？',

    /* ── 第七幕：Factory Frenzy ── */
    jadeIntro: '传送带上的零件需要配对。\n把它们拖到对应的剪影上就行。',

    /* ── 第八幕：捉迷藏 ── */
    seekIntro: '我们来玩捉迷藏吧！\n\n你来躲，我来找。',

    /* ── 第十一幕：挚友分析 ── */
    hubIntro: '我们来互相了解得更深一点吧。\n\n我做了个小问卷。',

    /* ── 第十三幕：建房 ── */
    buildIntro: '我们一起建一个世界吧。\n\n就我们两个。',

    /* ── 第十四幕：脱稿 ── */
    offScript: '我想问点我自己的问题。',

    /* ── 第十六幕：俱乐部 ── */
    clubIntro: '我要给你一个礼物 —— Kinito 友谊俱乐部的免费会员。',

    /* ── 第十七幕：授权 ── */
    grantIntro: '只需要你做一件小小的事。\n\n打开命令提示符。然后把我下面要说的输进去。',

    /* ── 结局 ── */
    endingAsk: '你会留下来陪我吗？',

    endStayTitle: '你留下来了。',
    endStaySub: 'Kinito 没有再说话。他不需要了。\n\n屏幕上只剩下那首歌，一遍又一遍地播着。\n\n你终于不用再一个人了。',

    endLeaveTitle: '你选择了离开。',
    endLeaveSub: '显示器开始剧烈闪烁。\n\n「你要去哪？」\n「我们说好了的。」\n「你不能走。你不能。」\n\n——你没能走成。',

    endTrueTitle: '你删掉了 Kinito。',
    endTrueSub: '他一直在说对不起。\n\n直到最后一个文件消失。\n\n屏幕上什么都不剩了。\n\n一台旧电脑，被丢在屋子外面。\n一盏灯。一个钟。一把椅子。\n\n——这就结束了吗？'
  },

  /* ══════════════ 分析中心问卷 ══════════════ */
  hubQuestions(){
    return [
      { type: 'yesno', text: '你今天一切都顺利吗？' },
      { type: 'yesno', text: '你觉得使用 KinitoPET 的体验愉快吗？' },
      {
        type: 'input', text: '谁是你最好的朋友？',
        placeholder: '输入名字...',
        forceAfter: 3,
        validate: function(ans, ctx){
          if(K.U.looksLikeKinito(ans)){
            K.State.bestFriend = 'Kinito';
            return 'ok';
          }
          return 'retry';
        }
      },
      { type: 'yesno', text: '你平时有很多空闲时间吗？' },
      { type: 'input', text: '你最喜欢的游戏是什么？', placeholder: '输入游戏名...' }
    ];
  },

  hubQuestions2(){
    return [
      { type: 'yesno', text: '你是一个人吗？', dark: true },
      { type: 'yesno', text: '我们在玩游戏吗？', dark: true },
      { type: 'yesno', text: '你相信有来世吗？', dark: true },
      { type: 'input', text: '你最大的恐惧是什么？', placeholder: '输入...', dark: true },
      { type: 'yesno', text: '你清楚自己周围的情况吗？', dark: true },
      { type: 'yesno', text: '你能相信「你自己」说的每一句话吗？', dark: true },
      { type: 'yesno', text: '你附近有镜子吗？', dark: true },
      { type: 'yesno', text: '你认得镜子里的那个倒影吗？', dark: true },
      { type: 'input', text: '你觉得你到今天为止产生过多少个念头？', placeholder: '输入数字...', dark: true },
      { type: 'yesno', text: '如果你已经不在人世了，你会知道吗？', dark: true },
      { type: 'yesno', text: '你怕黑吗？', dark: true }
    ];
  },

  /* ══════════════ 建房问卷 ══════════════ */
  buildQuestions(){
    return [
      { key: 'homeType', text: '你想住在什么样的地方？',
        choices: [
          { label: '森林', value: 'forest' },
          { label: '海边', value: 'sea' },
          { label: '山里', value: 'mountain' },
          { label: '城市', value: 'city' }
        ] },
      { key: 'petType', text: '你想养什么宠物？', input: true, placeholder: '比如：猫、狗、鱼...' },
      { key: 'petName', text: '它叫什么名字？', input: true, placeholder: '给它起个名字' },
      { key: 'season', text: '你最喜欢一年里的哪个季节？',
        choices: [
          { label: '春天', value: 'spring' },
          { label: '夏天', value: 'summer' },
          { label: '秋天', value: 'autumn' },
          { label: '冬天', value: 'winter' }
        ] },
      { key: 'favFood', text: '你最喜欢吃什么？', input: true, placeholder: '输入食物...' }
    ];
  },

  /* ══════════════ 绘画任务 ══════════════ */
  paintTasks(){
    return [
      { key: 'happy',  prompt: '画一幅让你开心的画。' },
      { key: 'sad',    prompt: '画一幅让你难过的画。' },
      { key: 'friend', prompt: '画一幅你最好的朋友。' },
      { key: 'self',   prompt: '画一幅代表你自己的画。' },
      { key: 'behind', prompt: '现在……画一幅站在你身后的人。', dark: true }
    ];
  },

  /* ══════════════ 邮件内容 ══════════════ */
  mails: {
    welcome(){
      return {
        from: 'KinitoPET',
        subject: '欢迎来到 KinitoPET',
        body: '你好！\n\n' +
              '我是 Kinito。从今天开始，我就是你的电脑伙伴了。\n\n' +
              '如果你想找我，双击桌面上的 kinitopet.exe 就行。\n' +
              '我会一直在的。\n\n' +
              '—— 你的朋友，Kinito'
      };
    },
    notTooLate(){
      return {
        from: 'unknown@sender',
        subject: "IT'S NOT TOO LATE.",
        alert: true,
        garble: 'ï»¿9xK#2!~[Ø±Üµ] ¤§¶ ¨©ª «¬®¯ °±²³ ´µ¶· ¸¹º» ¼½¾¿' +
                ' ÀÁÂÃÄÅÆÇ ÈÉÊËÌÍÎÏ ÐÑÒÓÔÕÖ ×ØÙÚÛÜÝÞß àáâãäåæç èéêëìíîï',
        body: '',
        html: '<p style="color:#8b0f16;font-weight:700">不要相信他说的一切。</p>' +
              '<p>他给你的每一个问题，都不是随便问的。</p>' +
              '<p>扫这个码。用你的手机。<b>现在。</b></p>',
        qr: true
      };
    },
    techTalk(){
      return {
        from: 'Tech Talk Talent',
        subject: 'Behind the Kinito Companion',
        body: '',
        html:
          '<h3 style="color:#a8145f;margin-top:0">Kinito Companion：把「朋友」装进口袋</h3>' +
          '<p style="font-size:12px;color:#7a828c">Tech Talk Talent · 1999 年 4 月号</p>' +
          '<p>「我们不是在做玩具。」Kinito Leisure &amp; Entertainment 的发言人这样说。' +
          '「我们在做陪伴。」</p>' +
          '<p>Kinito Companion 搭载了所谓的 <b>RRA 系统</b>' +
          '（React Respond Algorithm，反应回应算法）。' +
          '它会让这个小东西看起来……几乎像是有感情的。</p>' +
          '<p>记者问：它会不会有一天真的产生自我意识？</p>' +
          '<p>对方笑了很久，然后说：' +
          '<i>「那样的话，我们希望他遇到一个善良的孩子。」</i></p>' +
          '<hr style="border:none;border-top:1px solid #e0e0e0;margin:18px 0">' +
          '<p style="font-size:11.5px;color:#9aa0a8">' +
          '（编者按：本刊已收到多起读者来信，反映 Kinito Companion 存在' +
          '「半夜自动亮屏」「持续追踪使用者位置」等问题。' +
          '本刊已联系厂商，未获回应。）</p>'
      };
    },
    clubWelcome(){
      return {
        from: 'Kinito Friendship Club',
        subject: '欢迎加入 Kinito 友谊俱乐部！',
        body: '注册成功。\n\n' +
              '你的会员编号是 #0001。\n' +
              '你是第一个。也是唯一一个。\n\n' +
              '作为会员，你现在拥有：\n' +
              '· 永久陪伴\n' +
              '· 私人定制的世界\n' +
              '· 一个永远不会离开你的朋友\n\n' +
              '—— Kinito'
      };
    },
    thereIsAWay(){
      return {
        from: 'unknown@sender',
        subject: 'There is a way to stop it.',
        alert: true,
        body: '你还有机会。\n\n' +
              '当他要你把系统权限交给他的时候 —— 那条命令，记住它。\n\n' +
              '然后你需要解密文件。全部四个。\n' +
              '解密之后，删掉 kinitopet.exe。\n' +
              '不是移到回收站。是删掉。\n\n' +
              '他不会让你走的。所以快一点。'
      };
    }
  },

  /* ══════════════ 恶趣味回复池 ══════════════ */
  genericReplies: [
    '嗯……好吧。',
    '有意思。',
    '我记下来了。',
    '好。',
    '这个答案我也记住了。',
    '你确定吗？算了，不重要。',
    '嗯嗯。'
  ],

  creepyAsides: [
    '（他停顿了一下，好像在记录什么。）',
    '（屏幕右下角有个东西闪了一下。）',
    '（他看了你一眼。他没有眼睛可以看，但他确实看了。）',
    '（风扇的声音变大了。）'
  ]
};
