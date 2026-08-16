// PAGE FLIP Viewer V11.5.2 — Mobile Pinch Photo Zoom
let album=null;
let photos=[];
let story='';
let spreads=[];
let current=0,locked=false,drag=null;
let albumUrl=null;

// =========================================================
// PAGE FLIP Analytics — Viewer page_view
// =========================================================
const PAGEFLIP_ANALYTICS_URL='https://pageflip-analytics.withme-jesus.workers.dev/event';
let lastTrackedPageKey='';

function analyticsVisitorId(){
  const key='pageflip_visitor_id';
  try{
    let id=localStorage.getItem(key);
    if(!id){
      id=(crypto?.randomUUID?.() || ('v-'+Date.now()+'-'+Math.random().toString(16).slice(2)));
      localStorage.setItem(key,id);
    }
    return id;
  }catch{
    return 'session-'+Date.now();
  }
}

function analyticsDeviceType(){
  return matchMedia('(max-width:760px)').matches?'mobile':'pc';
}

function analyticsOS(){
  const ua=navigator.userAgent||'';
  if(/Windows/i.test(ua)) return 'Windows';
  if(/Android/i.test(ua)) return 'Android';
  if(/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if(/Mac OS X|Macintosh/i.test(ua)) return 'macOS';
  if(/Linux/i.test(ua)) return 'Linux';
  return '';
}

function currentAnalyticsPageNo(){
  const s=spreads[current];
  if(!s) return current+1;
  if(Number.isFinite(Number(s.start))) return Number(s.start)+1;
  return current+1;
}

function trackPageView(){
  if(!album || !views.reader.classList.contains('active')) return;

  const pageNo=currentAnalyticsPageNo();
  const albumId=String(album.id||album.albumId||album.album_id||'');
  const shelfId=String(album.shelfKey||album.shelf_id||album.shelfId||'personal');
  const key=[albumId,current,pageNo,analyticsDeviceType()].join('|');
  if(key===lastTrackedPageKey) return;
  lastTrackedPageKey=key;

  const payload={
    event_type:'page_view',
    visitor_id:analyticsVisitorId(),
    shelf_id:shelfId,
    album_id:albumId,
    album_title:String(album.title||''),
    page_no:pageNo,
    device_type:analyticsDeviceType(),
    os:analyticsOS()
  };

  try{
    fetch(PAGEFLIP_ANALYTICS_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload),
      keepalive:true,
      cache:'no-store'
    }).catch(()=>{});
  }catch{}
}

const views={
  cover:document.querySelector('#coverView'),
  reader:document.querySelector('#readerView')
};
const spreadEl=document.querySelector('#spread');
const book=document.querySelector('#book');
const curl=document.querySelector('#pageCurl');
const shadow=document.querySelector('.curl-shadow');
const turnUnderlay=document.querySelector('#turnUnderlay');
const turnSheet=document.querySelector('#turnSheet');
const turnFront=turnSheet?.querySelector('.turn-front');
const turnBack=turnSheet?.querySelector('.turn-back');
let turnSource=null;
let turnSourcePlaceholder=null;
let turnDirection=1;
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
  return (list||[]).map((p,i)=>{
    const width=Number(p.width||0);
    const height=Number(p.height||0);
    let orientation=p.orientation||p.o||'';

    if(!orientation && width>0 && height>0){
      const ratio=width/height;
      if(ratio>=0.88 && ratio<=1.14) orientation='square';
      else if(ratio>1.14) orientation='landscape';
      else orientation='portrait';
    }

    if(!orientation) orientation='portrait';

    return {
      ...p,
      file:p.file||p.f||String(i+1).padStart(3,'0')+'.webp',
      orientation
    };
  });
}

