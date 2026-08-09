const photos=[
{f:'001.webp',o:'landscape'},{f:'002.webp',o:'landscape'},{f:'003.webp',o:'portrait'},{f:'004.webp',o:'portrait'},
{f:'005.webp',o:'landscape'},{f:'006.webp',o:'portrait'},{f:'007.webp',o:'portrait'},{f:'008.webp',o:'portrait'},
{f:'009.webp',o:'portrait'},{f:'010.webp',o:'portrait'},{f:'011.webp',o:'portrait'},{f:'012.webp',o:'landscape'},
{f:'013.webp',o:'landscape'},{f:'014.webp',o:'landscape'},{f:'015.webp',o:'portrait'}];
const story=`뱅크시 특별전 다녀왔어요.\n\n뱅크시(Banksy)는 정체를 밝히지 않은 영국의 그래피티(graffiti) 예술가에요.\n거리의 담벼락을 캔버스 삼아 사회를 풍자하는 작품으로 유명하지요.\n\n영국에서는 벽에 그림을 그리다 걸리면\n중형에 처해지기 때문에\n몰래 그림을 그리기 위해서\n스텐실 기법을 사용해서\n빠르게 그리고 사라진다고 하네요.\n\n소더비 경매시장에서\n120억에 낙찰된 그림이\n자동으로 파쇄되어 버리는 바람에\n엄청나게 유명해져 버렸어요.\n실제로 파쇄된 작품 영상을 보는데 \n전시장에 있던 사람들이 얼마나 놀랐을지 \n상상이 되더라고요.\n\n전시장에 들어가면\n낡은 콘크리트벽을 그대로 재현되어 있어서\n그 시대의 거리를 체험하는 공간처럼 느껴졌어요.\n\n전시회에서 만난 뱅크시의 그림은\n파괴적인 풍자와\n사회적 메세지로 가득해요.\n사람 위에 사람을 세우려는 모습과 \n권력을 향한 욕심에 대한 조롱이 뒤섞인\n특유의 유머와 날카로운 풍자에\n웃음이 나오다가도 곧 마음이 무거워지는\n묘한 힘이 있었어요.\n\n이번에 알게 되었는데\n뱅크시는 벽화만 그린것이 아니라\n다양한 설치미술과 조각작품에\n심지어 행위예술까지\n다양한 시도를 했더라구요.\n\n뱅크시는 전쟁과 폭력, 권력과 감시\n차별과 모순을 날카롭게 드러내며\n불편한 현실을 끊임없이 고발했지만\n그가 최종적으로 추구하는 것은\n평화이며\n지금보다 더 나은 세계에 대한\n갈망처럼 느껴졌어요.\n\n[꽃을 던지는 남자]도\n폭력이 아닌 모습으로\n묵직한 평화의 메세지를 던지고 있어요.\n\n무더운 여름날, \n산과 바다를 찾는 대신\n도시의 미술관에서 평화의 메시지를 만났습니다.\n세상을 향해 꽃을 던진 뱅크시의 그림을 바라보며,\n오늘 내가 누군가에게 던져야 할 것은 분노가 아니라\n작은 사랑과 평화였으면 좋겠다는 생각이 들었습니다.`;
const base=[];for(let i=0;i<photos.length;){let p=photos[i];if(p.o==='landscape'){base.push({type:'landscape',items:[p],start:i});i++;}else{let n=photos[i+1];if(n&&n.o==='portrait'){base.push({type:'pair',items:[p,n],start:i});i+=2;}else{base.push({type:'pair',items:[p,null],start:i});i++;}}}
// V3: 에피소드는 책을 펼치자마자 첫 좌우 2페이지에 표시한다.
const spreads=[{type:'essay'},...base];
const views={shelf:document.querySelector('#shelfView'),cover:document.querySelector('#coverView'),reader:document.querySelector('#readerView')};
function show(name){Object.values(views).forEach(v=>v.classList.remove('active'));views[name].classList.add('active');window.scrollTo(0,0)}
document.querySelector('#openAlbum').onclick=()=>show('cover');document.querySelectorAll('[data-back-shelf]').forEach(b=>b.onclick=()=>show('shelf'));document.querySelectorAll('[data-back-cover]').forEach(b=>b.onclick=()=>show('cover'));document.querySelector('#openReader').onclick=()=>{current=0;render();show('reader')};
const strip=document.querySelector('#thumbStrip');photos.slice(0,8).forEach(p=>{let i=document.createElement('img');i.src='webp/'+p.f;i.alt='미리보기';strip.appendChild(i)});
let current=0,locked=false,drag=null;const spreadEl=document.querySelector('#spread'),book=document.querySelector('#book'),curl=document.querySelector('#pageCurl'),shadow=document.querySelector('.curl-shadow'),indicator=document.querySelector('#pageIndicator');const mobile=()=>matchMedia('(max-width:760px)').matches;
function makePage(item,side,no){let d=document.createElement('div');d.className='page '+side;if(item){let i=document.createElement('img');i.src='webp/'+item.f;i.alt='앨범 사진';d.appendChild(i)}else d.classList.add('blank-page');let n=document.createElement('div');n.className='page-number';n.textContent=no||'';d.appendChild(n);return d}
function essaySpread(){let left=document.createElement('article');left.className='essay-page essay-left';left.innerHTML=`<div class="essay-kicker">EPISODE 01</div><h3>그날의 기록</h3><div class="essay-sub">Banksy Still Here · 2026.08.07</div><div class="essay-quote">“사진 속에 남은 장면과 함께<br>그날의 생각도 한 장의 기록으로 남깁니다.”</div><img class="essay-art" src="webp/015.webp" alt="풍선을 든 소녀 작품">`;
let right=document.createElement('article');right.className='essay-page essay-right';right.innerHTML=`<div class="essay-excerpt">뱅크시 특별전 다녀왔어요.\n\n뱅크시는 정체를 밝히지 않은 영국의 그래피티 예술가에요. 거리의 담벼락을 캔버스 삼아 사회를 풍자하는 작품으로 유명하지요.\n\n영국에서는 벽에 그림을 그리다 걸리면 중형에 처해지기 때문에 몰래 그림을 그리기 위해 스텐실 기법을 사용해서 빠르게 그리고 사라진다고 하네요.\n\n전시회에서 만난 뱅크시의 그림에는 파괴적인 풍자와 사회적 메시지가 가득했어요…</div><button class="read-more">전체 감상문 읽기 ›</button>`;right.querySelector('.read-more').onclick=openStory;return [left,right]}
function render(){spreadEl.innerHTML='';let s=spreads[current];if(!s)return;if(s.type==='essay'){let [l,r]=essaySpread();spreadEl.appendChild(l);if(!mobile())spreadEl.appendChild(r);else{l.innerHTML=r.innerHTML;l.querySelector('.read-more').onclick=openStory}}else if(s.type==='landscape'){let d=document.createElement('div');d.className='landscape-spread';let i=document.createElement('img');i.src='webp/'+s.items[0].f;i.alt='가로 사진';d.appendChild(i);spreadEl.appendChild(d)}else{spreadEl.appendChild(makePage(s.items[0],'left',s.start+1));if(!mobile())spreadEl.appendChild(makePage(s.items[1],'right',s.items[1]?s.start+2:''));}indicator.textContent=`${current+1} / ${spreads.length}`;resetCurl()}
function resetCurl(){curl.style.cssText='';shadow.style.cssText='';book.classList.remove('dragging','settling','curl-hover')}
function ease(t){return 1-Math.pow(1-t,4)}
function setCurl(p,yRatio=.9){p=Math.max(0,Math.min(1,p));const W=book.clientWidth,H=book.clientHeight;const foldX=W*(1-p*.94), foldY=H*Math.max(.12,Math.min(.96,yRatio));const cw=Math.max(42,W-foldX+80), ch=Math.max(42,H-foldY+120);curl.style.width=cw+'px';curl.style.height=ch+'px';curl.style.right='0';curl.style.bottom='0';curl.style.opacity='1';curl.style.clipPath='polygon(100% 0,100% 100%,0 100%,18% 72%,44% 43%)';curl.style.background='linear-gradient(132deg,rgba(255,255,255,.99) 0 42%,#f5efe6 45%,#d8cdbf 49%,#b9aa98 50%,#eee6dc 52%,rgba(255,255,255,.97) 58%,rgba(255,255,255,.86) 100%)';curl.style.transformOrigin='100% 100%';curl.style.transform=`translate3d(${-p*W*.82}px,${-p*H*.08}px,0) rotate(${-p*18}deg) rotateY(${p*18}deg)`;curl.style.filter=`drop-shadow(${-10-p*26}px ${-4-p*10}px ${12+p*22}px rgba(0,0,0,${.12+p*.18}))`;
shadow.style.opacity=String(.12+p*.62);shadow.style.background=`radial-gradient(ellipse at ${100-p*72}% ${100-yRatio*34}%,rgba(0,0,0,${.16+p*.18}) 0,rgba(0,0,0,.08) 15%,transparent ${34+p*20}%)`;}
function animateTo(from,to,dur,done){book.classList.add('dragging');let st=performance.now();function frame(t){let q=Math.min(1,(t-st)/dur),v=from+(to-from)*ease(q);setCurl(v,.88-v*.22);if(q<1)requestAnimationFrame(frame);else{resetCurl();done&&done()}}requestAnimationFrame(frame)}
function turn(delta){if(locked)return;let next=current+delta;if(next<0||next>=spreads.length)return;if(delta<0){current=next;render();return}locked=true;animateTo(.05,1,620,()=>{current=next;render();locked=false})}
function openStory(){document.querySelector('#storyText').textContent=story;document.querySelector('#storyModal').classList.add('open')}
document.querySelector('#storyClose').onclick=()=>document.querySelector('#storyModal').classList.remove('open');document.querySelector('#storyModal').onclick=e=>{if(e.target.id==='storyModal')e.currentTarget.classList.remove('open')};
document.querySelector('#nextBtn').onclick=()=>turn(1);document.querySelector('#prevBtn').onclick=()=>turn(-1);addEventListener('keydown',e=>{if(document.querySelector('#storyModal').classList.contains('open')&&e.key==='Escape'){document.querySelector('#storyModal').classList.remove('open');return}if(!views.reader.classList.contains('active'))return;if(e.key==='ArrowRight')turn(1);if(e.key==='ArrowLeft')turn(-1)});addEventListener('resize',render);
book.addEventListener('pointermove',e=>{let r=book.getBoundingClientRect();if(drag){const dx=Math.max(0,drag.x-e.clientX),dy=Math.max(0,drag.y-e.clientY);let p=Math.min(1,Math.hypot(dx*1.08,dy*.55)/(r.width*.68));drag.p=p;drag.yRatio=(e.clientY-r.top)/r.height;setCurl(p,drag.yRatio);return}let near=r.right-e.clientX<125&&r.bottom-e.clientY<125;book.classList.toggle('curl-hover',near);if(near)setCurl(.055,.92);else resetCurl()});
book.addEventListener('pointerleave',()=>{if(!drag)resetCurl()});book.addEventListener('pointerdown',e=>{let r=book.getBoundingClientRect();if(r.right-e.clientX<170&&r.bottom-e.clientY<170&&current<spreads.length-1){drag={x:e.clientX,y:e.clientY,p:.03,yRatio:.9};book.setPointerCapture(e.pointerId);book.classList.add('dragging');setCurl(.03,.9)}});book.addEventListener('pointerup',()=>{if(!drag)return;let p=drag.p||0;drag=null;if(p>.38){locked=true;animateTo(p,1,Math.max(260,560*(1-p)),()=>{current=Math.min(current+1,spreads.length-1);render();locked=false})}else{book.classList.add('settling');animateTo(p,0,360,resetCurl)}});
let tx=null;book.addEventListener('touchstart',e=>tx=e.touches[0].clientX,{passive:true});book.addEventListener('touchend',e=>{if(tx==null)return;let dx=tx-e.changedTouches[0].clientX;if(Math.abs(dx)>50)turn(dx>0?1:-1);tx=null},{passive:true});
document.querySelector('#fullscreenBtn').onclick=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen()}catch{}};document.querySelector('#search').addEventListener('input',e=>document.querySelector('.bookcard').style.display='테스트앨범'.includes(e.target.value.trim())?'':'none');render();

