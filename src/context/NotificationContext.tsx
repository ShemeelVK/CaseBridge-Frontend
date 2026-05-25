import {
  createContext, useContext, useState, useCallback,
  useEffect, useRef, type ReactNode
} from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from '../hooks/useAuth';
import { useNotificationSound } from '../hooks/useNotificationSound';
import { caseService } from '../services/caseService';
import type { Case } from '../types/case.types';

export interface IncomingCallData {
  roomName: string;
  callType: 'video' | 'audio';
  callerName: string;
  callerId: number;
  caseId: number;
}

export interface CallEventData {
  type: 'accepted' | 'rejected' | 'initiated';
  roomName: string;
}

export interface ActiveCallData {
  roomName: string;
  callType: 'video' | 'audio';
  targetUserId: number;
  isInitiator: boolean;
  participantName?: string;
}

interface NotificationState {
  totalUnread: number;
  roomUnread: Record<number, number>;
  clearUnread: (caseId: number) => void;
  setActiveRoom: (caseId: number | null) => void;
  cases: Case[];
  setCasesExternal: (cases: Case[]) => void;
  onMessage: (handler: (msg: any) => void) => void;
  offMessage: (handler: (msg: any) => void) => void;
  joinRoom: (caseId: number, type: string, targetUserId: number | null) => void;
  // Call signaling
  incomingCall: IncomingCallData | null;
  clearIncomingCall: () => void;
  activeCall: ActiveCallData | null;
  setActiveCall: (call: ActiveCallData | null) => void;
  invokeHub: (method: string, ...args: any[]) => Promise<void>;
  onCallEvent: (handler: (event: CallEventData) => void) => void;
  offCallEvent: (handler: (event: CallEventData) => void) => void;
  // Generic hub event subscription (for WebRTC signaling)
  onHubEvent: (event: string, handler: (...args: any[]) => void) => void;
  offHubEvent: (event: string, handler: (...args: any[]) => void) => void;
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
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCallData | null>(null);

  const casesRef = useRef<Case[]>([]);
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const joinedRoomsRef = useRef<Set<number>>(new Set());
  const activeRoomRef = useRef<number | null>(null);
  const messageHandlersRef = useRef<Set<(msg: any) => void>>(new Set());
  const callEventHandlersRef = useRef<Set<(event: CallEventData) => void>>(new Set());

  useEffect(() => { casesRef.current = cases; }, [cases]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const data = user.userType === 'Client'
          ? await caseService.getClientCases()
          : await caseService.getFirmChatCases();
        setCases(data);
      } catch { /* degrade gracefully */ }
    };
    load();
  }, [user]);

  const joinPendingRooms = useCallback(() => {
    const conn = connectionRef.current;
    if (!conn) return;
    // If not yet connected, retry after a short delay
    if (conn.state !== signalR.HubConnectionState.Connected) {
      setTimeout(() => joinPendingRooms(), 500);
      return;
    }
    casesRef.current.forEach(c => {
      if (!joinedRoomsRef.current.has(c.id)) {
        conn.invoke('JoinCaseRoom', c.id, 'external', null).catch(() => {});
        joinedRoomsRef.current.add(c.id);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { joinPendingRooms(); }, [cases, joinPendingRooms]);

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
      messageHandlersRef.current.forEach(h => h(msg));
      if (msg.senderId === user.id) return;
      const caseId = msg.caseId as number;
      if (activeRoomRef.current === caseId) return;
      setRoomUnread(prev => ({ ...prev, [caseId]: (prev[caseId] ?? 0) + 1 }));
      playSound();
    });

    connection.on('IncomingCall', (data: any) => {
      setIncomingCall({
        roomName: data.roomName, callType: data.callType,
        callerName: data.callerName, callerId: data.callerId, caseId: data.caseId,
      });
    });

    // Caller receives this after InitiateCall — opens the VideoCallModal
    connection.on('CallInitiated', (data: any) => {
      setActiveCall({
        roomName: data.roomName,
        callType: data.callType,
        targetUserId: data.resolvedTargetId,
        isInitiator: true,
      });
      callEventHandlersRef.current.forEach(h => h({ type: 'initiated', roomName: data.roomName }));
    });

    connection.on('CallAccepted', (data: any) => {
      callEventHandlersRef.current.forEach(h => h({ type: 'accepted', roomName: data.roomName }));
    });

    connection.on('CallRejected', (data: any) => {
      callEventHandlersRef.current.forEach(h => h({ type: 'rejected', roomName: data.roomName }));
    });

    connection.onreconnected(() => {
      joinedRoomsRef.current = new Set();
      joinPendingRooms();
    });

    connection.start()
      .then(() => joinPendingRooms())
      .catch(() => {});

    return () => {
      connection.stop();
      connectionRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, user?.id]);

  const clearUnread = useCallback((caseId: number) => {
    setRoomUnread(prev => { if (!prev[caseId]) return prev; const next = { ...prev }; delete next[caseId]; return next; });
  }, []);

  const setActiveRoom = useCallback((caseId: number | null) => {
    activeRoomRef.current = caseId;
    if (caseId !== null) {
      setRoomUnread(prev => { if (!prev[caseId]) return prev; const next = { ...prev }; delete next[caseId]; return next; });
    }
  }, []);

  const setCasesExternal = useCallback((newCases: Case[]) => setCases(newCases), []);

  const onMessage = useCallback((handler: (msg: any) => void) => { messageHandlersRef.current.add(handler); }, []);
  const offMessage = useCallback((handler: (msg: any) => void) => { messageHandlersRef.current.delete(handler); }, []);

  const joinRoom = useCallback((caseId: number, type: string, targetUserId: number | null) => {
    const conn = connectionRef.current;
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) return;
    if (joinedRoomsRef.current.has(caseId)) return;
    conn.invoke('JoinCaseRoom', caseId, type, targetUserId).catch(() => {});
    joinedRoomsRef.current.add(caseId);
  }, []);

  const clearIncomingCall = useCallback(() => setIncomingCall(null), []);

  const invokeHub = useCallback(async (method: string, ...args: any[]) => {
    const conn = connectionRef.current;
    if (conn?.state === signalR.HubConnectionState.Connected) {
      await conn.invoke(method, ...args).catch(() => {});
    }
  }, []);

  const onCallEvent = useCallback((handler: (event: CallEventData) => void) => {
    callEventHandlersRef.current.add(handler);
  }, []);
  const offCallEvent = useCallback((handler: (event: CallEventData) => void) => {
    callEventHandlersRef.current.delete(handler);
  }, []);

  // Generic hub event subscription — used by useWebRTC for ReceiveOffer/Answer/IceCandidate
  const onHubEvent = useCallback((event: string, handler: (...args: any[]) => void) => {
    connectionRef.current?.on(event, handler);
  }, []);
  const offHubEvent = useCallback((event: string, handler: (...args: any[]) => void) => {
    connectionRef.current?.off(event, handler);
  }, []);

  const totalUnread = Object.values(roomUnread).reduce((sum, n) => sum + n, 0);

  return (
    <NotificationContext.Provider value={{
      totalUnread, roomUnread, clearUnread, setActiveRoom,
      cases, setCasesExternal, onMessage, offMessage, joinRoom,
      incomingCall, clearIncomingCall,
      activeCall, setActiveCall,
      invokeHub, onCallEvent, offCallEvent,
      onHubEvent, offHubEvent,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