function buildSpreads(){
  const base=[];

  for(let i=0;i<photos.length;){
    const p=photos[i];
    const n=photos[i+1];

    if(p.orientation==='landscape'){
      base.push({type:'landscape',items:[p],start:i});
      i++;
    }else if(p.orientation==='square'){
      base.push({type:'square',items:[p],start:i});
      i++;
    }else if(n&&n.orientation==='portrait'){
      base.push({type:'pair',items:[p,n],start:i});
      i+=2;
    }else{
      // 홀수로 남은 세로 사진은 빈 페이지 대신 이야기 페이지와 짝지음
      base.push({type:'portrait-story',items:[p],start:i});
      i++;
    }
  }

  const content=story.trim()?[{type:'essay'},...base]:base;

  // V11.5: 사진 콘텐츠가 완전히 끝난 뒤 엔딩 페이지와 뒷표지를 독립 spread로 추가합니다.
  // 마지막 사진이 가로사진이어도 landscape spread 전체가 먼저 끝난 뒤 엔딩으로 이동합니다.
  // V11.5.1: 마지막 사진 spread가 완전히 끝난 뒤 엔딩을 정확히 한 번만 표시합니다.
  // 별도의 두 번째 엔딩/뒷표지 spread는 만들지 않습니다.
  spreads=[
    ...content,
    {type:'ending'}
  ];
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

function makeStoryPage(side){
  const d=document.createElement('div');
  d.className='page '+side+' story-companion';
  d.style.display='flex';
  d.style.alignItems='center';
  d.style.justifyContent='center';
  d.style.textAlign='center';
  d.style.padding='44px';

  const box=document.createElement('div');
  box.style.maxWidth='260px';
  box.style.color='#6f5239';

  const date=document.createElement('div');
  date.textContent=formatDate(album?.date||'');
  date.style.fontSize='13px';
  date.style.letterSpacing='.12em';
  date.style.marginBottom='20px';
  date.style.color='#9b7652';

  const title=document.createElement('div');
  title.textContent=album?.title||'그날의 기록';
  title.style.fontFamily='Georgia, serif';
  title.style.fontSize='25px';
  title.style.lineHeight='1.35';
  title.style.marginBottom='18px';

  const line=document.createElement('div');
  line.style.width='36px';
  line.style.height='1px';
  line.style.background='rgba(111,82,57,.35)';
  line.style.margin='0 auto 18px';

  const text=document.createElement('div');
  text.textContent=album?.summary||'그날의 기록';
  text.style.fontSize='14px';
  text.style.lineHeight='1.9';
  text.style.color='#826b56';

  box.append(date,title,line,text);
  d.appendChild(box);

  const n=document.createElement('div');
  n.className='page-number';
  n.textContent='';
  d.appendChild(n);

  return d;
}

function makePage(item,side,no){
  const d=document.createElement('div');
  d.className='page '+side;

  if(item){
    const i=document.createElement('img');
    i.src=photoSrc(item);
    i.alt='앨범 사진';

    // V9.1: 사진 비율에 따라 사진책 편집처럼 여백과 크기를 자동 조정합니다.
    i.style.objectFit='contain';
    i.style.display='block';
    i.style.margin='auto';

    if(item.orientation==='portrait'){
      d.classList.add('portrait-photo-page');
      i.classList.add('portrait-photo');
      // V9.3.1: 실제 크기/여백은 CSS가 담당하여 양쪽 페이지의 균형을 맞춥니다.
      i.style.maxWidth='';
      i.style.maxHeight='';
      i.style.boxShadow='';
    }else if(item.orientation==='square'){
      i.style.maxWidth='78%';
      i.style.maxHeight='78%';
      i.style.boxShadow='0 14px 30px rgba(74,55,37,.13)';
    }else{
      i.style.maxWidth='92%';
      i.style.maxHeight='86%';
    }

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
  left.className='essay-page essay-left episode-fixed';

  // 샘플 사진책처럼 에피소드 대표 이미지는 마지막 사진을 사용합니다.
  const essayPhoto=photos.length?photos[photos.length-1]:null;
  const subtitle=[album.subtitle||'',formatDate(album.date)].filter(Boolean).join(' · ');

  left.innerHTML=
    '<div class="episode-inner episode-left-inner">'+
      '<div class="essay-kicker">'+escapeHtml(album.episodeLabel||'EPISODE 01')+'</div>'+
      '<h3>'+escapeHtml(album.storyTitle||'그날의 기록')+'</h3>'+
      '<div class="essay-sub">'+escapeHtml(subtitle)+'</div>'+
      '<div class="essay-quote">“사진 속에 남은 장면과 함께<br>그날의 생각도 한 장의 기록으로 남깁니다.”</div>'+
      (essayPhoto?'<img class="essay-art" src="'+photoSrc(essayPhoto)+'" alt="에세이 이미지">':'')+
    '</div>';

  const right=document.createElement('article');
  right.className='essay-page essay-right episode-fixed';

  // 감상문은 원문 줄바꿈을 살리고, 첫 화면에는 샘플처럼 적당한 분량만 보여줍니다.
  const excerpt=(album.storyExcerpt||story).trim();
  const maxChars=330;
  let short=excerpt.length>maxChars?excerpt.slice(0,maxChars).trim()+'…':excerpt;

  right.innerHTML=
    '<div class="episode-inner episode-right-inner">'+
      '<div class="essay-excerpt">'+escapeHtml(short)+'</div>'+
      '<button class="read-more">전체 감상문 읽기 ›</button>'+
    '</div>';

  right.querySelector('.read-more').onclick=openStory;
  return [left,right];
}

function makeEndingPage(side='left'){
  const d=document.createElement('div');
  d.className='page '+side+' ending-page';

  const box=document.createElement('div');
  box.className='ending-inner';

  const title=document.createElement('div');
  title.className='ending-title';
  title.textContent=album?.title||'PHOTO BOOK';

  const date=document.createElement('div');
  date.className='ending-date';
  date.textContent=formatDate(album?.date||'');

  const line=document.createElement('div');
  line.className='ending-line';

  const brand=document.createElement('div');
  brand.className='ending-brand';
  brand.textContent="YOUNGCHOON'S PHOTO BOOK";

  box.append(title,date,line,brand);
  d.appendChild(box);
  return d;
}

function makeEndingBlank(side='right'){
  const d=document.createElement('div');
  d.className='page '+side+' ending-blank';
  return d;
}

function makeBackCoverPage(side='left'){
  const d=document.createElement('div');
  d.className='page '+side+' back-cover-page';

  const mark=document.createElement('div');
  mark.className='back-cover-mark';

  const logo=document.createElement('span');
  logo.textContent='PAGE FLIP';
  const sub=document.createElement('small');
  sub.textContent="YOUNGCHOON'S PHOTO BOOK";

  mark.append(logo,sub);
  d.appendChild(mark);
  return d;
}

function makeBackCoverBlank(side='right'){
  const d=document.createElement('div');
  d.className='page '+side+' back-cover-blank';
  return d;
}

function render(){
  book.classList.remove('photo-zoomed');
  pinch.active=false;
  pinch.img=null;
  tx=null;
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
  }else if(s.type==='ending'){
    const ending=makeEndingPage('left');
    ending.classList.add('ending-only');
    spreadEl.appendChild(ending);
  }else if(s.type==='portrait-story'){
    spreadEl.appendChild(makePage(s.items[0],'left',s.start+1));
    if(!mobile()){
      spreadEl.appendChild(makeStoryPage('right'));
    }
  }else if(s.type==='landscape'){
    const d=document.createElement('div');
    d.className='landscape-spread landscape-hero-spread';

    const frame=document.createElement('div');
    frame.className='landscape-hero-frame';

    const i=document.createElement('img');
    i.src=photoSrc(s.items[0]);
    i.alt='가로 사진';
    i.className='landscape-hero-photo';

    const gutter=document.createElement('div');
    gutter.className='landscape-photo-gutter';
    gutter.setAttribute('aria-hidden','true');

    frame.append(i,gutter);
    d.appendChild(frame);
    spreadEl.appendChild(d);

  }else if(s.type==='square'){
    const d=document.createElement('div');
    d.className='landscape-spread';
    d.style.display='flex';
    d.style.alignItems='center';
    d.style.justifyContent='center';
    d.style.padding=mobile()?'24px':'46px';

    const i=document.createElement('img');
    i.src=photoSrc(s.items[0]);
    i.alt='정사각형 사진';
    i.style.width=mobile()?'82%':'54%';
    i.style.maxHeight='82%';
    i.style.objectFit='contain';
    i.style.boxShadow='0 18px 38px rgba(74,55,37,.15)';
    d.appendChild(i);
    spreadEl.appendChild(d);

  }else{
    spreadEl.appendChild(makePage(s.items[0],'left',s.start+1));
    if(!mobile()){
      spreadEl.appendChild(makePage(s.items[1],'right',s.items[1]?s.start+2:''));
    }
  }

  if(s.type==='ending') indicator.textContent='마지막 기록';
  else indicator.textContent=`${current+1} / ${spreads.length}`;
  resetCurl();
  trackPageView();
}


function clonePageForTurn(node){
  if(!node) return null;
  const clone=node.cloneNode(true);
  clone.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  clone.querySelectorAll('button').forEach(btn=>btn.tabIndex=-1);
  return clone;
}



function makeLandscapeTurnHalf(s,side='left'){
  const d=document.createElement('div');
  d.className='page reveal-photo-page landscape-turn-half landscape-turn-half-'+side;

  const full=document.createElement('div');
  full.className='landscape-spread landscape-hero-spread landscape-turn-full-spread';

  const frame=document.createElement('div');
  frame.className='landscape-hero-frame';

  const p=s?.items?.[0];
  if(p){
    const img=document.createElement('img');
    img.src=photoSrc(p);
    img.alt=side==='left'?'가로사진 왼쪽 면':'가로사진 오른쪽 면';
    img.className='landscape-hero-photo';
    frame.appendChild(img);
  }

  const gutter=document.createElement('div');
  gutter.className='landscape-photo-gutter';
  gutter.setAttribute('aria-hidden','true');
  frame.appendChild(gutter);

  full.appendChild(frame);
  d.appendChild(full);
  return d;
}

function makeRevealPage(targetIndex,direction){
  const s=spreads[targetIndex];
  if(!s) return null;

  // 다음으로 갈 때는 다음 펼침의 첫 페이지,
  // 이전으로 갈 때는 이전 펼침의 마지막 페이지를 보여줍니다.
  if(s.type==='essay'){
    const [left,right]=essaySpread();
    return direction>0 ? left : right;
  }

  if(s.type==='ending'){
    const ending=makeEndingPage(direction>0?'left':'right');
    ending.classList.add('ending-only');
    return ending;
  }

  if(s.type==='portrait-story'){
    return direction>0
      ? makePage(s.items[0],'left',s.start+1)
      : makeStoryPage('right');
  }

  if(s.type==='pair'){
    const item=direction>0 ? s.items[0] : (s.items[1]||s.items[0]);
    const no=direction>0 ? s.start+1 : (s.items[1]?s.start+2:s.start+1);
    return makePage(item,direction>0?'left':'right',no);
  }

  if(s.type==='landscape'){
    // 앞으로 넘길 때만 다음 가로 spread의 왼쪽 절반을 정확히 사용합니다.
    // 뒤로 넘기기는 V11.4에서 정상 확인된 기존 동작을 그대로 둡니다.
    if(direction>0) return makeLandscapeTurnHalf(s,'left');

    const d=document.createElement('div');
    d.className='page reveal-photo-page';
    const p=s.items?.[0];
    if(p){
      const img=document.createElement('img');
      img.src=photoSrc(p);
      img.alt='이전 페이지 미리보기';
      img.style.width='100%';
      img.style.height='100%';
      img.style.objectFit='contain';
      d.appendChild(img);
    }
    return d;
  }

  if(s.type==='square'){
    const d=document.createElement('div');
    d.className='page reveal-photo-page';
    const p=s.items?.[0];
    if(p){
      const img=document.createElement('img');
      img.src=photoSrc(p);
      img.alt='다음 페이지 미리보기';
      img.style.width='100%';
      img.style.height='100%';
      img.style.objectFit='contain';
      d.appendChild(img);
    }
    return d;
  }

  return null;
}


function makeUnderlayPage(targetIndex,direction){
  const s=spreads[targetIndex];
  if(!s) return null;

  // 앞으로 넘길 때 오른쪽 책 면 아래에는 다음 spread의 오른쪽 면이 있어야 합니다.
  // turn-back은 다음 spread의 왼쪽 면을 담당하므로 두 레이어를 분리합니다.
  if(direction>0){
    if(s.type==='essay'){
      const [,right]=essaySpread();
      return right;
    }
    if(s.type==='ending') return makeEndingBlank('right');
    if(s.type==='back-cover') return makeBackCoverBlank('right');
    if(s.type==='portrait-story') return makeStoryPage('right');
    if(s.type==='pair'){
      const item=s.items[1]||null;
      return item ? makePage(item,'right',s.start+2) : makePage(null,'right','');
    }
    if(s.type==='landscape'){
      return makeLandscapeTurnHalf(s,'right');
    }
    if(s.type==='square'){
      const d=document.createElement('div');
      d.className='page reveal-photo-page';
      const p=s.items?.[0];
      if(p){
        const img=document.createElement('img');
        img.src=photoSrc(p);
        img.alt='다음 펼침 오른쪽 면';
        img.style.width='100%';
        img.style.height='100%';
        img.style.objectFit='contain';
        d.appendChild(img);
      }
      return d;
    }
  }

  // 뒤로 넘기기는 기존 동작이 정상적이므로 그대로 유지합니다.
  return makeRevealPage(targetIndex,direction);
}

function prepareTurnSheet(direction=1){
  if(!turnSheet||mobile()) return false;

  const currentPages=[...spreadEl.children];
  if(!currentPages.length) return false;

  turnDirection=direction<0?-1:1;

  // 다음 방향은 오른쪽 페이지, 이전 방향은 왼쪽 페이지를 실제 종이처럼 넘깁니다.
  const source=
    turnDirection>0
      ? (currentPages.length>1 ? currentPages[currentPages.length-1] : currentPages[0])
      : currentPages[0];

  turnFront.innerHTML='';
  turnBack.innerHTML='';

  const frontClone=clonePageForTurn(source);
  if(frontClone){
    frontClone.classList.add('turn-clone');
    turnFront.appendChild(frontClone);
  }

  // V10.2:
  // 종이의 앞면에는 현재 페이지를, 뒷면에는 실제 다음(또는 이전) 페이지를 넣습니다.
  // 따라서 종이가 90도를 지나 뒤집히는 순간부터 같은 이미지가 반복되지 않고
  // 다음 이미지가 종이 뒷면에 붙어 자연스럽게 나타납니다.
  const targetIndex=current+turnDirection;
  const backPage=makeRevealPage(targetIndex,turnDirection);
  if(backPage){
    backPage.classList.add('turn-clone','turn-back-page');
    turnBack.appendChild(backPage);
  }

  // V10.0: 움직이는 복제 페이지에는 사진/텍스트를 그대로 유지합니다.
  // 대신 원래 위치의 페이지를 live spread에서 완전히 분리해
  // 3D 합성 중 희미한 원본 자국(ghost)을 구조적으로 없앱니다.
  turnSource=source;
  const isLandscapeSource=source.classList?.contains('landscape-hero-spread');
  if(isLandscapeSource){
    // V11.3: 가로사진은 한 장이 양면 전체를 차지하므로 원본 전체를 DOM에서 제거하면
    // 반대쪽 절반까지 사라집니다. 넘기는 쪽 절반만 가리고, 나머지 절반은 책에 남깁니다.
    turnSourcePlaceholder=null;
    source.classList.add('landscape-turn-source');
    source.classList.toggle('turning-forward',turnDirection>0);
    source.classList.toggle('turning-reverse',turnDirection<0);
    if(frontClone){
      frontClone.classList.add(turnDirection>0?'landscape-turn-right':'landscape-turn-left');
    }
  }else{
    turnSourcePlaceholder=document.createComment('page-turn-source');
    if(source.parentNode){
      source.parentNode.replaceChild(turnSourcePlaceholder,source);
    }
  }

  if(turnUnderlay){
    turnUnderlay.innerHTML='';
    const reveal=makeUnderlayPage(targetIndex,turnDirection);
    if(reveal){
      reveal.classList.add('turn-reveal-page');
      turnUnderlay.appendChild(reveal);
    }
    turnUnderlay.classList.toggle('reverse',turnDirection<0);
    turnUnderlay.classList.add('active');
  }

  turnSheet.classList.toggle('reverse',turnDirection<0);
  turnSheet.classList.add('active');
  turnSheet.style.transform='rotateY(0deg)';
  return true;
}

function setTurnSheet(p){
  if(!turnSheet||mobile()) return;
  p=Math.max(0,Math.min(1,p));
  const angle=turnDirection>0 ? -180*p : 180*p;
  turnSheet.style.transform=`rotateY(${angle}deg)`;
  turnSheet.style.setProperty('--sheet-progress',p.toFixed(3));
  turnSheet.style.opacity=p<=.995?'1':'0';
}

function resetCurl(){
  curl.style.cssText='';
  shadow.style.cssText='';
  book.style.setProperty('--turn-progress','0');
  book.classList.remove('dragging','settling','curl-hover');
  // 드래그를 취소한 경우에만 분리했던 원본 페이지를 제자리로 돌려놓습니다.
  // 정상 넘김 완료 시 render()가 새 spread를 만들기 때문에 placeholder는 사라집니다.
  if(turnSource && turnSourcePlaceholder && turnSourcePlaceholder.parentNode){
    turnSourcePlaceholder.parentNode.replaceChild(turnSource,turnSourcePlaceholder);
  }
  if(turnSource?.classList){
    turnSource.classList.remove('landscape-turn-source','turning-forward','turning-reverse');
  }
  turnSource=null;
  turnSourcePlaceholder=null;
  if(turnUnderlay){
    turnUnderlay.classList.remove('active','reverse');
    turnUnderlay.innerHTML='';
  }
  if(turnSheet){
    turnSheet.classList.remove('active','reverse');
    turnSheet.style.cssText='';
  }
  turnDirection=1;
  if(turnFront) turnFront.innerHTML='';
  if(turnBack) turnBack.innerHTML='';
}

function ease(t){
  // 종이가 처음에는 손을 따라 움직이고, 중간부터 자연스럽게 넘어가는 곡선
  return t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
}

function setCurl(p,yRatio=.9,direction=turnDirection){
  p=Math.max(0,Math.min(1,p));
  const W=book.clientWidth,H=book.clientHeight;

  // V9.4 Real Page Turn:
  // 오른쪽 페이지가 모서리에서 시작해 중앙 제본부를 지나 왼쪽으로 넘어가는 느낌.
  // V11.1: 말림 효과를 실제 페이지 끝부분에만 제한합니다.
  // 큰 삼각형이 책 밖으로 솟는 느낌을 줄이고 제본부는 안정적으로 유지합니다.
  const foldX=W*(1-p*.78);
  const foldY=H*Math.max(.18,Math.min(.96,yRatio));
  const cw=Math.max(46,Math.min(W*.46,W-foldX+58));
  const ch=Math.max(46,Math.min(H*.48,H-foldY+78));
  const bend=12+p*16;

  curl.style.width=cw+'px';
  curl.style.height=ch+'px';
  if(direction>0){
    curl.style.right='0';
    curl.style.left='auto';
  }else{
    curl.style.left='0';
    curl.style.right='auto';
  }
  curl.style.bottom='0';
  curl.style.opacity=String(Math.min(1,.28+p*1.8));
  curl.style.clipPath=direction>0
    ? `polygon(100% 12%,100% 100%,8% 100%,${bend}% 78%,${58-p*5}% 52%)`
    : `polygon(0 12%,0 100%,92% 100%,${100-bend}% 78%,${42+p*5}% 52%)`;
  curl.style.background=
    'linear-gradient(132deg,'+
    'rgba(255,255,255,.995) 0 38%,'+
    'rgba(248,243,236,.99) 41%,'+
    'rgba(214,204,192,.96) 47%,'+
    'rgba(151,137,120,.82) 49.2%,'+
    'rgba(250,247,241,.98) 51.5%,'+
    'rgba(255,255,255,.99) 59%,'+
    'rgba(246,240,232,.96) 100%)';
  curl.style.transformOrigin=direction>0?'100% 100%':'0% 100%';
  const sx=direction>0?-1:1;
  curl.style.transform=
    `translate3d(${sx*p*W*.72}px,${-p*H*.025}px,0) `+
    `perspective(${Math.max(1100,W*1.8)}px) rotate(${sx*p*7}deg) rotateY(${-sx*p*20}deg) skewY(${sx*p*.7}deg)`;
  curl.style.filter=
    `drop-shadow(${sx*(5+p*18)}px ${-2-p*5}px ${8+p*14}px rgba(0,0,0,${.08+p*.14}))`;

  // 움직이는 종이 아래의 그림자. 중앙에 가까워질수록 가장 진해집니다.
  const mid=1-Math.abs(.52-p)/.52;
  const strength=Math.max(.06,Math.min(.34,.09+p*.13+mid*.11));
  shadow.style.opacity=String(Math.min(.58,.10+p*.46));
  const shadowX=direction>0 ? 100-p*78 : p*78;
  shadow.style.background=
    `radial-gradient(ellipse at ${shadowX}% ${100-yRatio*35}%,`+
    `rgba(44,31,21,${strength}) 0,rgba(44,31,21,${strength*.48}) 16%,transparent ${36+p*24}%)`;

  // 책 전체에도 아주 약한 상태 클래스를 주어 CSS에서 제본부를 반응시킵니다.
  book.style.setProperty('--turn-progress',p.toFixed(3));
  if(turnSheet?.classList.contains('active')) setTurnSheet(p);
}
function animateTo(from,to,dur,done,direction=turnDirection){
  book.classList.add('dragging');
  const st=performance.now();
  function frame(t){
    const q=Math.min(1,(t-st)/dur);
    const v=from+(to-from)*ease(q);
    setCurl(v,.88-v*.22,direction);
    if(q<1) requestAnimationFrame(frame);
    else{resetCurl();done&&done()}
  }
  requestAnimationFrame(frame);
}

function turn(delta){
  if(locked)return;
  const next=current+delta;
  if(next<0||next>=spreads.length)return;

  locked=true;
  turnDirection=delta<0?-1:1;
  prepareTurnSheet(turnDirection);

  animateTo(.035,1,860,()=>{
    current=next;
    render();
    locked=false;
  },turnDirection);
}

function openStory(){
  document.querySelector('#storyText').textContent=story;
  document.querySelector('#storyModal').classList.add('open');
}

document.querySelector('#backToShelf').onclick=()=>{
  const fromMaker=new URLSearchParams(location.search).get('from')==='maker';
  if(fromMaker){
    location.href='../maker/';
    return;
  }
  const shelfKey=String(album?.shelfKey||'personal').trim()||'personal';
  location.href=`../shelves/${encodeURIComponent(shelfKey)}/`;
};
document.querySelector('#backToCover').onclick=()=>show('cover');
document.querySelector('#openReader').onclick=()=>{current=0;show('reader');render()};
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
    const horizontal=drag.direction>0
      ? Math.max(0,drag.x-e.clientX)
      : Math.max(0,e.clientX-drag.x);
    const dy=Math.max(0,drag.y-e.clientY);
    const p=Math.min(1,Math.hypot(horizontal*1.08,dy*.55)/(r.width*.68));
    drag.p=p;
    drag.yRatio=(e.clientY-r.top)/r.height;
    turnDirection=drag.direction;
    setCurl(p,drag.yRatio,drag.direction);
    return;
  }
  const nearRight=r.right-e.clientX<125&&r.bottom-e.clientY<125&&current<spreads.length-1;
  const nearLeft=e.clientX-r.left<125&&r.bottom-e.clientY<125&&current>0;
  const near=nearRight||nearLeft;
  book.classList.toggle('curl-hover',near);
  if(near){
    turnDirection=nearLeft?-1:1;
    setCurl(.055,.92,turnDirection);
  }else resetCurl();
});
book.addEventListener('pointerleave',()=>{if(!drag)resetCurl()});
book.addEventListener('pointerdown',e=>{
  if(mobile() && e.pointerType==='touch') return;
  const r=book.getBoundingClientRect();
  const rightCorner=r.right-e.clientX<170&&r.bottom-e.clientY<170&&current<spreads.length-1;
  const leftCorner=e.clientX-r.left<170&&r.bottom-e.clientY<170&&current>0;
  if(rightCorner||leftCorner){
    const direction=leftCorner?-1:1;
    turnDirection=direction;
    drag={x:e.clientX,y:e.clientY,p:.03,yRatio:.9,direction};
    prepareTurnSheet(direction);
    book.setPointerCapture(e.pointerId);
    book.classList.add('dragging');
    setCurl(.03,.9,direction);
  }
});
book.addEventListener('pointerup',()=>{
  if(!drag)return;
  const p=drag.p||0;
  drag=null;
  const direction=turnDirection;
  if(p>.34){
    locked=true;
    animateTo(p,1,Math.max(320,760*(1-p)),()=>{
      current=Math.max(0,Math.min(current+direction,spreads.length-1));
      render();
      locked=false;
    },direction);
  }else{
    book.classList.add('settling');
    animateTo(p,0,420,resetCurl,direction);
  }
});

