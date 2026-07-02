import { useCallback, useEffect, useRef, useState } from "react";

export const useWebSocket = (url, options = {}) => {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    onReconnect,
    shouldReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
    debug = false,
  } = options;

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const isSubscribedRef = useRef(true);

  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);
  const onReconnectRef = useRef(onReconnect);

  const [readyState, setReadyState] = useState(WebSocket.CONNECTING);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
    onErrorRef.current = onError;
    onReconnectRef.current = onReconnect;
  }, [onOpen, onClose, onError, onReconnect]);

  const log = useCallback(
    (message, data) => {
      if (debug) {
        console.log(`[WebSocket] ${message}`, data ?? "");
      }
    },
    [debug]
  );

  const connect = useCallback(() => {
    if (!url || !isSubscribedRef.current) return;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      console.log("Connecting to:", url);
      const ws = new WebSocket(url);
      wsRef.current = ws;
      setReadyState(WebSocket.CONNECTING);

      ws.onopen = () => {
        console.log("Connected");
        setReadyState(WebSocket.OPEN);
        reconnectAttemptsRef.current = 0;
        setReconnectAttempts(0);

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        if (heartbeatInterval > 0) {
          heartbeatIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({ type: "heartbeat", timestamp: Date.now() })
              );
            }
          }, heartbeatInterval);
        }

        onOpenRef.current?.();
      };

      ws.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          console.error("[WS] Invalid JSON:", event.data);
          return;
        }

        console.log("[WS] Received message:", data);

        if (data.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
          return;
        }

        onMessageRef.current?.(data);
      };

      ws.onclose = (event) => {
        console.log("Closed:", event.code, event.reason);
        setReadyState(WebSocket.CLOSED);

        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        onCloseRef.current?.(event);

        if (
          isSubscribedRef.current &&
          shouldReconnect &&
          event.code !== 1000
        ) {
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay =
              reconnectInterval *
              Math.pow(2, reconnectAttemptsRef.current);

            reconnectAttemptsRef.current += 1;
            setReconnectAttempts(reconnectAttemptsRef.current);

            console.log(
              `Reconnecting in ${delay}ms (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
            );

            reconnectTimeoutRef.current = setTimeout(() => {
              onReconnectRef.current?.(reconnectAttemptsRef.current);
              connect();
            }, delay);
          } else {
            console.log("Max reconnect attempts reached");
            onErrorRef.current?.(
              new Error("Max WebSocket reconnection attempts reached")
            );
          }
        }
      };

      ws.onerror = (error) => {
        console.log("Socket error:", error);
      };
    } catch (err) {
      console.error("WebSocket connection failed:", err);
      setReadyState(WebSocket.CLOSED);
      onErrorRef.current?.(err);
    }
  }, [
    url,
    shouldReconnect,
    reconnectInterval,
    maxReconnectAttempts,
    heartbeatInterval,
    log,
  ]);

  const sendMessage = useCallback(
    (message) => {
      if (!isSubscribedRef.current) return false;

      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(message));
          log("Sent:", message);
          return true;
        } catch (err) {
          console.error("Send failed:", err);
          return false;
        }
      }

      log("Send failed — socket not open");
      return false;
    },
    [log]
  );

  const closeConnection = useCallback(
    (code = 1000, reason = "Normal closure") => {
      isSubscribedRef.current = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      if (wsRef.current) {
        if (wsRef.current.readyState <= WebSocket.OPEN) {
          wsRef.current.close(code, reason);
        }
        wsRef.current = null;
      }

      setReadyState(WebSocket.CLOSED);
    },
    []
  );

  useEffect(() => {
    isSubscribedRef.current = true;
    if (url) connect();

    return () => {
      closeConnection();
    };
  }, [url, connect, closeConnection]);

  const isConnected = readyState === WebSocket.OPEN;

  return {
    sendMessage,
    closeConnection,
    readyState,
    isConnected,
    reconnectAttempts,
    reconnect: connect,
  };
};
