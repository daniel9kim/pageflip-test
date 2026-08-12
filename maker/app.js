// PAGE FLIP Maker V10.2-6 — exact GitHub Pages publication verification
const API_BASE = "https://pageflip-api.withme-jesus.workers.dev";

const drop=document.querySelector('#drop'),input=document.querySelector('#files'),choose=document.querySelector('#choose');
let selected=[],cover=0;
const params=new URLSearchParams(location.search);
const editAlbumId=params.get('edit');
let editAlbum=null;
const isEditMode=()=>/^album-[0-9]+$/.test(String(editAlbumId||''));

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
  if(introText) introText.textContent='기존 사진을 삭제하거나 표지를 바꾸고, 제목·날짜·기록·책장을 수정합니다.';

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
    `<div class="stat">수정 모드 <b>사진 삭제 가능</b></div>`;
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

    d.onclick=()=>{
      cover=i;
      [...thumbs.children].forEach((x,j)=>x.classList.toggle('selected',j===i));
    };
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
  return `https://daniel9kim.github.io/pageflip-test/viewer/?album=${encodeURIComponent(albumJsonUrl(albumId))}`;
}

async function waitForPagesReady(albumId, options={}){
  const intervalMs=options.intervalMs||3000;
  const timeoutMs=options.timeoutMs||180000;
  const expectedPhotoCount=Number.isFinite(Number(options.expectedPhotoCount))
    ? Number(options.expectedPhotoCount)
    : null;
  const expectedFiles=Array.isArray(options.expectedFiles)
    ? options.expectedFiles.filter(Boolean)
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
        const photos=Array.isArray(published?.photos)?published.photos:[];

        const countMatches=
          expectedPhotoCount===null
            ? photos.length>0
            : photos.length===expectedPhotoCount;

        const publishedNames=new Set(photos.map(p=>String(p?.file||'')));
        const filesListed=expectedFiles.every(file=>publishedNames.has(String(file)));

        if(
          published &&
          published.id===albumId &&
          published.status==='ready' &&
          countMatches &&
          filesListed
        ){
          // album.json뿐 아니라 이번 저장에서 기대하는 실제 사진 파일도
          // GitHub Pages에서 열리는지 확인합니다.
          const filesToCheck=expectedFiles.length
            ? expectedFiles
            : (photos[0]?.file?[photos[0].file]:[]);

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
              photoCount:photos.length
            };
          }
        }
      }
    }catch(e){
      // GitHub Pages 배포가 끝날 때까지 재시도합니다.
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
    : `GitHub Pages ${expectedPhotoCount}장 반영 대기 중…`;
  status.className='tag pending';

  const result=await waitForPagesReady(albumId,options);

  if(result.ready){
    status.textContent=`앨범·사진 ${result.photoCount}장 반영 완료`;
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
        <div class="planrow"><span>GitHub Pages</span><span class="tag pending" id="pagesReadyStatus">반영 대기 중…</span></div>
        <div class="planrow"><span>사진책 Viewer</span><span><button class="btn green" id="viewerBtn" type="button" disabled>사진책 준비 중…</button></span></div>`;

      activateViewerWhenReady(editAlbumId,{expectedPhotoCount:photos.length,expectedFiles:added.map(p=>p.file)});
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

    activateViewerWhenReady(albumId,{expectedPhotoCount:photos.length,expectedFiles:[photos[0]?.file,photos[photos.length-1]?.file].filter(Boolean)});
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