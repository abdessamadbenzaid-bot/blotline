/* Reads an MP4/MOV sample table so export can decode frames in order instead of seeking. */
function bcStr(d,p,n=4){let s='';for(let i=0;i<n;i++)s+=String.fromCharCode(d.getUint8(p+i));return s}
function bcU64(d,p){return d.getUint32(p)*4294967296+d.getUint32(p+4)}
function bcWalk(d,a,b,cb){let p=a;while(p+8<=b){let n=d.getUint32(p),h=8;const t=bcStr(d,p+4);if(n===1){n=bcU64(d,p+8);h=16}else if(n===0)n=b-p;if(n<h||p+n>b)return;cb(t,p+h,p+n);p+=n}}
function bcHevc(c){const b=c[1],sp=['','A','B','C'][b>>6],tier=(b>>5)&1,idc=b&31;let f=((c[2]<<24)|(c[3]<<16)|(c[4]<<8)|c[5])>>>0,r=0;for(let i=0;i<32;i++){r=(r*2)+(f&1);f>>>=1}const k=[...c.slice(6,12)];while(k.length&&!k[k.length-1])k.pop();return`hvc1.${sp}${idc}.${r.toString(16)}.${tier?'H':'L'}${c[12]}`+k.map(x=>'.'+x.toString(16)).join('')}
function bcEsds(d,a,b){let p=a+4,asc=null,oti=0;const len=()=>{let n=0,c;do{c=d.getUint8(p++);n=n*128+(c&127)}while(c&128);return n};while(p<b){const tag=d.getUint8(p++),n=len();if(tag===3){const fl=d.getUint8(p+2);p+=3;if(fl&128)p+=2;if(fl&64)p+=1+d.getUint8(p);if(fl&32)p+=2}else if(tag===4){oti=d.getUint8(p);p+=13}else if(tag===5){asc=new Uint8Array(d.buffer,d.byteOffset+p,n).slice();break}else p+=n}return oti===0x40?asc:null}
function bcTrack(d,a,b,mvTs){const t={};const inside=(x,y)=>bcWalk(d,x,y,(k,p,e)=>{
  if(['mdia','minf','stbl','edts'].includes(k))inside(p,e);
  else if(k==='tkhd'){const v=d.getUint8(p),m=p+(v?52:40);t.rot=((Math.round(Math.atan2(d.getInt32(m+4),d.getInt32(m))*180/Math.PI)%360)+360)%360}
  else if(k==='mdhd'){const v=d.getUint8(p);t.ts=d.getUint32(p+(v?20:12))}
  else if(k==='hdlr')t.kind=bcStr(d,p+8);
  else if(k==='elst'){const v=d.getUint8(p),n=d.getUint32(p+4);let q=p+8;t.delay=0;t.mt=0;for(let i=0;i<n;i++){const du=v?bcU64(d,q):d.getUint32(q),mt=v?d.getInt32(q+12):d.getInt32(q+4);q+=v?20:12;if(mt<0)t.delay+=du/mvTs;else{t.mt=mt;break}}}
  else if(['stsd','stts','ctts','stsc','stsz','stco','co64','stss'].includes(k))t[k]=[p,e]});inside(a,b);return t}
