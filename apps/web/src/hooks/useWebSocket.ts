import { useEffect, useState, useCallback, useRef } from 'react';

interface UseWebSocketOptions {
  onMessage?: (message: any) => void;
  reconnectDelay?: number;
}

// Global WebSocket instance to prevent multiple connections
let globalWs: WebSocket | null = null;
let connectionCount = 0;

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const { onMessage, reconnectDelay = 3000 } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = () => {
    try {
      // Reuse existing connection if available
      if (globalWs && globalWs.readyState === WebSocket.OPEN) {
        wsRef.current = globalWs;
        setIsConnected(true);
        console.log('Reusing existing WebSocket connection');
        return;
      }
      
      const ws = new WebSocket(url);
      globalWs = ws;
      
      ws.onopen = () => {
        setIsConnected(true);
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
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        wsRef.current = null;
        globalWs = null;
        console.log('WebSocket closed. Code:', event.code, 'Reason:', event.reason);
        
        // Attempt to reconnect only if not a normal closure
        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connect();
          }, reconnectDelay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setIsConnected(false);
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
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connectionCount++;
    console.log(`WebSocket hook mounted. Connection count: ${connectionCount}`);
    
    connect();
    
    return () => {
      connectionCount--;
      console.log(`WebSocket hook unmounting. Connection count: ${connectionCount}`);
      
      // Only disconnect if this is the last component using the connection
      if (connectionCount === 0 && wsRef.current?.readyState === WebSocket.OPEN) {
        disconnect();
      }
    };
  }, []); // Run only once on mount

  return {
    isConnected,
    messages,
    sendMessage,
    sendChatMessage,
    disconnect,
  };
}