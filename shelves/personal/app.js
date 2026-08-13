(async()=>{
  const r=await fetch('shelf.json',{cache:'no-store'});
  if(!r.ok) throw new Error('shelf.json을 불러오지 못했습니다. ('+r.status+')');
  const shelf=await r.json();

  // 빈 책장이어도 책장 제목/설명은 반드시 먼저 표시
  document.title='PAGE FLIP · '+(shelf.title||'사진책 책장');
  document.querySelector('#title').textContent=shelf.title||'사진책 책장';
  document.querySelector('#subtitle').textContent=shelf.subtitle||'';

  const root=document.querySelector('#albums');
  const albums=Array.isArray(shelf.albums)?shelf.albums:[];

  if(!albums.length){
    root.innerHTML=`
      <div class="empty">
        <div class="empty-icon">▭</div>
        <strong>아직 등록된 사진책이 없습니다.</strong>
        <p>새로운 추억이 이곳에 한 권씩 쌓입니다.</p>
      </div>`;
    return;
  }

  const groups={};
  albums.forEach(a=>{
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

      btn.onclick=()=>{
        const absoluteAlbumUrl=new URL(a.album, location.href).href;
        location.href='../../viewer/?album='+encodeURIComponent(absoluteAlbumUrl);
      };

      row.appendChild(btn);
    });
    root.appendChild(sec);
  });
})().catch(err=>{
  document.querySelector('#albums').innerHTML='<div class="empty"><strong>책장 정보를 불러오지 못했습니다.</strong><p>'+escapeHtml(err.message)+'</p></div>';
  console.error(err);
});

function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
function escapeAttr(s){return escapeHtml(s)}
