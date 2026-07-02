import { useRef, useEffect, useCallback, useState } from "react";

export const useGlobalWebsocket = ({
  token,
  WS_BASE_URI,
  heartbeatInterval = 20000,
  onMessage,
}) => {
  const wsRef = useRef(null);

  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  const isUnmountedRef = useRef(false);

  const pingIntervalRef = useRef(null);
  const healthCheckRef = useRef(null);

  const onMessageRef = useRef(onMessage);
  const lastPongRef = useRef(Date.now());

  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const getReconnectDelay = useCallback(() => {
    const base = 1000;
    const max = 15000;
    return Math.min(base * 2 ** reconnectAttemptsRef.current, max);
  }, []);

  const cleanupIntervals = () => {
    clearInterval(pingIntervalRef.current);
    clearInterval(healthCheckRef.current);

    pingIntervalRef.current = null;
    healthCheckRef.current = null;
  };

  const setupWebSocket = useCallback(() => {
    if (!token) return;

    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const ws = new WebSocket(
      `${WS_BASE_URI}/api/v1/ws/global?token=${token}`
    );

    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to global WS");

      setIsConnected(true);

      reconnectAttemptsRef.current = 0;

      lastPongRef.current = Date.now();

      pingIntervalRef.current = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "ping" }));
        }
      }, heartbeatInterval);

      healthCheckRef.current = setInterval(() => {
        const diff = Date.now() - lastPongRef.current;

        if (diff > 60000) {
          console.warn("No pong detected → closing socket");
          wsRef.current?.close();
        }
      }, 5000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "pong") {
          lastPongRef.current = Date.now();
          console.log("PONG received");
          return;
        }

        onMessageRef.current?.(data);
      } catch (err) {
        console.warn("Failed to parse WS message:", err);
      }
    };

    ws.onclose = (event) => {
      if (isUnmountedRef.current) return;
      if (wsRef.current !== ws) return;

      console.log("Disconnected:", event.reason);

      setIsConnected(false);

      cleanupIntervals();

      const delay = getReconnectDelay();

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttemptsRef.current += 1;
        setupWebSocket();
      }, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [token, WS_BASE_URI, heartbeatInterval, getReconnectDelay]);

  useEffect(() => {
    isUnmountedRef.current = false;

    if (token) {
      setupWebSocket();
    }

    return () => {
      isUnmountedRef.current = true;

      setIsConnected(false);

      clearTimeout(reconnectTimeoutRef.current);

      cleanupIntervals();

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [token, setupWebSocket]);

  const send = useCallback((payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
      return true;
    }

    console.warn("WebSocket not connected");
    return false;
  }, []);

  return {
    wsRef,
    send,
    isConnected,
  };
};