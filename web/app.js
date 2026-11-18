(function(){'use strict';
const $=s=>document.querySelector(s),clamp=(v,a,b)=>v<a?a:v>b?b:v,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ICON=n=>`<svg class="i"><use href="#${n}"/></svg>`;
const LI={en:0,fr:1,es:2,ar:3};
const S={lang:'en',url:null,file:null,dur:0,vw:0,vh:0,t:0,a:0,b:0,playing:false,fmt:'orig',bg:'blur',audio:'keep',bleeps:[],masks:[],sel:null,tab:'masks',cmp:false,busy:false,fps:30,undo:[],uid:1,q:0};
const video=document.createElement('video');video.playsInline=true;video.preload='auto';video.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';document.body.appendChild(video);
const pv=$('#pv'),pctx=pv.getContext('2d'),ov=$('#ov'),octx=ov.getContext('2d'),tl=$('#tl'),tctx=tl.getContext('2d');
function T(k,a){const e=I[k];let s=e?(e[LI[S.lang]]||e[0]):k;if(a)for(const n in a)s=s.split('{'+n+'}').join(a[n]);return s}
function fmtT(t){t=Math.max(0,t);const m=Math.floor(t/60),s=t-m*60;return String(m).padStart(2,'0')+':'+s.toFixed(1).padStart(4,'0')}
function toast(m){const e=$('#toast');e.textContent=m;e.classList.remove('hide');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.add('hide'),3400)}

/* ---------- language ---------- */
function setLang(l){S.lang=LANGS[l]?l:'en';try{localStorage.setItem('bc_lang',S.lang)}catch(e){}
  document.documentElement.lang=S.lang;document.documentElement.dir=S.lang==='ar'?'rtl':'ltr';
  document.querySelectorAll('[data-t]').forEach(e=>e.textContent=T(e.dataset.t));document.querySelectorAll('[data-ta]').forEach(e=>e.setAttribute('aria-label',T(e.dataset.ta)));
  if(S.url)renderPanel()}

/* ---------- masks ---------- */
function boxAt(m,t){const k=m.kf,n=k.length;if(n===1||t<=k[0].t)return k[0];if(t>=k[n-1].t)return k[n-1];let lo=0,hi=n-1;while(hi-lo>1){const c=(lo+hi)>>1;if(k[c].t<=t)lo=c;else hi=c}
  const a=k[lo],b=k[hi],u=(t-a.t)/Math.max(1e-6,b.t-a.t),L=(p,q)=>p+(q-p)*u;return{t,x:L(a.x,b.x),y:L(a.y,b.y),w:L(a.w,b.w),h:L(a.h,b.h),c:Math.min(a.c,b.c),g:Math.max(a.g,b.g)}}
const isOn=(m,t)=>t>=m.in-1e-3&&t<=m.out+1e-3;
const sel=()=>S.masks.find(m=>m.id===S.sel)||null;
const mName=m=>T(m.type)+' '+(S.masks.indexOf(m)+1);
function pushUndo(){S.undo.push(JSON.stringify({m:S.masks,s:S.sel}));if(S.undo.length>24)S.undo.shift()}
function addMask(type,box){pushUndo();const size={face:[.2,.2*S.vw/S.vh],plate:[.3,.1],text:[.42,.09],box:[.34,.2]}[type]||[.3,.2];
  const b=box||{w:size[0],h:Math.min(.5,size[1])};if(!box){b.x=.5-b.w/2;b.y=.42-b.h/2}
  const m={id:S.uid++,type,style:(type==='plate'||type==='text')?'solid':type==='face'?'blur':'mosaic',shape:type==='face'?'oval':'rect',str:6,in:0,out:S.dur,kf:[{t:S.t,x:b.x,y:b.y,w:b.w,h:b.h,c:1,g:1}]};
  S.masks.push(m);S.sel=m.id;$('#hint').classList.add('hide');renderPanel();dirty()}
function setKey(m,b){const k=m.kf;if(k.length===1){Object.assign(k[0],b,{c:1,g:1});return}const fr=.5/15;let i=k.findIndex(e=>Math.abs(e.t-S.t)<fr);if(i>=0)Object.assign(k[i],b,{c:1,g:1});else{k.push({t:S.t,...b,c:1,g:1});k.sort((p,q)=>p.t-q.t)}}

/* ---------- renderer: masks are burned into the frame before anything else is drawn ---------- */
function mk(w,h){const c=document.createElement('canvas');c.width=w||2;c.height=h||2;return c}
function makeRenderer(){const fc=mk(),fx=fc.getContext('2d'),tiny=mk(),tx=tiny.getContext('2d'),pad=mk(48,48),px=pad.getContext('2d');
  function maskOn(m,t,fw,fh){const b=boxAt(m,t),g=b.g||1,w=b.w*g*fw,h=b.h*g*fh,x=b.x*fw-(w-b.w*fw)/2,y=b.y*fh-(h-b.h*fh)/2;if(w<2||h<2)return;
    fx.save();fx.beginPath();if(m.shape==='oval')fx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);else fx.rect(x,y,w,h);fx.clip();
    if(m.style==='solid'){fx.fillStyle='#050505';fx.fillRect(x-2,y-2,w+4,h+4)}
    else{const n=Math.max(2,12-m.str),cell=Math.max(4,Math.min(w,h)/n),mar=m.style==='blur'?cell:0,x0=Math.max(0,Math.floor(x-mar)),y0=Math.max(0,Math.floor(y-mar)),x1=Math.min(fw,Math.ceil(x+w+mar)),y1=Math.min(fh,Math.ceil(y+h+mar)),rw=x1-x0,rh=y1-y0;
      if(rw>0&&rh>0){const tw=Math.max(1,Math.round(rw/cell)),th=Math.max(1,Math.round(rh/cell));tiny.width=tw;tiny.height=th;tx.imageSmoothingEnabled=true;tx.imageSmoothingQuality='high';tx.drawImage(fc,x0,y0,rw,rh,0,0,tw,th);
        if(m.style==='mosaic'){fx.imageSmoothingEnabled=false;fx.drawImage(tiny,0,0,tw,th,x0,y0,rw,rh);fx.imageSmoothingEnabled=true}
        else{fx.filter=`blur(${Math.round(cell*.55)}px)`;fx.drawImage(tiny,0,0,tw,th,x0,y0,rw,rh);fx.filter='none'}}}
    fx.restore()}
  return function(ctx,W,H,t,bare){const r=S.vw/S.vh,R=W/H;let fw,fh;if(r>R){fw=W;fh=W/r}else{fh=H;fw=H*r}fw=Math.round(fw);fh=Math.round(fh);
    if(fc.width!==fw||fc.height!==fh){fc.width=fw;fc.height=fh}fx.drawImage(video,0,0,fw,fh);if(!bare)for(const m of S.masks)if(isOn(m,t))maskOn(m,t,fw,fh);
    const ox=Math.round((W-fw)/2),oy=Math.round((H-fh)/2);ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
    if((ox>0||oy>0)&&S.bg==='blur'){px.drawImage(fc,0,0,48,48);ctx.save();ctx.filter=`blur(${Math.round(Math.max(W,H)/28)}px) brightness(.55)`;ctx.imageSmoothingEnabled=true;ctx.drawImage(pad,-W*.1,-H*.1,W*1.2,H*1.2);ctx.restore()}
    ctx.drawImage(fc,ox,oy);return{x:ox,y:oy,w:fw,h:fh}}}
