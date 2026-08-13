// PAGE FLIP Maker V11.0 — admin album management + delete
const API_BASE = "https://pageflip-api.withme-jesus.workers.dev";

const drop=document.querySelector('#drop'),input=document.querySelector('#files'),choose=document.querySelector('#choose');
let selected=[],cover=0;
const params=new URLSearchParams(location.search);
const editAlbumId=params.get('edit');
let editAlbum=null;
const isEditMode=()=>/^album-[0-9]+$/.test(String(editAlbumId||''));
const PUBLIC_BASE='https://daniel9kim.github.io/pageflip-test/';
const SHELF_SOURCES=[
  {key:'elders',label:'장로합창단',url:new URL('../shelves/elders/shelf.json',location.href).href},
  {key:'handbell',label:'핸드벨',url:new URL('../shelves/handbell/shelf.json',location.href).href},
  {key:'family',label:'가족',url:new URL('../shelves/family/shelf.json',location.href).href},
  {key:'personal',label:'영춘이 개인',url:new URL('../shelves/personal/shelf.json',location.href).href}
];
let adminAlbums=[];


choose.onclick=e=>{e.stopPropagation();input.click()};
drop.onclick=()=>input.click();
input.onchange=e=>load([...e.target.files]);
['dragenter','dragover'].forEach(x=>drop.addEventListener(x,e=>{e.preventDefault();drop.classList.add('over')}));
['dragleave','drop'].forEach(x=>drop.addEventListener(x,e=>{e.preventDefault();drop.classList.remove('over')}));
drop.addEventListener('drop',e=>load([...e.dataTransfer.files].filter(f=>f.type.startsWith('image/'))));

function load(files){
  if(!files.length)return;
  if(isEditMode()){
    selected=[...selected,...files.filter(f=>f.type.startsWith('image/'))];
    renderEditPhotos();
    return;
  }
  selected=files;
  document.querySelector('#editor').style.display='block';
  let p=0,l=0;
  const thumbs=document.querySelector('#thumbs');
  thumbs.innerHTML='';
  let pending=files.length;
  files.forEach((f,i)=>{
    const u=URL.createObjectURL(f),im=new Image();
    im.onload=()=>{im.width>im.height?l++:p++;if(--pending===0)stats(p,l)};
    im.src=u;
    const d=document.createElement('div');
    d.className='thumb'+(i===0?' selected':'');
    d.innerHTML=`<img src="${u}">`;
    d.onclick=()=>{cover=i;[...thumbs.children].forEach((x,j)=>x.classList.toggle('selected',j===i))};
    thumbs.appendChild(d)
  });
  document.querySelector('#editor').scrollIntoView({behavior:'smooth'})
}


function renderEditPhotos(){
  if(!editAlbum)return;
  const existing=Array.isArray(editAlbum.photos)?editAlbum.photos:[];
  renderExistingThumbs();
  const thumbs=document.querySelector('#thumbs');

  selected.forEach((f,j)=>{
    const i=existing.length+j;
    const d=document.createElement('div');
    d.className='thumb'+(i===cover?' selected':'');
    d.style.position='relative';

    const u=URL.createObjectURL(f);
    const img=document.createElement('img');
    img.src=u; img.alt='새 사진';
    img.onload=()=>URL.revokeObjectURL(u);
    d.appendChild(img);

    const badge=document.createElement('span');
    badge.textContent='새 사진';
    badge.style.cssText='position:absolute;left:4px;top:4px;background:#3f654a;color:#fff;font-size:10px;padding:3px 6px;border-radius:99px;z-index:2';
    d.appendChild(badge);

    const x=document.createElement('button');
    x.type='button'; x.textContent='×'; x.title='추가 취소';
    x.style.cssText='position:absolute;top:4px;right:4px;width:26px;height:26px;min-width:26px;padding:0;border:0;border-radius:50%;background:rgba(66,48,36,.88);color:#fff;font-size:18px;line-height:26px;z-index:3';
    x.onclick=e=>{
      e.stopPropagation();
      selected.splice(j,1);
      const total=existing.length+selected.length;
      if(cover>=total)cover=Math.max(0,total-1);
      renderEditPhotos();
    };
    d.appendChild(x);

    d.onclick=()=>{
      cover=i;
      [...thumbs.children].forEach((q,k)=>q.classList.toggle('selected',k===i));
    };
    thumbs.appendChild(d);
  });

  document.querySelector('#stats').innerHTML=
    `<div class="stat">기존 사진 <b>${existing.length}</b>장</div>`+
    `<div class="stat">새 사진 <b>${selected.length}</b>장</div>`+
    `<div class="stat">전체 <b>${existing.length+selected.length}</b>장</div>`+
    `<div class="stat">수정 모드 <b>추가·삭제 가능</b></div>`;

  const dropTitle=drop.querySelector('h2'),dropText=drop.querySelector('p');
  if(dropTitle)dropTitle.textContent=selected.length?`새 사진 ${selected.length}장 선택됨`:'새 사진 추가';
  if(dropText)dropText.textContent=selected.length?'“수정 저장”을 누르면 기존 앨범에 추가됩니다.':'추가할 사진을 드래그하거나 사진 선택 버튼을 눌러 주세요.';
}

