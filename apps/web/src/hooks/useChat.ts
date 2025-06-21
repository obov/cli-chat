import { useState, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import type { ChatMessage } from '@cli-chatbot/shared';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const handleWebSocketMessage = useCallback((wsMessage: any) => {
    switch (wsMessage.type) {
      case 'message':
        // Skip connection messages
        if (wsMessage.content?.includes('Using session:') || 
            wsMessage.content?.includes('Connected to')) {
          return;
        }
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: wsMessage.content || '',
          timestamp: Date.now(),
        }]);
        break;
        
      case 'token':
        setIsStreaming(true);
        // Update the last message if it's from assistant
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            return [
              ...prev.slice(0, -1),
              { ...lastMessage, content: lastMessage.content + wsMessage.content }
            ];
          } else {
            return [...prev, {
              role: 'assistant',
              content: wsMessage.content || '',
              timestamp: Date.now(),
            }];
          }
        });
        // Auto-stop streaming after no activity
        clearTimeout((window as any).streamTimeout);
        (window as any).streamTimeout = setTimeout(() => setIsStreaming(false), 1000);
        break;

      case 'tool_call':
        setMessages(prev => [...prev, {
          role: 'system',
          content: `🔧 Calling tool: ${wsMessage.tool}`,
          timestamp: Date.now(),
        }]);
        break;
        
      case 'tool_progress':
        setMessages(prev => [...prev, {
          role: 'system',
          content: `⏳ ${wsMessage.tool}: ${wsMessage.content}`,
          timestamp: Date.now(),
        }]);
        break;

      case 'tool_result':
        setMessages(prev => [...prev, {
          role: 'system',
          content: `✅ Tool result: ${JSON.stringify(wsMessage.result)}`,
          timestamp: Date.now(),
        }]);
        break;

      case 'error':
        setMessages(prev => [...prev, {
          role: 'system',
          content: `❌ Error: ${wsMessage.error}`,
          timestamp: Date.now(),
        }]);
        break;
        
      case 'done':
      case 'complete':
        setIsStreaming(false);
        break;
    }
  }, []);

  // Use relative URL to leverage Vite proxy
  const wsUrl = window.location.protocol === 'https:' 
    ? `wss://${window.location.host}/ws`
    : `ws://${window.location.host}/ws`;
    
  const { isConnected, connectionState, sendChatMessage } = useWebSocket(wsUrl, {
    onMessage: handleWebSocketMessage,
  });

  const sendMessage = useCallback((content: string) => {
    if (!content.trim()) return false;

    // Add user message immediately
    const userMessage: ChatMessage = {
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Send via WebSocket
    return sendChatMessage(content);
  }, [sendChatMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isConnected,
    connectionState,
    isStreaming,
    sendMessage,
    clearMessages,
  };
}