const previewR=makeRenderer(),exportR=makeRenderer();

/* ---------- stage ---------- */
let vr={x:0,y:0,w:1,h:1},cssW=1,cssH=1,DPR=1,needs=true;const dirty=()=>{needs=true};
function ratio(){return{orig:S.vw/S.vh,'9:16':9/16,'1:1':1,'4:5':.8,'16:9':16/9}[S.fmt]}
function layout(){if(!S.url)return;const st=$('#stage'),aw=st.clientWidth,ah=st.clientHeight,r=ratio();let w=aw,h=aw/r;if(h>ah){h=ah;w=ah*r}cssW=Math.max(1,Math.floor(w));cssH=Math.max(1,Math.floor(h));DPR=Math.min(2,devicePixelRatio||1);
  const k=Math.min(1,960/Math.max(cssW*DPR,cssH*DPR));pv.width=Math.round(cssW*DPR*k);pv.height=Math.round(cssH*DPR*k);pv.style.width=cssW+'px';pv.style.height=cssH+'px';ov.width=cssW*DPR;ov.height=cssH*DPR;ov.style.width=cssW+'px';ov.style.height=cssH+'px';
  const tw=tl.clientWidth;tl.width=tw*DPR;tl.height=76*DPR;dirty()}
function draw(){if(video.readyState<2)return;const k=cssW/pv.width,q=previewR(pctx,pv.width,pv.height,S.t,S.cmp);vr={x:q.x*k,y:q.y*k,w:q.w*k,h:q.h*k};drawOverlay();drawTL();$('#tc').innerHTML=`${fmtT(S.t-S.a)} <small>/ ${fmtT(S.b-S.a)}</small>`}
function maskPx(m,t){const b=boxAt(m,t),g=b.g||1,w=b.w*g*vr.w,h=b.h*g*vr.h;return{x:vr.x+b.x*vr.w-(w-b.w*vr.w)/2,y:vr.y+b.y*vr.h-(h-b.h*vr.h)/2,w,h,c:b.c}}
function drawOverlay(){octx.setTransform(DPR,0,0,DPR,0,0);octx.clearRect(0,0,cssW,cssH);if(S.cmp||S.busy==='export')return;
  for(const m of S.masks){if(!isOn(m,S.t))continue;const p=maskPx(m,S.t),on=m.id===S.sel,low=p.c<.6;octx.lineWidth=on?2.5:1.25;octx.strokeStyle=low?'#ff6a4d':on?'#ffe14a':'rgba(243,239,228,.6)';octx.setLineDash(on?[]:[5,4]);octx.beginPath();if(m.shape==='oval')octx.ellipse(p.x+p.w/2,p.y+p.h/2,p.w/2,p.h/2,0,0,7);else octx.rect(p.x,p.y,p.w,p.h);octx.stroke();octx.setLineDash([]);
    if(on){if(m.kf.length>1){octx.strokeStyle='rgba(255,225,74,.55)';octx.lineWidth=1.5;octx.beginPath();const st=Math.max(1,Math.floor(m.kf.length/90));m.kf.forEach((k,i)=>{if(i%st)return;const X=vr.x+(k.x+k.w/2)*vr.w,Y=vr.y+(k.y+k.h/2)*vr.h;i?octx.lineTo(X,Y):octx.moveTo(X,Y)});octx.stroke()}
      octx.fillStyle='#ffe14a';octx.strokeStyle='#0d0d0b';octx.lineWidth=2;octx.beginPath();octx.arc(p.x+p.w,p.y+p.h,9,0,7);octx.fill();octx.stroke()}}}
