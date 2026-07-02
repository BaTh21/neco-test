import { useRef, useEffect, useCallback } from "react";

export const useGroupWebsocket = ({ groupId, token, WS_BASE_URI, heartbeatInterval = 20000 }) => {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const isUnmountedRef = useRef(false);
  const heartbeatRef = useRef(null);

  const getReconnectDelay = useCallback(() => {
    const base = 1000; // 1s
    const max = 15000; // 15s
    return Math.min(base * 2 ** reconnectAttemptsRef.current, max);
  }, []);

  const setupWebSocket = useCallback(() => {
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const wsUrl = `${WS_BASE_URI}/api/v1/ws/group/${groupId}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to group chat");
      reconnectAttemptsRef.current = 0;

      heartbeatRef.current = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ action: "ping" }));
        }
      }, heartbeatInterval);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.action === "ping") {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ action: "pong" }));
          }
        }
      } catch (err) {
        console.warn("Failed to parse WS message:", err);
      }
    };

    ws.onclose = (event) => {
      if (isUnmountedRef.current) return;
      console.log("Disconnected from group chat:", event.reason);

      clearInterval(heartbeatRef.current);

      if (!isUnmountedRef.current) {
        const delay = getReconnectDelay();
        console.log(`Reconnecting in ${delay}ms...`);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current += 1;
          setupWebSocket();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.log("WebSocket error", error);
    };
  }, [groupId, token, WS_BASE_URI, getReconnectDelay, heartbeatInterval]);

  useEffect(() => {
    isUnmountedRef.current = false;
    setupWebSocket();

    return () => {
      isUnmountedRef.current = true;
      clearTimeout(reconnectTimeoutRef.current);
      clearInterval(heartbeatRef.current);
      wsRef.current?.close();
    };
  }, [setupWebSocket]);

  return wsRef;
};