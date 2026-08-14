// PAGE FLIP Shelf V1.4
// - 날짜 최신순 정렬
// - 화면 폭에 따라 4/3/2권 자동 배치
// - 공개 책장에서는 수정 메뉴를 노출하지 않음

let shelfData = null;
let allAlbums = [];

const root = document.querySelector('#albums');
const searchInput = document.querySelector('#albumSearch');
const yearSelect = document.querySelector('#yearSelect');
const resultCount = document.querySelector('#resultCount');

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
      '<div class="date">' + escapeHtml(String(a.date || '').replaceAll('-', '.')) + '</div>' +
    '</div>';

  btn.onclick = () => openViewer(a);
  wrap.appendChild(btn);

  return wrap;
}

function absoluteAlbumUrl(a) {
  return new URL(a.album, location.href).href;
}

function openViewer(a) {
  location.href = '../../viewer/?album=' + encodeURIComponent(absoluteAlbumUrl(a));
}

// 창 크기가 바뀌면 4/3/2열을 다시 계산
let resizeTimer = null;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (allAlbums.length) renderShelf();
  }, 120);
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
