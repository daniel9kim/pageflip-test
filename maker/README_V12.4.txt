PAGE FLIP Maker V12.4 — canonical shelf key

핵심 수정
- 화면 표시명(가족사진/개인사진)과 서버용 책장 ID를 분리
- 새 앨범/수정 저장 시 shelfKey(elders/handbell/family/personal)를 함께 전송
- 모바일/PC 브라우저의 표시값 차이에 영향을 받지 않도록 함

함께 배포해야 하는 Worker:
pageflip-api-worker-v10.4.js
