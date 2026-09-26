/* 验证线上修复：错误弹窗必须能被真实鼠标点掉 */
const path=require('path'), {launch,sleep}=require('./cdp.js');

async function realClick(cdp,x,y){
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y,button:'none',clickCount:0});
  await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,clickCount:1});
  await sleep(40);
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',buttons:0,clickCount:1});
}

(async()=>{
  const h=await launch({url:'https://gamesvibe.app/play/kus7_qFZvZNABThx-HFsA',windowSize:'1440,900',port:9451});
  const cdp=h.cdp;
  try{
    await sleep(9000);
    const src=await cdp.ev(`(function(){
      var f=document.querySelector('iframe');
      return f?f.src:null;
    })()`);
    console.log('游戏托管地址:', src);
    h.close();

    const g=await launch({url:src,windowSize:'1440,900',port:9452});
    const c2=g.cdp;
    try{
      await sleep(5000);
      // 线上 CSS 是否含修复
      const cssOk=await c2.ev(`(function(){
        var el=document.createElement('div');
        el.className='errpop';
        document.body.appendChild(el);
        var pe=getComputedStyle(el).pointerEvents;
        el.remove();
        return pe;
      })()`);
      console.log('线上 .errpop 的 pointer-events =', cssOk);

      // 真实弹窗 + 真实点击
      await c2.ev(`(function(){
        K.FX.errorPopup({title:'KinitoOS',message:'KinitoNet Explorer 已停止响应。',button:'关闭'});
        return true;
      })()`);
      await sleep(700);
      const r=await c2.ev(`(function(){
        var btn=document.querySelector('.errpop .ep-f button');
        if(!btn) return null;
        var b=btn.getBoundingClientRect();
        var hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
        return { x:b.left+b.width/2, y:b.top+b.height/2, hitSelf: hit===btn,
                 hitTag: hit?(hit.tagName+'.'+hit.className):'null' };
      })()`);
      console.log('hit-test:', JSON.stringify(r));
      await realClick(c2, r.x, r.y);
      await sleep(600);
      const left=await c2.ev('document.querySelectorAll(".errpop").length');
      console.log('真实点击后剩余弹窗数:', left);

      const okAll = cssOk==='auto' && r.hitSelf && left===0;
      console.log(okAll ? '\n✅ 线上修复生效：弹窗可被真实鼠标关闭' : '\n❌ 线上仍未修复');
      process.exitCode = okAll?0:1;
    } finally { g.close(); }
  } finally { try{h.close()}catch(e){} }
})();
