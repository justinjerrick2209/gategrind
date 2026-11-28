/* Gate Zone 3D scene: real WebGL (three.js) world of neural nets, loss surfaces, matrices, clusters and formulas.
   The camera travels through it as you scroll; the pointer adds parallax. Used by landing.html and index.html. */
(function(){
if(window.__gzScene)return;window.__gzScene=1;
function boot(){
var CV=document.getElementById('bg')||document.getElementById('gz-bg');
if(!CV){CV=document.createElement('canvas');CV.id='gz-bg';CV.setAttribute('aria-hidden','true');CV.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:0;pointer-events:none';document.body.prepend(CV)}


const T3=THREE,V=(x,y,z)=>new T3.Vector3(x,y,z),rnd=(a,b)=>a+Math.random()*(b-a),RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const R=new T3.WebGLRenderer({canvas:CV,antialias:true,alpha:true});R.setPixelRatio(Math.min(devicePixelRatio,1.75));
const S=new T3.Scene();S.fog=new T3.FogExp2(0x050914,.014);
const C=new T3.PerspectiveCamera(55,1,.1,300);C.position.z=20;
const K={b:0x4d8bff,c:0x6fe3ff,t:0x2dd4bf,v:0xa78bfa,y:0xffd166};
const AD=T3.AdditiveBlending,LM=(c,o)=>new T3.LineBasicMaterial({color:c,transparent:true,opacity:o,blending:AD,depthWrite:false});
const gt=(()=>{const k=document.createElement('canvas');k.width=k.height=64;const g=k.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,'rgba(255,255,255,.55)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return new T3.CanvasTexture(k)})();
const PM=(c,s,o=1,vc=false)=>new T3.PointsMaterial({color:c,size:s,map:gt,transparent:true,opacity:o,blending:AD,depthWrite:false,vertexColors:vc});
const groups=[],anim=[];
const G=(y,x)=>{const g=new T3.Group();g.position.set(x,y,0);g.bx=x;S.add(g);groups.push(g);return g};
const spin=(o,sx,sy)=>anim.push((t,dt,v)=>{o.rotation.y+=dt*sy+v*dt*3;o.rotation.x+=dt*sx});

/* 1 · Neural network with signal pulses (deep learning) */
{const g=G(-1,9),L=[4,6,6,3],N=[],idx=[],E=[],ep=[];let k=0;
 L.forEach((n,i)=>{idx.push([]);for(let j=0;j<n;j++){N.push(V((i-1.5)*3.6,(j-(n-1)/2)*1.8,rnd(-1.2,1.2)));idx[i].push(k++)}});
 for(let i=0;i<L.length-1;i++)idx[i].forEach(a=>idx[i+1].forEach(b=>{E.push([a,b,Math.random()]);ep.push(N[a],N[b])}));
 g.add(new T3.LineSegments(new T3.BufferGeometry().setFromPoints(ep),LM(K.b,.4)));
 g.add(new T3.Points(new T3.BufferGeometry().setFromPoints(N),PM(K.c,1.4)));
 const pg=new T3.BufferGeometry().setFromPoints(E.map(()=>V(0,0,0)));g.add(new T3.Points(pg,PM(0xffffff,.55)));
 g.rotation.y=-.5;anim.push((t,dt,v)=>{E.forEach((e,i)=>{const p=(e[2]+t*.35)%1,a=N[e[0]],b=N[e[1]];pg.attributes.position.setXYZ(i,a.x+(b.x-a.x)*p,a.y+(b.y-a.y)*p,a.z+(b.z-a.z)*p)});pg.attributes.position.needsUpdate=true;g.rotation.y=-.5+Math.sin(t*.3)*.5+v*.5});}

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
 anim.push((t,dt,v)=>{age+=dt;const e=.01,gx=(f(x+e,z)-f(x-e,z))/(2*e),gz=(f(x,z+e)-f(x,z-e))/(2*e);x-=gx*dt*1.6;z-=gz*dt*1.6;
  if(age>7||Math.hypot(gx,gz)<.02&&age>2){x=rnd(-6,6);z=rnd(-6,6);age=0;hist=[]}
  ball.position.set(x,f(x,z)+.3,z);hist.push(ball.position.clone());if(hist.length>70)hist.shift();
  hist.forEach((p,i)=>tr.attributes.position.setXYZ(i,p.x,p.y,p.z));for(let i=hist.length;i<70;i++)tr.attributes.position.setXYZ(i,0,-99,0);tr.attributes.position.needsUpdate=true;g.rotation.y+=dt*.12+v*dt*3});}

/* 4 · Breathing Gaussian bell (probability & statistics) */
{const g=G(-27,-10);g.add(surf(34,14,K.t,.4,(x,z,t)=>{const s=1.6+Math.sin(t*.8)*.7;return 4.5*Math.exp(-(x*x+z*z)/(2*s*s))-2}));
 g.add(new T3.LineSegments(new T3.BufferGeometry().setFromPoints([V(-8,-2,0),V(8,-2,0),V(0,-2,-8),V(0,-2,8),V(0,-2,0),V(0,4,0)]),LM(K.c,.7)));
 g.rotation.x=.35;anim.push((t,dt,v)=>{g.children[0].upd(t);g.rotation.y+=dt*.15+v*dt*3});}

/* 5 · Linear transformation of a cube (linear algebra) */
{const g=G(-39,10),box=new T3.EdgesGeometry(new T3.BoxGeometry(3,3,3));
 g.add(new T3.LineSegments(box,LM(K.b,.3)));const cu=new T3.LineSegments(box,LM(K.y,.95));cu.matrixAutoUpdate=false;g.add(cu);
 g.add(new T3.LineSegments(new T3.BufferGeometry().setFromPoints([V(-5,0,0),V(5,0,0),V(0,-5,0),V(0,5,0),V(0,0,-5),V(0,0,5)]),LM(K.c,.5)));
 g.rotation.set(.4,.5,0);anim.push((t,dt,v)=>{const a=Math.sin(t*.7),b=Math.cos(t*.5);cu.matrix.set(1+.7*a,.5*b,0,0,.5*a,1-.4*b,.35*a,0,0,.3*b,1+.5*a,0,0,0,0,1);g.rotation.y+=dt*.2+v*dt*3});}

/* 6 · CNN feature-map stack with moving kernel and data flow */
{const g=G(-51,-9),sz=[6,4.8,3.6,2.6,1.6],Z=i=>i*2.6-5.2;
 sz.forEach((s,i)=>{const m=new T3.LineSegments(new T3.EdgesGeometry(new T3.PlaneGeometry(s,s)),LM(K.c,.85));m.position.z=Z(i);g.add(m);
  const gr=new T3.GridHelper(s,Math.max(3,Math.round(s*1.2)),K.b,K.b);gr.rotation.x=Math.PI/2;gr.position.z=Z(i);gr.material.transparent=true;gr.material.opacity=.22;gr.material.blending=AD;gr.material.depthWrite=false;g.add(gr)});
 const kn=new T3.LineSegments(new T3.EdgesGeometry(new T3.BoxGeometry(1.2,1.2,.4)),LM(K.y,1));g.add(kn);
 const pt=new T3.BufferGeometry().setFromPoints(Array.from({length:40},()=>V(0,0,0)));g.add(new T3.Points(pt,PM(0xffffff,.45)));const ph=Array.from({length:40},()=>[Math.random(),rnd(-1,1),rnd(-1,1)]);
 g.rotation.set(.25,-.7,0);anim.push((t,dt,v)=>{kn.position.set(Math.sin(t*.9)*2.2,Math.cos(t*.6)*2.2,Z(0)+.1);
  ph.forEach((p,i)=>{const u=(p[0]+t*.12)%1,s=sz[Math.min(4,Math.floor(u*5))]*.4;pt.attributes.position.setXYZ(i,p[1]*s,p[2]*s,-5.2+u*10.4)});pt.attributes.position.needsUpdate=true;g.rotation.y=-.7+Math.sin(t*.25)*.4+v*.5});}

/* 7 · Torus knot (topology / manifolds) */
{const g=G(-63,10);g.add(new T3.LineSegments(new T3.WireframeGeometry(new T3.TorusKnotGeometry(2.8,.7,140,10,2,3)),LM(K.v,.4)));spin(g,.1,.25);}

/* 8 · K-means style clusters (machine learning) */
{const g=G(-74,-9),cs=[[-3,1,0,K.b],[3,-1,1,K.c],[0,3,-2,K.v]],P=[],Cl=[];
 cs.forEach(c=>{for(let i=0;i<110;i++){P.push(c[0]+rnd(-1.8,1.8),c[1]+rnd(-1.8,1.8),c[2]+rnd(-1.8,1.8));const k=new T3.Color(c[3]);Cl.push(k.r,k.g,k.b)}});
 const pg=new T3.BufferGeometry();pg.setAttribute('position',new T3.Float32BufferAttribute(P,3));pg.setAttribute('color',new T3.Float32BufferAttribute(Cl,3));g.add(new T3.Points(pg,PM(0xffffff,.5,1,true)));
 g.add(new T3.Points(new T3.BufferGeometry().setFromPoints(cs.map(c=>V(c[0],c[1],c[2]))),PM(0xffffff,2.2)));spin(g,.05,.3);}

/* ambient data-dust + floating math / ML symbols */
{const n=900,a=new Float32Array(n*3);for(let i=0;i<n;i++){a[i*3]=rnd(-34,34);a[i*3+1]=rnd(-90,12);a[i*3+2]=rnd(-28,8)}
 const pg=new T3.BufferGeometry();pg.setAttribute('position',new T3.BufferAttribute(a,3));const d=new T3.Points(pg,PM(0x8fb0ff,.16,.75));S.add(d);anim.push((t)=>{d.rotation.y=t*.01;d.position.x=Math.sin(t*.1)})}
const SY=['∇L(θ)','∫ eˣ dx','Σ','λ','π','σ(x)','∂f/∂x','P(A|B)','ReLU','softmax','Wx + b','e^{iπ}+1=0','∞','argmax','μ','Aᵀ','det(A)','θ ← θ − η∇L','H = −Σp log p','Ax = λx','CNN','LSTM','‖x‖₂','E[X]'];
for(let i=0;i<34;i++){const k=document.createElement('canvas');k.width=300;k.height=100;const c=k.getContext('2d');c.font='italic 600 46px "Cambria Math","STIX Two Math",Georgia,serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#b4ccff';c.shadowColor='#4d8bff';c.shadowBlur=16;c.fillText(SY[i%SY.length],150,50);
 const sp=new T3.Sprite(new T3.SpriteMaterial({map:new T3.CanvasTexture(k),transparent:true,opacity:rnd(.3,.65),blending:AD,depthWrite:false}));
 sp.scale.set(6,2,1);sp.position.set(rnd(-24,24),rnd(-84,6),rnd(-14,4));const y0=sp.position.y,ph=Math.random()*6;S.add(sp);anim.push(t=>{sp.position.y=y0+Math.sin(t*.5+ph)*.7})}

/* camera: scroll moves down the scene, pointer adds parallax */
const TOT=74;let sy=0,ty=0,mx=0,my=0,tx=0,tyy=0,last=0;
const sc=()=>{const h=document.documentElement.scrollHeight-innerHeight;ty=h>0?scrollY/h:0};addEventListener('scroll',sc,{passive:true});sc();
addEventListener('pointermove',e=>{tx=e.clientX/innerWidth-.5;tyy=e.clientY/innerHeight-.5},{passive:true});
function rs(){R.setSize(innerWidth,innerHeight,false);C.aspect=innerWidth/innerHeight;C.updateProjectionMatrix();const k=Math.min(1,C.aspect/1.5);groups.forEach(g=>g.position.x=g.bx*k)}
addEventListener('resize',rs);rs();
function frame(ms){const t=ms/1000,dt=RM?0:Math.min(.05,t-last);last=t;
 const v=Math.min(1.5,Math.abs(ty-sy)*30);sy+=(ty-sy)*.06;mx+=(tx-mx)*.05;my+=(tyy-my)*.05;
 C.position.set(mx*4,-sy*TOT-my*2,20-Math.sin(sy*Math.PI)*3);C.lookAt(mx*2,C.position.y-my*2,0);
 anim.forEach(f=>f(t,dt,v));R.render(S,C);if(!RM||Math.abs(ty-sy)>.0005)requestAnimationFrame(frame)}
requestAnimationFrame(frame);if(RM)addEventListener('scroll',()=>requestAnimationFrame(frame),{passive:true});

}
if(window.THREE)boot();else{var s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';s.onload=boot;document.head.appendChild(s)}
})();