function bcTable(d,t){const[zp]=t.stsz,fix=d.getUint32(zp+4),n=d.getUint32(zp+8);if(!n||!t.ts)return null;const size=new Uint32Array(n);for(let i=0;i<n;i++)size[i]=fix||d.getUint32(zp+12+i*4);
  const off=new Float64Array(n),co=t.co64||t.stco;if(!co||!t.stsc||!t.stts)return null;const nc=d.getUint32(co[0]+4),ch=i=>t.co64?bcU64(d,co[0]+8+i*8):d.getUint32(co[0]+8+i*4),sc=t.stsc[0],ne=d.getUint32(sc+4);let s=0;
  for(let e=0;e<ne;e++){const first=d.getUint32(sc+8+e*12)-1,per=d.getUint32(sc+12+e*12),last=e+1<ne?d.getUint32(sc+20+e*12)-1:nc;for(let c=first;c<last&&s<n;c++){let o=ch(c);for(let j=0;j<per&&s<n;j++){off[s++]=o;o+=size[s-1]}}}
  const dts=new Float64Array(n),dur=new Uint32Array(n),st=t.stts[0],ns=d.getUint32(st+4);let i=0,tm=0;for(let e=0;e<ns;e++){const c=d.getUint32(st+8+e*8),u=d.getUint32(st+12+e*8);for(let j=0;j<c&&i<n;j++){dts[i]=tm;dur[i++]=u;tm+=u}}
  const pts=new Float64Array(n);let cp=0,cl=0,cv=0,cn=0;if(t.ctts)cn=d.getUint32(t.ctts[0]+4);for(let k=0;k<n;k++){if(t.ctts){while(cl===0&&cp<cn){cl=d.getUint32(t.ctts[0]+8+cp*8);cv=d.getInt32(t.ctts[0]+12+cp*8);cp++}cl--}pts[k]=(dts[k]+(t.ctts?cv:0)-(t.mt||0))/t.ts+(t.delay||0)}
  return{n,size,off,pts,dur,ts:t.ts}}
async function demuxMp4(file){let pos=0,moov=null;while(pos+8<=file.size){const h=new DataView(await file.slice(pos,pos+16).arrayBuffer());let n=h.getUint32(0),hs=8;const k=bcStr(h,4);if(n===1){n=bcU64(h,8);hs=16}else if(n===0)n=file.size-pos;if(n<8||k==='moof')return null;if(k==='moov'){if(n>83886080)return null;moov=new DataView(await file.slice(pos+hs,pos+n).arrayBuffer())}pos+=n}if(!moov)return null;
  let mvTs=1000;bcWalk(moov,0,moov.byteLength,(k,p)=>{if(k==='mvhd')mvTs=moov.getUint32(p+(moov.getUint8(p)?20:12))});const tr=[];bcWalk(moov,0,moov.byteLength,(k,p,e)=>{if(k==='trak')tr.push(bcTrack(moov,p,e,mvTs))});
  const V=tr.find(t=>t.kind==='vide'&&t.stsd&&t.stsz),A=tr.find(t=>t.kind==='soun'&&t.stsd&&t.stsz);if(!V)return null;const tb=bcTable(moov,V);if(!tb)return null;const en=V.stsd[0]+8,ty=bcStr(moov,en+4),w=moov.getUint16(en+32),h=moov.getUint16(en+34);let codec=null,desc=null;
  bcWalk(moov,en+86,en+moov.getUint32(en),(k,p,e)=>{const c=new Uint8Array(moov.buffer,moov.byteOffset+p,e-p).slice();if(k==='avcC'){desc=c;codec='avc1.'+[c[1],c[2],c[3]].map(x=>x.toString(16).padStart(2,'0')).join('')}else if(k==='hvcC'){desc=c;codec=bcHevc(c)}});if(!codec)return null;
  const key=new Uint8Array(tb.n);if(V.stss){const p=V.stss[0],c=moov.getUint32(p+4);for(let i=0;i<c;i++){const s=moov.getUint32(p+8+i*4)-1;if(s<tb.n)key[s]=1}}else key.fill(1);
  const out={video:{...tb,key,rot:V.rot||0,w,h,config:{codec,codedWidth:w,codedHeight:h,description:desc}},audio:null,hasAudio:!!A};
  if(A){const e=A.stsd[0]+8,ty2=bcStr(moov,e+4);if(ty2==='mp4a'){const v=moov.getUint16(e+16),ch=moov.getUint16(e+24),base=e+36+(v===1?16:v===2?36:0);let asc=null;bcWalk(moov,base,e+moov.getUint32(e),(k,p,q)=>{if(k==='esds')asc=bcEsds(moov,p,q)});const t=bcTable(moov,A);if(asc&&t&&ch>=1&&ch<=2)out.audio={...t,asc,ch}}}return out}
class BcReader{constructor(f){this.f=f;this.s=0;this.b=new Uint8Array(0)}async get(o,n){if(o<this.s||o+n>this.s+this.b.length){this.s=o;this.b=new Uint8Array(await this.f.slice(o,o+Math.max(n,8388608)).arrayBuffer())}return this.b.subarray(o-this.s,o-this.s+n)}}
