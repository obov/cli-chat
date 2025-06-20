#!/bin/bash

# Quick launch scripts for common modes

case "$1" in
  "o"|"openai")
    bun run dev chat --mode openai "${@:2}"
    ;;
  "a"|"agent")
    bun run dev chat --mode agent --tools "${@:2}"
    ;;
  "oa"|"openai-all")
    bun run dev chat --mode openai --all
    ;;
  "os"|"openai-stream")
    bun run dev chat --mode openai --stream "${@:2}"
    ;;
  "ot"|"openai-tools")
    bun run dev chat --mode openai --tools "${@:2}"
    ;;
  *)
    echo "Usage: ./chat.sh [mode] [options]"
    echo ""
    echo "Modes:"
    echo "  o, openai       - OpenAI mode"
    echo "  a, agent        - Agent mode with tools"
    echo "  oa, openai-all  - OpenAI with all features"
    echo "  os, openai-stream - OpenAI with streaming"
    echo "  ot, openai-tools  - OpenAI with tools"
    echo ""
    echo "Examples:"
    echo "  ./chat.sh o          # Basic OpenAI"
    echo "  ./chat.sh oa         # OpenAI with everything"
    echo "  ./chat.sh os --tools # OpenAI streaming + tools"
    ;;
esac