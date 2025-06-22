import { useState, useCallback, useEffect } from 'react';
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
          timestamp: wsMessage.timestamp ? new Date(wsMessage.timestamp).getTime() : Date.now(),
          id: wsMessage.id,
        }]);
        break;
        
      case 'system_message':
        setMessages(prev => [...prev, {
          role: 'system',
          content: wsMessage.content || '',
          timestamp: wsMessage.timestamp ? new Date(wsMessage.timestamp).getTime() : Date.now(),
          id: wsMessage.id,
        }]);
        break;
        
      case 'token':
        setIsStreaming(true);
        // Update the last message if it's from assistant
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.role === 'assistant' && !lastMessage.id) {
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
          id: wsMessage.id,
        }]);
        break;
        
      case 'tool_progress':
        setMessages(prev => [...prev, {
          role: 'system',
          content: `⏳ ${wsMessage.tool}: ${wsMessage.content}`,
          timestamp: Date.now(),
          id: wsMessage.id,
        }]);
        break;

      case 'tool_result':
        setMessages(prev => [...prev, {
          role: 'system',
          content: `✅ Tool result: ${JSON.stringify(wsMessage.result)}`,
          timestamp: Date.now(),
          id: wsMessage.id,
        }]);
        break;

      case 'error':
        setMessages(prev => [...prev, {
          role: 'system',
          content: `❌ Error: ${wsMessage.error}`,
          timestamp: Date.now(),
          id: wsMessage.id,
        }]);
        break;
        
      case 'done':
      case 'complete':
        setIsStreaming(false);
        break;
        
      case 'history':
        // Add historical messages with IDs to prevent duplicates
        if (wsMessage.messages && Array.isArray(wsMessage.messages)) {
          setMessages(prev => {
            const existingIds = new Set(prev.filter(m => m.id).map(m => m.id));
            const newMessages = wsMessage.messages.filter((msg: any) => 
              !msg.id || !existingIds.has(msg.id)
            ).map((msg: any) => ({
              role: msg.role,
              content: msg.content || '',
              timestamp: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now(),
              id: msg.id,
            }));
            return [...prev, ...newMessages];
          });
        }
        break;
        
      case 'clear_history':
        // Clear all messages when server says to
        setMessages([]);
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