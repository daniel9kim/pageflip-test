// PAGE FLIP Shelf V1.6
// - 날짜 최신순 정렬
// - 화면 폭에 따라 4/3/2권 자동 배치
// - 공개 책장에서는 수정 메뉴를 노출하지 않음

let shelfData = null;
let allAlbums = [];

const root = document.querySelector('#albums');
const searchInput = document.querySelector('#albumSearch');
const yearSelect = document.querySelector('#yearSelect');
const resultCount = document.querySelector('#resultCount');

// PAGE FLIP Analytics
// 책장 이용과 무관하게 동작하는 비차단 기록입니다.
// Analytics 서버가 일시적으로 실패해도 책장은 그대로 열립니다.
const ANALYTICS_URL = 'https://pageflip-analytics.withme-jesus.workers.dev/event';
const SHELF_ID = 'elders';

function getAnalyticsVisitorId() {
  const key = 'pageflip_visitor_id';

  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = (globalThis.crypto?.randomUUID?.() ||
        ('v-' + Date.now() + '-' + Math.random().toString(36).slice(2)));
      localStorage.setItem(key, id);
    }
    return id;
  } catch (_) {
    return 'anonymous';
  }
}

function getAnalyticsDeviceType() {
  const ua = navigator.userAgent || '';
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'mobile';
  return 'pc';
}

function getAnalyticsOS() {
  const ua = navigator.userAgent || '';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Other';
}

function sendAnalyticsEvent(payload, preferBeacon = false) {
  const body = JSON.stringify(payload);

  if (preferBeacon && navigator.sendBeacon) {
    try {
      const blob = new Blob([body], { type: 'text/plain;charset=UTF-8' });
      if (navigator.sendBeacon(ANALYTICS_URL, blob)) return;
    } catch (_) {}
  }

  fetch(ANALYTICS_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body,
    keepalive: true
  }).catch(() => {});
}

function trackShelfView() {
  const payload = {
    event_type: 'shelf_view',
    visitor_id: getAnalyticsVisitorId(),
    shelf_id: SHELF_ID,
    album_id: null,
    album_title: null,
    page_no: null,
    device_type: getAnalyticsDeviceType(),
    os: getAnalyticsOS()
  };

  // Analytics 실패 여부와 관계없이 책장은 계속 동작합니다.
  sendAnalyticsEvent(payload);
}

// 한 번의 책장 로드당 1건 기록
trackShelfView();

(async () => {
  const r = await fetch('shelf.json', { cache: 'no-store' });
  if (!r.ok) throw new Error(`shelf.json을 불러오지 못했습니다. (${r.status})`);

  shelfData = await r.json();

  document.title = 'PAGE FLIP · ' + (shelfData.title || '앨범 책장');
  document.querySelector('#title').textContent = shelfData.title || '앨범 책장';
  document.querySelector('#subtitle').textContent = shelfData.subtitle || '';

  allAlbums = Array.isArray(shelfData.albums) ? [...shelfData.albums] : [];

  // 전체 데이터 자체를 최신 날짜 순서로 정리
  allAlbums.sort(compareAlbumsNewestFirst);

  if (!allAlbums.length) {
    root.innerHTML = '<div class="empty">아직 이 책장에 등록된 앨범이 없습니다.</div>';
    document.querySelector('.shelf-tools').style.display = 'none';
    return;
  }

  buildYearOptions();
  renderShelf();

  searchInput.addEventListener('input', renderShelf);
  yearSelect.addEventListener('change', renderShelf);
})().catch(err => {
  root.innerHTML =
    '<div class="empty">책장 정보를 불러오지 못했습니다.<br>' +
    escapeHtml(err.message) + '</div>';
  document.querySelector('.shelf-tools').style.display = 'none';
  console.error(err);
});

function compareAlbumsNewestFirst(a, b) {
  const ad = String(a?.date || '');
  const bd = String(b?.date || '');

  const byDate = bd.localeCompare(ad);
  if (byDate !== 0) return byDate;

  // 같은 날짜라면 album ID의 뒤 숫자(생성 시각)가 큰 것을 먼저 표시
  const ai = numericAlbumId(a);
  const bi = numericAlbumId(b);
  if (ai !== bi) return bi - ai;

  return String(a?.title || '').localeCompare(String(b?.title || ''), 'ko');
}