function stats(p,l){
  document.querySelector('#stats').innerHTML=
    `<div class="stat">사진 <b>${selected.length}</b>장</div>`+
    `<div class="stat">세로 <b>${p}</b>장</div>`+
    `<div class="stat">가로 <b>${l}</b>장</div>`+
    `<div class="stat">예상 펼침 <b>${Math.ceil(p/2)+l+1}</b></div>`
}

const modal=document.querySelector('#modal');
document.querySelector('#connectBtn').onclick=()=>{modal.classList.add('show');checkStatus()};
document.querySelector('#closeModal').onclick=()=>modal.classList.remove('show');
modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show')});
document.querySelector('#openRepo').onclick=()=>window.open('https://github.com/daniel9kim/pageflip-test','_blank','noopener');
document.querySelector('#checkStatus').onclick=checkStatus;


function ensureAdminPanel(){
  if(isEditMode()) return;

  const githubCard=document.querySelector('.card.github');
  if(!githubCard || document.querySelector('#adminAlbums')) return;

  const section=document.createElement('section');
  section.className='card admin-manager';
  section.id='adminAlbums';
  section.innerHTML=`
    <div class="admin-head">
      <div>
        <div class="label">관리자 앨범 관리</div>
        <h2>기존 앨범</h2>
        <p>앨범을 미리보기·수정하거나 더 이상 필요 없는 앨범을 삭제합니다.</p>
      </div>
      <button class="btn make" id="newAlbumBtn" type="button">+ 새 앨범 만들기</button>
    </div>

    <div class="admin-tools">
      <input id="adminSearch" type="search" placeholder="앨범 제목 검색">
      <select id="adminShelfFilter">
        <option value="all">전체 책장</option>
        ${SHELF_SOURCES.map(s=>`<option value="${s.key}">${s.label}</option>`).join('')}
      </select>
      <span id="adminCount" class="admin-count">불러오는 중…</span>
    </div>

    <div id="adminAlbumList" class="admin-album-list">
      <div class="admin-loading">앨범 목록을 불러오고 있습니다…</div>
    </div>`;

  githubCard.insertAdjacentElement('afterend',section);

  document.querySelector('#newAlbumBtn').onclick=()=>{
    const createCard=drop.closest('.card');
    createCard?.scrollIntoView({behavior:'smooth',block:'start'});
  };
  document.querySelector('#adminSearch').addEventListener('input',renderAdminAlbums);
  document.querySelector('#adminShelfFilter').addEventListener('change',renderAdminAlbums);

  loadAdminAlbums();
}

async function loadAdminAlbums(){
  const list=document.querySelector('#adminAlbumList');
  if(!list) return;

  const results=await Promise.all(SHELF_SOURCES.map(async shelf=>{
    try{
      const r=await fetch(shelf.url+`?t=${Date.now()}`,{cache:'no-store'});
      if(!r.ok) return [];
      const data=await r.json();
      const albums=Array.isArray(data.albums)?data.albums:[];
      return albums.map(a=>({
        ...a,
        shelfKey:shelf.key,
        shelfLabel:shelf.label,
        coverAbsolute:a.cover?new URL(a.cover,shelf.url).href:'',
        albumAbsolute:a.album?new URL(a.album,shelf.url).href:''
      }));
    }catch{
      return [];
    }
  }));

  const byId=new Map();
  results.flat().forEach(a=>{
    if(a?.id) byId.set(a.id,a);
  });
  adminAlbums=[...byId.values()].sort((a,b)=>{
    const d=String(b.date||'').localeCompare(String(a.date||''));
    return d!==0?d:String(b.updatedAt||'').localeCompare(String(a.updatedAt||''));
  });
  renderAdminAlbums();
}

function renderAdminAlbums(){
  const list=document.querySelector('#adminAlbumList');
  const count=document.querySelector('#adminCount');
  if(!list||!count) return;

  const q=String(document.querySelector('#adminSearch')?.value||'').trim().toLowerCase();
  const shelfKey=document.querySelector('#adminShelfFilter')?.value||'all';

  const items=adminAlbums.filter(a=>{
    if(shelfKey!=='all' && a.shelfKey!==shelfKey) return false;
    if(!q) return true;
    return `${a.title||''} ${a.date||''} ${a.summary||''}`.toLowerCase().includes(q);
  });

  count.textContent=`${items.length}개 앨범`;

  if(!items.length){
    list.innerHTML='<div class="admin-empty">조건에 맞는 앨범이 없습니다.</div>';
    return;
  }

  list.innerHTML='';
  items.forEach(a=>{
    const card=document.createElement('article');
    card.className='admin-album-card';
    card.innerHTML=`
      <div class="admin-cover">
        ${a.coverAbsolute?`<img src="${escapeHtmlAttr(a.coverAbsolute)}" alt="">`:'<div class="admin-no-cover">NO IMAGE</div>'}
      </div>
      <div class="admin-album-info">
        <div class="admin-shelf">${escapeHtmlText(a.shelfLabel||'')}</div>
        <h3>${escapeHtmlText(a.title||'앨범')}</h3>
        <div class="admin-date">${escapeHtmlText(String(a.date||'').replaceAll('-','.'))}</div>
        <div class="admin-summary">${escapeHtmlText(a.summary||'')}</div>
        <div class="admin-meta">사진 ${Number(a.photoCount||0)}장 · ${escapeHtmlText(a.id||'')}</div>
      </div>
      <div class="admin-actions">
        <button class="btn light preview-album" type="button">미리보기</button>
        <button class="btn green edit-album" type="button">수정</button>
        <button class="btn danger delete-album" type="button">삭제</button>
      </div>`;

    card.querySelector('.preview-album').onclick=()=>{
      if(a.albumAbsolute){
        location.href='../viewer/?album='+encodeURIComponent(a.albumAbsolute);
      }
    };
    card.querySelector('.edit-album').onclick=()=>{
      location.href='./?edit='+encodeURIComponent(a.id);
    };
    card.querySelector('.delete-album').onclick=()=>deleteAlbumFromAdmin(a,card);
    list.appendChild(card);
  });
}