book.addEventListener('pointercancel',()=>{
  if(!drag)return;
  const p=drag.p||0;
  const direction=drag.direction||turnDirection;
  drag=null;
  book.classList.add('settling');
  animateTo(p,0,320,resetCurl,direction);
});

// =========================================================
// V11.5.2 — Mobile Pinch Photo Zoom
// 두 손가락 확대/축소 + 확대 중 페이지 스와이프 방지
// =========================================================
let tx=null;
let pinch={
  img:null,
  active:false,
  startDist:0,
  startScale:1
};

function pinchDistance(touches){
  if(!touches || touches.length<2) return 0;
  const dx=touches[0].clientX-touches[1].clientX;
  const dy=touches[0].clientY-touches[1].clientY;
  return Math.hypot(dx,dy);
}

function zoomScale(img){
  return Number(img?.dataset?.zoomScale||1) || 1;
}

function setPhotoZoom(img,scale){
  if(!img) return;
  const safe=Math.max(1,Math.min(4,scale));
  img.dataset.zoomScale=String(safe);
  img.style.transform=`scale(${safe})`;
  img.classList.toggle('pinch-zoomed',safe>1.01);
  book.classList.toggle('photo-zoomed',safe>1.01);
}

function resetPhotoZoom(img){
  if(!img) return;
  img.dataset.zoomScale='1';
  img.style.transform='scale(1)';
  img.style.transformOrigin='50% 50%';
  img.classList.remove('pinch-zoomed');
  book.classList.remove('photo-zoomed');
}

