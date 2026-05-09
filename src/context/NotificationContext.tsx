import {
  createContext, useContext, useState, useCallback,
  useEffect, useRef, type ReactNode
} from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from '../hooks/useAuth';
import { useNotificationSound } from '../hooks/useNotificationSound';
import { caseService } from '../services/caseService';
import type { Case } from '../types/case.types';

interface NotificationState {
  totalUnread: number;
  roomUnread: Record<number, number>;
  clearUnread: (caseId: number) => void;
  setActiveRoom: (caseId: number | null) => void;  // Tell context which chat is open
  cases: Case[];
  setCasesExternal: (cases: Case[]) => void;
}

const NotificationContext = createContext<NotificationState | undefined>(undefined);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
};

const getHubUrl = () => {
  const base = (import.meta.env.VITE_CASES_API_URL || 'http://localhost:5035/api')
    .replace(/\/api(\/v\d+)?$/, '');
  return `${base.replace(/\/$/, '')}/case-chat-hub`;
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user, accessToken } = useAuth();
  const { playSound } = useNotificationSound();
  const [roomUnread, setRoomUnread] = useState<Record<number, number>>({});
  const [cases, setCases] = useState<Case[]>([]);

  const casesRef = useRef<Case[]>([]);
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const joinedRoomsRef = useRef<Set<number>>(new Set());
  // Tracks which room is currently open so we skip counting its messages
  const activeRoomRef = useRef<number | null>(null);

  // Sync ref whenever cases state changes
  useEffect(() => {
    casesRef.current = cases;
  }, [cases]);

  // Load cases once on login
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const data = user.userType === 'Client'
          ? await caseService.getClientCases()
          : await caseService.getFirmChatCases();
        setCases(data);
      } catch {
        // degrade gracefully
      }
    };
    load();
  }, [user]);

  // Join any new rooms that haven't been joined yet
  const joinPendingRooms = useCallback(() => {
    const conn = connectionRef.current;
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) return;
    casesRef.current.forEach(c => {
      if (!joinedRoomsRef.current.has(c.id)) {
        conn.invoke('JoinCaseRoom', c.id, 'external', null).catch(() => {});
        joinedRoomsRef.current.add(c.id);
      }
    });
  }, []);

  // When cases list changes, join any new rooms immediately
  useEffect(() => {
    joinPendingRooms();
  }, [cases, joinPendingRooms]);

  // Global persistent SignalR connection
  useEffect(() => {
    if (!accessToken || !user) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(getHubUrl(), { accessTokenFactory: () => accessToken })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.None)
      .build();

    connectionRef.current = connection;
    joinedRoomsRef.current = new Set();

    connection.on('ReceiveMessage', (msg: any) => {
      if (msg.senderId === user.id) return; // ignore own messages
      const caseId = msg.caseId as number;
      // Skip counting if this is the conversation the user is actively reading
      if (activeRoomRef.current === caseId) return;
      setRoomUnread(prev => ({ ...prev, [caseId]: (prev[caseId] ?? 0) + 1 }));
      playSound();
    });

    connection.onreconnected(() => {
      // Re-join all rooms after reconnect
      joinedRoomsRef.current = new Set();
      joinPendingRooms();
    });

    connection.start()
      .then(() => {
        // After connecting, join whatever cases have loaded by now
        joinPendingRooms();
      })
      .catch(() => {});

    return () => {
      connection.stop();
      connectionRef.current = null;
    };
  // Only restart the connection if the user/token changes (not on cases change)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, user?.id]);

  const clearUnread = useCallback((caseId: number) => {
    setRoomUnread(prev => {
      if (!prev[caseId]) return prev;
      const next = { ...prev };
      delete next[caseId];
      return next;
    });
  }, []);

  const setActiveRoom = useCallback((caseId: number | null) => {
    activeRoomRef.current = caseId;
    // Also immediately clear unread for this room when it becomes active
    if (caseId !== null) {
      setRoomUnread(prev => {
        if (!prev[caseId]) return prev;
        const next = { ...prev };
        delete next[caseId];
        return next;
      });
    }
  }, []);

  const setCasesExternal = useCallback((newCases: Case[]) => {
    setCases(newCases);
  }, []);

  const totalUnread = Object.values(roomUnread).reduce((sum, n) => sum + n, 0);

  return (
    <NotificationContext.Provider value={{ totalUnread, roomUnread, clearUnread, setActiveRoom, cases, setCasesExternal }}>
      {children}
    </NotificationContext.Provider>
  );
};
