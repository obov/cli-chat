# WebSocket 실시간 통신

## 개요
WebSocket을 통해 실시간 양방향 통신을 지원합니다. 클라이언트와 서버 간 지속적인 연결을 유지하며, 즉각적인 메시지 교환과 실시간 스트리밍이 가능합니다.

## 주요 기능

### 1. 실시간 양방향 통신
- 클라이언트와 서버 간 즉각적인 메시지 교환
- 연결 유지를 통한 낮은 레이턴시
- 이벤트 기반 통신 패턴

### 2. 세션 기반 대화 관리
- WebSocket 연결별 독립적인 세션
- 대화 히스토리 유지 및 조회
- 세션별 컨텍스트 관리

### 3. 실시간 스트리밍
- 토큰별 실시간 응답 스트리밍
- 도구 실행 진행 상황 실시간 전달
- 구조화된 이벤트 스트림

### 4. 연결 상태 관리
- 자동 재연결 지원
- Ping/Pong을 통한 연결 상태 확인
- 우아한 연결 종료 처리

## WebSocket 엔드포인트

### 연결 URL
```
ws://localhost:3002/ws
```

## 메시지 타입

### 클라이언트 → 서버

#### 1. `chat` - 채팅 메시지
```json
{
  "type": "chat",
  "message": "안녕하세요",
  "sessionId": "session-123",
  "enableTools": true
}
```

#### 2. `clear` - 대화 기록 삭제
```json
{
  "type": "clear",
  "sessionId": "session-123"
}
```

#### 3. `getHistory` - 대화 기록 조회
```json
{
  "type": "getHistory",
  "sessionId": "session-123"
}
```

#### 4. `ping` - 연결 상태 확인
```json
{
  "type": "ping"
}
```

### 서버 → 클라이언트

#### 1. `message` - 일반 메시지
```json
{
  "type": "message",
  "content": "Connected to ChatBot WebSocket server",
  "sessionId": "session-123",
  "timestamp": "2024-01-20T10:00:00.000Z"
}
```

#### 2. `token` - 스트리밍 토큰
```json
{
  "type": "token",
  "content": "안녕",
  "sessionId": "session-123"
}
```

#### 3. `tool_call` - 도구 호출 시작
```json
{
  "type": "tool_call",
  "tool": "get_weather",
  "args": {"location": "Seoul"},
  "sessionId": "session-123"
}
```

#### 4. `tool_progress` - 도구 실행 진행
```json
{
  "type": "tool_progress",
  "tool": "get_weather",
  "content": "위치 확인 중...",
  "sessionId": "session-123"
}
```

#### 5. `tool_result` - 도구 실행 결과
```json
{
  "type": "tool_result",
  "tool": "get_weather",
  "result": "서울: 20°C, 맑음",
  "sessionId": "session-123"
}
```

#### 6. `history` - 대화 기록
```json
{
  "type": "history",
  "sessionId": "session-123",
  "history": [
    {"role": "user", "content": "안녕"},
    {"role": "assistant", "content": "안녕하세요!"}
  ]
}
```

#### 7. `error` - 오류 메시지
```json
{
  "type": "error",
  "error": "Invalid message format",
  "timestamp": "2024-01-20T10:00:00.000Z"
}
```

#### 8. `pong` - Ping 응답
```json
{
  "type": "pong",
  "timestamp": "2024-01-20T10:00:00.000Z"
}
```

## 사용 예시

### JavaScript/TypeScript 클라이언트
```typescript
const ws = new WebSocket('ws://localhost:3002/ws');

// 연결 성공
ws.onopen = () => {
  console.log('Connected to server');
  
  // 채팅 메시지 전송
  ws.send(JSON.stringify({
    type: 'chat',
    message: '날씨 알려줘',
    enableTools: true
  }));
};

// 메시지 수신
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'token':
      process.stdout.write(data.content);
      break;
    case 'tool_call':
      console.log(`도구 호출: ${data.tool}`);
      break;
    case 'tool_result':
      console.log(`결과: ${data.result}`);
      break;
  }
};
```

### Python 클라이언트
```python
import websocket
import json

def on_message(ws, message):
    data = json.loads(message)
    if data['type'] == 'token':
        print(data['content'], end='')
    elif data['type'] == 'tool_call':
        print(f"\\n도구 호출: {data['tool']}")

ws = websocket.WebSocketApp("ws://localhost:3002/ws",
                            on_message=on_message)

ws.run_forever()
```

## 구현 세부사항

### 연결 관리
- 각 클라이언트에 고유 ID 할당
- Map 구조로 활성 연결 관리
- 연결 종료 시 자동 정리

### 세션 통합
- 기존 SessionStore와 완전 통합
- REST API와 동일한 세션 공유 가능
- 세션 타임아웃 (24시간)

### 오류 처리
- 잘못된 메시지 형식 검증
- 세션 없음 오류 처리
- 연결 오류 시 우아한 종료

### 성능 최적화
- 메시지 버퍼링 없이 즉시 전송
- 효율적인 이벤트 기반 아키텍처
- 동시 다중 연결 지원

## 테스트

### 테스트 스크립트
`tests/ws-client.test.ts`로 다음 시나리오 테스트:
1. 기본 연결 및 메시징
2. 도구 호출 스트리밍
3. 세션 관리 및 히스토리
4. 오류 처리
5. Ping/Pong 연결 확인

### 실행 방법
```bash
npx ts-node tests/ws-client.test.ts
```

## 보안 고려사항
- 프로덕션 환경에서는 WSS (WebSocket Secure) 사용 권장
- 인증/인가 미들웨어 추가 필요
- 메시지 크기 제한 설정 권장
- Rate limiting 구현 고려