function drawTL(){const W=tl.clientWidth,H=76,c=tctx;c.setTransform(DPR,0,0,DPR,0,0);c.clearRect(0,0,W,H);const X=t=>t/S.dur*W,th=44;
  if(thumbs)c.drawImage(thumbs,0,0,W,th);else{c.fillStyle='#211f1b';c.fillRect(0,0,W,th)}
  c.fillStyle='rgba(13,13,11,.76)';c.fillRect(0,0,X(S.a),th);c.fillRect(X(S.b),0,W-X(S.b),th);
  c.strokeStyle='#ffe14a';c.lineWidth=3;c.strokeRect(X(S.a)+1.5,1.5,X(S.b)-X(S.a)-3,th-3);c.fillStyle='#ffe14a';c.fillRect(X(S.a),0,11,th);c.fillRect(X(S.b)-11,0,11,th);c.fillStyle='#16140a';c.fillRect(X(S.a)+4,15,3,14);c.fillRect(X(S.b)-7,15,3,14);
  const list=S.masks.slice(-3);list.forEach((m,i)=>{const y=th+6+i*8;c.fillStyle='#322f29';c.fillRect(0,y,W,5);c.fillStyle=m.id===S.sel?'#ffe14a':'#a39d8e';c.fillRect(X(m.in),y,Math.max(2,X(m.out)-X(m.in)),5);c.fillStyle='#ff6a4d';for(const k of m.kf)if(k.c<.6)c.fillRect(X(k.t)-1,y,3,5)});
  c.fillStyle='#86dc9b';for(const b of S.bleeps)c.fillRect(X(b.t),th-6,Math.max(3,X(b.d)),6);
  c.fillStyle='#f3efe4';c.fillRect(X(S.t)-1,0,2,H);c.beginPath();c.arc(X(S.t),H-5,4.5,0,7);c.fill()}

/* ---------- pointer: masks ---------- */
let drag=null;const touches=new Map();
const copyBox=b=>({x:b.x,y:b.y,w:b.w,h:b.h});
function pos(e){const r=ov.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
function inMask(m,p,pad){const q=maskPx(m,S.t);return p.x>=q.x-pad&&p.x<=q.x+q.w+pad&&p.y>=q.y-pad&&p.y<=q.y+q.h+pad}
function hitMask(p,pad){const s=sel();if(s&&isOn(s,S.t)&&inMask(s,p,pad))return s;for(let i=S.masks.length-1;i>=0;i--){const m=S.masks[i];if(isOn(m,S.t)&&inMask(m,p,pad))return m}return null}
function pinchInfo(){const[a,b]=[...touches.values()];return{d:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),x:(a.x+b.x)/2,y:(a.y+b.y)/2}}
ov.addEventListener('pointerdown',e=>{if(S.busy)return;ov.setPointerCapture(e.pointerId);touches.set(e.pointerId,pos(e));pause();
  if(touches.size===2){const m=(drag&&drag.k)||sel();if(m&&isOn(m,S.t)){if(!drag||!drag.k)pushUndo();S.sel=m.id;drag={m:'pinch',k:m,b:copyBox(boxAt(m,S.t)),s:pinchInfo()};renderPanel()}else drag=null;dirty();return}
  if(touches.size>2)return;const p=pos(e),s=sel();
  if(s&&isOn(s,S.t)){const q=maskPx(s,S.t);if(Math.hypot(p.x-q.x-q.w,p.y-q.y-q.h)<30&&p.x>q.x+q.w*.55&&p.y>q.y+q.h*.55){pushUndo();drag={m:'size',k:s,b:copyBox(boxAt(s,S.t)),p};return}}
  const m=hitMask(p,e.pointerType==='touch'?14:2);if(m){S.sel=m.id;pushUndo();drag={m:'move',k:m,b:copyBox(boxAt(m,S.t)),p};renderPanel();dirty();return}
  if(s){S.sel=null;drag=null;renderPanel();dirty();return}
  drag={m:'draw',p,q:p};dirty()});
ov.addEventListener('pointermove',e=>{if(touches.has(e.pointerId))touches.set(e.pointerId,pos(e));if(!drag)return;const b=drag.b;
  if(drag.m==='pinch'){if(touches.size<2)return;const n=pinchInfo(),k=clamp(n.d/drag.s.d,.15,8),w=clamp(b.w*k,.03,1),h=clamp(b.h*k,.03,1),cx=b.x+b.w/2+(n.x-drag.s.x)/vr.w,cy=b.y+b.h/2+(n.y-drag.s.y)/vr.h;setKey(drag.k,{x:clamp(cx-w/2,-w/2,1-w/2),y:clamp(cy-h/2,-h/2,1-h/2),w,h});dirty();return}
  const p=pos(e),dx=(p.x-drag.p.x)/vr.w,dy=(p.y-drag.p.y)/vr.h;
  if(drag.m==='move')setKey(drag.k,{x:clamp(b.x+dx,-b.w/2,1-b.w/2),y:clamp(b.y+dy,-b.h/2,1-b.h/2),w:b.w,h:b.h});
  else if(drag.m==='size')setKey(drag.k,{x:b.x,y:b.y,w:clamp(b.w+dx,.03,1),h:clamp(b.h+dy,.03,1)});
  else{drag.q=p;draw();const a=drag.p;octx.setTransform(DPR,0,0,DPR,0,0);octx.strokeStyle='#ffe14a';octx.lineWidth=2;octx.strokeRect(a.x,a.y,p.x-a.x,p.y-a.y);return}dirty()});
function syncSize(){const z=$('#msize'),m=sel();if(z&&m){const b=boxAt(m,S.t);z.value=Math.round(Math.max(b.w,b.h)*100)}}
function endDrag(e){touches.delete(e.pointerId);if(!drag)return;if(drag.m==='pinch'){if(touches.size<1){drag=null;syncSize();dirty()}return}
  if(drag.m==='draw'){const a=drag.p,q=drag.q;if(Math.hypot(q.x-a.x,q.y-a.y)>14){const x=(Math.min(a.x,q.x)-vr.x)/vr.w,y=(Math.min(a.y,q.y)-vr.y)/vr.h;addMask('box',{x,y,w:Math.max(.03,Math.abs(q.x-a.x)/vr.w),h:Math.max(.03,Math.abs(q.y-a.y)/vr.h)})}}drag=null;syncSize();dirty()}