function currentZoomedPhoto(){
  return spreadEl.querySelector('img.pinch-zoomed');
}

function touchPhotoAtPoint(touch){
  const el=document.elementFromPoint(touch.clientX,touch.clientY);
  const img=el?.closest?.(
    '.page img, .landscape-spread img, .essay-art'
  );
  return img && spreadEl.contains(img) ? img : null;
}

book.addEventListener('touchstart',e=>{
  if(!mobile()) return;

  if(e.touches.length===2){
    const mid={
      clientX:(e.touches[0].clientX+e.touches[1].clientX)/2,
      clientY:(e.touches[0].clientY+e.touches[1].clientY)/2
    };

    const img=touchPhotoAtPoint(mid) ||
      e.target.closest?.('.page img, .landscape-spread img, .essay-art');

    if(!img || !spreadEl.contains(img)) return;

    // 다른 사진이 확대 중이면 먼저 원복
    const old=currentZoomedPhoto();
    if(old && old!==img) resetPhotoZoom(old);

    const rect=img.getBoundingClientRect();
    const ox=Math.max(0,Math.min(100,((mid.clientX-rect.left)/rect.width)*100));
    const oy=Math.max(0,Math.min(100,((mid.clientY-rect.top)/rect.height)*100));

    img.style.transformOrigin=`${ox}% ${oy}%`;
    img.style.willChange='transform';

    pinch.img=img;
    pinch.active=true;
    pinch.startDist=Math.max(1,pinchDistance(e.touches));
    pinch.startScale=zoomScale(img);
    tx=null;

    e.preventDefault();
    return;
  }

  if(e.touches.length===1){
    // 사진이 확대되어 있는 동안에는 페이지 넘김을 시작하지 않습니다.
    if(currentZoomedPhoto()){
      tx=null;
      return;
    }
    tx=e.touches[0].clientX;
  }
},{passive:false});