async function deleteAlbumFromAdmin(album,card){
  const title=album.title||album.id;
  const first=confirm(
    `“${title}” 앨범을 삭제할까요?\n\n`+
    `사진 ${Number(album.photoCount||0)}장과 album.json이 GitHub에서 삭제되고,\n`+
    `책장에서도 제거됩니다.\n\n이 작업은 되돌릴 수 없습니다.`
  );
  if(!first) return;

  const typed=prompt(`최종 확인입니다.\n삭제하려면 아래 칸에 “삭제”라고 입력해 주세요.\n\n앨범: ${title}`,'');
  if(typed!=='삭제'){
    if(typed!==null) alert('“삭제”라고 정확히 입력해야 삭제됩니다.');
    return;
  }

  const btn=card.querySelector('.delete-album');
  const actions=card.querySelectorAll('button');
  actions.forEach(b=>b.disabled=true);
  btn.textContent='삭제 중…';
  card.classList.add('deleting');

  try{
    const r=await fetch(API_BASE+'/api/album?albumId='+encodeURIComponent(album.id),{
      method:'DELETE',
      credentials:'include',
      cache:'no-store'
    });
    let d={};
    try{d=await r.json()}catch{}
    if(!r.ok||!d.ok) throw new Error(d.message||`HTTP ${r.status}`);

    adminAlbums=adminAlbums.filter(a=>a.id!==album.id);
    card.remove();
    renderAdminAlbums();
    alert(`“${title}” 앨범을 삭제했습니다.`);
  }catch(e){
    card.classList.remove('deleting');
    actions.forEach(b=>b.disabled=false);
    btn.textContent='삭제';
    alert('앨범 삭제에 실패했습니다: '+e.message);
  }
}

