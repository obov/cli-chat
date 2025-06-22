# 채팅 시스템 구현 및 문제 해결 가이드

## 개요

이 문서는 Express 서버와 React 웹 인터페이스를 사용한 채팅 시스템의 구현 과정과 발생한 문제들의 해결 방법을 정리한 것입니다.

## 시스템 구조

```
CLI Chatbot → Express Server → Web Interface
                    ↓
              WebSocket Server
                    ↓
              OpenAI API
```

## 주요 문제 및 해결 방법

### 1. 새로고침 시 채팅 메시지 중복 표시 문제

#### 문제 상황
- 페이지 새로고침 시 동일한 메시지가 여러 번 표시됨
- 여러 곳에서 세션 로드를 중복 요청

#### 원인
`useChat.ts`에서 여러 useEffect가 중복으로 세션 로드를 요청:
- 컴포넌트 마운트 시
- WebSocket 연결 시
- connection 이벤트 수신 시

#### 해결 방법
1. **프론트엔드 단순화**: 복잡한 세션 로드 로직 제거
2. **서버 주도 구조**: WebSocket 연결 시 서버가 자동으로 세션 히스토리 전송
3. **메시지 ID 추가**: 중복 방지를 위한 고유 ID 부여

```typescript
// 서버: 연결 시 자동 세션 로드
this.loadSessionHistory(ws, sessionId);

// 클라이언트: 단순히 받은 메시지만 처리
case 'history':
  setMessages(prev => {
    const existingIds = new Set(prev.filter(m => m.id).map(m => m.id));
    const newMessages = wsMessage.messages.filter((msg: any) => 
      !msg.id || !existingIds.has(msg.id)
    );
    return [...prev, ...newMessages];
  });
```

### 2. 페이지 네비게이션 후 채팅 기능 작동 불가 문제

#### 문제 상황
- `/history`로 이동 후 `/`로 돌아오면 채팅 내용이 사라짐
- 메시지 전송이 작동하지 않음

#### 원인
- WebSocket 연결은 유지되지만 컴포넌트가 언마운트되면서 상태 초기화
- 재연결 시 서버가 세션 히스토리를 다시 보내지 않음

#### 해결 방법
1. **WebSocket 재사용 시 reconnect 메시지 전송**
```typescript
// useWebSocket.ts
if (globalWs && globalWs.readyState === WebSocket.OPEN) {
  wsRef.current = globalWs;
  setConnectionState('connected');
  
  // 이벤트 핸들러 재등록
  globalWs.onmessage = (event) => {
    const message = JSON.parse(event.data);
    onMessage(message);
  };
  
  // 서버에 reconnect 메시지 전송
  globalWs.send(JSON.stringify({ type: 'reconnect' }));
}
```

2. **서버에서 reconnect 처리**
```typescript
case 'reconnect':
  const reconnectSessionId = (ws as any).sessionId;
  if (reconnectSessionId) {
    this.loadSessionHistory(ws, reconnectSessionId);
  }
  break;
```

### 3. OpenAI API 오류: Invalid role 'tool'

#### 문제 상황
```
Invalid parameter: messages with role 'tool' must be a response to a preceeding message with 'tool_calls'
```

#### 원인
1. UI 표시용 시스템 메시지가 OpenAI API로 전송됨
2. tool 메시지가 tool_calls가 있는 assistant 메시지 없이 독립적으로 존재
3. 커스텀 필드(id, timestamp)가 OpenAI API로 전송됨

#### 해결 방법
1. **UI 전용 메시지 필터링**
```typescript
private getOpenAIMessages(): any[] {
  const filtered = this.messages.filter((msg, index) => {
    // UI 전용 시스템 메시지 필터링
    if (msg.role === 'system' && msg.content) {
      if (content.includes('🔧 Calling tool:') || 
          content.includes('⏳') || 
          content.includes('✅ Tool result:')) {
        return false;
      }
    }
    // ...
  });
```

2. **orphaned tool 메시지 제거**
```typescript
openAIMessages.forEach((msg, idx) => {
  if (msg.role === 'tool') {
    // tool_call_id가 일치하는 assistant 메시지 확인
    if (!lastAssistantWithToolCalls || 
        !lastAssistantWithToolCalls.tool_calls.some(tc => tc.id === msg.tool_call_id)) {
      return; // 메시지 제외
    }
  }
  finalValidation.push(msg);
});
```

3. **커스텀 필드 제거**
```typescript
const cleanMsg: any = {
  role: msg.role,
  content: msg.content
};
// OpenAI가 예상하는 필드만 포함
if (msg.tool_calls) cleanMsg.tool_calls = msg.tool_calls;
if (msg.tool_call_id) cleanMsg.tool_call_id = msg.tool_call_id;
// id, timestamp 등은 제외
```

## 핵심 설계 원칙

### 1. 서버 주도 구조
- 프론트엔드는 단순히 메시지를 받아서 표시만 함
- 모든 상태 관리와 세션 처리는 서버에서 담당
- useEffect 최소화로 복잡한 상태 동기화 방지

### 2. WebSocket 연결 관리
- 글로벌 WebSocket 인스턴스로 페이지 네비게이션 시에도 연결 유지
- 컴포넌트 재마운트 시 이벤트 핸들러만 재등록
- 연결 재사용 시 서버에 알려 필요한 데이터 재전송

### 3. 메시지 형식 분리
- OpenAI API용 메시지와 UI 표시용 메시지 명확히 구분
- 필터링 로직으로 각 용도에 맞는 메시지만 사용

## 파일 구조

### 프론트엔드
- `/apps/web/src/hooks/useChat.ts` - 채팅 상태 관리
- `/apps/web/src/hooks/useWebSocket.ts` - WebSocket 연결 관리
- `/apps/web/src/components/chat/ChatInterface.tsx` - 채팅 UI

### 백엔드
- `/apps/server/src/websocket/ws-server.ts` - WebSocket 서버
- `/apps/server/src/agent.ts` - OpenAI API 통신 및 메시지 처리
- `/apps/server/src/sessions/` - 세션 저장소

## 디버깅 팁

1. **WebSocket 연결 상태 확인**
   - 브라우저 개발자 도구 Network 탭에서 WS 연결 확인
   - 메시지 송수신 내용 실시간 모니터링

2. **세션 ID 추적**
   - localStorage에서 sessionId 확인
   - 서버 로그에서 동일한 sessionId 사용 여부 확인

3. **메시지 필터링 검증**
   - Agent 클래스의 getOpenAIMessages() 메서드에 로그 추가
   - 필터링 전후 메시지 개수와 내용 비교