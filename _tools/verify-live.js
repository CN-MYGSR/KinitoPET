const path=require('path'),fs=require('fs');
const {launch,sleep}=require('./cdp.js');
(async()=>{
  const URL='https://gamesvibe.app/play/kus7_qFZvZNABThx-HFsA';
  const h=await launch({url:URL,windowSize:'1440,900',port:9431});
  const cdp=h.cdp;
  try{
    await sleep(9000);
    const frames=await cdp.ev('window.__n=0; true').catch(()=>null);
    // 找 iframe
    const info=await cdp.ev(`(function(){
      var f=document.querySelectorAll('iframe');
      return { iframes:f.length, srcs:Array.prototype.map.call(f,function(x){return x.src}) };
    })()`);
    console.log('iframe:',JSON.stringify(info));
    // 直接访问 iframe 内容
    let ok=false, detail='';
    if(info&&info.srcs&&info.srcs[0]){
      const g=await launch({url:info.srcs[0],windowSize:'1440,900',port:9432});
      await sleep(4000);
      const r=await g.cdp.ev(`(function(){
        return { k: typeof window.K!=='undefined',
                 boot: !!document.querySelector('.crt-power'),
                 title: document.title,
                 err: (window.K&&K.errors)?K.errors.length:-1 };
      })()`).catch(e=>({err:'eval失败: '+e.message}));
      detail=JSON.stringify(r); ok=!!(r&&r.boot);
      await g.cdp.shot(path.join(__dirname,'shots-live','live.png'));
      g.close();
    }
    console.log('游戏页面:',detail);
    console.log(ok?'✅ 线上游戏已加载（电源键已渲染）':'⚠️ 未确认');
  } finally { h.close(); }
})();