ov.addEventListener('pointerup',endDrag);ov.addEventListener('pointercancel',endDrag);

/* ---------- pointer: timeline ---------- */
let td=null;
function tlT(e){const r=tl.getBoundingClientRect();return clamp((e.clientX-r.left)/r.width,0,1)*S.dur}
tl.addEventListener('pointerdown',e=>{if(S.busy)return;tl.setPointerCapture(e.pointerId);pause();const r=tl.getBoundingClientRect(),px=e.clientX-r.left,y=e.clientY-r.top,X=t=>t/S.dur*r.width,da=Math.abs(px-X(S.a)-5),db=Math.abs(px-X(S.b)+5);td=(y<48&&Math.min(da,db)<26)?(da<db?'a':'b'):'s';tlMove(e)});
function tlMove(e){if(!td)return;const t=tlT(e),gap=Math.min(.2,S.dur/2);if(td==='a'){S.a=clamp(t,0,S.b-gap);seek(S.a)}else if(td==='b'){S.b=clamp(t,S.a+gap,S.dur);seek(S.b)}else seek(clamp(t,S.a,S.b));dirty()}
tl.addEventListener('pointermove',tlMove);tl.addEventListener('pointerup',()=>{td=null});tl.addEventListener('pointercancel',()=>{td=null});

/* ---------- transport ---------- */
function seek(t){S.t=t;video.currentTime=t;dirty()}
function setPP(){$('#pp').innerHTML=ICON(S.playing?'pause':'play')}
function pause(){if(S.playing){S.playing=false;video.pause();setPP();seek(S.t);bleepTone(false)}}
function play(){if(S.t>=S.b-.02)seek(S.a);S.playing=true;video.muted=S.audio==='mute';const p=video.play();if(p&&p.catch)p.catch(()=>{S.playing=false;setPP()});setPP()}
let actx=null,osc=null;function bleepTone(on){try{if(on&&!actx){actx=new AudioContext();osc=actx.createGain();osc.gain.value=0;const o=actx.createOscillator();o.frequency.value=1000;o.connect(osc);osc.connect(actx.destination);o.start()}if(osc)osc.gain.value=on?.14:0}catch(e){}}
function loop(){requestAnimationFrame(loop);if(!S.url||S.busy==='export')return;if(S.playing&&!S.busy){S.t=video.currentTime;if(S.t>=S.b||video.ended){video.currentTime=S.a;S.t=S.a;const p=video.play();if(p&&p.catch)p.catch(()=>{})}
    const b=S.audio==='keep'&&S.bleeps.some(x=>S.t>=x.t&&S.t<x.t+x.d);video.muted=S.audio==='mute'||b;bleepTone(b);needs=true}if(needs){needs=false;draw()}}
video.addEventListener('seeked',dirty);video.addEventListener('loadeddata',dirty);
const hold=$('#hold');hold.addEventListener('pointerdown',e=>{e.preventDefault();S.cmp=true;dirty()});['pointerup','pointerleave','pointercancel'].forEach(n=>hold.addEventListener(n,()=>{S.cmp=false;dirty()}));

/* ---------- open ---------- */
let thumbs=null,thumbJob=0;
async function makeThumbs(url,job){const v=document.createElement('video');v.muted=true;v.preload='auto';v.src=url;await new Promise(r=>{v.onloadeddata=r;v.onerror=r});if(!v.duration)return;const n=12,c=mk(n*64,44),x=c.getContext('2d');
  for(let i=0;i<n&&job===thumbJob;i++){await seekEl(v,(i+.5)/n*v.duration);const r=Math.max(64/v.videoWidth,44/v.videoHeight),w=v.videoWidth*r,h=v.videoHeight*r;x.save();x.beginPath();x.rect(i*64,0,64,44);x.clip();x.drawImage(v,i*64+32-w/2,22-h/2,w,h);x.restore();if(job===thumbJob){thumbs=c;dirty()}}v.removeAttribute('src');v.load()}
function seekEl(v,t){return new Promise(res=>{let ok=false;const fin=()=>{if(ok)return;ok=true;v.removeEventListener('seeked',on);clearTimeout(tm);res()},on=()=>{v.requestVideoFrameCallback?(v.requestVideoFrameCallback(fin),setTimeout(fin,45)):fin()},tm=setTimeout(fin,4000);v.addEventListener('seeked',on);v.currentTime=t})}
function openFile(f){if(!f)return;if(S.url)URL.revokeObjectURL(S.url);const u=URL.createObjectURL(f);video.onerror=()=>{toast(T('errOpen'));closeVideo()};video.onloadedmetadata=()=>{if(!isFinite(video.duration)||!video.videoWidth){toast(T('errOpen'));closeVideo();return}
    Object.assign(S,{url:u,file:f,dur:video.duration,vw:video.videoWidth,vh:video.videoHeight,t:0,a:0,b:video.duration,masks:[],sel:null,bleeps:[],undo:[],fmt:'orig',audio:'keep',tab:'masks',playing:false});thumbs=null;thumbJob++;
    $('#home').classList.add('hide');$('#ed').classList.remove('hide');$('#hint').classList.remove('hide');setPP();renderPanel();layout();seek(0);makeThumbs(u,thumbJob)};video.src=u;video.load()}
function closeVideo(){video.pause();video.removeAttribute('src');video.load();if(S.url)URL.revokeObjectURL(S.url);S.url=null;S.file=null;S.playing=false;thumbJob++;$('#ed').classList.add('hide');$('#home').classList.remove('hide');$('#file').value=''}
$('#file').addEventListener('change',e=>openFile(e.target.files[0]));
addEventListener('dragover',e=>e.preventDefault());addEventListener('drop',e=>{e.preventDefault();openFile(e.dataTransfer.files[0])});
addEventListener('resize',layout);

