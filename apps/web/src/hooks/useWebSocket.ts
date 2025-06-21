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
        console.log('Reusing existing WebSocket connection');
        return;
      }
      
      // Check if already connecting
      if (globalWs && globalWs.readyState === WebSocket.CONNECTING) {
        wsRef.current = globalWs;
        setConnectionState('connecting');
        console.log('WebSocket is already connecting');
        return;
      }
      
      setConnectionState('connecting');
      
      // Get browser timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const locale = navigator.language || 'en-US';
      
      // Add timezone and locale as query parameters
      const wsUrl = new URL(url);
      wsUrl.searchParams.set('tz', timezone);
      wsUrl.searchParams.set('locale', locale);
      
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
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        type,
        ...data,
      };
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const sendChatMessage = useCallback((content: string) => {
    const sessionId = localStorage.getItem('sessionId') || `session-${Date.now()}`;
    return sendMessage('chat', {
      message: content,
      enableTools: true,
      sessionId,
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
    console.log(`WebSocket hook mounted. Connection count: ${connectionCount}`);
    
    connect();
    
    return () => {
      connectionCount--;
      console.log(`WebSocket hook unmounting. Connection count: ${connectionCount}`);
      
      // Don't disconnect on unmount - keep connection alive for navigation
      // Only clear the local reference
      wsRef.current = null;
    };
  }, []); // Run only once on mount

  return {
    isConnected: connectionState === 'connected',
    connectionState,
    messages,
    sendMessage,
    sendChatMessage,
    disconnect,
  };
}