function escapeHtmlText(s){
  return String(s||'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
function escapeHtmlAttr(s){return escapeHtmlText(s)}

async function checkStatus(){
  const result=document.querySelector('#result');
  result.textContent='연결 상태를 확인하고 있습니다…';
  result.className='result';
  try{
    const r=await fetch(API_BASE+'/api/status',{credentials:'include',cache:'no-store'});
    const d=await r.json();
    if(!r.ok || !d.ok) throw new Error(d.message||`HTTP ${r.status}`);
    const canWrite=d.permissions?.contents==='write';
    result.innerHTML=`✓ <b>${d.repository}</b> · ${d.visibility} · ${d.defaultBranch}<br>GitHub App 권한: contents ${d.permissions?.contents||'-'} / metadata ${d.permissions?.metadata||'-'}`;
    result.className='result oktxt';
    document.querySelector('#ghDot').className='gh-dot ok';
    document.querySelector('#ghLabel').textContent='GitHub 연결 완료';
    document.querySelector('#ghRepo').textContent=d.repository;
    document.querySelector('#ghStatus').textContent=canWrite
      ? 'Cloudflare Access와 GitHub App 연결이 정상이며 쓰기 권한을 사용할 수 있습니다.'
      : 'GitHub 연결은 되었지만 contents: write 권한을 확인해 주세요.';
    document.querySelector('#connectBtn').textContent='연결됨 ✓';
  }catch(e){
    result.textContent='연결 상태를 확인하지 못했습니다: '+e.message;
    result.className='result errtxt';
    document.querySelector('#ghDot').className='gh-dot warn';
    document.querySelector('#ghLabel').textContent='GitHub 연결 확인 필요';
    document.querySelector('#ghStatus').textContent='Cloudflare Access 인증 또는 Worker 연결 상태를 확인해 주세요.';
  }
}


function shelfLabelFromAlbum(album){
  const key=String(album?.shelfKey||'').trim();
  const label=String(album?.shelf||'').trim();
  const map={
    elders:'장로합창단',
    handbell:'핸드벨',
    family:'가족',
    personal:'영춘이 개인'
  };
  return map[key]||label||'영춘이 개인';
}

function renderExistingAlbum(album){
  editAlbum=album;
  const photos=Array.isArray(album.photos)?album.photos:[];
  cover=Math.max(0,Math.min(Number(album.coverIndex||0),Math.max(0,photos.length-1)));

  document.querySelector('#editor').style.display='block';
  document.querySelector('#title').value=album.title||'';
  document.querySelector('#date').value=album.date||'';
  document.querySelector('#summary').value=album.summary||'';
  document.querySelector('#story').value=album.story||'';
  document.querySelector('#shelf').value=shelfLabelFromAlbum(album);

  renderExistingStats();
  renderExistingThumbs();

  document.querySelector('#make').textContent='수정 저장';
  const introTitle=document.querySelector('.intro h1');
  const introText=document.querySelector('.intro p');
  if(introTitle) introTitle.textContent='사진책 수정하기';
  if(introText) introText.textContent='사진을 드래그해 순서를 바꾸고, 삭제·추가·표지 변경과 제목·날짜·기록·책장을 수정합니다.';

  // V10.2-2: 기존 사진 삭제를 먼저 연결합니다.
  // 새 사진 추가는 다음 단계에서 안전하게 연결합니다.
  drop.style.opacity='1';
  drop.style.pointerEvents='auto';
  const dropTitle=drop.querySelector('h2');
  const dropText=drop.querySelector('p');
  if(dropTitle) dropTitle.textContent='새 사진 추가';
  if(dropText) dropText.textContent='추가할 사진을 드래그하거나 사진 선택 버튼을 눌러 주세요.';

  document.querySelector('#editor').scrollIntoView({behavior:'smooth'});
}

function renderExistingStats(){
  if(!editAlbum) return;
  const photos=Array.isArray(editAlbum.photos)?editAlbum.photos:[];
  const p=photos.filter(x=>Number(x.height||0)>=Number(x.width||0)).length;
  const l=photos.length-p;
  document.querySelector('#stats').innerHTML=
    `<div class="stat">기존 사진 <b>${photos.length}</b>장</div>`+
    `<div class="stat">세로 <b>${p}</b>장</div>`+
    `<div class="stat">가로 <b>${l}</b>장</div>`+
    `<div class="stat">수정 모드 <b>삭제·순서 변경</b></div>`;
}


let dragPhotoIndex=null;

function enableThumbReorder(thumbEl,index){
  thumbEl.draggable=true;
  thumbEl.dataset.photoIndex=String(index);

  thumbEl.addEventListener('dragstart',e=>{
    dragPhotoIndex=index;
    thumbEl.style.opacity='.45';
    if(e.dataTransfer){
      e.dataTransfer.effectAllowed='move';
      try{e.dataTransfer.setData('text/plain',String(index))}catch{}
    }
  });

  thumbEl.addEventListener('dragend',()=>{
    dragPhotoIndex=null;
    thumbEl.style.opacity='';
    document.querySelectorAll('#thumbs .thumb').forEach(x=>x.style.outline='');
  });

  thumbEl.addEventListener('dragover',e=>{
    e.preventDefault();
    if(dragPhotoIndex===null || dragPhotoIndex===index)return;
    thumbEl.style.outline='2px dashed #8b6a43';
    if(e.dataTransfer)e.dataTransfer.dropEffect='move';
  });

  thumbEl.addEventListener('dragleave',()=>{
    thumbEl.style.outline='';
  });

  thumbEl.addEventListener('drop',e=>{
    e.preventDefault();
    thumbEl.style.outline='';
    if(dragPhotoIndex===null || dragPhotoIndex===index)return;
    moveExistingPhoto(dragPhotoIndex,index);
  });
}

function moveExistingPhoto(from,to){
  if(!editAlbum)return;
  const photos=Array.isArray(editAlbum.photos)?[...editAlbum.photos]:[];
  if(from<0||to<0||from>=photos.length||to>=photos.length||from===to)return;

  const coverFile=photos[cover]?.file || editAlbum.cover || '';
  const [moved]=photos.splice(from,1);
  photos.splice(to,0,moved);

  editAlbum={...editAlbum,photos,photoCount:photos.length};
  const nextCoverIndex=photos.findIndex(p=>p && p.file===coverFile);
  cover=nextCoverIndex>=0?nextCoverIndex:0;
  editAlbum.coverIndex=cover;
  editAlbum.cover=photos[cover]?.file||'';

  renderExistingThumbs();
  renderExistingStats();

  const prog=document.querySelector('#progress');
  const msg=document.querySelector('#msg');
  if(prog)prog.style.display='block';
  if(msg)msg.textContent='사진 순서가 변경되었습니다. “수정 저장”을 눌러 반영해 주세요.';
}

function renderExistingThumbs(){
  if(!editAlbum) return;
  const photos=Array.isArray(editAlbum.photos)?editAlbum.photos:[];
  const thumbs=document.querySelector('#thumbs');
  thumbs.innerHTML='';

  photos.forEach((photo,i)=>{
    const d=document.createElement('div');
    d.className='thumb'+(i===cover?' selected':'');
    d.style.position='relative';

    const file=photo.file||photo.f||'';
    const img=document.createElement('img');
    img.src=albumPhotoUrl(editAlbumId,file);
    img.alt='기존 사진';
    d.appendChild(img);

    const del=document.createElement('button');
    del.type='button';
    del.textContent='×';
    del.title='이 사진 삭제';
    del.setAttribute('aria-label','사진 삭제');
    Object.assign(del.style,{
      position:'absolute',
      top:'4px',
      right:'4px',
      width:'26px',
      height:'26px',
      minWidth:'26px',
      padding:'0',
      border:'0',
      borderRadius:'50%',
      background:'rgba(66,48,36,.88)',
      color:'#fff',
      fontSize:'18px',
      lineHeight:'26px',
      cursor:'pointer',
      boxShadow:'0 2px 8px rgba(0,0,0,.18)',
      zIndex:'3'
    });
    del.onclick=async e=>{
      e.stopPropagation();
      await deleteExistingPhoto(file,i,del);
    };
    d.appendChild(del);

    const order=document.createElement('span');
    order.textContent=String(i+1);
    order.title='드래그해서 사진 순서 변경';
    Object.assign(order.style,{
      position:'absolute',left:'4px',bottom:'4px',minWidth:'20px',height:'20px',
      display:'grid',placeItems:'center',padding:'0 5px',borderRadius:'999px',
      background:'rgba(255,253,248,.92)',color:'#4a4037',fontSize:'10px',
      fontWeight:'800',zIndex:'2',boxShadow:'0 1px 5px rgba(0,0,0,.12)'
    });
    d.appendChild(order);

    d.onclick=()=>{
      cover=i;
      [...thumbs.children].forEach((x,j)=>x.classList.toggle('selected',j===i));
    };
    enableThumbReorder(d,i);
    thumbs.appendChild(d);
  });
}

async function deleteExistingPhoto(file,index,button){
  if(!editAlbum) return;
  const photos=Array.isArray(editAlbum.photos)?editAlbum.photos:[];
  if(photos.length<=1){
    alert('사진책에는 최소 1장의 사진이 필요합니다.');
    return;
  }

  const ok=confirm(`이 사진을 사진책에서 삭제할까요?\n\n${file}\n\n삭제하면 GitHub의 실제 사진 파일에서도 제거됩니다.`);
  if(!ok) return;

  button.disabled=true;
  const oldText=button.textContent;
  button.textContent='…';

  try{
    const r=await fetch(
      `${API_BASE}/api/photo?albumId=${encodeURIComponent(editAlbumId)}&name=${encodeURIComponent(file)}`,
      {
        method:'DELETE',
        credentials:'include',
        cache:'no-store'
      }
    );
    const d=await r.json();
    if(!r.ok||!d.ok) throw new Error(d.message||`HTTP ${r.status}`);

    const nextPhotos=photos.filter((_,i)=>i!==index);
    editAlbum={
      ...editAlbum,
      photos:nextPhotos,
      photoCount:Number(d.photoCount||nextPhotos.length),
      cover:String(d.cover||nextPhotos[0]?.file||''),
      coverIndex:Math.max(0,Math.min(Number(d.coverIndex||0),Math.max(0,nextPhotos.length-1)))
    };
    cover=editAlbum.coverIndex;

    if(selected.length)renderEditPhotos();
    else{renderExistingStats();renderExistingThumbs();}
  }catch(e){
    alert('사진을 삭제하지 못했습니다: '+e.message);
    button.disabled=false;
    button.textContent=oldText;
  }
}

async function loadEditAlbum(){
  if(!isEditMode()) return;

  try{
    const r=await fetch(`${API_BASE}/api/album/${encodeURIComponent(editAlbumId)}`,{
      credentials:'include',
      cache:'no-store'
    });
    const d=await r.json();
    if(!r.ok||!d.ok) throw new Error(d.message||`HTTP ${r.status}`);
    renderExistingAlbum(d.album);
  }catch(e){
    alert('수정할 사진책을 불러오지 못했습니다: '+e.message);
  }
}

function readImage(file){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('이미지를 읽지 못했습니다.'))};
    img.src=url;
  });
}