/* ---------- panel ---------- */
const seg=(key,val,opts)=>`<div class="seg" role="group">${opts.map(([v,l])=>`<button data-set="${key}" data-v="${v}" aria-pressed="${v===val}">${esc(T(l))}</button>`).join('')}</div>`;
function renderPanel(){document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===S.tab));const P=$('#panel');let h='';
  if(S.tab==='masks'){h+=`<div class="row pre">${[['face','face'],['plate','car'],['text','txt'],['box','sq']].map(([t,i])=>`<button data-add="${t}">${ICON(i)}<span>${esc(T(t))}</span></button>`).join('')}</div>`;
    if(S.masks.length)h+=`<div class="chips">${S.masks.map(m=>`<button data-pick="${m.id}" aria-pressed="${m.id===S.sel}">${esc(mName(m))}</button>`).join('')}</div>`;
    const m=sel();if(m){h+=`<button class="pri" data-act="track" style="width:100%;margin-bottom:10px">${ICON('target')}${esc(T('track'))}</button>`;
      h+=`<p class="lbl">${esc(T('size'))} · ${esc(T('pinchHint'))}</p><input id="msize" type="range" min="3" max="100" value="${Math.round(Math.max(boxAt(m,S.t).w,boxAt(m,S.t).h)*100)}" aria-label="${esc(T('size'))}">`;
      h+=`<p class="lbl">${esc(T('style'))}</p>`+seg('style',m.style,[['solid','solid'],['mosaic','mosaic'],['blur','blur']]);
      h+=`<div class="two"><div><p class="lbl">${esc(T('shape'))}</p>${seg('shape',m.shape,[['rect','rect'],['oval','oval']])}</div>`;
      h+=m.style==='solid'?'<div></div>':`<div><p class="lbl">${esc(T('strength'))}</p><input id="str" type="range" min="1" max="10" value="${m.str}" aria-label="${esc(T('strength'))}"></div>`;h+='</div>';
      h+=`<div class="row"><button data-act="setIn">${esc(T('setIn'))}</button><button data-act="setOut">${esc(T('setOut'))}</button><button data-act="whole">${esc(T('whole'))}</button></div>`;
      h+=`<div class="row">${m.kf.length>1?`<button data-act="clearMove">${esc(T('resetMove'))}</button>`:''}<button data-act="dup">${esc(T('dup'))}</button><button data-act="del">${esc(T('del'))}</button></div>`}
    else if(!S.masks.length)h+=`<p class="note">${esc(T('drawHint'))}</p>`}
  else if(S.tab==='frame'){h+=`<p class="lbl">${esc(T('fmt'))}</p>`+seg('fmt',S.fmt,[['orig','orig'],['9:16','9:16'],['1:1','1:1'],['4:5','4:5'],['16:9','16:9']]);if(S.fmt!=='orig')h+=`<p class="lbl">${esc(T('bg'))}</p>`+seg('bg',S.bg,[['blur','bgBlur'],['black','bgBlack']])}
  else{h+=seg('audio',S.audio,[['keep','keep'],['mute','mute']]);if(S.audio==='keep'){h+=`<button data-act="bleep" style="width:100%;margin-bottom:10px">${ICON('plus')}${esc(T('addBleep'))}</button>`;h+=S.bleeps.length?S.bleeps.map((b,i)=>`<div class="bl"><span>${fmtT(b.t)} · ${b.d.toFixed(1)}s</span><button class="ghost ic" data-rmb="${i}" aria-label="${esc(T('del'))}">${ICON('x')}</button></div>`).join(''):`<p class="note">${esc(T('noBleeps'))}</p>`}}
  P.innerHTML=h;const mz=$('#msize');if(mz){mz.onpointerdown=pushUndo;mz.oninput=()=>{const m=sel();if(!m)return;const c=boxAt(m,S.t),r=(+mz.value/100)/Math.max(c.w,c.h);for(const k of m.kf){const w=clamp(k.w*r,.03,1),h=clamp(k.h*r,.03,1);k.x+=(k.w-w)/2;k.y+=(k.h-h)/2;k.w=w;k.h=h}dirty()}}const st=$('#str');if(st){st.oninput=()=>{const m=sel();if(m){m.str=+st.value;dirty()}};st.onpointerdown=pushUndo}}
