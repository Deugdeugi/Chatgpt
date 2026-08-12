# Orbit Daily

NASA의 [Astronomy Picture of the Day(APOD)](https://apod.nasa.gov/)를 날짜별로 감상하고 브라우저에 저장하는 한국어 웹 앱입니다.

## 기능

- 오늘 또는 선택한 날짜의 천문 사진·영상과 해설 조회
- 이전/다음 날짜 및 랜덤 날짜 탐험
- 고해상도 원본 보기
- `localStorage` 기반 개인 컬렉션
- 서버 프록시와 메모리 캐시를 통한 API 키 보호 및 호출 절약
- 모바일 반응형 UI

## 실행

Node.js 20 이상이 필요하며 외부 패키지는 사용하지 않습니다.

```bash
cp .env.example .env
# .env에 NASA_API_KEY를 입력하거나 DEMO_KEY로 바로 실행
npm start
```

브라우저에서 <http://localhost:3000>을 엽니다. `.env` 파일은 Node가 자동으로 읽지 않으므로 키를 사용할 때는 다음처럼 환경변수로 전달합니다.

```bash
NASA_API_KEY=your_key npm start
```

무료 API 키는 [NASA Open APIs](https://api.nasa.gov/)에서 발급할 수 있습니다.

앱 상단의 **API 키 설정** 버튼에서도 발급받은 키를 입력할 수 있습니다. 입력한 키는 현재 브라우저 탭의 `sessionStorage`에만 보관되고, API 요청 시 서버를 거쳐 NASA에 전달됩니다. 키 없이 사용하면 `DEMO_KEY`가 적용됩니다.

## 테스트

```bash
npm test
```
