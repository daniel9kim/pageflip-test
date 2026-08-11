PAGE FLIP Maker Pages-ready V2

중요:
이 파일은 GitHub Pages Maker에서 사용합니다.
테스트 주소:
https://daniel9kim.github.io/pageflip-test/maker/

Cloudflare Worker 주소의 Maker 화면에는 이 파일이 적용되지 않습니다.

동작:
1. GitHub 저장 완료
2. GitHub Pages의 새 album.json이 200인지 확인
3. album.json의 id가 방금 만든 albumId와 같은지 확인
4. status=ready, photos 존재 확인
5. 첫 사진 파일도 200인지 확인
6. 모두 확인된 뒤에만 '사진책 보기' 활성화