// 앨범 공유: 모바일/지원 브라우저에서는 Web Share, 그 외에는 링크 복사.
const shareBtn=document.querySelector('#shareBtn');
const shareToast=document.querySelector('#shareToast');
let shareToastTimer=null;
function toast(msg){
  shareToast.textContent=msg;shareToast.classList.add('show');
  clearTimeout(shareToastTimer);shareToastTimer=setTimeout(()=>shareToast.classList.remove('show'),2200);
}
shareBtn.onclick=async()=>{
  const title='테스트앨범 · PAGE FLIP';
  const text='뱅크시 특별전에서 남긴 하루의 기록';
  const url=location.href;
  try{
    if(navigator.share && location.protocol!=='file:'){
      await navigator.share({title,text,url});
      return;
    }
    if(location.protocol==='file:'){
      toast('로컬 테스트입니다. GitHub Pages에 올리면 공유 링크를 사용할 수 있어요.');
      return;
    }
    await navigator.clipboard.writeText(url);
    toast('앨범 링크를 복사했습니다.');
  }catch(err){
    if(err && err.name==='AbortError') return;
    try{
      const ta=document.createElement('textarea');ta.value=url;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast('앨범 링크를 복사했습니다.');
    }catch{toast('공유 링크를 복사하지 못했습니다.');}
  }
};
