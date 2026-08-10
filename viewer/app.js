let album=null;
let photos=[];
let story='';
let spreads=[];
let current=0,locked=false,drag=null;
let albumUrl=null;

const views={
  cover:document.querySelector('#coverView'),
  reader:document.querySelector('#readerView')
};
const spreadEl=document.querySelector('#spread');
const book=document.querySelector('#book');
const curl=document.querySelector('#pageCurl');
const shadow=document.querySelector('.curl-shadow');
const indicator=document.querySelector('#pageIndicator');
const mobile=()=>matchMedia('(max-width:760px)').matches;

function show(name){
  Object.values(views).forEach(v=>v.classList.remove('active'));
  views[name].classList.add('active');
  window.scrollTo(0,0);
}

function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function formatDate(date){
  return String(date||'').replaceAll('-','.');
}

function photoSrc(p){
  if(!p) return '';
  if(p.url) return p.url;
  if(p.src) return p.src;
  // Maker V8 album.json stores photos in the same album folder's /photos directory.
  return new URL('photos/'+(p.file||p.f||''), albumUrl).href;
}

function normalizePhotos(list){
  return (list||[]).map((p,i)=>({
    ...p,
    file:p.file||p.f||String(i+1).padStart(3,'0')+'.webp',
    orientation:p.orientation || p.o || ((p.width&&p.height&&p.width>p.height)?'landscape':'portrait')
  }));
}

function buildSpreads(){
  const base=[];
  for(let i=0;i<photos.length;){
    const p=photos[i];
    if(p.orientation==='landscape'){
      base.push({type:'landscape',items:[p],start:i});
      i++;
    }else{
      const n=photos[i+1];
      if(n&&n.orientation==='portrait'){
        base.push({type:'pair',items:[p,n],start:i});
        i+=2;
      }else{
        base.push({type:'pair',items:[p,null],start:i});
        i++;
      }
    }
  }
  spreads=story.trim()?[{type:'essay'},...base]:base;
}

function bindAlbum(){
  const title=album.title||'제목 없는 앨범';
  const date=formatDate(album.date);
  const summary=album.summary||'';
  const coverIndex=Math.max(0,Math.min(Number(album.coverIndex||0),photos.length-1));
  const coverPhoto=photos[coverIndex]||photos[0];

  document.title='PAGE FLIP · '+title;
  document.querySelector('#coverImg').src=photoSrc(coverPhoto);
  document.querySelector('#coverTitle').textContent=title;
  document.querySelector('#coverDate').textContent=date;
  document.querySelector('#coverSummary').textContent=summary;
  document.querySelector('#coverMeta').textContent=`사진 ${photos.length}장 · 자동 편집`;
  document.querySelector('#storyMark').style.display=story.trim()?'':'none';
  document.querySelector('#readerTitle').textContent=title;
  document.querySelector('#readerDate').textContent=date;
  document.querySelector('#storyDate').textContent=[album.subtitle||'',date].filter(Boolean).join(' · ');

  const strip=document.querySelector('#thumbStrip');
  strip.innerHTML='';
  photos.slice(0,8).forEach(p=>{
    const img=document.createElement('img');
    img.src=photoSrc(p);
    img.alt='미리보기';
    strip.appendChild(img);
  });
}

function makePage(item,side,no){
  const d=document.createElement('div');
  d.className='page '+side;
  if(item){
    const i=document.createElement('img');
    i.src=photoSrc(item);
    i.alt='앨범 사진';
    d.appendChild(i);
  }else{
    d.classList.add('blank-page');
  }
  const n=document.createElement('div');
  n.className='page-number';
  n.textContent=no||'';
  d.appendChild(n);
  return d;
}

function essaySpread(){
  const left=document.createElement('article');
  left.className='essay-page essay-left';

  const essayPhoto=photos.length?photos[photos.length-1]:null;
  left.innerHTML=
    '<div class="essay-kicker">'+escapeHtml(album.episodeLabel||'EPISODE 01')+'</div>'+
    '<h3>'+escapeHtml(album.storyTitle||'그날의 기록')+'</h3>'+
    '<div class="essay-sub">'+escapeHtml([album.subtitle||'',formatDate(album.date)].filter(Boolean).join(' · '))+'</div>'+
    '<div class="essay-quote">“사진 속에 남은 장면과 함께<br>그날의 생각도 한 장의 기록으로 남깁니다.”</div>'+
    (essayPhoto?'<img class="essay-art" src="'+photoSrc(essayPhoto)+'" alt="에세이 이미지">':'');

  const right=document.createElement('article');
  right.className='essay-page essay-right';

  const excerpt=(album.storyExcerpt||story).trim();
  const short=excerpt.length>420?excerpt.slice(0,420).trim()+'…':excerpt;
  right.innerHTML='<div class="essay-excerpt">'+escapeHtml(short)+'</div><button class="read-more">전체 감상문 읽기 ›</button>';
  right.querySelector('.read-more').onclick=openStory;
  return [left,right];
}