function stepF(d){pause();seek(clamp(S.t+d/S.fps,S.a,S.b))}
const ACT={toggle(){S.playing?pause():play()},prev(){stepF(-1)},next(){stepF(1)},undo(){const u=S.undo.pop();if(u){const o=JSON.parse(u);S.masks=o.m;S.sel=o.s;renderPanel();dirty()}},
  setIn(){const m=sel();pushUndo();m.in=Math.min(S.t,m.out-.05);renderPanel();dirty()},setOut(){const m=sel();pushUndo();m.out=Math.max(S.t,m.in+.05);renderPanel();dirty()},whole(){const m=sel();pushUndo();m.in=0;m.out=S.dur;dirty()},
  clearMove(){const m=sel();pushUndo();const b=boxAt(m,S.t);m.kf=[{t:S.t,x:b.x,y:b.y,w:b.w,h:b.h,c:1,g:1}];renderPanel();dirty()},
  dup(){const m=sel();pushUndo();const c=JSON.parse(JSON.stringify(m));c.id=S.uid++;c.kf.forEach(k=>{k.x+=.04;k.y+=.04});S.masks.push(c);S.sel=c.id;renderPanel();dirty()},
  del(){pushUndo();S.masks=S.masks.filter(m=>m.id!==S.sel);S.sel=null;renderPanel();dirty()},
  bleep(){S.bleeps.push({t:S.t,d:Math.min(1,S.dur-S.t)||.2});S.bleeps.sort((a,b)=>a.t-b.t);renderPanel();dirty()},
  track(){trackSel()},trackStop(){trackCancel=true},lang:sheetLang,about:sheetAbout,leave:sheetLeave,check:sheetCheck,closeSheet,leaveYes(){closeSheet();closeVideo()},
  startExport(){runExport()},stopExport(){expCancel=true},save:saveResult,share:shareResult};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
  if(d.act&&ACT[d.act])ACT[d.act]();else if(d.tab){S.tab=d.tab;renderPanel()}else if(d.add)addMask(d.add);else if(d.pick){S.sel=+d.pick;renderPanel();dirty()}
  else if(d.rmb){S.bleeps.splice(+d.rmb,1);renderPanel();dirty()}else if(d.setl){setLang(d.setl);closeSheet()}else if(d.q){S.q=+d.q;sheetCheck()}
  else if(d.jump!==undefined){closeSheet();S.tab='masks';if(d.mask)S.sel=+d.mask;pause();seek(clamp(+d.jump,S.a,S.b));renderPanel()}else if(d.fix){applyFix(d.fix,+d.mask);sheetCheck()}
  else if(d.set){const v=d.v;if(d.set==='fmt'){S.fmt=v;layout()}else if(d.set==='bg')S.bg=v;else if(d.set==='audio'){S.audio=v;video.muted=v==='mute'}else{const m=sel();if(m){pushUndo();m[d.set]=v}}renderPanel();dirty()}});
function applyFix(k,id){const m=S.masks.find(x=>x.id===id);if(k==='solid'&&m){pushUndo();m.style='solid'}else if(k==='cover'&&m){pushUndo();m.in=0;m.out=S.dur}else if(k==='mute')S.audio='mute';renderPanel();dirty()}

/* ---------- tracking ---------- */
let trackCancel=false;const aC=mk(),aX=aC.getContext('2d',{willReadFrequently:true});
function grab(aw,ah){aX.drawImage(video,0,0,aw,ah);const d=aX.getImageData(0,0,aw,ah).data,g=new Uint8ClampedArray(aw*ah);for(let i=0,j=0;j<g.length;i+=4,j++)g[j]=(d[i]*77+d[i+1]*150+d[i+2]*29)>>8;return g}
async function trackSel(){const m=sel();if(!m||S.busy)return;pause();pushUndo();S.busy='track';trackCancel=false;$('#tchip').classList.remove('hide');
  const k=320/Math.max(S.vw,S.vh),aw=Math.round(S.vw*k),ah=Math.round(S.vh*k);aC.width=aw;aC.height=ah;const t0=S.t,base=copyBox(boxAt(m,t0)),lo=Math.max(m.in,S.a),hi=Math.min(m.out,S.b),step=1/15,tot=Math.max(1,Math.round((hi-lo)/step));let done=0,flat=false;const out=[{t:t0,x:base.x,y:base.y,w:base.w,h:base.h,c:1,g:1}];
  for(const dir of[1,-1]){await seekEl(video,t0);const tr=new PatchTracker(grab(aw,ah),aw,ah,{x:base.x*aw,y:base.y*ah,w:Math.max(6,base.w*aw),h:Math.max(6,base.h*ah)});if(!tr.T){flat=true;break}let lost=0,last=base;
    for(let t=t0+dir*step;dir>0?t<=hi:t>=lo;t+=dir*step){if(trackCancel)break;await seekEl(video,t);S.t=t;const r=tr.update(grab(aw,ah)),c=r.conf;lost=c<.45?lost+1:0;const g=c<.72?Math.min(1.7,1.14+(.72-c)*1.6):1.14;last={t,x:r.box.x/aw,y:r.box.y/ah,w:r.box.w/aw,h:r.box.h/ah,c,g};out.push(last);done++;$('#tbar').style.width=(done/tot*100)+'%';draw();
      if(lost>=30){const end=dir>0?hi:lo;out.push({...last,t:end,c:0,g:1.7});break}}if(trackCancel)break}
  $('#tchip').classList.add('hide');await seekEl(video,t0);S.t=t0;S.busy=false;
  if(flat){toast(T('trkFlat'));S.undo.pop();dirty();return}
  out.sort((a,b)=>a.t-b.t);const a0=out[0].t,b0=out[out.length-1].t;m.kf=[...m.kf.filter(x=>x.t<a0-1e-3||x.t>b0+1e-3),...out].sort((a,b)=>a.t-b.t);renderPanel();dirty();const nLow=lowSegs(m).length;toast(nLow?T('trkDone',{n:nLow}):T('trkOk'))}
function lowSegs(m){const r=[];let on=false;for(const k of m.kf){if(k.t<S.a||k.t>S.b)continue;if(k.c<.6){if(!on){r.push(k.t);on=true}}else on=false}return r}

