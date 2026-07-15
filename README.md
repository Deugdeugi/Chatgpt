# Telegram Chat Summary MCP

텔레그램 채팅방의 메시지를 Claude를 통해 조회하고 요약하는 MCP(Model Context Protocol) 서버입니다.

## 설치

### 1. Telegram API 설정

[https://my.telegram.org](https://my.telegram.org)에서 API 자격증명을 획득하세요:
1. 로그인
2. "API development tools" 클릭
3. App 이름 입력하고 생성
4. **API ID**와 **API Hash** 저장

### 2. 환경 설정

`.env.example`을 `.env`로 복사하고 수정하세요:

```bash
cp .env.example .env
```

`.env` 파일 내용:
```
TELEGRAM_API_ID=123456
TELEGRAM_API_HASH=your_api_hash_here
TELEGRAM_PHONE=+1234567890  # 로그인할 전화번호 (국가코드 포함)
```

### 3. 의존성 설치

```bash
pip install -r requirements.txt
```

## 사용 방법

### MCP 서버 실행

```bash
python main.py
```

첫 실행 시 인증 코드를 입력하라는 메시지가 나타납니다. Telegram 앱에서 받은 코드를 입력하세요.

### Claude에서 사용

MCP 서버가 실행되면 Claude는 다음 도구들을 사용할 수 있습니다:

#### 1. `get_chat_messages`
채팅방에서 메시지를 조회합니다.

**파라미터:**
- `chat_id` (필수): 채팅방 ID
- `limit` (선택): 조회할 메시지 수 (기본값: 100)

**사용 예:**
```
"채팅방 12345에서 최근 50개의 메시지를 보여줘"
```

#### 2. `summarize_chat`
채팅방의 내용을 요약합니다.

**파라미터:**
- `chat_id` (필수): 채팅방 ID
- `limit` (선택): 조회할 메시지 수 (기본값: 100)

**반환값:**
- `summary`: 채팅 요약 텍스트
- `keywords`: 추출된 주요 키워드
- `message_count`: 조회된 메시지 수

**사용 예:**
```
"채팅방 12345를 요약해줘"
```

#### 3. `get_chat_info`
채팅방 정보를 조회합니다.

**파라미터:**
- `chat_id` (필수): 채팅방 ID

**반환값:**
- `name`: 채팅방 이름
- `type`: 채팅방 타입

## 채팅방 ID 찾기

### 개인 채팅 (DM)
- 상대방과의 DM에서 URL을 확인하거나
- `/me` 명령으로 자신의 사용자 ID를 확인할 수 있습니다

### 그룹 채팅
1. 그룹에서 봇을 추가하거나 메시지 구조를 확인
2. 그룹의 초대 링크 URL에서 ID를 추출할 수 있습니다
3. 또는 `get_chat_messages` 호출 시 그룹 이름으로도 조회 가능

### 채널
1. 채널의 URL: `https://t.me/channel_username`
2. 또는 `-100XXXXX` 형식의 ID 사용 가능

## 보안 주의사항

⚠️ **중요:**
- `.env` 파일을 절대 공유하지 마세요
- `.env` 파일을 버전 관리에 포함시키지 마세요
- 민감한 채팅방 접근은 권한을 철저히 관리하세요
- 세션 파일(`session_*.session`)을 안전하게 보관하세요

## 트러블슈팅

### "인증 실패" 에러
- Telegram 계정으로 올바르게 로그인했는지 확인
- 2FA가 활성화된 경우 비밀번호를 입력해야 할 수 있음
- API ID/Hash가 올바른지 확인

### "채팅방을 찾을 수 없음" 에러
- 채팅방 ID가 올바른지 확인
- 봇/클라이언트가 해당 채팅방에 접근 권한이 있는지 확인

### 느린 응답
- 대용량 메시지 조회 시 시간이 걸릴 수 있음
- `limit` 파라미터를 줄여 조회 속도 향상

## 아키텍처

```
main.py                 # MCP 서버 메인 파일
├── telegram_client.py  # Telegram 클라이언트 (Telethon 래핑)
├── summarizer.py       # 채팅 요약 로직
└── config.py          # 설정 관리
```

## 라이센스

MIT