async function toWebP(file,maxSide=1800,quality=0.82){
  const img=await readImage(file);
  const scale=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight));
  const width=Math.max(1,Math.round(img.naturalWidth*scale));
  const height=Math.max(1,Math.round(img.naturalHeight*scale));
  const canvas=document.createElement('canvas');
  canvas.width=width; canvas.height=height;
  const ctx=canvas.getContext('2d',{alpha:false});
  ctx.drawImage(img,0,0,width,height);
  const blob=await new Promise((resolve,reject)=>
    canvas.toBlob(b=>b?resolve(b):reject(new Error('WebP 변환에 실패했습니다.')),'image/webp',quality)
  );
  return {blob,width,height};
}

function pad3(n){return String(n).padStart(3,'0')}

function albumJsonUrl(albumId){
  return `https://daniel9kim.github.io/pageflip-test/albums/${albumId}/album.json`;
}

function albumPhotoUrl(albumId,fileName){
  return `https://daniel9kim.github.io/pageflip-test/albums/${albumId}/photos/${encodeURIComponent(fileName)}`;
}

function viewerUrl(albumId){
  const v=Date.now();
  const albumWithVersion=albumJsonUrl(albumId)+`?v=${v}`;
  return `https://daniel9kim.github.io/pageflip-test/viewer/?album=${encodeURIComponent(albumWithVersion)}&v=${v}`;
}