/* ---------- sheets ---------- */
function openSheet(h){$('#toast').classList.add('hide');$('#sheet').innerHTML=h;$('#scrim').classList.remove('hide')}
function closeSheet(){$('#scrim').classList.add('hide');$('#sheet').innerHTML='';if(resultURL){URL.revokeObjectURL(resultURL);resultURL=null;resultBlob=null}}
$('#scrim').addEventListener('click',e=>{if(e.target.id==='scrim'&&!S.busy)closeSheet()});
function sheetLang(){openSheet(`<h2>${esc(T('lang'))}</h2><div class="lg" style="margin-top:12px">${Object.keys(LANGS).map(l=>`<button data-setl="${l}" aria-pressed="${l===S.lang}" lang="${l}">${LANGS[l]}</button>`).join('')}</div>`)}
function sheetAbout(){openSheet(`<h2>${esc(T('about'))}</h2><p>${esc(T('aboutT'))}</p><p>${esc(T('aboutW'))}</p><div class="foot"><button data-act="closeSheet">${esc(T('close'))}</button></div>`)}
function sheetLeave(){openSheet(`<h2>${esc(T('leave'))}</h2><p>${esc(T('leaveT'))}</p><div class="foot"><button data-act="leaveYes">${esc(T('leaveY'))}</button><button class="pri" data-act="closeSheet">${esc(T('stay'))}</button></div>`)}
function audit(){const o=[];if(!S.masks.length)o.push({l:'w',s:T('cNone')});
  for(const m of S.masks){const n=mName(m);if(m.in>S.a+.05||m.out<S.b-.05)o.push({l:'w',s:T('cPart',{m:n,a:fmtT(Math.max(m.in,S.a)),b:fmtT(Math.min(m.out,S.b))}),fix:'cover',id:m.id});
    for(const t of lowSegs(m))o.push({l:'b',s:T('cLow',{m:n,a:fmtT(t)}),jump:t,id:m.id});
    if((m.type==='plate'||m.type==='text')&&m.style!=='solid')o.push({l:'w',s:T('cText',{m:n}),fix:'solid',id:m.id});
    if(m.kf.length<2&&S.b-S.a>1.5&&m.type!=='box')o.push({l:'w',s:T('cStatic',{m:n}),jump:S.t,id:m.id})}
  if(S.audio==='keep')o.push({l:'w',s:T('cAudio'),fix:'mute',soft:1});return o}
function qualities(){const sh=Math.min(S.vw,S.vh),q=[1080,720,480].filter(v=>v<=sh);if(!q.length)q.push(sh-(sh%2));else if(sh<1080&&q[0]!==sh&&sh>q[0])q.unshift(sh-(sh%2));return q}
function outSize(q){const r=ratio();let w,h;if(r>=1){h=q;w=q*r}else{w=q;h=q/r}const L=Math.max(w,h);if(L>1920){const k=1920/L;w*=k;h*=k}return[Math.round(w/2)*2,Math.round(h/2)*2]}
function sheetCheck(){const items=audit(),hard=items.filter(i=>!i.soft),qs=qualities();if(!qs.includes(S.q))S.q=qs[0];
  let h=`<h2>${esc(T('chk'))}</h2><p class="vd ${hard.length?'w':'ok'}">${esc(hard.length?T('chkN',{n:hard.length}):T('chkOk'))}</p>`;
  for(const i of items)h+=`<div class="it ${i.l}">${ICON('warn')}<span>${esc(i.s)}</span><div class="acts">${i.jump!==undefined?`<button data-jump="${i.jump}" data-mask="${i.id}">${esc(T('go'))}</button>`:''}${i.fix?`<button data-fix="${i.fix}" data-mask="${i.id||0}">${esc(T('fix'))}</button>`:''}</div></div>`;
  h+=`<div class="it k">${ICON('ok')}<span>${esc(T('cMeta'))}</span></div><p class="lbl" style="margin-top:12px">${esc(T('quality'))}</p><div class="seg">${qs.map(q=>`<button data-q="${q}" aria-pressed="${q===S.q}">${q}p</button>`).join('')}</div>`;
  h+=`<div class="foot"><button data-act="closeSheet">${esc(T('cancel'))}</button><button class="pri" data-act="startExport">${esc(T(hard.length?'exportAny':'startExport'))}</button></div>`;openSheet(h)}

/* ---------- export ---------- */
let expCancel=false,resultBlob=null,resultURL=null,resultName='';
async function pickCodec(w,h,br){for(const c of['avc1.640028','avc1.4D0028','avc1.42E028']){const cfg={codec:c,width:w,height:h,bitrate:br,framerate:30,avc:{format:'avc'}};try{if((await VideoEncoder.isConfigSupported(cfg)).supported)return cfg}catch(e){}}return null}
async function pickAudio(sr,ch){for(const c of['mp4a.40.2','opus']){const cfg={codec:c,sampleRate:sr,numberOfChannels:ch,bitrate:128000};try{if((await AudioEncoder.isConfigSupported(cfg)).supported)return cfg}catch(e){}}return null}
async function loadPCM(){const sr=48000;const ab=await S.file.arrayBuffer();const buf=await new OfflineAudioContext(2,1,sr).decodeAudioData(ab);const ch=Math.min(2,buf.numberOfChannels),a=Math.floor(S.a*sr),n=Math.max(1,Math.floor((S.b-S.a)*sr)),out=[];
  for(let c=0;c<ch;c++){const s=new Float32Array(n);s.set(buf.getChannelData(c).subarray(a,Math.min(a+n,buf.length)));out.push(s)}
  for(const b of S.bleeps){const i0=Math.max(0,Math.round((b.t-S.a)*sr)),i1=Math.min(n,Math.round((b.t+b.d-S.a)*sr));for(let i=i0;i<i1;i++){const e=Math.min(1,Math.min(i-i0,i1-i)/240),v=Math.sin(2*Math.PI*1000*i/sr)*.25*e;for(const s of out)s[i]=v}}return{pcm:out,sr,ch,n}}