book.addEventListener('touchmove',e=>{
  if(!mobile() || !pinch.active || e.touches.length<2 || !pinch.img) return;

  const dist=pinchDistance(e.touches);
  const scale=pinch.startScale*(dist/pinch.startDist);
  setPhotoZoom(pinch.img,scale);
  e.preventDefault();
},{passive:false});

book.addEventListener('touchend',e=>{
  if(!mobile()) return;

  if(pinch.active){
    // 한 손가락이 먼저 떨어지는 순간에는 페이지 넘김으로 연결하지 않음
    if(e.touches.length<2){
      const img=pinch.img;
      pinch.active=false;
      pinch.img=null;
      pinch.startDist=0;

      if(img){
        if(zoomScale(img)<1.06) resetPhotoZoom(img);
        else img.style.willChange='auto';
      }
    }
    tx=null;
    e.preventDefault();
    return;
  }

  if(currentZoomedPhoto()){
    tx=null;
    return;
  }

  if(tx==null || !e.changedTouches.length) return;
  const dx=tx-e.changedTouches[0].clientX;
  if(Math.abs(dx)>64) turn(dx>0?1:-1);
  tx=null;
},{passive:false});

book.addEventListener('touchcancel',()=>{
  pinch.active=false;
  pinch.img=null;
  tx=null;
},{passive:true});

