# 축약 명령어 가이드

## NPM Scripts 방식

```bash
# 기본 OpenAI
bun run o

# OpenAI + 모든 기능 (도구, 스트리밍, 저장)
bun run oa

# OpenAI + 스트리밍
bun run os

# OpenAI + 도구
bun run ot
```

## 짧은 플래그 사용

```bash
# 모든 기능 활성화
bun run dev chat -m openai -a

# 개별 옵션
bun run dev chat -m openai -t -s   # 도구 + 스트리밍
```

## Bash 스크립트 사용

```bash
# 실행 권한 부여 (처음 한번만)
chmod +x scripts/chat.sh

# 사용
./scripts/chat.sh o     # OpenAI 기본
./scripts/chat.sh oa    # OpenAI 모든 기능
./scripts/chat.sh os    # OpenAI 스트리밍
./scripts/chat.sh ot    # OpenAI 도구
```

## 별칭 설정 (선택사항)

~/.bashrc 또는 ~/.zshrc에 추가:

```bash
alias chat="bun run dev chat"
alias chato="bun run dev chat -m openai"
alias chatoa="bun run dev chat -m openai -a"
```

그 후:
```bash
source ~/.bashrc  # 또는 source ~/.zshrc

# 사용
chato      # OpenAI 모드
chatoa     # 모든 기능