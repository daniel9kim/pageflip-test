// PAGE FLIP Shelf V1.2 — search + year filter + edit menu
let shelfData=null;
let allAlbums=[];
let activeMenuAlbum=null;

const root=document.querySelector('#albums');
const searchInput=document.querySelector('#albumSearch');
const yearSelect=document.querySelector('#yearSelect');
const resultCount=document.querySelector('#resultCount');
const menuLayer=document.querySelector('#menuLayer');
const menuView=document.querySelector('#menuView');
const menuEdit=document.querySelector('#menuEdit');

(async()=>{
  const r=await fetch('shelf.json',{cache:'no-store'});
  if(!r.ok) throw new Error(`shelf.json을 불러오지 못했습니다. (${r.status})`);

  shelfData=await r.json();
  document.title='PAGE FLIP · '+(shelfData.title||'앨범 책장');
  document.querySelector('#title').textContent=shelfData.title||'앨범 책장';
  document.querySelector('#subtitle').textContent=shelfData.subtitle||'';

  allAlbums=Array.isArray(shelfData.albums)?[...shelfData.albums]:[];

  if(!allAlbums.length){
    root.innerHTML='<div class="empty">아직 이 책장에 등록된 앨범이 없습니다.</div>';
    document.querySelector('.shelf-tools').style.display='none';
    return;
  }

  buildYearOptions();
  renderShelf();

  searchInput.addEventListener('input',renderShelf);
  yearSelect.addEventListener('change',renderShelf);

})().catch(err=>{
  root.innerHTML=
    '<div class="empty">책장 정보를 불러오지 못했습니다.<br>'+
    escapeHtml(err.message)+'</div>';
  document.querySelector('.shelf-tools').style.display='none';
  console.error(err);
});

function buildYearOptions(){
  const years=[...new Set(
    allAlbums
      .map(a=>(a.date||'').slice(0,4))
      .filter(Boolean)
  )].sort((a,b)=>b.localeCompare(a));

  years.forEach(year=>{
    const opt=document.createElement('option');
    opt.value=year;
    opt.textContent=year;
    yearSelect.appendChild(opt);
  });
}

function filteredAlbums(){
  const q=searchInput.value.trim().toLowerCase();
  const selectedYear=yearSelect.value;

  return allAlbums.filter(a=>{
    const year=(a.date||'').slice(0,4)||'기타';
    if(selectedYear!=='all' && year!==selectedYear) return false;
    if(!q) return true;

    const haystack=[
      a.title||'',
      a.date||'',
      String(a.date||'').replaceAll('-','.'),
      a.summary||'',
      a.subtitle||''
    ].join(' ').toLowerCase();

    return haystack.includes(q);
  });
}

function renderShelf(){
  closeMenu();

  const filtered=filteredAlbums();
  resultCount.textContent=`${filtered.length}권 표시`;

  if(!filtered.length){
    root.innerHTML='<div class="empty">조건에 맞는 앨범이 없습니다.</div>';
    return;
  }

  const groups={};
  filtered.forEach(a=>{
    const y=(a.date||'').slice(0,4)||'기타';
    (groups[y]??=[]).push(a);
  });

  root.innerHTML='';

  Object.keys(groups)
    .sort((a,b)=>b.localeCompare(a))
    .forEach(year=>{
      const albums=[...groups[year]].sort((a,b)=>{
        const d=String(b.date||'').localeCompare(String(a.date||''));
        if(d!==0) return d;
        return String(b.title||'').localeCompare(String(a.title||''),'ko');
      });

      const sec=document.createElement('section');
      sec.className='year-section';

      const yearline=document.createElement('div');
      yearline.className='yearline';
      yearline.innerHTML=
        '<span>'+escapeHtml(year)+'</span>'+
        '<small>'+albums.length+'권</small>';

      const shelves=document.createElement('div');
      shelves.className='shelf-stack';

      const perRow=window.matchMedia('(max-width:760px)').matches?2:4;

      for(let i=0;i<albums.length;i+=perRow){
        const rowWrap=document.createElement('div');
        rowWrap.className='shelf-row-wrap';

        const row=document.createElement('div');
        row.className='bookshelf';

        albums.slice(i,i+perRow).forEach(a=>{
          row.appendChild(makeBookCard(a));
        });

        rowWrap.appendChild(row);

        const wood=document.createElement('div');
        wood.className='wood';
        rowWrap.appendChild(wood);

        shelves.appendChild(rowWrap);
      }

      sec.append(yearline,shelves);
      root.appendChild(sec);
    });
}