function numericAlbumId(a) {
  const raw = String(a?.id || a?.albumId || a?.album || '');
  const m = raw.match(/album-(\d+)/);
  return m ? Number(m[1]) : 0;
}

function buildYearOptions() {
  const years = [...new Set(
    allAlbums
      .map(a => (a.date || '').slice(0, 4))
      .filter(Boolean)
  )].sort((a, b) => b.localeCompare(a));

  years.forEach(year => {
    const opt = document.createElement('option');
    opt.value = year;
    opt.textContent = year;
    yearSelect.appendChild(opt);
  });
}

function filteredAlbums() {
  const q = searchInput.value.trim().toLowerCase();
  const selectedYear = yearSelect.value;

  return allAlbums
    .filter(a => {
      const year = (a.date || '').slice(0, 4) || '기타';

      if (selectedYear !== 'all' && year !== selectedYear) return false;
      if (!q) return true;

      const haystack = [
        a.title || '',
        a.date || '',
        String(a.date || '').replaceAll('-', '.'),
        a.summary || '',
        a.subtitle || ''
      ].join(' ').toLowerCase();

      return haystack.includes(q);
    })
    .sort(compareAlbumsNewestFirst);
}

function getBooksPerRow() {
  // 실제 책장이 차지하는 폭을 기준으로 계산
  const width = root?.clientWidth || window.innerWidth;

  if (width >= 790) return 4;
  if (width >= 570) return 3;
  return 2;
}

function renderShelf() {
  const filtered = filteredAlbums();
  resultCount.textContent = `${filtered.length}권 표시`;

  if (!filtered.length) {
    root.innerHTML = '<div class="empty">조건에 맞는 앨범이 없습니다.</div>';
    return;
  }

  const groups = {};
  filtered.forEach(a => {
    const year = (a.date || '').slice(0, 4) || '기타';
    (groups[year] ??= []).push(a);
  });

  root.innerHTML = '';
  const perRow = getBooksPerRow();

  Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .forEach(year => {
      const albums = [...groups[year]].sort(compareAlbumsNewestFirst);

      const sec = document.createElement('section');
      sec.className = 'year-section';

      const yearline = document.createElement('div');
      yearline.className = 'yearline';
      yearline.innerHTML =
        '<span>' + escapeHtml(year) + '</span>' +
        '<small>' + albums.length + '권</small>';

      const shelves = document.createElement('div');
      shelves.className = 'shelf-stack';

      for (let i = 0; i < albums.length; i += perRow) {
        const rowWrap = document.createElement('div');
        rowWrap.className = 'shelf-row-wrap';

        const row = document.createElement('div');
        row.className = 'bookshelf';
        row.style.setProperty('--books-per-row', perRow);

        albums.slice(i, i + perRow).forEach(a => {
          row.appendChild(makeBookCard(a));
        });

        const wood = document.createElement('div');
        wood.className = 'wood';

        rowWrap.append(row, wood);
        shelves.appendChild(rowWrap);
      }

      sec.append(yearline, shelves);
      root.appendChild(sec);
    });
}

function makeBookCard(a) {
  const wrap = document.createElement('div');
  wrap.className = 'book-slot';

  const btn = document.createElement('button');
  btn.className = 'bookcard';
  btn.type = 'button';
  btn.setAttribute('aria-label', (a.title || '앨범') + ' 사진책 보기');

  btn.innerHTML =
    '<div class="book">' +
      '<div class="cover-frame">' +
        '<img src="' + escapeAttr(a.cover || '') + '" alt="">' +
      '</div>' +
      '<div class="title">' + escapeHtml(a.title || '앨범') + '</div>' +
      '<div class="book-meta">' +
        '<span class="date">' + escapeHtml(String(a.date || '').replaceAll('-', '.')) + '</span>' +
        '<span class="photo-count" data-photo-count>사진 수 확인 중</span>' +
      '</div>' +
    '</div>';

  btn.onclick = () => openViewer(a);
  wrap.appendChild(btn);

  // shelf.json에 사진 수가 있으면 즉시 표시하고,
  // 없으면 해당 album.json을 읽어 실제 사진 수를 확인합니다.
  hydratePhotoCount(wrap, a);

  return wrap;
}

