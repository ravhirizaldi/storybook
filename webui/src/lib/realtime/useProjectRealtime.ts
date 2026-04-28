import { useEffect, useState } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { getStoredToken } from '../../stores/authStore';

type UseProjectRealtimeInput = {
  projectId?: string;
  queryKeys: QueryKey[];
  enabled?: boolean;
};

export function useProjectRealtime({ projectId, queryKeys, enabled = true }: UseProjectRealtimeInput) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !projectId) return;

    const token = getStoredToken();
    if (!token) {
      setConnected(false);
      setLastError('Missing auth token');
      return;
    }

    const apiBase = import.meta.env.VITE_API_BASE_URL as string;
    const wsBase = apiBase.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');

    let closedByEffect = false;
    let reconnectTimer: number | undefined;
    let reconnectAttempt = 0;
    let socket: WebSocket | null = null;

    const invalidateAll = () => {
      void Promise.all(
        queryKeys.map((key) =>
          queryClient.invalidateQueries({
            queryKey: key,
          }),
        ),
      );
    };

    const connect = () => {
      socket = new WebSocket(`${wsBase}/ws/projects/${projectId}?token=${encodeURIComponent(token)}`);

      socket.onopen = () => {
        reconnectAttempt = 0;
        setConnected(true);
        setLastError(null);
      };

      socket.onmessage = () => {
        invalidateAll();
      };

      socket.onerror = () => {
        setLastError('WebSocket error');
      };

      socket.onclose = (event) => {
        setConnected(false);
        if (closedByEffect) return;

        setLastError(event.reason || `WebSocket closed (${event.code})`);
        reconnectAttempt += 1;
        const delay = Math.min(1000 * 2 ** (reconnectAttempt - 1), 12000);
        reconnectTimer = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      closedByEffect = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close(1000, 'Unmount');
    };
  }, [enabled, projectId, queryClient, queryKeys]);

  return {
    connected,
    lastError,
  };
}