function makeBookCard(a){
  const wrap=document.createElement('div');
  wrap.className='book-slot';

  const btn=document.createElement('button');
  btn.className='bookcard';
  btn.type='button';
  btn.setAttribute('aria-label',(a.title||'앨범')+' 사진책 보기');
  btn.innerHTML=
    '<div class="book">'+
      '<div class="cover-frame">'+
        '<img src="'+escapeAttr(a.cover||'')+'" alt="">'+
      '</div>'+
      '<div class="title">'+escapeHtml(a.title||'앨범')+'</div>'+
      '<div class="date">'+escapeHtml(String(a.date||'').replaceAll('-','.'))+'</div>'+
    '</div>';

  btn.onclick=()=>openViewer(a);

  const more=document.createElement('button');
  more.type='button';
  more.className='more-btn';
  more.textContent='⋯';
  more.title='앨범 메뉴';
  more.setAttribute('aria-label',(a.title||'앨범')+' 메뉴');
  more.onclick=e=>{
    e.stopPropagation();
    toggleMenu(a,more);
  };

  wrap.append(btn,more);
  return wrap;
}

function absoluteAlbumUrl(a){
  return new URL(a.album,location.href).href;
}

function albumId(a){
  if(a.id) return String(a.id);
  const m=String(a.album||'').match(/\/?(album-[^/]+)\/album\.json(?:$|\?)/);
  return m?m[1]:'';
}

function openViewer(a){
  location.href='../../viewer/?album='+encodeURIComponent(absoluteAlbumUrl(a));
}

function openEditor(a){
  const id=albumId(a);
  if(!id){
    alert('이 앨범의 ID를 찾지 못했습니다.');
    return;
  }
  location.href='../../maker/?edit='+encodeURIComponent(id);
}

function toggleMenu(a,anchor){
  if(!menuLayer.hidden && activeMenuAlbum===a){
    closeMenu();
    return;
  }

  activeMenuAlbum=a;
  const r=anchor.getBoundingClientRect();

  menuLayer.hidden=false;
  const menuWidth=menuLayer.offsetWidth||150;
  const left=Math.min(
    window.innerWidth-menuWidth-12,
    Math.max(12,r.right-menuWidth)
  );
  const top=Math.min(window.innerHeight-100,r.bottom+7);

  menuLayer.style.left=left+'px';
  menuLayer.style.top=top+'px';
}

function closeMenu(){
  menuLayer.hidden=true;
  activeMenuAlbum=null;
}

menuView.onclick=()=>{
  if(activeMenuAlbum) openViewer(activeMenuAlbum);
};
menuEdit.onclick=()=>{
  if(activeMenuAlbum) openEditor(activeMenuAlbum);
};

document.addEventListener('click',e=>{
  if(menuLayer.hidden) return;
  if(menuLayer.contains(e.target)) return;
  if(e.target.closest('.more-btn')) return;
  closeMenu();
});

document.addEventListener('keydown',e=>{
  if(e.key==='Escape') closeMenu();
});

addEventListener('resize',()=>{
  closeMenu();
  // PC/모바일 선반 권수가 바뀔 수 있으므로 재배치합니다.
  if(allAlbums.length) renderShelf();
});

function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'
  }[c]));
}
function escapeAttr(s){return escapeHtml(s)}
