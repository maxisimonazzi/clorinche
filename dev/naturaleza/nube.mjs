// Naturaleza / arcoíris: busca la fase del festón de la nube izquierda para que cada línea de banda
// cruce el contorno de la nube lejos (≥ 15–20 u) de un piquito. Uso: cd dev && node naturaleza/nube.mjs
// (los parámetros del arcoíris tienen que coincidir con los de app/js/drawings/naturaleza.js).
const R=Math.round, abulta=0.62, cx=500, cy=736, n6=6, paso=52, rin=112, k=1.05;
const rx0=rin+n6*paso, xc=R(cx-(rx0+rin)/2);
function outline(a,b,n,fase){ const pts=[];for(let i=0;i<=n;i++){const t=fase+i/n*2*Math.PI;pts.push([R(xc+a*Math.cos(t)),R(cy+b*Math.sin(t))]);}
  const samp=[];for(let i=1;i<=n;i++){const [x0,y0]=pts[i-1],[x1,y1]=pts[i];const c=Math.hypot(x1-x0,y1-y0),r=R(c*abulta);const h=Math.sqrt(Math.max(0,r*r-c*c/4));
  const mx=(x0+x1)/2,my=(y0+y1)/2,ux=(x1-x0)/c,uy=(y1-y0)/c;const cxA=mx-uy*h,cyA=my+ux*h;const a0=Math.atan2(y0-cyA,x0-cxA),a1=Math.atan2(y1-cyA,x1-cxA);let da=a1-a0;while(da<0)da+=2*Math.PI;
  for(let s=0;s<=80;s++){const ang=a0+da*s/80;samp.push([cxA+r*Math.cos(ang),cyA+r*Math.sin(ang)]);}} return {pts,samp};}
const res=[];
for(let n=9;n<=11;n++)for(const a of [172])for(const b of [104])for(let f=0;f<360/n;f+=1){
  const {pts,samp}=outline(a,b,n,f*Math.PI/180);
  const xmin=Math.min(...samp.map(p=>p[0]));
  let worst=1e9;
  for(let j=0;j<=n6;j++){const ax=rx0-j*paso, ay=ax*k;
    // punto del arco (lado izquierdo) más alto que está sobre el contorno: recorro el arco desde abajo
    let cross=null; for(let t=0;t<=Math.PI/2;t+=0.004){const x=cx-ax*Math.cos(t), y=cy-ay*Math.sin(t);
      // ¿adentro de la nube? test por muestreo: punto dentro del polígono samp
      let inside=false; for(let i=0,jj=samp.length-1;i<samp.length;jj=i++){const [xi,yi]=samp[i],[xj,yj]=samp[jj]; if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))inside=!inside;}
      if(!inside){cross=[x,y];break;}}
    const d=Math.min(...pts.map(([x,y])=>Math.hypot(x-cross[0],y-cross[1]))); worst=Math.min(worst,d);}
  res.push({n,a,b,f,worst:R(worst),ext:R(xmin)});
}
res.sort((p,q)=>q.worst-p.worst); console.log('xc',xc); console.log(res.filter(r=>r.ext>=48).slice(0,15));