// 확대된 사진을 빠르게 두 번 누르면 원래 크기로 복귀
let lastPhotoTap=0;
book.addEventListener('click',e=>{
  if(!mobile()) return;
  const img=e.target.closest?.('.page img, .landscape-spread img, .essay-art');
  if(!img || !spreadEl.contains(img)) return;

  const now=Date.now();
  if(now-lastPhotoTap<320 && zoomScale(img)>1.01){
    resetPhotoZoom(img);
    e.preventDefault();
    e.stopPropagation();
  }
  lastPhotoTap=now;
},true);

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

    albumUrl=/^https?:\/\//i.test(albumParam)
      ? new URL(albumParam)
      : new URL(albumParam,location.href);

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
/* ADMIN_RETURN_V11_1_VIEWER */
(function(){
  const fromMaker=new URLSearchParams(location.search).get('from')==='maker';
  if(!fromMaker) return;
  const apply=()=>{
    const b=document.getElementById('backToShelf');
    if(b) b.textContent='← 앨범 관리로';
    const bar=document.querySelector('.reader-topbar');
    if(bar && !document.getElementById('adminBackFromReader')){
      const x=document.createElement('button');
      x.id='adminBackFromReader';
      x.className='text-btn light';
      x.textContent='← 앨범 관리';
      x.onclick=()=>{location.href='../maker/';};
      bar.appendChild(x);
    }
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply);
  else apply();
})();


