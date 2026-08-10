
(async()=>{
  const r=await fetch('shelf.json',{cache:'no-store'});
  const shelf=await r.json();
  document.title='PAGE FLIP · '+shelf.title;
  document.querySelector('#title').textContent=shelf.title;
  document.querySelector('#subtitle').textContent=shelf.subtitle||'';
  const root=document.querySelector('#albums');
  if(!shelf.albums.length){
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
      btn.innerHTML='<div class="book"><img src="'+a.cover+'" alt=""><div class="title">'+escapeHtml(a.title)+'</div><div class="date">'+String(a.date||'').replaceAll('-','.')+'</div></div>';
      btn.onclick=()=>location.href='../../viewer/?album='+encodeURIComponent(a.album);
      row.appendChild(btn);
    });
    root.appendChild(sec);
  });
})();
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