async function waitForPagesReady(albumId, options={}){
  const intervalMs=options.intervalMs||3000;
  const timeoutMs=options.timeoutMs||180000;

  const expectedPhotoCount=Number.isFinite(Number(options.expectedPhotoCount))
    ? Number(options.expectedPhotoCount)
    : null;

  // V10.4: 사진 존재 여부가 아니라 album.json의 photos 배열 순서까지 검증합니다.
  const expectedPhotoOrder=Array.isArray(options.expectedPhotoOrder)
    ? options.expectedPhotoOrder.map(String).filter(Boolean)
    : [];

  const expectedFiles=Array.isArray(options.expectedFiles)
    ? options.expectedFiles.map(String).filter(Boolean)
    : [];

  const started=Date.now();

  while(Date.now()-started < timeoutMs){
    try{
      const jsonRes=await fetch(albumJsonUrl(albumId)+`?t=${Date.now()}`,{
        method:'GET',
        cache:'no-store'
      });

      if(jsonRes.ok){
        const published=await jsonRes.json();
        const publishedPhotos=Array.isArray(published?.photos)?published.photos:[];
        const publishedOrder=publishedPhotos.map(p=>String(p?.file||''));

        const countMatches=
          expectedPhotoCount===null
            ? publishedPhotos.length>0
            : publishedPhotos.length===expectedPhotoCount;

        const orderMatches=
          !expectedPhotoOrder.length ||
          (
            publishedOrder.length===expectedPhotoOrder.length &&
            publishedOrder.every((file,i)=>file===expectedPhotoOrder[i])
          );

        const publishedNames=new Set(publishedOrder);
        const filesListed=expectedFiles.every(file=>publishedNames.has(file));

        if(
          published &&
          published.id===albumId &&
          published.status==='ready' &&
          countMatches &&
          orderMatches &&
          filesListed
        ){
          // 실제 사진 파일까지 Pages에서 열리는지 확인합니다.
          const filesToCheck=expectedFiles.length
            ? expectedFiles
            : (
                expectedPhotoOrder.length
                  ? [expectedPhotoOrder[0],expectedPhotoOrder[expectedPhotoOrder.length-1]].filter(Boolean)
                  : (publishedPhotos[0]?.file?[publishedPhotos[0].file]:[])
              );

          let allPhotosReady=true;
          for(const file of filesToCheck){
            const photoRes=await fetch(
              albumPhotoUrl(albumId,file)+`?t=${Date.now()}`,
              {method:'GET',cache:'no-store'}
            );
            if(!photoRes.ok){
              allPhotosReady=false;
              break;
            }
          }

          if(allPhotosReady){
            return {
              ready:true,
              album:published,
              photoCount:publishedPhotos.length,
              photoOrder:publishedOrder
            };
          }
        }
      }
    }catch(e){
      // GitHub Pages가 최신 commit을 제공할 때까지 재시도합니다.
    }

    await new Promise(resolve=>setTimeout(resolve,intervalMs));
  }

  return {ready:false};
}

async function activateViewerWhenReady(albumId, options={}){
  const btn=document.querySelector('#viewerBtn');
  const status=document.querySelector('#pagesReadyStatus');
  if(!btn||!status) return;

  const expectedPhotoCount=Number.isFinite(Number(options.expectedPhotoCount))
    ? Number(options.expectedPhotoCount)
    : null;

  btn.disabled=true;
  btn.textContent='사진책 준비 중…';
  status.textContent=expectedPhotoCount===null
    ? 'album.json 반영 대기 중…'
    : `GitHub Pages ${expectedPhotoCount}장 · 사진 순서 반영 대기 중…`;
  status.className='tag pending';

  const result=await waitForPagesReady(albumId,options);

  if(result.ready){
    status.textContent=`앨범·사진 ${result.photoCount}장 · 순서 반영 완료`;
    status.className='tag ready';
    btn.disabled=false;
    btn.textContent='사진책 보기';
    btn.title='';
    btn.onclick=()=>window.open(viewerUrl(albumId),'_blank');
  }else{
    // V10.2-6: 정확한 사진 수가 확인되지 않은 상태에서는
    // Viewer를 열 수 있게 하지 않습니다.
    status.textContent='아직 최신 앨범이 반영되지 않았습니다';
    status.className='tag pending';
    btn.disabled=false;
    btn.textContent='반영 다시 확인';
    btn.title='GitHub Pages의 최신 album.json과 사진 수를 다시 확인합니다.';
    btn.onclick=()=>activateViewerWhenReady(albumId,options);
  }
}


