import { useEffect, useState, useCallback, useRef } from 'react';

interface UseWebSocketOptions {
  onMessage?: (message: any) => void;
  reconnectDelay?: number;
}

// Global WebSocket instance to prevent multiple connections
let globalWs: WebSocket | null = null;
let connectionCount = 0;

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected';

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const { onMessage, reconnectDelay = 3000 } = options;
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [messages, setMessages] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = () => {
    
    try {
      // Reuse existing connection if available
      if (globalWs && globalWs.readyState === WebSocket.OPEN) {
        wsRef.current = globalWs;
        setConnectionState('connected');
        
        // Re-register message handler for the reused connection
        if (onMessage) {
          globalWs.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              setMessages(prev => [...prev, message]);
              onMessage(message);
            } catch (error) {
              console.error('Failed to parse WebSocket message:', error);
            }
          };
        }
        
        // Send reconnect message to server to reload session history
        globalWs.send(JSON.stringify({ type: 'reconnect' }));
        
        return;
      }
      
      // Check if already connecting
      if (globalWs && globalWs.readyState === WebSocket.CONNECTING) {
        wsRef.current = globalWs;
        setConnectionState('connecting');
        console.log('WebSocket is already connecting');
        return;
      }
      
      // If WebSocket exists but is closed, clear it
      if (globalWs && globalWs.readyState === WebSocket.CLOSED) {
        globalWs = null;
      }
      
      setConnectionState('connecting');
      
      // Get browser timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const locale = navigator.language || 'en-US';
      
      // Get session ID from localStorage
      const sessionId = localStorage.getItem('sessionId') || `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      
      // Save session ID if it's new
      if (!localStorage.getItem('sessionId')) {
        localStorage.setItem('sessionId', sessionId);
      }
      
      // Add parameters as query strings
      const wsUrl = new URL(url);
      wsUrl.searchParams.set('tz', timezone);
      wsUrl.searchParams.set('locale', locale);
      wsUrl.searchParams.set('sessionId', sessionId);
      
      const ws = new WebSocket(wsUrl.toString());
      globalWs = ws;
      
      ws.onopen = () => {
        setConnectionState('connected');
        console.log('WebSocket connected to:', url);
        console.log('WebSocket readyState:', ws.readyState);
        
        // Clear any pending reconnect
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        // Session history is now automatically loaded by the server
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setMessages(prev => [...prev, message]);
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionState('disconnected');
      };

      ws.onclose = (event) => {
        setConnectionState('disconnected');
        wsRef.current = null;
        globalWs = null;
        console.log('WebSocket closed. Code:', event.code, 'Reason:', event.reason);
        
        // Attempt to reconnect only if not a normal closure
        if (event.code !== 1000) {
          setConnectionState('connecting');
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connect();
          }, reconnectDelay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setConnectionState('disconnected');
    }
  };

  const sendMessage = useCallback((type: string, data: any) => {
    console.log('[useWebSocket] Attempting to send message:', type, data);
    console.log('[useWebSocket] WebSocket state:', wsRef.current?.readyState, 'OPEN=', WebSocket.OPEN);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        type,
        ...data,
      };
      console.log('[useWebSocket] Sending message:', message);
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    console.log('[useWebSocket] Cannot send - WebSocket not open');
    return false;
  }, []);

  const sendChatMessage = useCallback((content: string) => {
    return sendMessage('chat', {
      message: content,
      enableTools: true
    });
  }, [sendMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
    setConnectionState('disconnected');
  }, []);

  useEffect(() => {
    connectionCount++;
    
    connect();
    
    return () => {
      connectionCount--;
      
      // Don't disconnect on unmount - keep connection alive for navigation
      // Only clear the local reference
      wsRef.current = null;
    };
  }, []); // Run only once on mount
  
  // Update message handler when onMessage changes
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && onMessage) {
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setMessages(prev => [...prev, message]);
          onMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
    }
  }, [onMessage]);

  return {
    isConnected: connectionState === 'connected',
    connectionState,
    messages,
    sendMessage,
    sendChatMessage,
    disconnect,
  };
}