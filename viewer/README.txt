PAGE FLIP Viewer V9.2.1 — Episode layout fix

1) viewer/app.js
   기존 viewer/app.js를 이 파일로 교체하세요.

2) viewer/episode-fix.css
   이 파일의 내용을 현재 viewer/style.css 맨 아래에 붙여 넣으세요.
   (현재 style.css 전체를 받지 못했기 때문에 안전하게 추가 패치 형태로 만들었습니다.)

목표:
- 에피소드 첫 펼침면을 최초 샘플의 고정 Editorial Layout으로 복원
- 왼쪽: EPISODE / 그날의 기록 / 부제·날짜 / 인용문 / 대표사진
- 오른쪽: 감상문 미리보기 + 전체 감상문 읽기
- 사진 자동편집 로직은 그대로 유지