document.querySelector('#make').onclick=async()=>{
  const title=document.querySelector('#title').value.trim();
  if(!title){alert('앨범 제목을 입력해 주세요.');return}

  const makeBtn=document.querySelector('#make');
  const prog=document.querySelector('#progress'),fill=document.querySelector('#fill'),msg=document.querySelector('#msg');
  const plan=document.querySelector('#uploadPlan');

  const metadata={
    title,
    date:document.querySelector('#date').value||'',
    summary:document.querySelector('#summary').value.trim(),
    story:document.querySelector('#story').value.trim(),
    shelf:document.querySelector('#shelf').value,
    coverIndex:cover
  };

  // =========================================================
  // V10.2-3 EDIT MODE — 삭제 + 새 사진 추가 + 메타데이터 수정
  // =========================================================
  if(isEditMode()){
    if(!editAlbum){alert('기존 앨범을 아직 불러오지 못했습니다.');return}

    makeBtn.disabled=true;
    prog.style.display='block';
    plan.style.display='block';
    fill.style.width='5%';
    msg.textContent='사진책 수정 저장을 준비하고 있습니다…';

    const existing=Array.isArray(editAlbum.photos)?editAlbum.photos:[];
    plan.innerHTML=`
      <div style="font-weight:800;margin-bottom:8px">사진책 수정 진행</div>
      <div class="planrow"><span>기존 사진</span><span class="tag ready">${existing.length}장</span></div>
      <div class="planrow"><span>새 사진 업로드</span><span class="tag pending" id="stageNew">${selected.length?`0 / ${selected.length}`:'없음'}</span></div>
      <div class="planrow"><span>album.json 갱신</span><span class="tag pending" id="stageEdit">대기</span></div>
      <div class="planrow"><span>책장 정보 갱신</span><span class="tag pending" id="stageShelf">대기</span></div>`;

    try{
      const used=new Set(existing.map(p=>String(p.file||'')));
      const added=[];
      const nextName=()=>{
        for(let n=1;n<=999;n++){
          const s=`${pad3(n)}.webp`;
          if(!used.has(s)){used.add(s);return s}
        }
        throw new Error('사진 번호를 만들 수 없습니다.');
      };

      for(let i=0;i<selected.length;i++){
        const f=selected[i];
        msg.textContent=`새 사진 ${i+1}/${selected.length} WebP 변환 중…`;
        const converted=await toWebP(f,1800,0.82);
        if(converted.blob.size>8*1024*1024)throw new Error(`${f.name}: 변환 후 파일이 너무 큽니다.`);
        const fileName=nextName();

        msg.textContent=`새 사진 ${i+1}/${selected.length} GitHub 업로드 중…`;
        const pr=await fetch(`${API_BASE}/api/photo?albumId=${encodeURIComponent(editAlbumId)}&name=${encodeURIComponent(fileName)}`,{
          method:'POST',headers:{'Content-Type':'image/webp'},credentials:'include',body:converted.blob
        });
        const pd=await pr.json();
        if(!pr.ok||!pd.ok)throw new Error(pd.message||`새 사진 ${i+1} 업로드 실패`);

        added.push({file:fileName,path:pd.file,originalName:f.name,width:converted.width,height:converted.height,bytes:converted.blob.size});
        const st=document.querySelector('#stageNew');
        if(st)st.textContent=`${i+1} / ${selected.length}`;
        fill.style.width=`${10+Math.round(((i+1)/Math.max(1,selected.length))*60)}%`;
      }
      const st=document.querySelector('#stageNew');
      if(st){st.className='tag ready';if(!selected.length)st.textContent='없음'}

      const photos=[...existing,...added];
      const safeCover=Math.max(0,Math.min(cover,photos.length-1));
      const editMetadata={
        ...metadata,
        photoCount:photos.length,
        coverIndex:safeCover,
        cover:photos[safeCover]?.file||''
      };

      msg.textContent='album.json과 책장 정보를 갱신하고 있습니다…';
      document.querySelector('#stageEdit').textContent='진행 중';
      fill.style.width='78%';

      const r=await fetch(API_BASE+'/api/album/update',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'include',
        body:JSON.stringify({albumId:editAlbumId,metadata:editMetadata,photos})
      });
      const d=await r.json();
      if(!r.ok||!d.ok)throw new Error(d.message||`HTTP ${r.status}`);

      document.querySelector('#stageEdit').textContent='저장 완료';
      document.querySelector('#stageEdit').className='tag ready';
      document.querySelector('#stageShelf').textContent='갱신 완료';
      document.querySelector('#stageShelf').className='tag ready';

      editAlbum={...editAlbum,...editMetadata,photos};
      selected=[];
      cover=safeCover;
      fill.style.width='100%';
      msg.textContent='새 사진 추가와 사진책 수정 저장이 완료되었습니다.';
      renderExistingStats();
      renderExistingThumbs();

      plan.innerHTML+=`
        <div style="border-top:1px solid #e5dbcf;margin:14px 0 4px"></div>
        <div class="planrow"><span>앨범 ID</span><span class="tag">${editAlbumId}</span></div>
        <div class="planrow"><span>새 사진</span><span class="tag ready">${added.length}장 추가</span></div>
        <div class="planrow"><span>전체 사진</span><span class="tag ready">${photos.length}장</span></div>
        <div class="planrow"><span>저장 순서</span><span class="tag ready">${photos.map(p=>p.file).join(' → ')}</span></div>
        <div class="planrow"><span>GitHub Pages</span><span class="tag pending" id="pagesReadyStatus">순서 포함 반영 대기 중…</span></div>
        <div class="planrow"><span>사진책 Viewer</span><span><button class="btn green" id="viewerBtn" type="button" disabled>사진책 준비 중…</button></span></div>`;

      activateViewerWhenReady(editAlbumId,{
        expectedPhotoCount:photos.length,
        expectedPhotoOrder:photos.map(p=>p.file),
        expectedFiles:added.map(p=>p.file)
      });
      plan.scrollIntoView({behavior:'smooth',block:'center'});
    }catch(e){
      fill.style.width='100%';
      msg.textContent='수정 저장에 실패했습니다: '+e.message;
    }finally{
      makeBtn.disabled=false;
    }
    return;
  }

  // =========================================================
  // CREATE MODE — 기존 V8/V9 새 사진책 만들기 흐름 그대로 유지
  // =========================================================
  if(!selected.length){alert('사진을 먼저 선택해 주세요.');return}

  metadata.photoCount=selected.length;

  makeBtn.disabled=true;
  prog.style.display='block';
  plan.style.display='block';
  fill.style.width='5%';
  msg.textContent='앨범을 준비하고 있습니다…';
  plan.innerHTML=`
    <div style="font-weight:800;margin-bottom:8px">GitHub 업로드 진행</div>
    <div class="planrow"><span>album.json 준비</span><span class="tag pending" id="stageAlbum">진행 중</span></div>
    <div class="planrow"><span>WebP 사진 업로드</span><span class="tag pending" id="stagePhotos">0 / ${selected.length}</span></div>
    <div class="planrow"><span>album.json 최종 갱신</span><span class="tag pending" id="stageFinal">대기</span></div>
    <div class="planrow"><span>선택한 책장 자동 등록</span><span class="tag pending" id="stageShelf">대기</span></div>`;

  try{
    const startRes=await fetch(API_BASE+'/api/album/start',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'include',
      body:JSON.stringify(metadata)
    });
    const startData=await startRes.json();
    if(!startRes.ok||!startData.ok) throw new Error(startData.message||`HTTP ${startRes.status}`);
    const albumId=startData.albumId;
    document.querySelector('#stageAlbum').textContent='준비 완료';
    document.querySelector('#stageAlbum').className='tag ready';

    const photos=[];
    for(let i=0;i<selected.length;i++){
      const file=selected[i];
      msg.textContent=`사진 ${i+1}/${selected.length} WebP 변환 중…`;
      const converted=await toWebP(file,1800,0.82);
      const fileName=`${pad3(i+1)}.webp`;

      if(converted.blob.size > 8*1024*1024){
        throw new Error(`${file.name}: 변환 후 파일이 너무 큽니다.`);
      }

      msg.textContent=`사진 ${i+1}/${selected.length} GitHub 업로드 중…`;
      const photoRes=await fetch(
        `${API_BASE}/api/photo?albumId=${encodeURIComponent(albumId)}&name=${encodeURIComponent(fileName)}`,
        {
          method:'POST',
          headers:{'Content-Type':'image/webp'},
          credentials:'include',
          body:converted.blob
        }
      );
      const saved=await photoRes.json();
      if(!photoRes.ok||!saved.ok) throw new Error(saved.message||`사진 ${i+1} 업로드 실패`);

      photos.push({
        file:fileName,
        path:saved.file,
        originalName:file.name,
        width:converted.width,
        height:converted.height,
        bytes:converted.blob.size
      });

      const done=i+1;
      document.querySelector('#stagePhotos').textContent=`${done} / ${selected.length}`;
      fill.style.width=`${10+Math.round((done/selected.length)*75)}%`;
    }
    document.querySelector('#stagePhotos').className='tag ready';

    msg.textContent='album.json을 최종 갱신하고 있습니다…';
    document.querySelector('#stageFinal').textContent='진행 중';

    const finalRes=await fetch(API_BASE+'/api/album/finalize',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'include',
      body:JSON.stringify({albumId,metadata,photos})
    });
    const final=await finalRes.json();
    if(!finalRes.ok||!final.ok) throw new Error(final.message||`HTTP ${finalRes.status}`);

    fill.style.width='100%';
    msg.textContent='사진과 album.json 저장이 모두 완료되었습니다.';
    document.querySelector('#stageFinal').textContent='저장 완료';
    document.querySelector('#stageFinal').className='tag ready';
    document.querySelector('#stageShelf').textContent='등록 완료';
    document.querySelector('#stageShelf').className='tag ready';

    plan.innerHTML += `
      <div style="border-top:1px solid #e5dbcf;margin:14px 0 4px"></div>
      <div class="planrow"><span>앨범 ID</span><span class="tag">${albumId}</span></div>
      <div class="planrow"><span>사진</span><span class="tag ready">${photos.length}장 저장 완료</span></div>
      <div class="planrow"><span>album.json</span><span class="tag ready">최종 저장 완료</span></div>
      <div class="planrow"><span>Commit</span><span class="tag ready">${(final.commit||'').slice(0,10)}</span></div>
      <div class="planrow"><span>등록 책장</span><span class="tag ready">${final.shelfTitle||metadata.shelf}</span></div>
      <div class="planrow"><span>책장 등록</span><span class="tag ready">완료</span></div>
      <div class="planrow"><span>GitHub Pages</span><span class="tag pending" id="pagesReadyStatus">반영 대기 중…</span></div>
      <div class="planrow"><span>사진책 Viewer</span><span><button class="btn green" id="viewerBtn" type="button" disabled>사진책 준비 중…</button></span></div>`;

    activateViewerWhenReady(albumId,{
      expectedPhotoCount:photos.length,
      expectedPhotoOrder:photos.map(p=>p.file),
      expectedFiles:[photos[0]?.file,photos[photos.length-1]?.file].filter(Boolean)
    });
    plan.scrollIntoView({behavior:'smooth',block:'center'});
  }catch(e){
    fill.style.width='100%';
    msg.textContent='업로드에 실패했습니다: '+e.message;
  }finally{
    makeBtn.disabled=false;
  }
};

checkStatus();
loadEditAlbum();

// V11.0 관리자 앨범 관리 화면
ensureAdminPanel();
