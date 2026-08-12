PAGE FLIP Viewer V9.3.1 — Portrait Pair refinement

이번 단계에서는 세로+세로 사진 펼침면만 수정했습니다.

변경:
- 세로사진을 기존 76% 제한보다 크게 사용
- 좌/우 페이지의 바깥 여백과 제본선 쪽 여백을 다르게 조정
- 두 사진이 한 쌍의 사진책 spread처럼 균형 있게 보이도록 정렬
- 원본 비율 유지(object-fit: contain)
- 모바일 단면 구조 유지

변경하지 않은 것:
- Episode 고정 Editorial Layout
- 가로 Hero Spread
- 정사각형 사진
- 홀수 마지막 사진 + 이야기 페이지
- 페이지 넘김
- 공유/전체화면/책장 복귀
- Maker/Worker

설치:
GitHub pageflip-test/viewer/ 의
1) app.js
2) style.css
두 파일을 이 ZIP의 파일로 교체 후 Commit 하세요.

주의:
기존 episode-fix.css는 index.html에서 계속 연결되어 있어도 됩니다.
