/* Gate Zone 3D scene: real WebGL (three.js) world of neural nets, loss surfaces, matrices, clusters and formulas.
   The camera travels through it as you scroll; the pointer adds parallax. Used by landing.html and index.html. */
(function(){
if(window.__gzScene)return;window.__gzScene=1;
function boot(){
var CV=document.getElementById('bg')||document.getElementById('gz-bg');
if(!CV){CV=document.createElement('canvas');CV.id='gz-bg';CV.setAttribute('aria-hidden','true');CV.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:0;pointer-events:none';document.body.prepend(CV)}


const T3=THREE,V=(x,y,z)=>new T3.Vector3(x,y,z),rnd=(a,b)=>a+Math.random()*(b-a),RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const R=new T3.WebGLRenderer({canvas:CV,antialias:false,alpha:true,powerPreference:'high-performance'});let DPR=1;R.setPixelRatio(DPR);
const S=new T3.Scene();S.fog=new T3.FogExp2(0x050914,.014);
const C=new T3.PerspectiveCamera(55,1,.1,300);C.position.z=20;
const K={b:0x4d8bff,c:0x6fe3ff,t:0x2dd4bf,v:0xa78bfa,y:0xffd166};
const AD=T3.AdditiveBlending,LM=(c,o)=>new T3.LineBasicMaterial({color:c,transparent:true,opacity:o,blending:AD,depthWrite:false});
const gt=(()=>{const k=document.createElement('canvas');k.width=k.height=64;const g=k.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,'rgba(255,255,255,.55)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return new T3.CanvasTexture(k)})();
const PM=(c,s,o=1,vc=false)=>new T3.PointsMaterial({color:c,size:s,map:gt,transparent:true,opacity:o,blending:AD,depthWrite:false,vertexColors:vc});
const groups=[],anim=[];let cur=null;
const AP=(f,o)=>anim.push([f,o===undefined?cur:o]);
const G=(y,x)=>{const g=new T3.Group();g.position.set(x,y,0);g.bx=x;S.add(g);groups.push(g);cur=g;return g};
const spin=(o,sx,sy)=>AP((t,dt,v)=>{o.rotation.y+=dt*sy+v*dt*3;o.rotation.x+=dt*sx});

/* 1 · Neural network with signal pulses (deep learning) */
{const g=G(-1,9),L=[4,6,6,3],N=[],idx=[],E=[],ep=[];let k=0;
 L.forEach((n,i)=>{idx.push([]);for(let j=0;j<n;j++){N.push(V((i-1.5)*3.6,(j-(n-1)/2)*1.8,rnd(-1.2,1.2)));idx[i].push(k++)}});
 for(let i=0;i<L.length-1;i++)idx[i].forEach(a=>idx[i+1].forEach(b=>{E.push([a,b,Math.random()]);ep.push(N[a],N[b])}));
 g.add(new T3.LineSegments(new T3.BufferGeometry().setFromPoints(ep),LM(K.b,.4)));
 g.add(new T3.Points(new T3.BufferGeometry().setFromPoints(N),PM(K.c,1.4)));
 const pg=new T3.BufferGeometry().setFromPoints(E.map(()=>V(0,0,0)));g.add(new T3.Points(pg,PM(0xffffff,.55)));
 g.rotation.y=-.5;AP((t,dt,v)=>{E.forEach((e,i)=>{const p=(e[2]+t*.35)%1,a=N[e[0]],b=N[e[1]];pg.attributes.position.setXYZ(i,a.x+(b.x-a.x)*p,a.y+(b.y-a.y)*p,a.z+(b.z-a.z)*p)});pg.attributes.position.needsUpdate=true;g.rotation.y=-.5+Math.sin(t*.3)*.5+v*.5});}

/* 2 · Nested icosahedron (embedding / manifold) */
{const g=G(-4,-10);g.add(new T3.LineSegments(new T3.WireframeGeometry(new T3.IcosahedronGeometry(3.4,1)),LM(K.b,.55)));
 g.add(new T3.LineSegments(new T3.WireframeGeometry(new T3.IcosahedronGeometry(1.9,0)),LM(K.c,.8)));
 g.add(new T3.Points(new T3.IcosahedronGeometry(3.4,1),PM(K.c,.5)));spin(g,.12,.3);}

/* helper: wireframe surface z = f(x,z,t) */
function surf(n,s,col,op,f){const V1=(n+1)*(n+1),a=new Float32Array(V1*3),ix=[],q=(i,j)=>i*(n+1)+j,geo=new T3.BufferGeometry();
 for(let i=0;i<=n;i++)for(let j=0;j<=n;j++){a[q(i,j)*3]=(i/n-.5)*s;a[q(i,j)*3+2]=(j/n-.5)*s;if(i<n)ix.push(q(i,j),q(i+1,j));if(j<n)ix.push(q(i,j),q(i,j+1))}
 geo.setAttribute('position',new T3.BufferAttribute(a,3));geo.setIndex(ix);const m=new T3.LineSegments(geo,LM(col,op));
 m.upd=t=>{for(let v=0;v<V1;v++)a[v*3+1]=f(a[v*3],a[v*3+2],t);geo.attributes.position.needsUpdate=true};m.upd(0);return m}

/* 3 · Loss landscape + gradient descent ball (optimization) */
{const g=G(-15,10),f=(x,z)=>Math.sin(x*.55)*Math.cos(z*.6)*1.4+.05*(x*x+z*z)-1.5;
 g.add(surf(38,15,K.b,.36,f));g.rotation.x=.25;
 const ball=new T3.Mesh(new T3.SphereGeometry(.26,16,16),new T3.MeshBasicMaterial({color:K.y}));g.add(ball);
 const tr=new T3.BufferGeometry().setFromPoints(Array.from({length:70},()=>V(0,-99,0)));g.add(new T3.Points(tr,PM(K.y,.5,.9)));
 let x=-6,z=5,age=0,hist=[];
 AP((t,dt,v)=>{age+=dt;const e=.01,gx=(f(x+e,z)-f(x-e,z))/(2*e),gz=(f(x,z+e)-f(x,z-e))/(2*e);x-=gx*dt*1.6;z-=gz*dt*1.6;
  if(age>7||Math.hypot(gx,gz)<.02&&age>2){x=rnd(-6,6);z=rnd(-6,6);age=0;hist=[]}
  ball.position.set(x,f(x,z)+.3,z);hist.push(ball.position.clone());if(hist.length>70)hist.shift();
  hist.forEach((p,i)=>tr.attributes.position.setXYZ(i,p.x,p.y,p.z));for(let i=hist.length;i<70;i++)tr.attributes.position.setXYZ(i,0,-99,0);tr.attributes.position.needsUpdate=true;g.rotation.y+=dt*.12+v*dt*3});}

/* 4 · Breathing Gaussian bell (probability & statistics) */
{const g=G(-27,-10);g.add(surf(34,14,K.t,.4,(x,z,t)=>{const s=1.6+Math.sin(t*.8)*.7;return 4.5*Math.exp(-(x*x+z*z)/(2*s*s))-2}));
 g.add(new T3.LineSegments(new T3.BufferGeometry().setFromPoints([V(-8,-2,0),V(8,-2,0),V(0,-2,-8),V(0,-2,8),V(0,-2,0),V(0,4,0)]),LM(K.c,.7)));
 g.rotation.x=.35;AP((t,dt,v)=>{g.children[0].upd(t);g.rotation.y+=dt*.15+v*dt*3});}

/* 5 · Linear transformation of a cube (linear algebra) */
{const g=G(-39,10),box=new T3.EdgesGeometry(new T3.BoxGeometry(3,3,3));
 g.add(new T3.LineSegments(box,LM(K.b,.3)));const cu=new T3.LineSegments(box,LM(K.y,.95));cu.matrixAutoUpdate=false;g.add(cu);
 g.add(new T3.LineSegments(new T3.BufferGeometry().setFromPoints([V(-5,0,0),V(5,0,0),V(0,-5,0),V(0,5,0),V(0,0,-5),V(0,0,5)]),LM(K.c,.5)));
 g.rotation.set(.4,.5,0);AP((t,dt,v)=>{const a=Math.sin(t*.7),b=Math.cos(t*.5);cu.matrix.set(1+.7*a,.5*b,0,0,.5*a,1-.4*b,.35*a,0,0,.3*b,1+.5*a,0,0,0,0,1);g.rotation.y+=dt*.2+v*dt*3});}

/* 6 · CNN feature-map stack with moving kernel and data flow */
{const g=G(-51,-9),sz=[6,4.8,3.6,2.6,1.6],Z=i=>i*2.6-5.2;
 sz.forEach((s,i)=>{const m=new T3.LineSegments(new T3.EdgesGeometry(new T3.PlaneGeometry(s,s)),LM(K.c,.85));m.position.z=Z(i);g.add(m);
  const gr=new T3.GridHelper(s,Math.max(3,Math.round(s*1.2)),K.b,K.b);gr.rotation.x=Math.PI/2;gr.position.z=Z(i);gr.material.transparent=true;gr.material.opacity=.22;gr.material.blending=AD;gr.material.depthWrite=false;g.add(gr)});
 const kn=new T3.LineSegments(new T3.EdgesGeometry(new T3.BoxGeometry(1.2,1.2,.4)),LM(K.y,1));g.add(kn);
 const pt=new T3.BufferGeometry().setFromPoints(Array.from({length:40},()=>V(0,0,0)));g.add(new T3.Points(pt,PM(0xffffff,.45)));const ph=Array.from({length:40},()=>[Math.random(),rnd(-1,1),rnd(-1,1)]);
 g.rotation.set(.25,-.7,0);AP((t,dt,v)=>{kn.position.set(Math.sin(t*.9)*2.2,Math.cos(t*.6)*2.2,Z(0)+.1);
  ph.forEach((p,i)=>{const u=(p[0]+t*.12)%1,s=sz[Math.min(4,Math.floor(u*5))]*.4;pt.attributes.position.setXYZ(i,p[1]*s,p[2]*s,-5.2+u*10.4)});pt.attributes.position.needsUpdate=true;g.rotation.y=-.7+Math.sin(t*.25)*.4+v*.5});}

/* 7 · Torus knot (topology / manifolds) */
{const g=G(-63,10);g.add(new T3.LineSegments(new T3.WireframeGeometry(new T3.TorusKnotGeometry(2.8,.7,140,10,2,3)),LM(K.v,.4)));spin(g,.1,.25);}

/* 8 · K-means style clusters (machine learning) */
{const g=G(-74,-9),cs=[[-3,1,0,K.b],[3,-1,1,K.c],[0,3,-2,K.v]],P=[],Cl=[];
 cs.forEach(c=>{for(let i=0;i<110;i++){P.push(c[0]+rnd(-1.8,1.8),c[1]+rnd(-1.8,1.8),c[2]+rnd(-1.8,1.8));const k=new T3.Color(c[3]);Cl.push(k.r,k.g,k.b)}});
 const pg=new T3.BufferGeometry();pg.setAttribute('position',new T3.Float32BufferAttribute(P,3));pg.setAttribute('color',new T3.Float32BufferAttribute(Cl,3));g.add(new T3.Points(pg,PM(0xffffff,.5,1,true)));
 g.add(new T3.Points(new T3.BufferGeometry().setFromPoints(cs.map(c=>V(c[0],c[1],c[2]))),PM(0xffffff,2.2)));spin(g,.05,.3);}

/* ambient data-dust + floating math / ML symbols */
cur=null;
{const n=700,a=new Float32Array(n*3);for(let i=0;i<n;i++){a[i*3]=rnd(-48,48);a[i*3+1]=rnd(-90,12);a[i*3+2]=rnd(-28,8)}
 const pg=new T3.BufferGeometry();pg.setAttribute('position',new T3.BufferAttribute(a,3));const d=new T3.Points(pg,PM(0x8fb0ff,.16,.75));S.add(d);AP((t)=>{d.rotation.y=t*.01;d.position.x=Math.sin(t*.1)},null)}
const SY=['∇L(θ)','∫ eˣ dx','Σ','λ','π','σ(x)','∂f/∂x','P(A|B)','ReLU','softmax','Wx + b','e^{iπ}+1=0','∞','argmax','μ','Aᵀ','det(A)','θ ← θ − η∇L','H = −Σp log p','Ax = λx','CNN','LSTM','‖x‖₂','E[X]'];
const SYT=[];function symTex(i){const j=i%SY.length;if(SYT[j])return SYT[j];const k=document.createElement('canvas');k.width=300;k.height=100;const c=k.getContext('2d');c.font='italic 600 46px "Cambria Math","STIX Two Math",Georgia,serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#b4ccff';c.shadowColor='#4d8bff';c.shadowBlur=16;c.fillText(SY[j],150,50);return SYT[j]=new T3.CanvasTexture(k)}
for(let i=0;i<26;i++){
 const sp=new T3.Sprite(new T3.SpriteMaterial({map:symTex(i),transparent:true,opacity:rnd(.3,.65),blending:AD,depthWrite:false}));
 sp.scale.set(6,2,1);sp.position.set(rnd(-36,36),rnd(-84,6),rnd(-14,4));const y0=sp.position.y,ph=Math.random()*6;S.add(sp);AP(t=>{sp.position.y=y0+Math.sin(t*.5+ph)*.7},sp)}

/* filler: small wireframes + a flowing floor and ceiling grid so the whole screen is filled, even under the sidebar and top bar */
{const GE=[()=>new T3.IcosahedronGeometry(1,0),()=>new T3.OctahedronGeometry(1,0),()=>new T3.TetrahedronGeometry(1,0),()=>new T3.TorusGeometry(.9,.3,8,16),()=>new T3.BoxGeometry(1.4,1.4,1.4),()=>new T3.DodecahedronGeometry(1,0),()=>new T3.TorusKnotGeometry(.7,.22,48,6,2,3)],cl=[K.b,K.c,K.v,K.t];
 for(let i=0;i<20;i++){const left=i%3===0,x=left?rnd(-34,-14):rnd(-32,32),y=rnd(-86,10),z=rnd(-14,-1),m=new T3.LineSegments(new T3.WireframeGeometry(GE[i%GE.length]()),LM(cl[i%4],rnd(.4,.85)));
  m.position.set(x,y,z);m.scale.setScalar(rnd(.9,2.5));S.add(m);const sx=rnd(-.5,.5),sy=rnd(-.5,.5),y0=y,ph=Math.random()*6;
  AP((t,dt,v)=>{m.rotation.x+=dt*sx+v*dt;m.rotation.y+=dt*sy+v*dt*2;m.position.y=y0+Math.sin(t*.4+ph)*.8},m)}
 [[-11,K.b,.16],[13,K.c,.1]].forEach(g=>{const gr=new T3.GridHelper(170,68,g[1],g[1]);gr.material.transparent=true;gr.material.opacity=g[2];gr.material.blending=AD;gr.material.depthWrite=false;S.add(gr);
  AP(t=>{gr.position.set(0,C.position.y+g[0],-10+((t*1.2)%2.5))},null)})}

/* ===== EXTRA OBJECTS: Lorenz attractor, Möbius strip, Fourier epicycles, softmax sphere, decision tree, data rain ===== */
try{/* 9 · Lorenz attractor (chaos / dynamical systems) */
{const g=G(-21,-12),N=1600,P=[];let x=.1,y=0,z=0;
 for(let i=0;i<N;i++){const dt=.0065,dx=10*(y-x),dy=x*(28-z)-y,dz=x*y-8/3*z;x+=dx*dt;y+=dy*dt;z+=dz*dt;P.push(V(x*.2,(z-25)*.2,y*.2))}
 const geo=new T3.BufferGeometry().setFromPoints(P);g.add(new T3.Line(geo,LM(K.y,.55)));
 const head=new T3.BufferGeometry().setFromPoints([P[0]]);g.add(new T3.Points(head,PM(0xffffff,2.2)));
 AP((t,dt,v)=>{const i=Math.floor((t*90)%N),p=P[i];head.attributes.position.setXYZ(0,p.x,p.y,p.z);head.attributes.position.needsUpdate=true;g.rotation.y+=dt*.22+v*dt*3});}
}catch(e){console.warn("gz-3d extra object skipped:",e)}
try{/* 10 · Möbius strip (topology) */
{const g=G(-10,-12),nu=70,nv=6,A=new Float32Array((nu+1)*(nv+1)*3),ix=[],q=(i,j)=>i*(nv+1)+j;
 for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++){const u=i/nu*Math.PI*2,w=(j/nv-.5)*2,R=3+w*.9*Math.cos(u/2),o=q(i,j)*3;A[o]=R*Math.cos(u);A[o+1]=w*.9*Math.sin(u/2)*1.0;A[o+2]=R*Math.sin(u);if(i<nu)ix.push(q(i,j),q(i+1,j));if(j<nv)ix.push(q(i,j),q(i,j+1))}
 const geo=new T3.BufferGeometry();geo.setAttribute('position',new T3.BufferAttribute(A,3));geo.setIndex(ix);g.add(new T3.LineSegments(geo,LM(K.v,.6)));g.rotation.x=.6;spin(g,.1,.28);}
}catch(e){console.warn("gz-3d extra object skipped:",e)}
try{/* 11 · Fourier epicycles drawing a square wave (signals / maths) */
{const g=G(-45,11),R=[2.4,.8,.48,.34],F=[1,3,5,7],cir=[],tr=[];
 R.forEach(r=>{const pts=[];for(let i=0;i<=48;i++){const a=i/48*Math.PI*2;pts.push(V(Math.cos(a)*r,Math.sin(a)*r,0))}const c=new T3.Line(new T3.BufferGeometry().setFromPoints(pts),LM(K.c,.7));g.add(c);cir.push(c)});
 const arm=new T3.BufferGeometry().setFromPoints(R.map(()=>V(0,0,0)).concat([V(0,0,0)]));g.add(new T3.Line(arm,LM(K.y,.9)));
 const W=new T3.BufferGeometry().setFromPoints(Array.from({length:160},()=>V(0,0,0)));g.add(new T3.Line(W,LM(K.b,.9)));
 AP((t,dt,v)=>{let x=-3.2,y=0;arm.attributes.position.setXYZ(0,x,y,0);
  R.forEach((r,i)=>{cir[i].position.set(x,y,0);const a=t*F[i]*.9;x+=Math.cos(a)*r;y+=Math.sin(a)*r;arm.attributes.position.setXYZ(i+1,x,y,0)});arm.attributes.position.needsUpdate=true;
  tr.unshift(y);if(tr.length>160)tr.pop();tr.forEach((h,i)=>W.attributes.position.setXYZ(i,2.2+i*.05,h,0));W.attributes.position.needsUpdate=true;g.rotation.y=-.4+Math.sin(t*.3)*.35+v*.5;g.rotation.x=.15})}
}catch(e){console.warn("gz-3d extra object skipped:",e)}
try{/* 12 · Softmax sphere: embedding points orbiting a latitude/longitude globe */
{const g=G(-58,10),sg=new T3.SphereGeometry(3,20,14);g.add(new T3.LineSegments(new T3.WireframeGeometry(sg),LM(K.t,.32)));
 const n=60,ph=Array.from({length:n},()=>[Math.random()*6.28,Math.acos(rnd(-1,1)),rnd(.2,.7)]),pg=new T3.BufferGeometry().setFromPoints(ph.map(()=>V(0,0,0)));g.add(new T3.Points(pg,PM(0xffffff,.8)));
 AP((t,dt,v)=>{ph.forEach((p,i)=>{const a=p[0]+t*p[2],b=p[1],r=3.05;pg.attributes.position.setXYZ(i,r*Math.sin(b)*Math.cos(a),r*Math.cos(b),r*Math.sin(b)*Math.sin(a))});pg.attributes.position.needsUpdate=true;g.rotation.y+=dt*.15+v*dt*3;g.rotation.z=.4})}
}catch(e){console.warn("gz-3d extra object skipped:",e)}
try{/* 13 · Decision tree with data samples falling down random paths */
{const g=G(-66,-11),D=4,N=[],ep=[],kids=[];
 for(let l=0;l<=D;l++)for(let i=0;i<(1<<l);i++)N.push(V((i-((1<<l)-1)/2)*(9/(1<<l))*1.1,-l*2,0));
 const id=(l,i)=>(1<<l)-1+i;
 for(let l=0;l<D;l++)for(let i=0;i<(1<<l);i++)for(let c=0;c<2;c++){ep.push(N[id(l,i)],N[id(l+1,i*2+c)])}
 g.add(new T3.LineSegments(new T3.BufferGeometry().setFromPoints(ep),LM(K.b,.5)));g.add(new T3.Points(new T3.BufferGeometry().setFromPoints(N),PM(K.c,1.5)));
 const W=Array.from({length:8},()=>({s:Math.random()*6,p:Array.from({length:D+1},(_,l)=>[l,0])})),wg=new T3.BufferGeometry().setFromPoints(W.map(()=>V(0,0,0)));g.add(new T3.Points(wg,PM(K.y,2)));
 W.forEach(w=>{let i=0;w.p=w.p.map((_,l)=>{if(l>0)i=i*2+(Math.random()<.5?0:1);return [l,i]})});
 AP((t,dt,v)=>{W.forEach((w,k)=>{const u=((t*.5+w.s)%1)*D,l=Math.min(D-1,Math.floor(u)),f=u-l,a=N[id(w.p[l][0],w.p[l][1])],b=N[id(w.p[l+1][0],w.p[l+1][1])];if(l===0&&f<.03){let i=0;w.p=w.p.map((_,q)=>{if(q>0)i=i*2+(Math.random()<.5?0:1);return [q,i]})}wg.attributes.position.setXYZ(k,a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f,0)});wg.attributes.position.needsUpdate=true;g.rotation.y=.45+Math.sin(t*.3)*.4+v*.5;g.position.y=-66+4})}
}catch(e){console.warn("gz-3d extra object skipped:",e)}
/* page-switch pulse: whoosh the camera, flare the field, spin every object */
let pulse=0;window.gzPulse=()=>{};

/* camera: scroll moves down the scene, pointer adds parallax */
const TOT=74;let sy=0,ty=0,mx=0,my=0,tx=0,tyy=0,last=0,syv=0,vs=0;
/* smooth follow: critically damped spring with a speed limit, so the world glides instead of rushing (same feel at 60 / 120 / 144 Hz) */
const SMOOTH_TIME=.75,MAX_SPEED=.18;
function damp(c,t,v,dt){const om=2/SMOOTH_TIME,x=om*dt,e=1/(1+x+.48*x*x+.235*x*x*x),mc=MAX_SPEED*SMOOTH_TIME;
 let ch=Math.max(-mc,Math.min(mc,c-t));const tg=c-ch,tmp=(v+om*ch)*dt;v=(v-om*tmp)*e;let o=tg+(ch+tmp)*e;
 if((t-c>0)===(o>t)){o=t;v=0}return[o,v]}
const ease=(dt,tc)=>1-Math.exp(-dt/tc);
const sc=()=>{const h=document.documentElement.scrollHeight-innerHeight;ty=h>0?scrollY/h:0};addEventListener('scroll',sc,{passive:true});sc();
addEventListener('pointermove',e=>{tx=e.clientX/innerWidth-.5;tyy=e.clientY/innerHeight-.5},{passive:true});
function rs(){R.setSize(innerWidth,innerHeight,false);C.aspect=innerWidth/innerHeight;C.updateProjectionMatrix();const k=Math.min(1,C.aspect/1.5);groups.forEach(g=>g.position.x=g.bx*k)}
addEventListener('resize',rs);rs();
/* STATIC SCENE: objects are placed once and never animate. The only motion is the camera gliding with your scroll / mouse,
   and frames are drawn only while that is happening, so an idle page costs nothing. */
anim.forEach(a=>a[0](0,0,0));
let running=0,lastMs=0;
function frame(ms){running=0;if(document.hidden)return;
 const dt=Math.min(.05,Math.max(.001,(ms-lastMs)/1000));lastMs=ms;
 if(RM){sy=ty}else{const r=damp(sy,ty,syv,dt);sy=r[0];syv=r[1]}
 mx+=(tx-mx)*ease(dt,.35);my+=(tyy-my)*ease(dt,.35);
 C.position.set(mx*4,-sy*TOT-my*2,20-Math.sin(sy*Math.PI)*3);C.lookAt(mx*2,C.position.y-my*2,0);
 for(let i=0;i<anim.length;i++)if(anim[i][1]===null)anim[i][0](0,0,0);   /* floor / ceiling grids follow the camera */
 R.render(S,C);
 if(Math.abs(ty-sy)>.0004||Math.abs(tx-mx)>.0008||Math.abs(tyy-my)>.0008){running=1;requestAnimationFrame(frame)}}
function kick(){if(!running){running=1;lastMs=performance.now();requestAnimationFrame(frame)}}
addEventListener('scroll',kick,{passive:true});addEventListener('pointermove',kick,{passive:true});addEventListener('resize',()=>{rs();kick()});
document.addEventListener('visibilitychange',kick);
kick();
}
if(window.THREE)boot();else{var s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';s.onload=boot;document.head.appendChild(s)}
})();
/* ===== Transition FX: shockwave ring + 3D content flip-in + camera pulse on every page / tab switch ===== */
(function(){
if(window.__gzFx)return;window.__gzFx=1;
var RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
var st=document.createElement('style');
st.textContent='.gzx-ring{position:fixed;left:50%;top:50%;width:20vmax;height:20vmax;margin:-10vmax 0 0 -10vmax;border-radius:50%;z-index:99996;pointer-events:none;border:1px solid rgba(111,227,255,.5);box-shadow:0 0 50px 4px rgba(77,139,255,.3),inset 0 0 50px rgba(77,139,255,.18);opacity:0;transform:scale(.05)}'+
'.gzx-ring.run{animation:gzxring 1.5s cubic-bezier(.22,1,.36,1)}'+
'@keyframes gzxring{0%{opacity:.55;transform:scale(.05)}100%{opacity:0;transform:scale(4)}}'+
'.gzx-in{animation:gzxin .9s cubic-bezier(.22,1,.36,1) both;transform-origin:50% 0}'+
'@keyframes gzxin{0%{opacity:0;transform:perspective(1400px) translateY(22px) translateZ(-60px) rotateX(4deg) scale(.985);}60%{opacity:1}100%{opacity:1;transform:none}}'+
'.gzx-flip{animation:gzxflip .85s cubic-bezier(.22,1,.36,1) both}'+
'@keyframes gzxflip{0%{transform:perspective(900px) rotateY(-30deg) scale(.96);opacity:.1}100%{transform:perspective(900px) rotateY(0) scale(1);opacity:1}}';
document.head.appendChild(st);
var ring=document.createElement('div');ring.className='gzx-ring';document.body.appendChild(ring);
function targets(){var t=document.querySelector('.topbar'),p=t&&t.parentElement;
 if(!p)return[];return[].filter.call(p.children,function(e){return e!==t&&!/^(SCRIPT|STYLE)$/.test(e.tagName)&&e.offsetParent!==null&&getComputedStyle(e).position!=='fixed'})}
var busy=0;
window.gzSwitchFx=function(){
 if(window.gzPulse)window.gzPulse();
 if(RM)return;
 
 if(document.querySelector('.gz-bar'))return; /* page-transitions.js already animates the content */
 targets().forEach(function(e){e.classList.remove('gzx-in');void e.offsetWidth;e.classList.add('gzx-in');setTimeout(function(){e.classList.remove('gzx-in')},950)})};
function hook(){if(typeof window.show==='function'&&!window.show.gzx){var o=window.show;window.show=function(){var r=o.apply(this,arguments);window.gzSwitchFx();return r};window.show.gzx=1}return !!(window.show&&window.show.gzx)}
var hooked=hook();addEventListener('load',function(){hooked=hook()||hooked});
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.nav button,.sidebar button,.tabs button');
 if(!b)return;if(!hooked||b.closest('.tabs')){setTimeout(window.gzSwitchFx,30)}},true);
})();

/* ===== Smoothness layer: inertial wheel scrolling + one eased feel for every hover / press / card / page animation ===== */
(function(){
if(window.__gzSmooth)return;window.__gzSmooth=1;
var RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
var st=document.createElement('style');
st.textContent=':root{--gz-ease:cubic-bezier(.22,1,.36,1)}'+
'html{scroll-behavior:auto !important}'+
'button,a,summary,input,select,textarea,.subject,.item,.pg-card,.builder,.quick-mix,.lower-card,.scorecard,.scorecard>div,.counts button,.mode button,.nav button,.chip,.tag,.glass,.f,.sub,.step,.btn,.lz-btn,.lz-chip,.lz-opt,.topic-toggle,.save-q{transition-duration:.4s !important;transition-timing-function:var(--gz-ease) !important}'+
'.primary,.btn,button.primary{transition-duration:.3s !important}'+
'.content>section:not(.hide){animation-duration:.8s !important;animation-timing-function:var(--gz-ease) !important}'+
'.qin{animation-duration:.6s !important;animation-timing-function:var(--gz-ease) !important}'+
'.topic-pop,.lz-pop{animation-duration:.3s !important;animation-timing-function:var(--gz-ease) !important}';
document.head.appendChild(st);
})();