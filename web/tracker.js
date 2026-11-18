/* On-device patch tracker: zero-mean normalised cross-correlation with motion prediction. */
class PatchTracker{
  constructor(g,W,H,b){this.W=W;this.H=H;this.b={...b};this.vx=0;this.vy=0;this.sc=1;
    const s=Math.max(1,Math.floor(Math.sqrt(b.w*b.h/420)));this.pts=[];
    for(let y=b.h*.06;y<b.h*.94;y+=s)for(let x=b.w*.06;x<b.w*.94;x+=s)this.pts.push((x-b.w/2),(y-b.h/2));
    this.n=this.pts.length/2;this.T=this._norm(this._sample(g,b.x+b.w/2,b.y+b.h/2,1));this.T0=this.T?this.T.slice():null}
  _sample(g,cx,cy,sc){const{W,H,pts,n}=this,o=new Float32Array(n);for(let i=0;i<n;i++){let x=Math.round(cx+pts[2*i]*sc),y=Math.round(cy+pts[2*i+1]*sc);x=x<0?0:x>=W?W-1:x;y=y<0?0:y>=H?H-1:y;o[i]=g[y*W+x]}return o}
  _norm(a){let m=0;for(const v of a)m+=v;m/=a.length;let e=0;for(let i=0;i<a.length;i++){a[i]-=m;e+=a[i]*a[i]}e=Math.sqrt(e);if(e<a.length**.5*3)return null;for(let i=0;i<a.length;i++)a[i]/=e;return a}
  _ncc(g,cx,cy,sc){const{W,H,pts,n,T}=this;let sum=0,s2=0,c=0;for(let i=0;i<n;i++){let x=Math.round(cx+pts[2*i]*sc),y=Math.round(cy+pts[2*i+1]*sc);x=x<0?0:x>=W?W-1:x;y=y<0?0:y>=H?H-1:y;const v=g[y*W+x];sum+=v;s2+=v*v;c+=T[i]*v}const d=s2-sum*sum/n;return d<=1e-6?0:c/Math.sqrt(d)}
  update(g){const b=this.b;if(!this.T)return{box:{...b},conf:0};
    const cx0=b.x+b.w/2+this.vx,cy0=b.y+b.h/2+this.vy,R=Math.round(Math.min(44,Math.max(12,Math.max(b.w,b.h)*.7)));let best=-2,bx=cx0,by=cy0;
    for(let dy=-R;dy<=R;dy+=2)for(let dx=-R;dx<=R;dx+=2){const r=this._ncc(g,cx0+dx,cy0+dy,this.sc);if(r>best){best=r;bx=cx0+dx;by=cy0+dy}}
    const c1=bx,c2=by;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const r=this._ncc(g,c1+dx,c2+dy,this.sc);if(r>best){best=r;bx=c1+dx;by=c2+dy}}
    let sc=this.sc;for(const k of[.95,1.05]){const t=Math.min(2.5,Math.max(.4,this.sc*k)),r=this._ncc(g,bx,by,t);if(r>best+.012){best=r;sc=t}}
    const conf=Math.max(0,Math.min(1,best));const px=b.x+b.w/2,py=b.y+b.h/2;let nx=bx,ny=by;
    if(conf<.45){nx=cx0;ny=cy0;this.vx*=.8;this.vy*=.8}else{this.vx=.65*this.vx+.35*(nx-px);this.vy=.65*this.vy+.35*(ny-py);this.sc=sc}
    if(conf>.72){const o=this._norm(this._sample(g,nx,ny,this.sc));if(o){const T=this.T,A=this.T0;for(let i=0;i<T.length;i++)T[i]=.82*T[i]+.08*o[i]+.1*A[i];this._norm(T)}}
    const w=this.b0w?this.b0w:(this.b0w=b.w),h=this.b0h?this.b0h:(this.b0h=b.h),nw=w*this.sc,nh=h*this.sc;this.b={x:nx-nw/2,y:ny-nh/2,w:nw,h:nh};return{box:{...this.b},conf}}
}
if(typeof module!=='undefined')module.exports={PatchTracker};
