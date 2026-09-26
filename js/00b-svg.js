/* ══════════════════════════════════════════════════════════════
   00b-svg.js — 程序化美术库
   全部图形用内联 SVG 绘制，不依赖任何外部图片素材。
   ══════════════════════════════════════════════════════════════ */
'use strict';

K.SVG = {

  /* ══════════════════════════════════════════
     Kinito the Axolotl
     浅粉椭圆头 / 两侧各三根深粉外鳃 / 黑色大眼 / 无嘴 /
     两条长黑腿 / 悬浮白色五指手 / 绿白条纹冲浪板
     ══════════════════════════════════════════ */
  kinito(opts){
    opts = opts || {};
    var id = K.U.uid();
    var pink      = opts.pink      || '#f9c2dc';
    var pinkDark  = opts.pinkDark  || '#eb8fb8';
    var gill      = opts.gill      || '#d1568f';
    var gillTip   = opts.gillTip   || '#b03f76';
    var legColor  = opts.legColor  || '#1a1a1f';
    var eyeColor  = opts.eyeColor  || '#0d0d12';
    var showBoard = opts.surfboard;
    var withHands = opts.hands !== false;
    var mouth     = opts.mouth;               /* 只有卧室段落才有嘴 */

    var s = [];
    /* viewBox 留出两侧外鳃的余量（角色中心仍在 x=110） */
    s.push('<svg viewBox="-30 -5 280 340" xmlns="http://www.w3.org/2000/svg" overflow="visible">');

    /* 渐变定义 */
    s.push('<defs>');
    s.push('<radialGradient id="hg' + id + '" cx="34%" cy="26%" r="78%">');
    s.push('<stop offset="0%" stop-color="#ffe4f0"/>');
    s.push('<stop offset="30%" stop-color="' + pink + '"/>');
    s.push('<stop offset="82%" stop-color="' + pink + '"/>');
    s.push('<stop offset="100%" stop-color="' + pinkDark + '"/>');
    s.push('</radialGradient>');
    s.push('<linearGradient id="lg' + id + '" x1="0" y1="0" x2="0" y2="1">');
    s.push('<stop offset="0%" stop-color="#3a3a44"/><stop offset="100%" stop-color="' + legColor + '"/>');
    s.push('</linearGradient>');
    if(showBoard){
      s.push('<linearGradient id="bg' + id + '" x1="0" y1="0" x2="0" y2="1">');
      s.push('<stop offset="0%" stop-color="#5fd47a"/><stop offset="100%" stop-color="#2f9a4a"/>');
      s.push('</linearGradient>');
    }
    s.push('</defs>');

    /* 冲浪板（在身体后面） */
    if(showBoard){
      s.push('<g transform="translate(110,268) rotate(-6)">');
      s.push('<ellipse cx="0" cy="0" rx="82" ry="19" fill="url(#bg' + id + ')"/>');
      s.push('<ellipse cx="0" cy="0" rx="82" ry="19" fill="none" stroke="#1f6b34" stroke-width="2.4"/>');
      s.push('<rect x="-70" y="-3.4" width="140" height="6.8" rx="3.4" fill="#ffffff" opacity=".92"/>');
      s.push('</g>');
    }

    /* 身体整体（呼吸动画组） */
    s.push('<g class="k-bob">');

    /* ── 腿（细长，占身高近一半，两条靠得较近） ── */
    s.push('<g class="k-leg-l">');
    s.push('<rect x="88" y="168" width="12" height="132" rx="6" fill="url(#lg' + id + ')"/>');
    s.push('<ellipse cx="94" cy="300" rx="16" ry="9" fill="' + legColor + '"/>');
    s.push('</g>');
    s.push('<g class="k-leg-r">');
    s.push('<rect x="120" y="168" width="12" height="132" rx="6" fill="url(#lg' + id + ')"/>');
    s.push('<ellipse cx="126" cy="300" rx="16" ry="9" fill="' + legColor + '"/>');
    s.push('</g>');

    /* ── 外鳃（每侧三根，从头部两侧向外上方展开） ── */
    function gillGroup(dir){
      var g = [];
      var sign = dir > 0 ? 1 : -1;
      var baseX = 110 + sign * 50;          /* 起点在头部侧缘 */
      /* 三根鳃：上面两根朝上外，最下面一根朝外略下 */
      var rows = [
        { y: 82,  dx: 62, dy: -46, r: 11 },
        { y: 108, dx: 74, dy: -8,  r: 12 },
        { y: 136, dx: 64, dy: 30,  r: 10 }
      ];
      rows.forEach(function(r, i){
        var ex = baseX + sign * r.dx;
        var ey = r.y + r.dy;
        var mx = baseX + sign * r.dx * 0.55;
        var my = r.y + r.dy * 0.42;
        g.push('<g class="k-gill k-gill-' + i + '">');
        /* 鳃茎（带弧度） */
        g.push('<path d="M' + baseX + ' ' + r.y + ' Q' + mx + ' ' + my + ' ' + ex + ' ' + ey + '" ' +
               'stroke="' + gill + '" stroke-width="8" fill="none" stroke-linecap="round"/>');
        /* 主鳃球 */
        g.push('<circle cx="' + ex + '" cy="' + ey + '" r="' + r.r + '" fill="' + gillTip + '"/>');
        /* 分叉小鳃球（羽毛感） */
        g.push('<circle cx="' + (ex + sign * 9) + '" cy="' + (ey - 7) + '" r="' +
               (r.r * 0.62) + '" fill="' + gill + '"/>');
        g.push('<circle cx="' + (ex + sign * 4) + '" cy="' + (ey + 9) + '" r="' +
               (r.r * 0.52) + '" fill="' + gill + '"/>');
        /* 高光 */
        g.push('<circle cx="' + (ex - 3) + '" cy="' + (ey - 4) + '" r="' +
               (r.r * 0.3) + '" fill="#ffffff" opacity=".42"/>');
        g.push('</g>');
      });
      return g.join('');
    }
    s.push(gillGroup(-1));
    s.push(gillGroup(1));

    /* ── 头 ── */
    s.push('<g class="k-head">');
    s.push('<ellipse cx="110" cy="112" rx="64" ry="70" fill="url(#hg' + id + ')"/>');
    s.push('<ellipse cx="110" cy="112" rx="64" ry="70" fill="none" stroke="' +
           pinkDark + '" stroke-width="2.6" opacity=".65"/>');

    /* 腮红 */
    s.push('<ellipse cx="72" cy="140" rx="13" ry="8" fill="#ff9dc4" opacity=".45"/>');
    s.push('<ellipse cx="148" cy="140" rx="13" ry="8" fill="#ff9dc4" opacity=".45"/>');

    /* 眼睛 */
    s.push('<g class="k-eyes">');
    [82, 138].forEach(function(cx, i){
      s.push('<g>');
      s.push('<ellipse cx="' + cx + '" cy="112" rx="12.5" ry="16" fill="' + eyeColor + '"/>');
      s.push('<ellipse class="k-pupil" cx="' + (cx - 3.6) + '" cy="' + 106 + '" rx="4.2" ry="5.2" fill="#ffffff" opacity=".9"/>');
      s.push('<ellipse class="k-pupil" cx="' + (cx + 4) + '" cy="' + 119 + '" rx="2.4" ry="2.8" fill="#ffffff" opacity=".5"/>');
      /* 眼皮（眨眼用） */
      s.push('<ellipse class="k-eyelid" cx="' + cx + '" cy="112" rx="13" ry="16.6" fill="' + pinkDark + '"/>');
      s.push('</g>');
    });
    s.push('</g>');

    /* 生气时眼部红光 */
    s.push('<g class="k-eye-glow" opacity="0" style="mix-blend-mode:screen">');
    s.push('<circle cx="82" cy="112" r="13" fill="#ff2a2a" opacity=".7"/>');
    s.push('<circle cx="138" cy="112" r="13" fill="#ff2a2a" opacity=".7"/>');
    s.push('</g>');

    /* 嘴（仅特定场景） */
    if(mouth){
      if(mouth === 'smile'){
        s.push('<path d="M92 156 Q110 172 128 156" stroke="#8a2a4a" stroke-width="3.4" ' +
               'fill="none" stroke-linecap="round"/>');
      }else if(mouth === 'open'){
        s.push('<path d="M90 152 Q110 186 130 152 Q110 162 90 152 Z" fill="#5a0f22"/>');
        s.push('<path d="M92 153 L99 161 L106 152 L113 161 L120 152 L127 160 L130 153" ' +
               'stroke="#ffffff" stroke-width="3" fill="none" stroke-linejoin="round"/>');
      }else if(mouth === 'scary'){
        s.push('<path d="M74 148 Q110 200 146 148 Q110 164 74 148 Z" fill="#3d0008"/>');
        s.push('<path d="M78 150 L88 168 L98 150 L108 170 L118 150 L128 168 L138 150 L146 158" ' +
               'stroke="#ffffff" stroke-width="3.6" fill="none" stroke-linejoin="round"/>');
      }
    }
    s.push('</g>');   /* /k-head */

    /* ── 悬浮的手（白色五指手套，掌心 + 五根香肠指 + 拇指） ── */
    if(withHands){
      function hand(x, y, flip){
        var g = [];
        g.push('<g class="k-hand" transform="translate(' + x + ',' + y + ')' +
               (flip ? ' scale(-1,1)' : '') + '">');
        /* 五指：从掌心边缘向外辐射 */
        var fingers = [
          { a: -158, l: 15, w: 6.6 },
          { a: -120, l: 19, w: 7.2 },
          { a: -82,  l: 20, w: 7.2 },
          { a: -44,  l: 18, w: 7.0 },
          { a: -8,   l: 15, w: 6.6 }
        ];
        fingers.forEach(function(f){
          var rad = f.a * Math.PI / 180;
          var c = Math.cos(rad), sn = Math.sin(rad);
          var x1 = c * 8, y1 = sn * 8;
          var x2 = c * (8 + f.l), y2 = sn * (8 + f.l);
          /* 描边做轮廓 */
          g.push('<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
                 '" stroke="#d9c6cf" stroke-width="' + (f.w + 1.6) +
                 '" stroke-linecap="round"/>');
          g.push('<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
                 '" stroke="#ffffff" stroke-width="' + f.w + '" stroke-linecap="round"/>');
          g.push('<circle cx="' + x2 + '" cy="' + y2 + '" r="' + (f.w / 2) +
                 '" fill="#ffffff"/>');
        });
        /* 拇指 */
        g.push('<line x1="-6" y1="10" x2="-18" y2="22" stroke="#d9c6cf" stroke-width="9.4" stroke-linecap="round"/>');
        g.push('<line x1="-6" y1="10" x2="-18" y2="22" stroke="#ffffff" stroke-width="7.8" stroke-linecap="round"/>');
        /* 掌 */
        g.push('<ellipse cx="0" cy="0" rx="13.5" ry="15" fill="#ffffff" ' +
               'stroke="#d9c6cf" stroke-width="1.6"/>');
        g.push('<ellipse cx="-3" cy="-3" rx="7" ry="8" fill="#ffffff" opacity=".9"/>');
        g.push('</g>');
        return g.join('');
      }
      s.push(hand(12, 214, false));
      s.push(hand(208, 214, true));
    }

    s.push('</g>');   /* /k-bob */
    s.push('</svg>');
    return s.join('');
  },

  /* 恐怖版 Kinito（跳吓用：巨口、血红眼、鳃张开） */
  kinitoFaceScary(){
    var s = [];
    s.push('<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">');
    s.push('<defs><radialGradient id="sc1" cx="42%" cy="34%" r="70%">');
    s.push('<stop offset="0%" stop-color="#ffd6e6"/><stop offset="55%" stop-color="#e88fb2"/>');
    s.push('<stop offset="100%" stop-color="#7a2a48"/></radialGradient>');
    s.push('<radialGradient id="sc2" cx="50%" cy="50%" r="50%">');
    s.push('<stop offset="0%" stop-color="#ff2020"/><stop offset="70%" stop-color="#8a0000"/>');
    s.push('<stop offset="100%" stop-color="#2a0000"/></radialGradient></defs>');
    s.push('<rect width="400" height="400" fill="#000"/>');
    /* 外鳃张开 */
    for(var i = 0; i < 3; i++){
      [[-1, 0], [1, 0]].forEach(function(side){
        var sx = side[0];
        var bx = 200 + sx * 118, by = 130 + i * 60;
        var ex = bx + sx * (70 + i * 6), ey = by - 30 + i * 26;
        s.push('<path d="M' + bx + ' ' + by + ' Q' + (bx + sx * 40) + ' ' + (by - 22) + ' ' +
               ex + ' ' + ey + '" stroke="#e07aa8" stroke-width="13" fill="none" stroke-linecap="round"/>');
        s.push('<circle cx="' + ex + '" cy="' + ey + '" r="19" fill="#c96b98"/>');
      });
    }
    /* 头 */
    s.push('<ellipse cx="200" cy="196" rx="126" ry="136" fill="url(#sc1)"/>');
    /* 眼 */
    [148, 252].forEach(function(cx){
      s.push('<ellipse cx="' + cx + '" cy="176" rx="34" ry="42" fill="#08080a"/>');
      s.push('<ellipse cx="' + cx + '" cy="176" rx="15" ry="20" fill="url(#sc2)"/>');
      s.push('<ellipse cx="' + cx + '" cy="176" rx="6" ry="9" fill="#fff"/>');
      /* 血丝 */
      for(var k = 0; k < 5; k++){
        var a = (k / 5) * Math.PI * 2;
        s.push('<line x1="' + (cx + Math.cos(a) * 16) + '" y1="' + (176 + Math.sin(a) * 20) +
               '" x2="' + (cx + Math.cos(a) * 33) + '" y2="' + (176 + Math.sin(a) * 41) +
               '" stroke="#c01010" stroke-width="2.4" opacity=".85"/>');
      }
    });
    /* 巨口 */
    s.push('<path d="M120 240 Q200 350 280 240 Q200 272 120 240 Z" fill="#2a0004"/>');
    s.push('<path d="M126 244 L142 288 L158 244 L174 292 L190 244 L206 292 L222 244 ' +
           'L238 290 L254 244 L270 286 L280 248" stroke="#f4f4f4" stroke-width="7" ' +
           'fill="none" stroke-linejoin="round"/>');
    /* 嘴角血 */
    s.push('<path d="M132 268 Q138 300 146 330" stroke="#8b0f16" stroke-width="6" ' +
           'fill="none" stroke-linecap="round" opacity=".9"/>');
    s.push('<path d="M268 266 Q262 302 254 332" stroke="#8b0f16" stroke-width="6" ' +
           'fill="none" stroke-linecap="round" opacity=".9"/>');
    s.push('</svg>');
    return s.join('');
  },

  /* 蛋（沉睡中的粉色斑点蛋） */
  egg(){
    var s = [];
    s.push('<svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg">');
    s.push('<defs><radialGradient id="eg" cx="38%" cy="30%" r="72%">');
    s.push('<stop offset="0%" stop-color="#ffffff"/><stop offset="42%" stop-color="#fbc4de"/>');
    s.push('<stop offset="100%" stop-color="#e08cb4"/></radialGradient></defs>');
    s.push('<ellipse cx="60" cy="150" rx="34" ry="7" fill="#000" opacity=".22"/>');
    s.push('<path d="M60 8 C92 34 108 74 108 104 C108 134 86 152 60 152 ' +
           'C34 152 12 134 12 104 C12 74 28 34 60 8 Z" fill="url(#eg)"/>');
    s.push('<path d="M60 8 C92 34 108 74 108 104 C108 134 86 152 60 152 ' +
           'C34 152 12 134 12 104 C12 74 28 34 60 8 Z" fill="none" ' +
           'stroke="#c96b98" stroke-width="2.4" opacity=".6"/>');
    /* 斑点 */
    var spots = [[44,54,9],[76,68,7],[58,92,11],[82,104,6],[40,104,8],[62,128,7],[46,76,5]];
    spots.forEach(function(p){
      s.push('<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="' + p[2] +
             '" ry="' + (p[2] * 0.82) + '" fill="#d9739f" opacity=".55"/>');
    });
    /* 高光 */
    s.push('<ellipse cx="42" cy="52" rx="14" ry="20" fill="#fff" opacity=".5" transform="rotate(-18 42 52)"/>');
    s.push('</svg>');
    return s.join('');
  },

  /* ══════════════════════════════════════════
     Sam the Sea Anemone（海葵）
     ══════════════════════════════════════════ */
  sam(opts){
    opts = opts || {};
    var s = [];
    s.push('<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">');
    s.push('<defs><radialGradient id="smb" cx="40%" cy="34%" r="70%">');
    s.push('<stop offset="0%" stop-color="#ffd9a8"/><stop offset="60%" stop-color="#f0a45c"/>');
    s.push('<stop offset="100%" stop-color="#c4702c"/></radialGradient></defs>');
    /* 触手 */
    for(var i = 0; i < 9; i++){
      var t = i / 8;
      var x = 40 + t * 120;
      var h = 60 + Math.sin(t * Math.PI) * 46;
      s.push('<path d="M' + x + ' 130 Q' + (x + (t - .5) * 22) + ' ' + (130 - h * 0.6) + ' ' +
             (x + (t - .5) * 34) + ' ' + (130 - h) + '" stroke="#f2b06a" ' +
             'stroke-width="9" fill="none" stroke-linecap="round"/>');
      s.push('<circle cx="' + (x + (t - .5) * 34) + '" cy="' + (130 - h) +
             '" r="7.5" fill="#ffcf94"/>');
    }
    /* 身体 */
    s.push('<ellipse cx="100" cy="150" rx="62" ry="58" fill="url(#smb)"/>');
    /* 眼 */
    s.push('<ellipse cx="80" cy="142" rx="9" ry="11" fill="#22160c"/>');
    s.push('<ellipse cx="120" cy="142" rx="9" ry="11" fill="#22160c"/>');
    s.push('<circle cx="77" cy="138" r="3" fill="#fff"/>');
    s.push('<circle cx="117" cy="138" r="3" fill="#fff"/>');
    /* 嘴 */
    if(opts.mouth === 'sad'){
      s.push('<path d="M84 176 Q100 164 116 176" stroke="#7a3a10" stroke-width="3.4" ' +
             'fill="none" stroke-linecap="round"/>');
    }else if(opts.mouth === 'scream'){
      s.push('<ellipse cx="100" cy="178" rx="14" ry="18" fill="#3d1400"/>');
    }else{
      s.push('<path d="M84 170 Q100 186 116 170" stroke="#7a3a10" stroke-width="3.4" ' +
             'fill="none" stroke-linecap="round"/>');
    }
    s.push('</svg>');
    return s.join('');
  },

  /* ══════════════════════════════════════════
     Jade the Jellyfish（水母）
     ══════════════════════════════════════════ */
  jade(opts){
    opts = opts || {};
    var s = [];
    s.push('<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">');
    s.push('<defs><radialGradient id="jdb" cx="38%" cy="28%" r="72%">');
    s.push('<stop offset="0%" stop-color="#e6d6ff"/><stop offset="55%" stop-color="#a98cf0"/>');
    s.push('<stop offset="100%" stop-color="#6a4fc0"/></radialGradient></defs>');
    /* 触须 */
    for(var i = 0; i < 7; i++){
      var x = 52 + i * 16;
      var len = 54 + (i % 3) * 16;
      s.push('<path d="M' + x + ' 148 Q' + (x + (i % 2 ? 12 : -12)) + ' ' + (148 + len * .55) +
             ' ' + (x + (i % 2 ? -8 : 8)) + ' ' + (148 + len) + '" stroke="#b8a0f2" ' +
             'stroke-width="5.5" fill="none" stroke-linecap="round" opacity=".88"/>');
    }
    /* 伞盖 */
    s.push('<path d="M34 148 C34 92 62 56 100 56 C138 56 166 92 166 148 ' +
           'C166 156 158 160 148 160 L52 160 C42 160 34 156 34 148 Z" fill="url(#jdb)"/>');
    s.push('<path d="M34 148 C34 92 62 56 100 56 C138 56 166 92 166 148" fill="none" ' +
           'stroke="#5a3fa8" stroke-width="2.6" opacity=".55"/>');
    /* 斑点 */
    s.push('<ellipse cx="72" cy="102" rx="10" ry="6" fill="#fff" opacity=".38"/>');
    s.push('<ellipse cx="126" cy="118" rx="7" ry="4.5" fill="#fff" opacity=".3"/>');
    /* 眼 */
    s.push('<ellipse cx="82" cy="124" rx="8.5" ry="10.5" fill="#1a1030"/>');
    s.push('<ellipse cx="118" cy="124" rx="8.5" ry="10.5" fill="#1a1030"/>');
    s.push('<circle cx="79" cy="120" r="2.8" fill="#fff"/>');
    s.push('<circle cx="115" cy="120" r="2.8" fill="#fff"/>');
    /* 嘴 */
    if(opts.mouth === 'sad'){
      s.push('<path d="M90 144 Q100 136 110 144" stroke="#4a2f80" stroke-width="3" ' +
             'fill="none" stroke-linecap="round"/>');
    }else{
      s.push('<path d="M90 140 Q100 152 110 140" stroke="#4a2f80" stroke-width="3" ' +
             'fill="none" stroke-linecap="round"/>');
    }
    s.push('</svg>');
    return s.join('');
  },

  /* ══════════════════════════════════════════
     建筑
     ══════════════════════════════════════════ */
  house(kind){
    var roof = '#8a5a3a', wall = '#e8d4b8', door = '#6a4a2a';
    if(kind === 'purple'){ roof = '#7a4fc0'; wall = '#e0d6f5'; door = '#4a3080'; }
    if(kind === 'tree'){ roof = '#3f8a3a'; wall = '#a8783a'; door = '#6a4a1a'; }
    var s = [];
    s.push('<svg viewBox="0 0 200 170" xmlns="http://www.w3.org/2000/svg">');
    if(kind === 'tree'){
      s.push('<rect x="92" y="96" width="16" height="66" fill="#6a4a1a"/>');
      s.push('<ellipse cx="100" cy="96" rx="76" ry="42" fill="#4ea53c"/>');
      s.push('<ellipse cx="72" cy="82" rx="42" ry="30" fill="#5fbc4a"/>');
      s.push('<ellipse cx="132" cy="88" rx="38" ry="26" fill="#3f8f30"/>');
      s.push('<rect x="70" y="74" width="60" height="52" fill="' + wall + '" rx="4"/>');
      s.push('<rect x="90" y="98" width="22" height="28" fill="' + door + '" rx="3"/>');
      s.push('<circle cx="80" cy="88" r="9" fill="#bfe9ff" stroke="#6a4a1a" stroke-width="2"/>');
      s.push('<circle cx="120" cy="88" r="9" fill="#bfe9ff" stroke="#6a4a1a" stroke-width="2"/>');
    }else{
      s.push('<rect x="30" y="70" width="140" height="92" fill="' + wall + '" rx="3"/>');
      s.push('<path d="M18 74 L100 14 L182 74 Z" fill="' + roof + '"/>');
      s.push('<path d="M18 74 L100 14 L182 74 Z" fill="none" stroke="#00000033" stroke-width="2"/>');
      s.push('<rect x="86" y="108" width="30" height="54" fill="' + door + '" rx="3"/>');
      s.push('<circle cx="110" cy="136" r="3" fill="#e8c060"/>');
      s.push('<rect x="44" y="92" width="30" height="28" fill="#bfe9ff" stroke="' + roof + '" stroke-width="3" rx="2"/>');
      s.push('<rect x="128" y="92" width="30" height="28" fill="#bfe9ff" stroke="' + roof + '" stroke-width="3" rx="2"/>');
      /* 烟囱 */
      s.push('<rect x="136" y="26" width="18" height="34" fill="' + roof + '" rx="2"/>');
    }
    s.push('<ellipse cx="100" cy="164" rx="82" ry="9" fill="#000" opacity=".14"/>');
    s.push('</svg>');
    return s.join('');
  },

  /* ══════════════════════════════════════════
     桌面图标
     ══════════════════════════════════════════ */
  icon(name){
    var s = [];
    s.push('<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">');
    switch(name){
      case 'internet':
        s.push('<circle cx="24" cy="24" r="19" fill="#2f8fd8"/>');
        s.push('<circle cx="24" cy="24" r="19" fill="none" stroke="#0e4a78" stroke-width="2"/>');
        s.push('<ellipse cx="24" cy="24" rx="8" ry="19" fill="none" stroke="#d6ecff" stroke-width="1.8"/>');
        s.push('<ellipse cx="24" cy="24" rx="15" ry="19" fill="none" stroke="#d6ecff" stroke-width="1.2" opacity=".7"/>');
        s.push('<line x1="5" y1="24" x2="43" y2="24" stroke="#d6ecff" stroke-width="1.8"/>');
        s.push('<path d="M7 15 Q24 22 41 15" stroke="#d6ecff" stroke-width="1.6" fill="none"/>');
        s.push('<path d="M7 33 Q24 26 41 33" stroke="#d6ecff" stroke-width="1.6" fill="none"/>');
        break;
      case 'mail':
        s.push('<rect x="4" y="11" width="40" height="27" rx="3" fill="#f4f6f8" stroke="#8a94a0" stroke-width="2"/>');
        s.push('<path d="M4 13 L24 28 L44 13" fill="none" stroke="#8a94a0" stroke-width="2.4"/>');
        s.push('<path d="M4 36 L18 24 M44 36 L30 24" stroke="#b0b8c0" stroke-width="1.6" fill="none"/>');
        break;
      case 'notes':
        s.push('<rect x="8" y="5" width="32" height="38" rx="2" fill="#fffbe6" stroke="#c8b870" stroke-width="2"/>');
        s.push('<line x1="14" y1="14" x2="34" y2="14" stroke="#c0b060" stroke-width="1.6"/>');
        s.push('<line x1="14" y1="21" x2="34" y2="21" stroke="#c0b060" stroke-width="1.6"/>');
        s.push('<line x1="14" y1="28" x2="28" y2="28" stroke="#c0b060" stroke-width="1.6"/>');
        break;
      case 'paint':
        s.push('<path d="M24 5 C12 5 4 13 4 23 C4 31 11 36 18 36 L21 36 C24 36 25 39 24 41 C23 44 26 45 29 45 C38 45 44 37 44 25 C44 13 36 5 24 5 Z" fill="#f2f2f2" stroke="#8a94a0" stroke-width="2"/>');
        s.push('<circle cx="15" cy="17" r="4" fill="#e0453b"/>');
        s.push('<circle cx="25" cy="12" r="4" fill="#f0c020"/>');
        s.push('<circle cx="34" cy="19" r="4" fill="#2f8fd8"/>');
        s.push('<circle cx="14" cy="28" r="4" fill="#4ea53c"/>');
        break;
      case 'cmd':
        s.push('<rect x="4" y="8" width="40" height="32" rx="2" fill="#0c0c0c" stroke="#4a4a4a" stroke-width="2"/>');
        s.push('<path d="M11 18 L17 24 L11 30" stroke="#d8d8d8" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>');
        s.push('<line x1="21" y1="30" x2="34" y2="30" stroke="#d8d8d8" stroke-width="2.6" stroke-linecap="round"/>');
        break;
      case 'files':
        s.push('<path d="M4 12 L18 12 L22 18 L44 18 L44 40 L4 40 Z" fill="#f0c860" stroke="#b8901c" stroke-width="2" stroke-linejoin="round"/>');
        s.push('<path d="M4 22 L44 22" stroke="#d8a830" stroke-width="1.6"/>');
        break;
      case 'camera':
        s.push('<rect x="4" y="14" width="40" height="26" rx="4" fill="#3a4048" stroke="#1a1e24" stroke-width="2"/>');
        s.push('<rect x="16" y="8" width="16" height="8" rx="2" fill="#3a4048" stroke="#1a1e24" stroke-width="2"/>');
        s.push('<circle cx="24" cy="27" r="9" fill="#8fd0ff" stroke="#1a1e24" stroke-width="2"/>');
        s.push('<circle cx="24" cy="27" r="4" fill="#1a1e24"/>');
        s.push('<circle cx="38" cy="19" r="2" fill="#e0453b"/>');
        break;
      case 'pinball':
        s.push('<rect x="5" y="4" width="38" height="40" rx="6" fill="#1a1e2a" stroke="#5a6a8a" stroke-width="2"/>');
        s.push('<circle cx="24" cy="15" r="5" fill="#e0c060"/>');
        s.push('<circle cx="15" cy="26" r="3" fill="#7ec8ff"/>');
        s.push('<circle cx="33" cy="30" r="3" fill="#e070a0"/>');
        s.push('<rect x="10" y="36" width="10" height="4" rx="2" fill="#4ea53c"/>');
        s.push('<rect x="28" y="36" width="10" height="4" rx="2" fill="#4ea53c"/>');
        break;
      case 'mine':
        s.push('<circle cx="24" cy="26" r="15" fill="#22262c" stroke="#0c0e12" stroke-width="2"/>');
        s.push('<path d="M24 11 L24 4 M24 41 L24 48 M9 26 L2 26 M39 26 L46 26" stroke="#0c0e12" stroke-width="3" stroke-linecap="round"/>');
        s.push('<path d="M13 15 L7 9 M35 15 L41 9 M13 37 L7 43 M35 37 L41 43" stroke="#0c0e12" stroke-width="2.6" stroke-linecap="round"/>');
        s.push('<circle cx="19" cy="21" r="4" fill="#ffffff" opacity=".85"/>');
        break;
      case 'trash':
        s.push('<path d="M14 14 L34 14 L31 42 L17 42 Z" fill="#c8d0d8" stroke="#7a848e" stroke-width="2" stroke-linejoin="round"/>');
        s.push('<rect x="11" y="9" width="26" height="5" rx="2" fill="#a8b0b8" stroke="#7a848e" stroke-width="1.6"/>');
        s.push('<line x1="20" y1="20" x2="21" y2="36" stroke="#8a949e" stroke-width="1.8"/>');
        s.push('<line x1="28" y1="20" x2="27" y2="36" stroke="#8a949e" stroke-width="1.8"/>');
        break;
      case 'kinitopet':
        s.push('<rect x="4" y="4" width="40" height="40" rx="8" fill="#f9c2dc" stroke="#d81b7a" stroke-width="2.4"/>');
        s.push('<ellipse cx="24" cy="22" rx="13" ry="14" fill="#fff"/>');
        s.push('<circle cx="19" cy="21" r="3.4" fill="#0d0d12"/>');
        s.push('<circle cx="29" cy="21" r="3.4" fill="#0d0d12"/>');
        s.push('<path d="M14 34 Q24 42 34 34" stroke="#d81b7a" stroke-width="2.6" fill="none" stroke-linecap="round"/>');
        break;
      case 'webworld':
        s.push('<circle cx="24" cy="24" r="19" fill="#7fd06a"/>');
        s.push('<ellipse cx="24" cy="20" rx="11" ry="10" fill="#f9c2dc"/>');
        s.push('<circle cx="20" cy="19" r="2.6" fill="#0d0d12"/>');
        s.push('<circle cx="28" cy="19" r="2.6" fill="#0d0d12"/>');
        s.push('<rect x="14" y="34" width="20" height="6" rx="3" fill="#4ea53c"/>');
        break;
      case 'world':
        s.push('<rect x="4" y="6" width="40" height="36" rx="4" fill="#101a2a" stroke="#4a6a9a" stroke-width="2"/>');
        s.push('<circle cx="16" cy="18" r="4" fill="#e0c060"/>');
        s.push('<path d="M8 34 L18 24 L26 32 L34 22 L40 30 L40 38 L8 38 Z" fill="#2f7a4a"/>');
        s.push('<circle cx="34" cy="14" r="3" fill="#7ec8ff"/>');
        break;
      case 'folder':
        s.push('<path d="M4 12 L18 12 L22 18 L44 18 L44 40 L4 40 Z" fill="#f0c860" stroke="#b8901c" stroke-width="2" stroke-linejoin="round"/>');
        break;
      case 'file-txt':
        s.push('<path d="M12 4 L30 4 L38 12 L38 44 L12 44 Z" fill="#fff" stroke="#9aa4ae" stroke-width="2" stroke-linejoin="round"/>');
        s.push('<path d="M30 4 L30 12 L38 12" fill="#e0e6ec" stroke="#9aa4ae" stroke-width="2" stroke-linejoin="round"/>');
        s.push('<line x1="17" y1="20" x2="33" y2="20" stroke="#b0b8c0" stroke-width="1.8"/>');
        s.push('<line x1="17" y1="26" x2="33" y2="26" stroke="#b0b8c0" stroke-width="1.8"/>');
        s.push('<line x1="17" y1="32" x2="27" y2="32" stroke="#b0b8c0" stroke-width="1.8"/>');
        break;
      case 'file-png':
        s.push('<path d="M12 4 L30 4 L38 12 L38 44 L12 44 Z" fill="#fff" stroke="#9aa4ae" stroke-width="2" stroke-linejoin="round"/>');
        s.push('<path d="M30 4 L30 12 L38 12" fill="#e0e6ec" stroke="#9aa4ae" stroke-width="2" stroke-linejoin="round"/>');
        s.push('<circle cx="21" cy="22" r="3" fill="#f0c020"/>');
        s.push('<path d="M16 38 L22 30 L28 36 L32 32 L34 38 Z" fill="#4ea53c"/>');
        break;
      case 'file-mp4':
        s.push('<path d="M12 4 L30 4 L38 12 L38 44 L12 44 Z" fill="#fff" stroke="#9aa4ae" stroke-width="2" stroke-linejoin="round"/>');
        s.push('<path d="M30 4 L30 12 L38 12" fill="#e0e6ec" stroke="#9aa4ae" stroke-width="2" stroke-linejoin="round"/>');
        s.push('<path d="M21 20 L31 27 L21 34 Z" fill="#e0453b"/>');
        break;
      case 'file-exe':
        s.push('<rect x="10" y="6" width="28" height="36" rx="3" fill="#dfe6f0" stroke="#7a8a9e" stroke-width="2"/>');
        s.push('<rect x="10" y="6" width="28" height="9" fill="#2f8fd8"/>');
        s.push('<path d="M20 24 L28 30 L20 36 Z" fill="#2f8fd8"/>');
        break;
      case 'file-sys':
        s.push('<rect x="10" y="6" width="28" height="36" rx="3" fill="#2a0a0c" stroke="#8b0f16" stroke-width="2"/>');
        s.push('<path d="M20 20 L28 26 L20 32 Z" fill="#c02020"/>');
        break;
      case 'file-corrupt':
        s.push('<path d="M12 4 L30 4 L38 12 L38 44 L12 44 Z" fill="#2a0a0c" stroke="#8b0f16" stroke-width="2" stroke-linejoin="round"/>');
        s.push('<text x="25" y="32" font-size="20" text-anchor="middle" fill="#c02020" font-family="monospace">?</text>');
        break;
      case 'floppy':
        s.push('<rect x="8" y="8" width="32" height="32" rx="3" fill="#2a3a52" stroke="#16202e" stroke-width="2"/>');
        s.push('<rect x="15" y="10" width="18" height="13" fill="#c8d0d8"/>');
        s.push('<rect x="19" y="12" width="10" height="9" fill="#4a5a72"/>');
        s.push('<rect x="14" y="30" width="20" height="10" fill="#c8d0d8"/>');
        break;
      default:
        s.push('<rect x="10" y="8" width="28" height="32" rx="3" fill="#e0e6ec" stroke="#8a94a0" stroke-width="2"/>');
    }
    s.push('</svg>');
    return s.join('');
  },

  /* ══════════════════════════════════════════
     独眼黑影（The Eye / I am waiting for you）
     ══════════════════════════════════════════ */
  darkOne(){
    var s = [];
    s.push('<svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">');
    s.push('<defs><radialGradient id="dob" cx="50%" cy="34%" r="66%">');
    s.push('<stop offset="0%" stop-color="#1a1016"/><stop offset="100%" stop-color="#000"/></radialGradient>');
    s.push('<radialGradient id="doe" cx="50%" cy="50%" r="50%">');
    s.push('<stop offset="0%" stop-color="#ffffff"/><stop offset="34%" stop-color="#ffe9a8"/>');
    s.push('<stop offset="72%" stop-color="#c08a10"/><stop offset="100%" stop-color="#3a2600"/></radialGradient></defs>');
    /* 身体 */
    s.push('<path d="M150 22 C214 22 250 78 250 156 L250 400 L50 400 L50 156 C50 78 86 22 150 22 Z" fill="url(#dob)"/>');
    /* 独眼 */
    s.push('<g class="do-eye">');
    s.push('<ellipse cx="150" cy="146" rx="54" ry="42" fill="#0a0a0c"/>');
    s.push('<ellipse cx="150" cy="146" rx="44" ry="33" fill="url(#doe)"/>');
    s.push('<ellipse cx="150" cy="146" rx="15" ry="26" fill="#050506"/>');
    s.push('<ellipse cx="141" cy="134" rx="6" ry="8" fill="#fff" opacity=".9"/>');
    s.push('</g>');
    /* 裂纹 */
    s.push('<path d="M110 62 L124 96 L108 118 L126 152" stroke="#3a1a1a" stroke-width="3" fill="none"/>');
    s.push('<path d="M196 74 L184 104 L200 126 L186 158" stroke="#3a1a1a" stroke-width="3" fill="none"/>');
    s.push('</svg>');
    return s.join('');
  },

  /* ══════════════════════════════════════════
     人形剪影
     ══════════════════════════════════════════ */
  silhouetteFigure(kind){
    var s = [];
    s.push('<svg viewBox="0 0 100 220" xmlns="http://www.w3.org/2000/svg">');
    if(kind === 'sam'){
      s.push('<ellipse cx="50" cy="34" rx="27" ry="30" fill="#000"/>');
      s.push('<path d="M50 64 L50 78 M32 56 Q18 34 12 12 M68 56 Q82 34 88 12 M38 62 Q30 38 26 16 M62 62 Q70 38 74 16" stroke="#000" stroke-width="9" fill="none" stroke-linecap="round"/>');
      s.push('<path d="M24 86 Q50 74 76 86 L80 210 L20 210 Z" fill="#000"/>');
    }else if(kind === 'body'){
      s.push('<rect x="12" y="14" width="76" height="192" rx="26" fill="#000"/>');
      s.push('<path d="M22 22 Q50 10 78 22" stroke="#000" stroke-width="8" fill="none"/>');
    }else{
      s.push('<circle cx="50" cy="30" r="24" fill="#000"/>');
      s.push('<path d="M50 54 L50 68 M30 62 Q14 44 10 22 M70 62 Q86 44 90 22" stroke="#000" stroke-width="8" fill="none" stroke-linecap="round"/>');
      s.push('<path d="M22 74 Q50 62 78 74 L74 140 L60 140 L60 210 L40 210 L40 140 L26 140 Z" fill="#000"/>');
    }
    s.push('</svg>');
    return s.join('');
  },

  /* ══════════════════════════════════════════
     结局场景：荒野中的旧电脑
     ══════════════════════════════════════════ */
  endingScene(mode){
    var s = [];
    s.push('<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">');
    s.push('<defs>');
    s.push('<linearGradient id="esky" x1="0" y1="0" x2="0" y2="1">');
    if(mode === 'warm'){
      s.push('<stop offset="0%" stop-color="#ffd9a8"/><stop offset="52%" stop-color="#f0a06a"/>');
      s.push('<stop offset="100%" stop-color="#7a4a3a"/>');
    }else{
      s.push('<stop offset="0%" stop-color="#1a2030"/><stop offset="52%" stop-color="#2a3040"/>');
      s.push('<stop offset="100%" stop-color="#14181f"/>');
    }
    s.push('</linearGradient>');
    s.push('<radialGradient id="eglow" cx="50%" cy="50%" r="50%">');
    s.push('<stop offset="0%" stop-color="#ffe9a8" stop-opacity=".9"/>');
    s.push('<stop offset="100%" stop-color="#ffe9a8" stop-opacity="0"/>');
    s.push('</radialGradient>');
    s.push('</defs>');
    s.push('<rect width="800" height="450" fill="url(#esky)"/>');
    /* 远山 */
    s.push('<path d="M0 300 L140 210 L260 300 L400 190 L560 300 L700 220 L800 300 L800 450 L0 450 Z" fill="' +
           (mode === 'warm' ? '#5a3a2e' : '#0e1219') + '"/>');
    /* 地面 */
    s.push('<rect y="330" width="800" height="120" fill="' + (mode === 'warm' ? '#3a2418' : '#080a0e') + '"/>');
    /* 椅子 */
    s.push('<path d="M180 400 L180 320 L232 320 L232 400 M186 330 L226 330" stroke="' +
           (mode === 'warm' ? '#2a1a12' : '#05070a') + '" stroke-width="9" fill="none"/>');
    /* 桌子 */
    s.push('<rect x="300" y="352" width="220" height="12" fill="' + (mode === 'warm' ? '#3a2618' : '#0a0c10') + '"/>');
    s.push('<rect x="312" y="364" width="10" height="42" fill="' + (mode === 'warm' ? '#2a1a12' : '#07090c') + '"/>');
    s.push('<rect x="498" y="364" width="10" height="42" fill="' + (mode === 'warm' ? '#2a1a12' : '#07090c') + '"/>');
    /* 旧显示器 */
    s.push('<rect x="352" y="266" width="118" height="88" rx="8" fill="' + (mode === 'warm' ? '#c8c0b4' : '#3a4048') + '"/>');
    s.push('<rect x="362" y="276" width="98" height="66" rx="4" fill="#0a0a0c"/>');
    s.push('<rect x="368" y="282" width="86" height="54" rx="3" fill="#16202a" opacity=".9"/>');
    s.push('<rect x="392" y="354" width="38" height="10" fill="' + (mode === 'warm' ? '#b0a89c' : '#2a3038') + '"/>');
    /* 屏幕微光 */
    s.push('<circle cx="411" cy="309" r="70" fill="url(#eglow)" opacity=".28"/>');
    /* 灯泡 */
    s.push('<line x1="620" y1="120" x2="620" y2="176" stroke="' + (mode === 'warm' ? '#2a1a12' : '#0a0c10') + '" stroke-width="4"/>');
    s.push('<circle cx="620" cy="196" r="21" fill="' + (mode === 'warm' ? '#ffe9a8' : '#2a2a30') + '"/>');
    s.push('<circle cx="620" cy="196" r="42" fill="url(#eglow)" opacity="' + (mode === 'warm' ? '.5' : '.08') + '"/>');
    s.push('<rect x="606" y="214" width="28" height="10" rx="3" fill="' + (mode === 'warm' ? '#8a8078' : '#22262c') + '"/>');
    /* 时钟 */
    s.push('<circle cx="722" cy="230" r="26" fill="' + (mode === 'warm' ? '#e8e0d4' : '#2a3038') + '" stroke="' + (mode === 'warm' ? '#8a8078' : '#12161c') + '" stroke-width="4"/>');
    s.push('<line x1="722" y1="230" x2="722" y2="214" stroke="#1a1a1a" stroke-width="3.4" stroke-linecap="round"/>');
    s.push('<line x1="722" y1="230" x2="735" y2="236" stroke="#1a1a1a" stroke-width="2.6" stroke-linecap="round"/>');
    /* 草 */
    for(var i = 0; i < 26; i++){
      var gx = i * 32 + 8;
      var gh = 12 + (i % 5) * 6;
      s.push('<path d="M' + gx + ' 450 Q' + (gx + 4) + ' ' + (450 - gh) + ' ' + (gx + 9) + ' 450" stroke="' +
             (mode === 'warm' ? '#3a2a18' : '#0c1014') + '" stroke-width="3" fill="none"/>');
    }
    s.push('</svg>');
    return s.join('');
  },

  /* ══════════════════════════════════════════
     伪 QR 码（程序化生成，用于"IT'S NOT TOO LATE"邮件）
     ══════════════════════════════════════════ */
  qrCode(seed){
    seed = seed || 20240109;
    var N = 25, cell = 6, pad = 2;
    var size = N * cell + pad * 2;
    var rnd = (function(s){
      return function(){ s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    })(seed);

    var grid = [];
    for(var y = 0; y < N; y++){
      grid.push([]);
      for(var x = 0; x < N; x++) grid[y].push(rnd() < 0.47 ? 1 : 0);
    }
    /* 三个定位角 */
    function finder(ox, oy){
      for(var y = 0; y < 7; y++){
        for(var x = 0; x < 7; x++){
          var edge = (x === 0 || x === 6 || y === 0 || y === 6);
          var core = (x >= 2 && x <= 4 && y >= 2 && y <= 4);
          grid[oy + y][ox + x] = (edge || core) ? 1 : 0;
        }
      }
      /* 静默区 */
      for(var k = -1; k <= 7; k++){
        if(oy + k >= 0 && oy + k < N){ if(ox - 1 >= 0) grid[oy + k][ox - 1] = 0; if(ox + 7 < N) grid[oy + k][ox + 7] = 0; }
        if(ox + k >= 0 && ox + k < N){ if(oy - 1 >= 0) grid[oy - 1][ox + k] = 0; if(oy + 7 < N) grid[oy + 7][ox + k] = 0; }
      }
    }
    finder(0, 0); finder(N - 7, 0); finder(0, N - 7);

    var s = ['<svg viewBox="0 0 ' + size + ' ' + size + '" xmlns="http://www.w3.org/2000/svg" ' +
             'style="width:100%;height:100%;display:block">'];
    s.push('<rect width="' + size + '" height="' + size + '" fill="#fff"/>');
    for(var yy = 0; yy < N; yy++){
      for(var xx = 0; xx < N; xx++){
        if(grid[yy][xx]){
          s.push('<rect x="' + (pad + xx * cell) + '" y="' + (pad + yy * cell) +
                 '" width="' + cell + '" height="' + cell + '" fill="#0b0b0e"/>');
        }
      }
    }
    s.push('</svg>');
    return s.join('');
  },

  /* 小图标：Kinito 头像（用于对话框/标题栏） */
  kinitoAvatar(size){
    size = size || 32;
    return '<svg viewBox="0 0 40 40" width="' + size + '" height="' + size + '">' +
      '<ellipse cx="20" cy="20" rx="15" ry="16" fill="#f9c2dc"/>' +
      '<path d="M6 16 L0 11 M6 20 L0 20 M6 25 L0 29 M34 16 L40 11 M34 20 L40 20 M34 25 L40 29" ' +
      'stroke="#e07aa8" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="14" cy="19" r="3.6" fill="#0d0d12"/>' +
      '<circle cx="26" cy="19" r="3.6" fill="#0d0d12"/>' +
      '<circle cx="12.6" cy="17.4" r="1.3" fill="#fff"/>' +
      '<circle cx="24.6" cy="17.4" r="1.3" fill="#fff"/>' +
      '</svg>';
  }
};