function render(){
  spreadEl.innerHTML='';
  const s=spreads[current];
  if(!s){
    indicator.textContent='0 / 0';
    return;
  }

  if(s.type==='essay'){
    const [l,r]=essaySpread();
    spreadEl.appendChild(l);
    if(!mobile()){
      spreadEl.appendChild(r);
    }else{
      l.innerHTML=r.innerHTML;
      const btn=l.querySelector('.read-more');
      if(btn) btn.onclick=openStory;
    }
  }else if(s.type==='landscape'){
    const d=document.createElement('div');
    d.className='landscape-spread';
    const i=document.createElement('img');
    i.src=photoSrc(s.items[0]);
    i.alt='가로 사진';
    d.appendChild(i);
    spreadEl.appendChild(d);
  }else{
    spreadEl.appendChild(makePage(s.items[0],'left',s.start+1));
    if(!mobile()){
      spreadEl.appendChild(makePage(s.items[1],'right',s.items[1]?s.start+2:''));
    }
  }

  indicator.textContent=`${current+1} / ${spreads.length}`;
  resetCurl();
}

function resetCurl(){
  curl.style.cssText='';
  shadow.style.cssText='';
  book.classList.remove('dragging','settling','curl-hover');
}

function ease(t){return 1-Math.pow(1-t,4)}

function setCurl(p,yRatio=.9){
  p=Math.max(0,Math.min(1,p));
  const W=book.clientWidth,H=book.clientHeight;
  const foldX=W*(1-p*.94),foldY=H*Math.max(.12,Math.min(.96,yRatio));
  const cw=Math.max(42,W-foldX+80),ch=Math.max(42,H-foldY+120);

  curl.style.width=cw+'px';
  curl.style.height=ch+'px';
  curl.style.right='0';
  curl.style.bottom='0';
  curl.style.opacity='1';
  curl.style.clipPath='polygon(100% 0,100% 100%,0 100%,18% 72%,44% 43%)';
  curl.style.background='linear-gradient(132deg,rgba(255,255,255,.99) 0 42%,#f5efe6 45%,#d8cdbf 49%,#b9aa98 50%,#eee6dc 52%,rgba(255,255,255,.97) 58%,rgba(255,255,255,.86) 100%)';
  curl.style.transformOrigin='100% 100%';
  curl.style.transform=`translate3d(${-p*W*.82}px,${-p*H*.08}px,0) rotate(${-p*18}deg) rotateY(${p*18}deg)`;
  curl.style.filter=`drop-shadow(${-10-p*26}px ${-4-p*10}px ${12+p*22}px rgba(0,0,0,${.12+p*.18}))`;

  shadow.style.opacity=String(.12+p*.62);
  shadow.style.background=`radial-gradient(ellipse at ${100-p*72}% ${100-yRatio*34}%,rgba(0,0,0,${.16+p*.18}) 0,rgba(0,0,0,.08) 15%,transparent ${34+p*20}%)`;
}

function animateTo(from,to,dur,done){
  book.classList.add('dragging');
  const st=performance.now();
  function frame(t){
    const q=Math.min(1,(t-st)/dur);
    const v=from+(to-from)*ease(q);
    setCurl(v,.88-v*.22);
    if(q<1) requestAnimationFrame(frame);
    else{resetCurl();done&&done()}
  }
  requestAnimationFrame(frame);
}

function turn(delta){
  if(locked)return;
  const next=current+delta;
  if(next<0||next>=spreads.length)return;
  if(delta<0){
    current=next;
    render();
    return;
  }
  locked=true;
  animateTo(.05,1,620,()=>{
    current=next;
    render();
    locked=false;
  });
}

function openStory(){
  document.querySelector('#storyText').textContent=story;
  document.querySelector('#storyModal').classList.add('open');
}

