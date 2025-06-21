# Tool Calling 추상화 구현 여정

이 문서는 CLI 챗봇 프로젝트에서 Tool Calling 기능을 추상화하는 과정을 상세히 기록합니다. 시행착오와 해결 과정을 포함하여, 누구나 이와 유사한 작업을 수행할 수 있도록 안내합니다.

## 목차
1. [프로젝트 배경](#프로젝트-배경)
2. [초기 구현 (Phase 1-3)](#초기-구현-phase-1-3)
3. [Tool Calling 문제 해결](#tool-calling-문제-해결)
4. [추상화 필요성 인식](#추상화-필요성-인식)
5. [MCP 조사 및 분석](#mcp-조사-및-분석)
6. [추상화 구현](#추상화-구현)
7. [핵심 교훈](#핵심-교훈)

## 프로젝트 배경

### 목표
Bun 런타임을 사용하여 단계별 CLI 챗봇 구축:
1. Echo bot → OpenAI SDK responses → OpenAI agent SDK

### 기술 스택
- **런타임**: Bun (Node.js 대신 선택)
- **언어**: TypeScript
- **주요 라이브러리**: OpenAI SDK, Commander.js
- **테스트**: Bun 내장 테스트 러너

## 초기 구현 (Phase 1-3)

### Phase 1: Echo Bot
```typescript
// 기본 echo bot 구현
export class ChatBot {
  async getResponse(userInput: string): Promise<string> {
    return userInput; // 단순 echo
  }
}
```

### Phase 2: OpenAI 통합
```typescript
// OpenAI API 통합
if (mode === "openai") {
  const completion = await this.openai.chat.completions.create({
    model: config.openai.model,
    messages: this.messages,
  });
}
```

### Phase 3: Agent 구현 시도
**첫 번째 시행착오**: OpenAI Agents API가 Python 전용임을 발견
- 해결책: Function Calling을 사용한 커스텀 Agent 구현

## Tool Calling 문제 해결

### 문제 1: 도구가 호출되지 않음
**증상**: 날씨를 물어봐도 "실시간 정보 제공 불가" 응답

**원인 분석**:
```typescript
// 문제가 된 설정
model: process.env.OPENAI_MODEL || "gpt-4.1-nano", // 이 모델은 tool calling 미지원
```

**해결책**:
```typescript
model: process.env.OPENAI_MODEL || "gpt-4o-mini", // tool calling 지원 모델로 변경
```

### 문제 2: OpenAI API 스키마 검증 오류
**에러 메시지**:
```
400 Invalid schema for function 'get_current_time': 
In context=(), 'required' is required to be supplied and to be an array 
including every key in properties. Missing 'timezone'.
```

**원인**: 
- `strict: true` 옵션 사용 시 모든 필드가 required 배열에 포함되어야 함
- 하지만 timezone은 optional 필드여야 함

**해결책**:
```typescript
// Before
{
  strict: true,  // 제거
  parameters: {
    properties: {
      timezone: { ... }  // optional 필드
    },
    required: []  // 빈 배열
  }
}

// After
{
  // strict 제거
  parameters: {
    properties: {
      timezone: { ... }
    },
    required: [],  // optional 필드는 required에 포함하지 않음
    additionalProperties: false
  }
}
```

### 문제 3: 기본값 처리
**발견**: 위치 정보 없이도 날씨 정보가 반환됨

**코드 분석**:
```typescript
const location = args.location?.toLowerCase() || 'here'; // 기본값 'here'
```

**디버깅 추가**:
```typescript
console.log('[TOOL DEBUG] get_weather called with args:', args);
```

## 추상화 필요성 인식

### 동기
1. 다양한 LLM Provider 지원 필요 (OpenAI, Anthropic, Google 등)
2. MCP (Model Context Protocol) 통합 준비
3. 코드 재사용성 및 유지보수성 향상

### 요구사항
- 기존 코드와 100% 호환성 유지
- Provider별 스키마 차이 처리
- 통합된 에러 처리

## MCP 조사 및 분석

### MCP 핵심 특징
```typescript
// MCP Tool 정의
interface Tool {
  name: string;
  description?: string;
  inputSchema: {
    type: "object";
    properties?: { [key: string]: object };
    required?: string[];
  };
  annotations?: ToolAnnotations;
}
```

### OpenAI vs MCP 스키마 비교
```typescript
// OpenAI 형식
{
  type: 'function',
  function: {
    name: string,
    description: string,
    parameters: {...}
  }
}

// MCP 형식
{
  name: string,
  description?: string,
  inputSchema: {...},
  annotations?: {...}
}
```

## 추상화 구현

### 1. ToolManager 클래스 설계
```typescript
// src/tool-manager.ts
export class ToolManager {
  private tools: Map<string, BaseTool> = new Map();
  private executors: Map<string, ToolExecutor> = new Map();

  registerTool(tool: BaseTool, executor: ToolExecutor): void {
    this.tools.set(tool.name, tool);
    this.executors.set(tool.name, executor);
  }

  async executeTool(name: string, args: any): Promise<ToolResult> {
    const executor = this.executors.get(name);
    if (!executor) {
      return { success: false, error: `Unknown tool: ${name}` };
    }

    try {
      const result = await executor(args);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getToolsForProvider(provider: 'openai'): any[] {
    // Provider별 스키마 변환
    if (provider === 'openai') {
      return this.getAllTools().map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));
    }
    return [];
  }
}
```

### 2. 기존 도구 마이그레이션
```typescript
// tools.ts 리팩토링
import { defaultToolManager } from './tool-manager';

// 도구 등록
defaultToolManager.registerTool(
  {
    name: 'get_weather',
    description: 'Get the current weather',
    parameters: { /* ... */ }
  },
  async (args: any) => {
    // 실행 로직
    return `Weather in ${args.location}: ...`;
  }
);

// 백워드 호환성 유지
export const availableTools = defaultToolManager.getToolsForProvider('openai');
export async function executeToolCall(name: string, args: any) {
  const result = await defaultToolManager.executeTool(name, args);
  return result.success ? result.data : result.error;
}
```

### 3. 구현 과정의 핵심 결정사항

#### a. 백워드 호환성 우선
- 기존 `chatbot.ts`와 `agent.ts` 수정 불필요
- Export 이름과 함수 시그니처 유지

#### b. 점진적 마이그레이션
- 먼저 간단한 버전 구현
- 테스트 통과 확인 후 고급 기능 추가

#### c. 명확한 책임 분리
- ToolManager: 도구 관리 및 실행
- tools.ts: 도구 정의 및 구현
- Provider Adapter: 스키마 변환 (향후 구현)

## 핵심 교훈

### 1. 디버깅의 중요성
```typescript
console.log('[TOOL DEBUG] get_weather called with args:', args);
```
- 문제 파악을 위한 로깅 추가
- 실제 동작 확인

### 2. API 문서 정확히 읽기
- OpenAI의 `strict` 모드 제약사항 이해
- 모델별 기능 지원 여부 확인

### 3. 점진적 리팩토링
- 한 번에 모든 것을 바꾸지 않기
- 각 단계마다 테스트 실행
- 백워드 호환성 유지

### 4. 추상화 수준 결정
- 너무 일찍 추상화하지 않기
- 실제 필요가 생겼을 때 구현
- YAGNI (You Aren't Gonna Need It) 원칙

## 다음 단계 (발전된 버전)

### 계획된 개선사항
1. **MCP 어댑터 구현**
   ```typescript
   class MCPAdapter extends ProviderAdapter {
     toProviderFormat(tool: UniversalTool): MCPTool
     fromProviderResult(result: any): ToolResult
   }
   ```

2. **동적 도구 발견**
   ```typescript
   class MCPClient {
     async discoverTools(): Promise<UniversalTool[]>
   }
   ```

3. **스트리밍 지원 개선**
   - 도구 실행 진행상황 실시간 전달

4. **배치 실행**
   - 여러 도구 병렬 실행

## 실제 사용 예시

### 도구 추가하기
```typescript
// 새로운 도구 추가
defaultToolManager.registerTool(
  {
    name: 'search_web',
    description: 'Search the web for information',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query'
        }
      },
      required: ['query']
    }
  },
  async (args) => {
    // 웹 검색 로직 구현
    return `Search results for: ${args.query}`;
  }
);
```

### Provider 추가하기 (향후)
```typescript
class AnthropicAdapter extends ProviderAdapter {
  toProviderFormat(tool: UniversalTool) {
    return {
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema
    };
  }
}
```

## 결론

이 여정을 통해 배운 가장 중요한 점은 **문제를 작은 단위로 나누고, 각 단계마다 검증하며, 기존 시스템과의 호환성을 유지하는 것**입니다. 추상화는 강력한 도구이지만, 적절한 시점에 적절한 수준으로 적용해야 합니다.

### 체크리스트
- [ ] 현재 시스템의 제약사항 파악
- [ ] 명확한 목표 설정
- [ ] 백워드 호환성 계획
- [ ] 점진적 마이그레이션 전략
- [ ] 각 단계별 테스트
- [ ] 디버깅을 위한 로깅
- [ ] 문서화

이 가이드를 따라 유사한 추상화 작업을 수행할 수 있으며, 각자의 상황에 맞게 조정하여 사용할 수 있습니다.