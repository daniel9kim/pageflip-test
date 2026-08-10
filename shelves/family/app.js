const WORKER_VIEWER_BASE='https://pageflip-api.withme-jesus.workers.dev/viewer/';

(async()=>{
  const r=await fetch('shelf.json',{cache:'no-store'});
  const shelf=await r.json();
  document.title='PAGE FLIP · '+shelf.title;
  document.querySelector('#title').textContent=shelf.title;
  document.querySelector('#subtitle').textContent=shelf.subtitle||'';

  const root=document.querySelector('#albums');
  if(!Array.isArray(shelf.albums) || !shelf.albums.length){
    root.innerHTML='<div class="empty">아직 이 책장에 등록된 앨범이 없습니다.</div>';
    return;
  }

  const groups={};
  shelf.albums.forEach(a=>{
    const y=(a.date||'').slice(0,4)||'기타';
    (groups[y]??=[]).push(a);
  });

  Object.keys(groups).sort((a,b)=>b.localeCompare(a)).forEach(year=>{
    const sec=document.createElement('section');
    sec.innerHTML='<div class="yearline"><span>'+year+'</span><small>'+groups[year].length+'권</small></div><div class="bookshelf"></div><div class="wood"></div>';
    const row=sec.querySelector('.bookshelf');

    groups[year].forEach(a=>{
      const btn=document.createElement('button');
      btn.className='bookcard';
      btn.innerHTML='<div class="book"><img src="'+escapeAttr(a.cover||'')+'" alt=""><div class="title">'+escapeHtml(a.title||'앨범')+'</div><div class="date">'+String(a.date||'').replaceAll('-','.')+'</div></div>';

      // 중요: GitHub Pages의 /viewer/가 아니라 Cloudflare Worker Viewer로 이동
      btn.onclick=()=>{
        if(!a.id){
          alert('앨범 ID가 없어 Viewer를 열 수 없습니다.');
          return;
        }
        location.href=WORKER_VIEWER_BASE+encodeURIComponent(a.id);
      };

      row.appendChild(btn);
    });

    root.appendChild(sec);
  });
})().catch(err=>{
  const root=document.querySelector('#albums');
  root.innerHTML='<div class="empty">책장 정보를 불러오지 못했습니다.<br>'+escapeHtml(err.message)+'</div>';
  console.error(err);
});

function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
function escapeAttr(s){
  return escapeHtml(s);
}
