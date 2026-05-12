import { useEffect, useRef, useState, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';

export const useSignalR = (hubUrl: string, token: string | null) => {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const startConnection = useCallback(async () => {
    if (!hubUrl || !token) {
      console.warn("🚫 SignalR: Missing URL or Token");
      return;
    }
    
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling | signalR.HttpTransportType.ServerSentEvents
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    connection.onreconnecting((err) => {
      console.warn("⚠️ SignalR: Reconnecting...", err);
      setIsConnected(false);
    });
    
    connection.onreconnected((id) => {
      console.log("✅ SignalR: Reconnected. ID:", id);
      setIsConnected(true);
    });

    connection.onclose((err) => {
      console.error("❌ SignalR: Connection closed.", err);
      setIsConnected(false);
    });

    connectionRef.current = connection;

    try {
      await connection.start();
      console.log('🚀 SignalR: Connected successfully');
      setIsConnected(true);
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('stopped')) return; // Ignore React Strict Mode unmounts
      console.error('🔥 SignalR: Connection failed:', err);
      setIsConnected(false);
      setTimeout(startConnection, 5000);
    }
  }, [hubUrl, token]);

  useEffect(() => {
    startConnection();

    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, [startConnection]);

  const joinRoom = useCallback(async (caseId: number, roomType: string, targetUserId?: number | null) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      const safeTargetUserId = targetUserId ?? null;
      await connectionRef.current.invoke('JoinCaseRoom', caseId, roomType, safeTargetUserId);
    }
  }, []);

  const sendMessage = useCallback(async (caseId: number, roomType: string, message: string, targetUserId?: number | null, parentMessageId?: number | null, attachmentDocIds?: number[] | null) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.invoke(
        'SendMessage',
        caseId,
        roomType,
        message,
        targetUserId ?? null,
        parentMessageId ?? null,
        attachmentDocIds ?? null
      );
    }
  }, []);

  const on = useCallback((eventName: string, callback: (...args: any[]) => void) => {
    connectionRef.current?.on(eventName, callback);
  }, []);

  const off = useCallback((eventName: string) => {
    connectionRef.current?.off(eventName);
  }, []);

  return {
    isConnected,
    joinRoom,
    sendMessage,
    on,
    off,
    connection: connectionRef.current
  };
};