// =========================================================
// V11.5.4 — Mobile Essay Preview Pinch Fix
// '그날의 기록'/감상문 텍스트 페이지 전체 확대
// =========================================================
(()=>{
  let rp=null, active=false, startDist=0, startScale=1;

  const dist=t=>{
    if(!t || t.length<2) return 0;
    return Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
  };
  const scaleOf=el=>Number(el?.dataset?.recordZoomScale||1)||1;
  const isRecordPage=el=>{
    // V11.5.4: 모바일 첫 감상문 화면은 .page가 아니라
    // <article class="essay-page ..."> 구조이므로 두 타입을 모두 인식합니다.
    const page=el?.closest?.('.page, .essay-page, .episode-page, .story-companion');
    if(!page || !spreadEl.contains(page)) return null;

    // 사진을 직접 집은 경우에는 기존 사진 핀치 확대에 맡김
    if(el.closest?.('img')) return null;

    const text=page.textContent||'';
    const isEssayLayout =
      page.classList.contains('essay-page') ||
      page.classList.contains('episode-page') ||
      page.classList.contains('story-companion');

    return (
      isEssayLayout ||
      /전체\s*감상문\s*읽기|EPISODE|그날의\s*기록/i.test(text)
    ) ? page : null;
  };
  const setScale=(page,s)=>{
    s=Math.max(1,Math.min(3,s));
    page.dataset.recordZoomScale=String(s);
    page.style.transform=`scale(${s})`;
    page.classList.toggle('record-page-zoomed',s>1.01);
    book.classList.toggle('record-page-zoom-active',s>1.01);
  };
  const reset=page=>{
    if(!page)return;
    page.dataset.recordZoomScale='1';
    page.style.transform='scale(1)';
    page.style.transformOrigin='50% 50%';
    page.classList.remove('record-page-zoomed');
    book.classList.remove('record-page-zoom-active');
  };

  book.addEventListener('touchstart',e=>{
    if(!mobile() || e.touches.length!==2) return;
    const x=(e.touches[0].clientX+e.touches[1].clientX)/2;
    const y=(e.touches[0].clientY+e.touches[1].clientY)/2;
    const target=document.elementFromPoint(x,y);
    const page=isRecordPage(target);
    if(!page)return;

    const rect=page.getBoundingClientRect();
    page.style.transformOrigin=
      `${Math.max(0,Math.min(100,(x-rect.left)/rect.width*100))}% `+
      `${Math.max(0,Math.min(100,(y-rect.top)/rect.height*100))}%`;
    rp=page; active=true; startDist=Math.max(1,dist(e.touches)); startScale=scaleOf(page);
    e.preventDefault(); e.stopImmediatePropagation();
  },{passive:false,capture:true});

  book.addEventListener('touchmove',e=>{
    if(!mobile() || !active || !rp || e.touches.length<2)return;
    setScale(rp,startScale*(dist(e.touches)/startDist));
    e.preventDefault(); e.stopImmediatePropagation();
  },{passive:false,capture:true});

  book.addEventListener('touchend',e=>{
    if(!active)return;
    if(e.touches.length<2){
      if(rp && scaleOf(rp)<1.06) reset(rp);
      active=false; rp=null;
    }
    e.preventDefault(); e.stopImmediatePropagation();
  },{passive:false,capture:true});

  book.addEventListener('touchcancel',()=>{active=false;rp=null;},{capture:true});

  let lastTap=0;
  book.addEventListener('click',e=>{
    if(!mobile())return;
    const page=e.target.closest?.('.record-page-zoomed');
    if(!page)return;
    const now=Date.now();
    if(now-lastTap<320){reset(page);e.preventDefault();e.stopImmediatePropagation();}
    lastTap=now;
  },true);

  // 페이지가 바뀌면 기록 페이지 확대 상태 자동 해제
  const observer=new MutationObserver(()=>{
    book.classList.remove('record-page-zoom-active');
  });
  observer.observe(spreadEl,{childList:true});
})();
