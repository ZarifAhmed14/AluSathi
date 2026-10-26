'use strict';
(() => {
 const W=2172,H=304,canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const make=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c;};
 const load=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;});
 const definitions=[
  {name:'sample',path:'M563 218Q599 207 624 187L639 175L651 168Q648 156 665 156Q682 156 687 169L685 178Q691 178 686 190L679 202L673 213Q646 224 623 228L565 259L556 259Q554 237 563 218Z',pivot:[562,240],period:4000,angle:-2.6},
  {name:'phone',path:'M745 147L777 150L766 176Q773 180 765 194L762 225Q769 251 743 265Q718 263 716 244L720 223L723 210L707 206Q705 201 710 192L732 160Z',pivot:[737,247],period:4000,angle:1.2,phone:true},
  {name:'worker-left',path:'M213 215L228 215Q231 222 240 223L253 226Q261 222 266 230L272 235Q269 243 259 242L249 236L226 233L216 225Z',pivot:[220,218],period:2000,angle:-3,worker:true},
  {name:'worker-right',path:'M349 217L360 220L359 229Q348 237 333 241L314 246L307 242L311 237L333 232L346 225Z',pivot:[353,222],period:2000,angle:3.2,phase:Math.PI,worker:true}
 ];
 let art,clean,worker,layers=[],paused=false,frame=0,elapsed=0,started=0;
 function cutout(definition,data){
  const path=new Path2D(definition.path),mask=make(),mc=mask.getContext('2d'),image=mc.createImageData(W,H);
  // Keep original skin/potato pixels and dark outlines, not nearby cream shirt fabric.
  const phoneShape=new Path2D('M744 147L777 150L752 205L707 206Z');
  for(let y=145;y<269;y++)for(let x=205;x<780;x++){
   if(!mc.isPointInPath(path,x+.5,y+.5))continue;
   const p=(y*W+x)*4,r=data[p],g=data[p+1],b=data[p+2];
   const skin=r-g>22&&g-b>12;
   const outline=r<90&&g<80&&b<70;
   const phone=definition.phone&&mc.isPointInPath(phoneShape,x+.5,y+.5);
   if(skin||outline||phone){image.data[p]=image.data[p+1]=image.data[p+2]=255;image.data[p+3]=255;}
  }
  mc.putImageData(image,0,0);
  const expanded=make(),ec=expanded.getContext('2d');
  for(const [x,y] of [[0,0],[-.55,0],[.55,0],[0,-.55],[0,.55]])ec.drawImage(mask,x,y);
  const texture=make(),tc=texture.getContext('2d');tc.drawImage(art,0,0);tc.globalCompositeOperation='destination-in';tc.drawImage(expanded,0,0);
  const plate=make(),bc=plate.getContext('2d');
  if(definition.worker)bc.drawImage(worker,200,175,180,100);else bc.drawImage(clean,0,0);
  bc.globalCompositeOperation='destination-in';bc.drawImage(expanded,0,0);
  return {...definition,texture,plate};
 }
 function birds(t){
  const phase=t/8000*Math.PI*2,x=1110+140*Math.sin(phase),y=43+6*Math.cos(phase);
  ctx.save();ctx.translate(x,y);ctx.strokeStyle='#315e59';ctx.lineWidth=2.6;ctx.lineCap='round';
  for(let i=0;i<3;i++){
   ctx.save();ctx.translate(i*38,-i*9);const size=1-i*.17;ctx.scale(size,size);
   const wing=5+4*Math.sin(t/800*Math.PI*2-i*.9);
   ctx.beginPath();ctx.moveTo(-15,-2);ctx.quadraticCurveTo(-7,-wing,0,0);ctx.quadraticCurveTo(7,-wing,15,-2);ctx.stroke();ctx.restore();
  }
  ctx.restore();
 }
 function render(t){
  ctx.clearRect(0,0,W,H);ctx.drawImage(art,0,0);if(reduced.matches)return;
  for(const layer of layers)ctx.drawImage(layer.plate,0,0);
  for(const layer of layers){
   const wave=(1-Math.cos(t/layer.period*Math.PI*2+(layer.phase||0)))/2;
   ctx.save();ctx.translate(...layer.pivot);ctx.rotate(layer.angle*wave*Math.PI/180);ctx.translate(-layer.pivot[0],-layer.pivot[1]);ctx.drawImage(layer.texture,0,0);ctx.restore();
  }
  birds(t);
 }
 function tick(now){if(paused||reduced.matches)return;render(elapsed+now-started);frame=requestAnimationFrame(tick);}
 function setPaused(value){if(value===paused)return;if(value){elapsed+=performance.now()-started;cancelAnimationFrame(frame);}paused=value;if(!value){started=performance.now();frame=requestAnimationFrame(tick);}}
 Promise.all([load('banner-still.png'),load('clean-background.png'),load('worker-background.png')]).then(images=>{
  [art,clean,worker]=images;const source=make(),sc=source.getContext('2d',{willReadFrequently:true});sc.drawImage(art,0,0);const data=sc.getImageData(0,0,W,H).data;
  layers=definitions.map(definition=>cutout(definition,data));
  window.banner={render,setPaused,get paused(){return paused;},ready:true};render(0);started=performance.now();frame=requestAnimationFrame(tick);
  reduced.addEventListener('change',()=>{cancelAnimationFrame(frame);if(reduced.matches)render(0);else if(!paused){started=performance.now();frame=requestAnimationFrame(tick);}});
 }).catch(()=>document.documentElement.classList.add('still'));
 addEventListener('message',event=>{if(event.source===parent&&event.data?.type==='setPaused'&&typeof event.data.paused==='boolean')setPaused(event.data.paused);});
})();
