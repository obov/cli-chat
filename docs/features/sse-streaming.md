# Server-Sent Events (SSE) Streaming

## 개요
Server-Sent Events(SSE)를 통해 실시간으로 챗봇 응답과 도구 실행 과정을 스트리밍할 수 있습니다. 사용자는 응답이 생성되는 과정을 토큰 단위로 볼 수 있으며, 도구가 실행되는 진행 상황도 실시간으로 확인할 수 있습니다.

## 주요 기능

### 1. 실시간 토큰 스트리밍
- AI 응답이 토큰 단위로 실시간 전송
- 사용자가 응답 생성 과정을 즉시 확인 가능
- 긴 응답도 빠른 피드백 제공

### 2. 도구 실행 진행 상황
- 도구 호출 시작 알림
- 실행 중간 단계 업데이트
- 최종 결과 전달
- 도구별 진행 상황 메시지

### 3. 세션 관리 통합
- 기존 세션 시스템과 완전 통합
- 대화 히스토리 유지
- 세션별 독립적인 스트리밍

## API 엔드포인트

### GET `/api/chat/stream`
쿼리 파라미터를 통한 스트리밍 요청

**파라미터:**
- `message` (필수): 채팅 메시지
- `sessionId` (선택): 세션 식별자
- `enableTools` (선택): 도구 사용 여부 (기본값: true)

**예시:**
```bash
curl -N "http://localhost:3002/api/chat/stream?message=서울날씨알려줘&enableTools=true"
```

### POST `/api/chat/stream`
JSON 본문을 통한 스트리밍 요청

**요청 본문:**
```json
{
  "message": "서울의 날씨를 알려주고 섭씨를 화씨로 변환해줘",
  "sessionId": "user-123",
  "enableTools": true
}
```

## 이벤트 타입

### 1. `token`
AI 응답의 각 토큰
```
event: token
data: {"content": "안녕하세요"}
```

### 2. `tool_call`
도구 호출 시작
```
event: tool_call
data: {"tool": "get_weather", "args": {"location": "Seoul"}}
```

### 3. `tool_progress`
도구 실행 진행 상황
```
event: tool_progress
data: {"tool": "get_weather", "message": "위치 확인 중..."}
```

### 4. `tool_result`
도구 실행 결과
```
event: tool_result
data: {"tool": "get_weather", "result": "서울: 20°C, 맑음, 습도 55%"}
```

### 5. `done`
스트리밍 완료
```
event: done
data: {"message": "complete", "sessionId": "user-123", "historyLength": 4}
```

### 6. `error`
오류 발생
```
event: error
data: {"code": "INTERNAL_ERROR", "message": "오류 메시지"}
```

## 구현 세부사항

### Agent 클래스 확장
- 새로운 `getStreamingResponse()` 메서드 추가
- 구조화된 청크 반환을 위한 AsyncGenerator 구현
- 기존 CLI 기능과 독립적으로 동작

### 요청 로깅
- 타임스탬프, HTTP 메서드, 경로 로깅
- 쿼리 파라미터 및 요청 본문 출력
- 응답 시간 측정

### 도구 통합
- `enableTools` 프로퍼티 추가로 도구 활성화 상태 관리
- 스트리밍 중 도구 호출 감지 및 처리
- 도구 실행 후 응답 계속 스트리밍

## 테스트

### 테스트 스크립트
`tests/sse-client.test.ts` 파일로 다음 시나리오 테스트:
1. 기본 SSE 연결
2. 도구 호출 포함 스트리밍
3. 세션 지속성
4. POST 엔드포인트

### 실행 방법
```bash
npx ts-node tests/sse-client.test.ts
```

## Bruno API 클라이언트
다음 `.bru` 파일들로 API 테스트 가능:
- `chat-stream-get.bru`: GET 방식 스트리밍
- `chat-stream-post.bru`: POST 방식 스트리밍
- 기존 `chat-stream.bru` 파일 수정 (JSON 형식으로 변경)

## 브라우저 호환성
- Chrome 6+
- Firefox 6+
- Safari 5+
- Edge 79+
- IE는 폴리필 필요

## 성능 고려사항
- 브라우저당 SSE 연결 제한 (도메인당 6개)
- Keep-alive 헤더로 연결 유지
- 버퍼링 없는 즉시 스트리밍
- 텍스트/이벤트 스트림에 gzip 압축 고려