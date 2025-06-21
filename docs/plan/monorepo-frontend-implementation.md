# Monorepo 구조 전환 및 React 프론트엔드 추가 구현 계획

## 개요
기존 CLI 챗봇 프로젝트를 Monorepo 구조로 전환하고, React 기반 웹 프론트엔드를 추가하여 WebSocket을 통한 실시간 채팅 인터페이스를 구현합니다.

## Phase 1: Monorepo 구조 전환

### 1.1 디렉토리 구조 재구성
```bash
cli-chatbot/
├── apps/
│   ├── cli/          # 기존 CLI 코드 이동
│   ├── server/       # 기존 서버 코드 이동
│   └── web/          # 새로운 React 앱
├── packages/
│   └── shared/       # 공통 타입, 유틸리티
├── package.json      # Root workspace 설정
├── bun.lockb
└── tsconfig.json     # 공통 TypeScript 설정
```

### 1.2 Root Package.json 설정
```json
{
  "name": "cli-chatbot-monorepo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "run-p dev:*",
    "dev:cli": "bun run --filter cli dev",
    "dev:server": "bun run --filter server dev",
    "dev:web": "bun run --filter web dev",
    "build": "bun run --filter '*' build"
  }
}
```

### 1.3 기존 코드 이동
- `src/` → `apps/cli/src/`
- `src/server/` → `apps/server/src/`
- `src/shared/` → `packages/shared/src/`
- 각 앱별 독립적인 package.json 생성

## Phase 2: 공통 패키지 구성

### 2.1 Shared 패키지 생성
```
packages/shared/
├── src/
│   ├── types/
│   │   ├── message.ts    # 메시지 타입
│   │   ├── tool.ts       # Tool 인터페이스
│   │   └── websocket.ts  # WebSocket 이벤트 타입
│   └── utils/
│       └── format.ts     # 공통 포맷팅 함수
├── package.json
└── tsconfig.json
```

### 2.2 타입 정의 예시
```typescript
// packages/shared/src/types/websocket.ts
export interface WebSocketMessage {
  type: 'chat' | 'tool_call' | 'tool_result' | 'error';
  payload: any;
  timestamp: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}
```

## Phase 3: React 웹 앱 생성 (Data Mode)

### 3.1 기본 구조 설정
```
apps/web/
├── src/
│   ├── routes/
│   │   ├── _layout.tsx     # 공통 레이아웃
│   │   ├── _index.tsx      # 채팅 메인
│   │   ├── settings.tsx    # 설정 페이지
│   │   └── history.tsx     # 대화 기록
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageItem.tsx
│   │   │   └── InputBox.tsx
│   │   └── common/
│   │       ├── Header.tsx
│   │       └── Sidebar.tsx
│   ├── hooks/
│   │   ├── useWebSocket.ts
│   │   └── useChat.ts
│   ├── lib/
│   │   └── api.ts          # API 클라이언트
│   ├── router.tsx          # React Router 설정
│   ├── main.tsx
│   └── index.css
├── public/
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

### 3.2 React Router v7 Data Mode 설정
```typescript
// apps/web/src/router.tsx
import { createBrowserRouter } from 'react-router-dom';
import RootLayout from './routes/_layout';
import ChatPage from './routes/_index';
import SettingsPage from './routes/settings';
import HistoryPage from './routes/history';
import { api } from './lib/api';

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <ChatPage />,
        loader: async () => {
          // 초기 설정 및 세션 정보 로드
          return { 
            session: await api.getSession(),
            tools: await api.getTools()
          };
        },
      },
      {
        path: "settings",
        element: <SettingsPage />,
        action: async ({ request }) => {
          const formData = await request.formData();
          return api.updateSettings(formData);
        },
      },
      {
        path: "history",
        element: <HistoryPage />,
        loader: async ({ params }) => {
          return api.getChatHistory(params.sessionId);
        },
      }
    ]
  }
]);
```

### 3.3 WebSocket Hook 구현
```typescript
// apps/web/src/hooks/useWebSocket.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import type { WebSocketMessage } from '@cli-chatbot/shared/types';

export function useWebSocket(url: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as WebSocketMessage;
      setMessages(prev => [...prev, message]);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      setIsConnected(false);
      // 재연결 로직
      setTimeout(connect, 3000);
    };

    wsRef.current = ws;
  }, [url]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return { isConnected, messages, sendMessage };
}
```

## Phase 4: 스타일링 및 UI 구성

### 4.1 Tailwind CSS 설정
```javascript
// apps/web/tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        secondary: '#10B981',
      }
    },
  },
  plugins: [],
}
```

### 4.2 주요 컴포넌트 예시
```typescript
// apps/web/src/components/chat/ChatInterface.tsx
import { useState } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import MessageList from './MessageList';
import InputBox from './InputBox';

export default function ChatInterface() {
  const { isConnected, messages, sendMessage } = useWebSocket('ws://localhost:3000');
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && isConnected) {
      sendMessage({
        type: 'chat',
        payload: { content: input, role: 'user' },
        timestamp: Date.now()
      });
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} />
      </div>
      <div className="border-t p-4">
        <InputBox 
          value={input}
          onChange={setInput}
          onSend={handleSend}
          disabled={!isConnected}
        />
      </div>
      {!isConnected && (
        <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded">
          Disconnected
        </div>
      )}
    </div>
  );
}
```

## Phase 5: 개발 환경 통합

### 5.1 개발 스크립트 설정
```json
// Root package.json
{
  "scripts": {
    "dev": "run-p dev:*",
    "dev:server": "cd apps/server && bun run dev",
    "dev:web": "cd apps/web && npm run dev",
    "build": "bun run --filter '*' build",
    "clean": "rm -rf apps/*/dist packages/*/dist"
  }
}
```

### 5.2 환경 변수 관리
```bash
# apps/web/.env.example
VITE_WS_URL=ws://localhost:3000
VITE_API_URL=http://localhost:3000/api

# apps/server/.env.example
PORT=3000
NODE_ENV=development
OPENAI_API_KEY=your-key-here
```

## 구현 순서 요약

1. **Monorepo 구조 전환**: 기존 코드를 apps 폴더로 재구성
2. **공통 패키지 생성**: 타입 및 유틸리티 공유
3. **React 앱 생성**: React Router v7 Data Mode로 구성
4. **WebSocket 통합**: 실시간 채팅 기능 구현
5. **UI 구성**: Tailwind CSS로 스타일링
6. **개발 환경**: 동시 실행 스크립트 설정

## 기술 스택

- **Monorepo**: Bun workspaces
- **Frontend**: React 18 + React Router v7 (Data Mode)
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **State Management**: React hooks + Context API
- **WebSocket**: 네이티브 WebSocket API
- **TypeScript**: 전체 프로젝트에서 사용

## 주의사항

- WebSocket 재연결 로직 필수
- CORS 설정 확인 (서버 측)
- 타입 공유를 통한 타입 안전성 확보
- 환경 변수로 URL 관리

## 예상 소요 시간

- Phase 1-2: ~30분
- Phase 3: ~45분
- Phase 4: ~1시간
- Phase 5: ~15분

총 예상 시간: 약 2시간 30분