document.querySelector('#backToShelf').onclick=()=>{
  if(document.referrer && document.referrer.includes('/shelves/')){
    history.back();
  }else{
    location.href='../shelves/personal/';
  }
};
document.querySelector('#backToCover').onclick=()=>show('cover');
document.querySelector('#openReader').onclick=()=>{current=0;render();show('reader')};
document.querySelector('#storyClose').onclick=()=>document.querySelector('#storyModal').classList.remove('open');
document.querySelector('#storyModal').onclick=e=>{
  if(e.target.id==='storyModal') e.currentTarget.classList.remove('open');
};
document.querySelector('#nextBtn').onclick=()=>turn(1);
document.querySelector('#prevBtn').onclick=()=>turn(-1);

addEventListener('keydown',e=>{
  if(document.querySelector('#storyModal').classList.contains('open')&&e.key==='Escape'){
    document.querySelector('#storyModal').classList.remove('open');
    return;
  }
  if(!views.reader.classList.contains('active'))return;
  if(e.key==='ArrowRight')turn(1);
  if(e.key==='ArrowLeft')turn(-1);
});
addEventListener('resize',render);

book.addEventListener('pointermove',e=>{
  const r=book.getBoundingClientRect();
  if(drag){
    const dx=Math.max(0,drag.x-e.clientX),dy=Math.max(0,drag.y-e.clientY);
    const p=Math.min(1,Math.hypot(dx*1.08,dy*.55)/(r.width*.68));
    drag.p=p;
    drag.yRatio=(e.clientY-r.top)/r.height;
    setCurl(p,drag.yRatio);
    return;
  }
  const near=r.right-e.clientX<125&&r.bottom-e.clientY<125;
  book.classList.toggle('curl-hover',near);
  if(near)setCurl(.055,.92);else resetCurl();
});
book.addEventListener('pointerleave',()=>{if(!drag)resetCurl()});
book.addEventListener('pointerdown',e=>{
  const r=book.getBoundingClientRect();
  if(r.right-e.clientX<170&&r.bottom-e.clientY<170&&current<spreads.length-1){
    drag={x:e.clientX,y:e.clientY,p:.03,yRatio:.9};
    book.setPointerCapture(e.pointerId);
    book.classList.add('dragging');
    setCurl(.03,.9);
  }
});
book.addEventListener('pointerup',()=>{
  if(!drag)return;
  const p=drag.p||0;
  drag=null;
  if(p>.38){
    locked=true;
    animateTo(p,1,Math.max(260,560*(1-p)),()=>{
      current=Math.min(current+1,spreads.length-1);
      render();
      locked=false;
    });
  }else{
    book.classList.add('settling');
    animateTo(p,0,360,resetCurl);
  }
});

let tx=null;
book.addEventListener('touchstart',e=>tx=e.touches[0].clientX,{passive:true});
book.addEventListener('touchend',e=>{
  if(tx==null)return;
  const dx=tx-e.changedTouches[0].clientX;
  if(Math.abs(dx)>50)turn(dx>0?1:-1);
  tx=null;
},{passive:true});

document.querySelector('#fullscreenBtn').onclick=async()=>{
  try{
    if(!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  }catch{}
};

const shareBtn=document.querySelector('#shareBtn');
const shareToast=document.querySelector('#shareToast');
let shareToastTimer=null;
function toast(msg){
  shareToast.textContent=msg;
  shareToast.classList.add('show');
  clearTimeout(shareToastTimer);
  shareToastTimer=setTimeout(()=>shareToast.classList.remove('show'),2200);
}
shareBtn.onclick=async()=>{
  const title=(album?.title||'앨범')+' · PAGE FLIP';
  const text=album?.summary||'';
  const url=location.href;
  try{
    if(navigator.share){
      await navigator.share({title,text,url});
      return;
    }
    await navigator.clipboard.writeText(url);
    toast('앨범 링크를 복사했습니다.');
  }catch(err){
    if(err&&err.name==='AbortError')return;
    toast('공유 링크를 복사하지 못했습니다.');
  }
};

(async()=>{
  try{
    const params=new URLSearchParams(location.search);
    const albumParam=params.get('album');
    if(!albumParam) throw new Error('앨범 경로가 없습니다.');

    albumUrl=new URL(albumParam,location.href);
    const r=await fetch(albumUrl.href,{cache:'no-store'});
    if(!r.ok) throw new Error(`album.json을 불러오지 못했습니다. (${r.status})`);

    album=await r.json();
    photos=normalizePhotos(album.photos);
    story=album.story||'';
    buildSpreads();
    bindAlbum();
    render();
  }catch(err){
    const e=document.querySelector('#loadError');
    e.textContent='앨범을 불러오지 못했습니다: '+err.message;
    e.style.display='block';
    console.error(err);
  }
})();
