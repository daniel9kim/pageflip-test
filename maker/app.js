const API_BASE = "https://pageflip-api.withme-jesus.workers.dev";

const drop=document.querySelector('#drop'),input=document.querySelector('#files'),choose=document.querySelector('#choose');
let selected=[],cover=0;

choose.onclick=e=>{e.stopPropagation();input.click()};
drop.onclick=()=>input.click();
input.onchange=e=>load([...e.target.files]);
['dragenter','dragover'].forEach(x=>drop.addEventListener(x,e=>{e.preventDefault();drop.classList.add('over')}));
['dragleave','drop'].forEach(x=>drop.addEventListener(x,e=>{e.preventDefault();drop.classList.remove('over')}));
drop.addEventListener('drop',e=>load([...e.dataTransfer.files].filter(f=>f.type.startsWith('image/'))));

function load(files){
  if(!files.length)return;
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
  const started=Date.now();

  while(Date.now()-started < timeoutMs){
    try{
      const jsonRes=await fetch(albumJsonUrl(albumId)+`?t=${Date.now()}`,{
        method:'GET',
        cache:'no-store'
      });

      if(jsonRes.ok){
        const published=await jsonRes.json();

        if(
          published &&
          published.id===albumId &&
          published.status==='ready' &&
          Array.isArray(published.photos) &&
          published.photos.length>0
        ){
          const firstFile=published.photos[0].file;
          if(firstFile){
            const photoRes=await fetch(
              albumPhotoUrl(albumId,firstFile)+`?t=${Date.now()}`,
              {method:'GET',cache:'no-store'}
            );
            if(photoRes.ok){
              return {ready:true,album:published};
            }
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

async function activateViewerWhenReady(albumId){
  const btn=document.querySelector('#viewerBtn');
  const status=document.querySelector('#pagesReadyStatus');
  if(!btn||!status) return;

  btn.disabled=true;
  btn.textContent='사진책 준비 중…';
  status.textContent='album.json 반영 대기 중…';
  status.className='tag pending';

  const result=await waitForPagesReady(albumId);

  if(result.ready){
    status.textContent='앨범·사진 반영 완료';
    status.className='tag ready';
    btn.disabled=false;
    btn.textContent='사진책 보기';
    btn.onclick=()=>window.open(viewerUrl(albumId),'_blank');
  }else{
    status.textContent='반영이 지연되고 있습니다';
    status.className='tag pending';
    btn.disabled=false;
    btn.textContent='사진책 보기';
    btn.onclick=()=>window.open(viewerUrl(albumId),'_blank');
    btn.title='GitHub Pages 반영이 아직 끝나지 않았을 수 있습니다.';
  }
}


document.querySelector('#make').onclick=async()=>{
  const title=document.querySelector('#title').value.trim();
  if(!title){alert('앨범 제목을 입력해 주세요.');return}
  if(!selected.length){alert('사진을 먼저 선택해 주세요.');return}

  const makeBtn=document.querySelector('#make');
  const prog=document.querySelector('#progress'),fill=document.querySelector('#fill'),msg=document.querySelector('#msg');
  const plan=document.querySelector('#uploadPlan');
  const metadata={
    title,
    date:document.querySelector('#date').value||'',
    summary:document.querySelector('#summary').value.trim(),
    story:document.querySelector('#story').value.trim(),
    shelf:document.querySelector('#shelf').value,
    photoCount:selected.length,
    coverIndex:cover
  };

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
    // 1) album start
    const startRes=await fetch(API_BASE+'/api/album/start',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'include',
      body:JSON.stringify(metadata)
    });
    const start=await startRes.json();
    if(!startRes.ok||!start.ok) throw new Error(start.message||`HTTP ${startRes.status}`);
    const albumId=start.albumId;
    document.querySelector('#stageAlbum').textContent='준비 완료';
    document.querySelector('#stageAlbum').className='tag ready';

    // 2) photos sequentially
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
        `https://pageflip-api.withme-jesus.workers.dev/api/photo?albumId=${encodeURIComponent(albumId)}&name=${encodeURIComponent(fileName)}`,
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

    // 3) final album json
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
    activateViewerWhenReady(albumId);
    plan.scrollIntoView({behavior:'smooth',block:'center'});
  }catch(e){
    fill.style.width='100%';
    msg.textContent='업로드에 실패했습니다: '+e.message;
  }finally{
    makeBtn.disabled=false;
  }
};

checkStatus();