async function hydratePhotoCount(card, a) {
  const el = card.querySelector('[data-photo-count]');
  if (!el) return;

  const known = getKnownPhotoCount(a);
  if (known !== null) {
    el.textContent = `사진 ${known}장`;
    return;
  }

  try {
    const url = absoluteAlbumUrl(a);
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(String(r.status));
    const album = await r.json();

    const count = getKnownPhotoCount(album);
    el.textContent = count === null ? '' : `사진 ${count}장`;
  } catch (err) {
    // 사진 수를 못 읽어도 책장 이용에는 지장이 없도록 날짜만 남깁니다.
    el.textContent = '';
  }
}

function getKnownPhotoCount(obj) {
  if (!obj || typeof obj !== 'object') return null;

  const direct = [
    obj.photoCount,
    obj.photosCount,
    obj.imageCount,
    obj.imagesCount,
    obj.count
  ];

  for (const value of direct) {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) return n;
  }

  if (Array.isArray(obj.photos)) return obj.photos.length;
  if (Array.isArray(obj.images)) return obj.images.length;
  if (Array.isArray(obj.pages)) {
    // pages 배열 안에 image/photo가 있는 구조도 대응
    const imagePages = obj.pages.filter(p =>
      p && typeof p === 'object' &&
      (p.image || p.photo || p.src || p.url || p.file)
    );
    if (imagePages.length) return imagePages.length;
  }

  return null;
}

function absoluteAlbumUrl(a) {
  return new URL(a.album, location.href).href;
}

function openViewer(a) {
  // 실제 사진책을 열 때 1건 기록합니다.
  // keepalive 전송이므로 곧바로 Viewer로 이동해도 기록 요청은 계속 처리됩니다.
  sendAnalyticsEvent({
    event_type: 'album_open',
    visitor_id: getAnalyticsVisitorId(),
    shelf_id: SHELF_ID,
    album_id: String(a?.id || a?.albumId || a?.album || ''),
    album_title: String(a?.title || ''),
    page_no: null,
    device_type: getAnalyticsDeviceType(),
    os: getAnalyticsOS()
  }, true);

  location.href = '../../viewer/?album=' + encodeURIComponent(absoluteAlbumUrl(a));
}

// 창 크기가 바뀔 때 '열 수'가 실제로 달라진 경우에만 다시 그립니다.
// 모바일 브라우저는 주소창이 숨거나 나타날 때 높이만 바뀌어도 resize를 발생시키므로,
// 매번 renderShelf()를 호출하면 DOM이 통째로 재생성되어 스크롤이 위로 튈 수 있습니다.
let resizeTimer = null;
let lastBooksPerRow = null;

function rememberBooksPerRow(){
  lastBooksPerRow = getBooksPerRow();
}

// 최초 렌더 이후 현재 열 수를 기억
requestAnimationFrame(rememberBooksPerRow);

addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!allAlbums.length) return;

    const nextBooksPerRow = getBooksPerRow();

    // 폭 변화로 4↔3↔2열이 실제로 바뀔 때만 재렌더
    if (lastBooksPerRow === null) {
      lastBooksPerRow = nextBooksPerRow;
      return;
    }

    if (nextBooksPerRow !== lastBooksPerRow) {
      lastBooksPerRow = nextBooksPerRow;

      // 회전/창 크기 변경 때도 현재 읽던 위치를 최대한 유지
      const y = window.scrollY;
      renderShelf();
      requestAnimationFrame(() => window.scrollTo({ top:y, left:0, behavior:'auto' }));
    }
  }, 160);
});

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}
function escapeAttr(s) {
  return escapeHtml(s);
}