function setProg(p,lab){const b=$('#xbar'),t=$('#xpct');if(b)b.style.width=(p*100).toFixed(1)+'%';if(t)t.textContent=Math.round(p*100)+'%';if(lab&&$('#xlab'))$('#xlab').textContent=lab}
async function runExport(){const[W,H]=outSize(S.q),br=Math.round(W*H*30*.13);pause();
  if(typeof VideoEncoder==='undefined'){toast(T('errEnc'));return}const cfg=await pickCodec(W,H,br);if(!cfg){toast(T('errEnc'));return}
  S.busy='export';expCancel=false;openSheet(`<h2>${esc(T('rendering'))}</h2><div class="pct" id="xpct">0%</div><div class="prog"><i id="xbar"></i></div><p id="xlab">${esc(T('keepOpen'))}</p><div class="foot"><button data-act="stopExport">${esc(T('cancel'))}</button></div>`);
  let wl=null;try{wl=await navigator.wakeLock.request('screen')}catch(e){}try{window.BlotlineNative&&BlotlineNative.keepAwake(true)}catch(e){}
  let notice='',A=null,acfg=null;
  try{if(S.audio==='keep'){if(S.dur>1200)notice=T('tooLong');else{setProg(0,T('audioStep'));try{A=await loadPCM();acfg=typeof AudioEncoder!=='undefined'?await pickAudio(A.sr,A.ch):null;if(!acfg){A=null;notice=T('noAudio')}}catch(e){A=null;notice=T('noAudio')}}}
    setProg(0,T('keepOpen'));const fps=30,mux=new Mp4Muxer({width:W,height:H,fps,audio:A?{codec:acfg.codec==='opus'?'opus':'aac',sampleRate:A.sr,channels:A.ch,bitrate:128000}:null});let err=null;
    const enc=new VideoEncoder({output:(c,m)=>mux.addVideo(c,m),error:e=>{err=e}});enc.configure(cfg);const out=mk(W,H),ctx=out.getContext('2d',{alpha:false}),n=Math.max(1,Math.round((S.b-S.a)*fps));
    for(let i=0;i<n;i++){if(expCancel||err)break;const t=S.a+i/fps;await seekEl(video,Math.min(S.dur-.001,t+.001));S.t=t;exportR(ctx,W,H,t,false);const f=new VideoFrame(out,{timestamp:Math.round(i*1e6/fps),duration:Math.round(1e6/fps)});enc.encode(f,{keyFrame:i%60===0});f.close();while(enc.encodeQueueSize>3&&!err)await sleep(4);if(i%3===0)setProg((i+1)/n*(A?.92:.99))}
    if(err)throw err;if(expCancel){enc.close();endExport(wl);sheetCheck();return}await enc.flush();enc.close();
    if(A){let aerr=null;const ae=new AudioEncoder({output:(c,m)=>mux.addAudio(c,m),error:e=>{aerr=e}});ae.configure(acfg);const size=4800;for(let p=0;p<A.n;p+=size){const len=Math.min(size,A.n-p),data=new Float32Array(len*A.ch);for(let c=0;c<A.ch;c++)data.set(A.pcm[c].subarray(p,p+len),c*len);const ad=new AudioData({format:'f32-planar',sampleRate:A.sr,numberOfFrames:len,numberOfChannels:A.ch,timestamp:Math.round(p*1e6/A.sr),data});ae.encode(ad);ad.close();while(ae.encodeQueueSize>6&&!aerr)await sleep(2);setProg(.92+.07*p/A.n)}await ae.flush();ae.close();if(aerr)throw aerr}
    resultBlob=mux.finalize();nativeSaved=false;endExport(wl);const d=new Date(),P=x=>String(x).padStart(2,'0');resultName=`Blotline_${d.getFullYear()}${P(d.getMonth()+1)}${P(d.getDate())}_${P(d.getHours())}${P(d.getMinutes())}${P(d.getSeconds())}.mp4`;resultURL=URL.createObjectURL(resultBlob);
    openSheet(`<h2>${esc(T('done'))}</h2>${notice?`<p class="vd w">${esc(notice)}</p>`:''}<video id="res" src="${resultURL}" controls playsinline></video><p>${W}×${H} · 30 fps · ${fmtT(S.b-S.a)} · ${(resultBlob.size/1048576).toFixed(1)} MB</p><div class="foot"><button class="pri" data-act="save">${esc(T('save'))}</button><button data-act="share">${esc(T('share'))}</button><button data-act="closeSheet">${esc(T('close'))}</button></div>`)
  }catch(e){console.error(e);endExport(wl);closeSheet();toast(T('errExp'))}}
function endExport(wl){S.busy=false;try{wl&&wl.release()}catch(e){}try{window.BlotlineNative&&BlotlineNative.keepAwake(false)}catch(e){}seek(clamp(S.t,S.a,S.b))}
function b64(buf){const a=new Uint8Array(buf);let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode.apply(null,a.subarray(i,i+32768));return btoa(s)}
let nativeSaved=false;async function toNative(){const N=window.BlotlineNative;if(nativeSaved)return;if(!N.begin(resultName,'video/mp4'))throw new Error('begin');const size=786432;for(let p=0;p<resultBlob.size;p+=size){N.write(b64(await resultBlob.slice(p,p+size).arrayBuffer()));await sleep(0)}N.end();nativeSaved=true}
async function saveResult(){try{if(window.BlotlineNative){await toNative();toast(T('saved'));return}const a=document.createElement('a');a.href=resultURL;a.download=resultName;document.body.appendChild(a);a.click();a.remove()}catch(e){toast(T('errExp'))}}
async function shareResult(){try{if(window.BlotlineNative){await toNative();BlotlineNative.shareLast();return}const f=new File([resultBlob],resultName,{type:'video/mp4'});if(navigator.canShare&&navigator.canShare({files:[f]}))await navigator.share({files:[f]});else saveResult()}catch(e){}}

/* ---------- Android back ---------- */
window.blotlineBack=function(){if(S.busy)return true;if(!$('#scrim').classList.contains('hide')){closeSheet();return true}if(S.url){sheetLeave();return true}return false};
let saved=null;try{saved=localStorage.getItem('bc_lang')}catch(e){}const nav=(navigator.language||'en').slice(0,2);setLang(saved||(LANGS[nav]?nav:'en'));requestAnimationFrame(loop);
if(location.hash==='#qa')window.__bc={S,boxAt};
})();
