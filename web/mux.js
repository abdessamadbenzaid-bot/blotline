/* Blotline MP4 muxer: H.264 + AAC/Opus, moov first (fast start), no dates, no metadata. */
class Mp4Muxer{
  constructor(o){this.o=o;this.v=[];this.a=[];this.parts=[];this.pend=[];this.pendN=0;this.pos=0;this.avcC=null;this.asc=null;this.vScale=90000;this.vDur=Math.round(90000/o.fps)}
  _store(c){const d=new Uint8Array(c.byteLength);c.copyTo(d);const p=this.pos;this.pos+=d.length;this.pend.push(d);this.pendN+=d.length;if(this.pendN>4194304)this._flush();return{p,n:d.length}}
  _flush(){if(this.pend.length){this.parts.push(new Blob(this.pend));this.pend=[];this.pendN=0}}
  addVideo(c,m){if(m&&m.decoderConfig&&m.decoderConfig.description)this.avcC=new Uint8Array(m.decoderConfig.description.buffer||m.decoderConfig.description).slice();const s=this._store(c),i=this.v.length;s.key=c.type==='key';s.ct=Math.round(c.timestamp*this.vScale/1e6)-i*this.vDur;this.v.push(s)}
  addAudio(c,m){if(m&&m.decoderConfig&&m.decoderConfig.description)this.asc=new Uint8Array(m.decoderConfig.description.buffer||m.decoderConfig.description).slice();const s=this._store(c);s.d=Math.max(1,Math.round((c.duration||0)*this.o.audio.sampleRate/1e6));this.a.push(s)}
  finalize(){this._flush();const ftyp=B('ftyp',S4('isom'),U32(512),S4('isom'),S4('iso2'),S4('avc1'),S4('mp41'));
    const hdr=this.pos+16;const mk=b=>this._moov(b);const len=mk(0).length;const moov=mk(ftyp.length+len+16);
    const mh=cat(U32(1),S4('mdat'),U32(Math.floor((hdr)/4294967296)),U32(hdr>>>0));return new Blob([ftyp,moov,mh,...this.parts],{type:'video/mp4'})}
  _moov(base){const vms=this.v.length*this.vDur/this.vScale*1000;const au=this.o.audio&&this.a.length;const ams=au?this.a.reduce((t,s)=>t+s.d,0)/this.o.audio.sampleRate*1000:0;const dur=Math.round(Math.max(vms,ams));
    const mvhd=F('mvhd',0,0,U32(0),U32(0),U32(1000),U32(dur),U32(65536),U16(256),Z(10),MATRIX,Z(24),U32(au?3:2));
    const t=[mvhd,this._vTrak(base,Math.round(vms))];if(au)t.push(this._aTrak(base,Math.round(ams)));return B('moov',...t)}
  _vTrak(base,ms){const{width:w,height:h}=this.o;const s=this.v;
    const stsd=F('stsd',0,0,U32(1),B('avc1',Z(6),U16(1),Z(16),U16(w),U16(h),U32(0x480000),U32(0x480000),Z(4),U16(1),Z(32),U16(24),U16(65535),B('avcC',this.avcC),B('colr',S4('nclx'),U16(1),U16(1),U16(1),new Uint8Array([0]))));
    const st=[stsd,F('stts',0,0,U32(1),U32(s.length),U32(this.vDur))];
    const keys=s.map((x,i)=>x.key?i+1:0).filter(Boolean);st.push(F('stss',0,0,U32(keys.length),...keys.map(U32)));
    const first=s.length?s[0].ct:0;if(s.some(x=>x.ct!==first)){const r=[];for(const x of s){const l=r[r.length-1];if(l&&l[1]===x.ct)l[0]++;else r.push([1,x.ct])}st.push(F('ctts',1,0,U32(r.length),...r.flatMap(e=>[U32(e[0]),U32(e[1]>>>0)])))}
    st.push(...tables(s,base));
    const minf=B('minf',F('vmhd',0,1,Z(8)),DINF,B('stbl',...st));
    const mdia=B('mdia',F('mdhd',0,0,U32(0),U32(0),U32(this.vScale),U32(s.length*this.vDur),U16(0x55C4),U16(0)),HDLR('vide','VideoHandler'),minf);
    const parts=[F('tkhd',0,3,U32(0),U32(0),U32(1),Z(4),U32(ms),Z(8),U16(0),U16(0),U16(0),U16(0),MATRIX,U32(w*65536),U32(h*65536))];
    if(first)parts.push(B('edts',F('elst',0,0,U32(1),U32(ms),U32(first>>>0),U32(65536))));return B('trak',...parts,mdia)}
  _aTrak(base,ms){const A=this.o.audio,s=this.a,sr=A.sampleRate,ch=A.channels;const head=[Z(6),U16(1),Z(8),U16(ch),U16(16),Z(4),U32(sr*65536)];let entry;
    if(A.codec==='opus'){let skip=312;if(this.asc&&this.asc.length>=12)skip=this.asc[10]|(this.asc[11]<<8);entry=B('Opus',...head,B('dOps',new Uint8Array([0,ch]),U16(skip),U32(sr),U16(0),new Uint8Array([0])))}
    else{const c=this.asc||new Uint8Array([17,144]);const ds=desc(5,c),dc=desc(4,cat(new Uint8Array([0x40,0x15,0,0,0]),U32(A.bitrate),U32(A.bitrate),ds)),sl=desc(6,new Uint8Array([2]));entry=B('mp4a',...head,F('esds',0,0,desc(3,cat(U16(1),new Uint8Array([0]),dc,sl))))}
    const r=[];for(const x of s){const l=r[r.length-1];if(l&&l[1]===x.d)l[0]++;else r.push([1,x.d])}
    const stbl=B('stbl',F('stsd',0,0,U32(1),entry),F('stts',0,0,U32(r.length),...r.flatMap(e=>[U32(e[0]),U32(e[1])])),...tables(s,base));
    const total=s.reduce((t,x)=>t+x.d,0);
    const mdia=B('mdia',F('mdhd',0,0,U32(0),U32(0),U32(sr),U32(total),U16(0x55C4),U16(0)),HDLR('soun','SoundHandler'),B('minf',F('smhd',0,0,Z(4)),DINF,stbl));
    return B('trak',F('tkhd',0,3,U32(0),U32(0),U32(2),Z(4),U32(ms),Z(8),U16(0),U16(1),U16(256),U16(0),MATRIX,U32(0),U32(0)),mdia)}
}
function cat(...a){let n=0;for(const x of a)n+=x.length;const o=new Uint8Array(n);let p=0;for(const x of a){o.set(x,p);p+=x.length}return o}
function U32(n){return new Uint8Array([n>>>24&255,n>>>16&255,n>>>8&255,n&255])}
function U16(n){return new Uint8Array([n>>>8&255,n&255])}
function S4(s){return new Uint8Array([...s].map(c=>c.charCodeAt(0)))}
function Z(n){return new Uint8Array(n)}
function B(t,...p){const b=cat(...p);return cat(U32(b.length+8),S4(t),b)}
function F(t,v,f,...p){return B(t,new Uint8Array([v,f>>>16&255,f>>>8&255,f&255]),...p)}
function desc(tag,b){return cat(new Uint8Array([tag,0x80,0x80,0x80,b.length]),b)}
function HDLR(t,n){return F('hdlr',0,0,Z(4),S4(t),Z(12),S4(n),Z(1))}
function tables(s,base){return[F('stsc',0,0,U32(1),U32(1),U32(1),U32(1)),F('stsz',0,0,U32(0),U32(s.length),...s.map(x=>U32(x.n))),F('co64',0,0,U32(s.length),...s.flatMap(x=>{const o=base+x.p;return[U32(Math.floor(o/4294967296)),U32(o>>>0)]}))]}
const MATRIX=cat(U32(65536),Z(12),U32(65536),Z(12),U32(0x40000000));
const DINF=B('dinf',F('dref',0,0,U32(1),F('url ',0,1)));
if(typeof module!=='undefined')module.exports={Mp4Muxer};
