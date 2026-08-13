// PAGE FLIP Shelf V1.1 — multi-row wooden shelves
(async()=>{
  const r=await fetch('shelf.json',{cache:'no-store'});
  if(!r.ok) throw new Error(`shelf.json을 불러오지 못했습니다. (${r.status})`);
  const shelf=await r.json();

  document.title='PAGE FLIP · '+(shelf.title||'앨범 책장');
  document.querySelector('#title').textContent=shelf.title||'앨범 책장';
  document.querySelector('#subtitle').textContent=shelf.subtitle||'';

  const root=document.querySelector('#albums');

  if(!Array.isArray(shelf.albums)||!shelf.albums.length){
    root.innerHTML='<div class="empty">아직 이 책장에 등록된 앨범이 없습니다.</div>';
    return;
  }

  const groups={};
  shelf.albums.forEach(a=>{
    const y=(a.date||'').slice(0,4)||'기타';
    (groups[y]??=[]).push(a);
  });

  Object.keys(groups)
    .sort((a,b)=>b.localeCompare(a))
    .forEach(year=>{
      // 최신 날짜가 먼저 보이도록 정렬
      const albums=[...groups[year]].sort((a,b)=>
        String(b.date||'').localeCompare(String(a.date||''))
      );

      const sec=document.createElement('section');
      sec.className='year-section';

      const yearline=document.createElement('div');
      yearline.className='yearline';
      yearline.innerHTML=
        '<span>'+escapeHtml(year)+'</span>'+
        '<small>'+albums.length+'권</small>';

      const shelves=document.createElement('div');
      shelves.className='shelf-stack';

      // PC 4권, 작은 화면 2권씩 한 선반
      const perRow=window.matchMedia('(max-width:760px)').matches?2:4;

      for(let i=0;i<albums.length;i+=perRow){
        const rowWrap=document.createElement('div');
        rowWrap.className='shelf-row-wrap';

        const row=document.createElement('div');
        row.className='bookshelf';

        albums.slice(i,i+perRow).forEach(a=>{
          const btn=document.createElement('button');
          btn.className='bookcard';
          btn.type='button';

          btn.innerHTML=
            '<div class="book">'+
              '<div class="cover-frame">'+
                '<img src="'+escapeAttr(a.cover||'')+'" alt="">'+
              '</div>'+
              '<div class="title">'+escapeHtml(a.title||'앨범')+'</div>'+
              '<div class="date">'+escapeHtml(String(a.date||'').replaceAll('-','.'))+'</div>'+
            '</div>';

          btn.onclick=()=>{
            const absoluteAlbumUrl=new URL(a.album,location.href).href;
            location.href='../../viewer/?album='+encodeURIComponent(absoluteAlbumUrl);
          };

          row.appendChild(btn);
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

})().catch(err=>{
  document.querySelector('#albums').innerHTML=
    '<div class="empty">책장 정보를 불러오지 못했습니다.<br>'+
    escapeHtml(err.message)+'</div>';
  console.error(err);
});

function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
function escapeAttr(s){return escapeHtml(s)}
