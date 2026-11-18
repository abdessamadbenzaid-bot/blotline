/* On-device face detection. Files are bundled with the app and nothing leaves the device. */
const BcFace=(()=>{let det=null,busy=null;const tile=document.createElement('canvas');tile.width=tile.height=256;const tx=tile.getContext('2d',{willReadFrequently:true});
  const script=src=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)});
  function init(){if(det)return Promise.resolve(det);if(busy)return busy;busy=(async()=>{await script('vendor/vision_bundle.js');const V=window.__mp.exports;
    const buf=new Uint8Array(await(await fetch('vendor/blaze_face_short_range.tflite')).arrayBuffer()),u=f=>new URL('vendor/'+f,location.href).href;
    det=await V.FaceDetector.createFromOptions({wasmLoaderPath:u('vision_wasm_internal.js'),wasmBinaryPath:u('vision_wasm_internal.wasm')},{baseOptions:{modelAssetBuffer:buf,delegate:'CPU'},runningMode:'IMAGE',minDetectionConfidence:.4,minSuppressionThreshold:.3});return det})();busy.catch(()=>{busy=null});return busy}
  async function crop(src,sx,sy,sw,sh){const d=await init();tx.drawImage(src,sx,sy,sw,sh,0,0,256,256);const k=sw/256,q=sh/256;return d.detect(tile).detections.map(r=>{const b=r.boundingBox;return{x:sx+b.originX*k,y:sy+b.originY*q,w:b.width*k,h:b.height*q,s:r.categories[0].score}})}
  const iou=(a,b)=>{const x=Math.max(a.x,b.x),y=Math.max(a.y,b.y),X=Math.min(a.x+a.w,b.x+b.w),Y=Math.min(a.y+a.h,b.y+b.h),i=Math.max(0,X-x)*Math.max(0,Y-y);return i/(a.w*a.h+b.w*b.h-i||1)};
  async function findAll(src){const W=src.width,H=src.height,S=Math.min(W,H),L=Math.max(W,H),out=[];const n=Math.max(1,Math.ceil((L-S)/(S*.5))+1);for(let i=0;i<n;i++){const p=n>1?(L-S)*i/(n-1):0;out.push(...await crop(src,W>H?p:0,W>H?0:p,S,S))}const T=S*.55,m=Math.max(1,Math.ceil((S-T)/(T*.6))+1),r=Math.max(1,Math.ceil((L-T)/(T*.6))+1);for(let a=0;a<r;a++)for(let b=0;b<m;b++){const u=r>1?(L-T)*a/(r-1):0,v=m>1?(S-T)*b/(m-1):0;out.push(...await crop(src,W>H?u:v,W>H?v:u,T,T))}
    out.sort((a,b)=>b.s-a.s);const keep=[];for(const f of out)if(!keep.some(k=>iou(k,f)>.25))keep.push(f);return keep}
  return{init,crop,findAll}})();
