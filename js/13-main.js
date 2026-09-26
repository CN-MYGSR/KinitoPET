/* ══════════════════════════════════════════════════════════════
   13-main.js — 启动器 / 全局快捷键 / 调试接口
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function(){

  /* ── 桌面图标动作（提前注册，避免加载顺序问题） ── */
  K.Apps = K.Apps || {};
  K.Apps.egg = function(){ K.Bus.emit('egg:click'); };
  K.Apps.kinitopet = function(){ K.Bus.emit('kinitopet:run'); };
  K.Apps.yourworld = function(){ K.Bus.emit('yourworld:run'); };
  K.Apps.browser = function(url){ return K.Browser.open(url); };

  /* ── 全局快捷键 ── */
  function bindHotkeys(){
    window.addEventListener('keydown', function(e){
      /* Ctrl+Shift+D 调试 */
      if(e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd'){
        e.preventDefault();
        K.DEBUG = !K.DEBUG;
        K.Desktop.toast('调试模式：' + (K.DEBUG ? '开' : '关'));
      }
      /* Ctrl+Shift+S 跳过当前等待（应急） */
      if(e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's'){
        e.preventDefault();
        K.Desktop.toast('已跳过等待。');
        K.Bus.emit('launch', 'internet');
        K.Bus.emit('kinitopet:download');
        K.Bus.emit('egg:click');
      }
      /* Esc：解除指针锁定 */
      if(e.key === 'Escape'){
        K.Kinito && K.Kinito.clearBubble && null;
      }
      /* M：静音 */
      if(e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'm'){
        e.preventDefault();
        K.Audio.muted = !K.Audio.muted;
        K.Voice.enabled = !K.Audio.muted;
        K.Desktop.toast('音频：' + (K.Audio.muted ? '静音' : '开'));
      }
    });
  }

  /* ── 页面标题与图标会随剧情变化 ── */
  function bindTitle(){
    K.Bus.on('control', function(v){
      if(v >= 70){
        document.title = 'kinitopet.exe';
      }else if(v >= 35){
        document.title = 'KinitoPET';
      }else{
        document.title = 'KinitoOS';
      }
    });
  }

  /* ── 阻止误关（恐怖段落） ── */
  function bindUnload(){
    window.addEventListener('beforeunload', function(e){
      if(K.State.controlLevel >= 80){
        e.preventDefault();
        e.returnValue = 'Kinito 不想让你走。';
        return e.returnValue;
      }
    });
  }

  /* ── 失去焦点时的"他还在这里" ── */
  function bindVisibility(){
    document.addEventListener('visibilitychange', function(){
      if(document.hidden){
        K.Voice.shut();
      }else if(K.State.controlLevel >= 55 && K.Kinito.el && K.Kinito.visible){
        setTimeout(function(){
          K.Kinito.say('你去哪了？\n\n我一直在这里等。', { dark: true, autoAdvance: 2600 });
        }, 600);
      }
    });
  }

  /* ── 启动 ── */
  async function boot(){
    K.State.load();
    K.Voice.init();
    bindHotkeys();
    bindTitle();
    bindUnload();
    bindVisibility();

    /* 强制回到开机画面 */
    K.Layers.only('boot');
    document.getElementById('stage-layer').innerHTML = '';
    document.getElementById('sysdialog-host').innerHTML = '';
    document.getElementById('os-layer').classList.add('hidden');

    /* 检测是否已经玩过（有存档则提示） */
    var hasSave = false;
    try{ hasSave = !!localStorage.getItem('kinitopet.save'); }catch(e){}

    await K.Director.run('boot');
  }

  /* ── 调试接口（控制台可用） ── */
  window.KinitoPET = {
    K: K,
    jumpTo(id){ K.Director.run(id); },
    state: K.State,
    skip(){ K.Bus.emit('launch', 'internet'); },
    unlockAll(){
      ['didBoot','didNet','didInstall','didWake','didKnow','didSam','didJade',
       'didSeek','didAd','didHub','didPaint','didBuild','didOffScript','didNight',
       'didClub','didGrant','didWorld','didSeason','didHouse'].forEach(function(f){
        K.State.setFlag(f);
      });
      K.State.controlLevel = 100;
      K.Bus.emit('control', 100);
    },
    endings(){ return K.State.endingsSeen; },
    resetEndings(){ K.State.endingsSeen = {}; K.State.save(); },
    version: K.VERSION
  };

  /* ── DOM 就绪后启动 ── */
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  }else{
    boot();
  }

})();
