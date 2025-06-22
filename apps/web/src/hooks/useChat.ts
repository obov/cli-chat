import { useState, useCallback, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';
import type { ChatMessage } from '@cli-chatbot/shared';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [needsSessionLoad, setNeedsSessionLoad] = useState(false);

  const handleWebSocketMessage = useCallback((wsMessage: any) => {
    console.log('[useChat] Received WebSocket message:', wsMessage.type, wsMessage);
    switch (wsMessage.type) {
      case 'message':
        // Skip connection messages
        if (wsMessage.content?.includes('Using session:') || 
            wsMessage.content?.includes('Connected to')) {
          return;
        }
        setMessages(prev => {
          const newMessages = [...prev, {
            role: 'assistant',
            content: wsMessage.content || '',
            timestamp: wsMessage.timestamp ? new Date(wsMessage.timestamp).getTime() : Date.now(),
          }];
          console.log('[useChat] Added assistant message. Total messages:', newMessages.length);
          return newMessages;
        });
        break;
        
      case 'system_message':
        setMessages(prev => {
          const newMessages = [...prev, {
            role: 'system',
            content: wsMessage.content || '',
            timestamp: wsMessage.timestamp ? new Date(wsMessage.timestamp).getTime() : Date.now(),
          }];
          console.log('[useChat] Added system message. Total messages:', newMessages.length);
          return newMessages;
        });
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
        
      case 'history':
        // Add historical messages (usually user messages)
        if (wsMessage.history && Array.isArray(wsMessage.history)) {
          console.log('[useChat] Received history with', wsMessage.history.length, 'messages');
          wsMessage.history.forEach((msg: any) => {
            setMessages(prev => {
              const newMessages = [...prev, {
                role: msg.role,
                content: msg.content || '',
                timestamp: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now(),
              }];
              console.log(`[useChat] Added ${msg.role} message from history. Total messages:`, newMessages.length);
              return newMessages;
            });
          });
        }
        break;
        
      case 'session_loaded':
        console.log('Session loaded:', wsMessage.sessionId);
        setSessionLoaded(true);
        break;
        
      case 'connection':
        console.log('[useChat] Received connection event, sessionLoaded:', sessionLoaded);
        // When connection is established, request session if not loaded
        if (!sessionLoaded) {
          const sessionId = localStorage.getItem('sessionId');
          console.log('[useChat] Session not loaded, sessionId:', sessionId);
          if (sessionId) {
            // Clear existing messages before loading
            setMessages([]);
            // Set flag to request session load after WebSocket is ready
            console.log('[useChat] Setting needsSessionLoad flag');
            setNeedsSessionLoad(true);
          }
        }
        break;
    }
  }, [sessionLoaded]);

  // Use relative URL to leverage Vite proxy
  const wsUrl = window.location.protocol === 'https:' 
    ? `wss://${window.location.host}/ws`
    : `ws://${window.location.host}/ws`;
    
  const { isConnected, connectionState, sendMessage: wsSendMessage, sendChatMessage } = useWebSocket(wsUrl, {
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

  // Debug messages state changes
  useEffect(() => {
    console.log('[useChat] Messages state updated:', messages.length, 'messages');
    if (messages.length > 0) {
      console.log('[useChat] First message:', messages[0]);
      console.log('[useChat] Last message:', messages[messages.length - 1]);
    }
  }, [messages]);

  // Load session when component mounts and WebSocket is connected
  useEffect(() => {
    console.log('[useChat] Component mounted, isConnected:', isConnected);
    setSessionLoaded(false);
    setMessages([]); // Clear messages on mount to ensure fresh load
    
    // Request session load if WebSocket is connected
    if (isConnected) {
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        console.log('[useChat] Requesting session load:', sessionId);
        wsSendMessage('loadSession', { sessionId });
      }
    }
    
    // Clean up on unmount
    return () => {
      console.log('[useChat] Component unmounting');
      setSessionLoaded(false);
    };
  }, []); // Run only on mount
  
  // Request session load when needsSessionLoad flag is set
  useEffect(() => {
    if (needsSessionLoad && wsSendMessage) {
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        console.log('[useChat] Sending deferred session load request:', sessionId);
        wsSendMessage('loadSession', { sessionId });
        setNeedsSessionLoad(false);
      }
    }
  }, [needsSessionLoad, wsSendMessage]);
  
  // Also request session load when connection state changes to connected
  useEffect(() => {
    if (isConnected && !sessionLoaded && wsSendMessage) {
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        console.log('[useChat] WebSocket connected, requesting session load:', sessionId);
        wsSendMessage('loadSession', { sessionId });
      }
    }
  }, [isConnected, sessionLoaded, wsSendMessage]);

  return {
    messages,
    isConnected,
    connectionState,
    isStreaming,
    sendMessage,
    clearMessages,
  };
}