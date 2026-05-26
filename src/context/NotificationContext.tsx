import {
  createContext, useContext, useState, useCallback,
  useEffect, useRef, type ReactNode
} from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from '../hooks/useAuth';
import { useNotificationSound } from '../hooks/useNotificationSound';
import { caseService } from '../services/caseService';
import type { Case } from '../types/case.types';
import type { CallToastData } from '../components/shared/CallStatusToast';

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
  resolvedTargetId?: number;   // Only on 'initiated'
  callType?: 'video' | 'audio'; // Only on 'initiated'
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
  heldCall: ActiveCallData | null;               // Call on hold
  holdCurrentAndAnswer: (incoming: IncomingCallData) => void;
  resumeHeldCall: () => void;
  endHeldCall: () => void;      // Terminate held call from outside the modal
  clearHeldCall: () => void;    // Clear held state after modal has cleaned up internally
  declineWhileBusy: (incoming: IncomingCallData) => void;
  invokeHub: (method: string, ...args: any[]) => Promise<void>;
  onCallEvent: (handler: (event: CallEventData) => void) => void;
  offCallEvent: (handler: (event: CallEventData) => void) => void;
  // Generic hub event subscription (for WebRTC signaling)
  onHubEvent: (event: string, handler: (...args: any[]) => void) => void;
  offHubEvent: (event: string, handler: (...args: any[]) => void) => void;
  // Call status toasts
  callToast: CallToastData | null;
  showCallToast: (data: CallToastData) => void;
  dismissCallToast: () => void;
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
  const [heldCall, setHeldCall] = useState<ActiveCallData | null>(null);
  const [callToast, setCallToast] = useState<CallToastData | null>(null);

  const showCallToast = useCallback((data: CallToastData) => {
    setCallToast(data);
  }, []);
  const dismissCallToast = useCallback(() => setCallToast(null), []);

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
      // Don't set activeCall here — ChatWindow sets it with the full data
      // including participantName to avoid race condition
      callEventHandlersRef.current.forEach(h => h({
        type: 'initiated',
        roomName: data.roomName,
        resolvedTargetId: data.resolvedTargetId,
        callType: data.callType as 'video' | 'audio',
      }));
    });

    connection.on('CallAccepted', (data: any) => {
      callEventHandlersRef.current.forEach(h => h({ type: 'accepted', roomName: data.roomName }));
    });

    connection.on('CallRejected', (data: any) => {
      callEventHandlersRef.current.forEach(h => h({ type: 'rejected', roomName: data.roomName }));
      // Show decline toast to the caller
      setCallToast({ type: 'declined' });
    });

    // Caller is busy (receiver had another call and sent BusyReject)
    connection.on('CallBusy', (_data: any) => {
      setCallToast({ type: 'busy' });
    });

    // Caller cancelled before receiver answered — dismiss the ringing modal
    connection.on('CallEnded', (data: any) => {
      // Use functional form to read current state
      setIncomingCall(prev => {
        if (prev?.roomName === data.roomName) {
          setCallToast({ type: 'cancelled' });
          return null;
        }
        return prev;
      });
      // If the ACTIVE call ended from remote, check if there's a held call to auto-resume
      setActiveCall(prev => {
        if (prev?.roomName === data.roomName) {
          // Auto-resume held call when active call ends
          setHeldCall(held => {
            if (held) {
              // Resume the held call by moving it to active
              setTimeout(() => {
                setActiveCall(held);
                setHeldCall(null);
              }, 0);
            }
            return null;
          });
          return null;
        }
        return prev;
      });
      // If the HELD call ended from remote
      setHeldCall(prev => {
        if (prev?.roomName === data.roomName) {
          setCallToast({ type: 'ended' });
          return null;
        }
        return prev;
      });
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

  // ── Hold/resume helpers ─────────────────────────────────────────────────────
  const holdCurrentAndAnswer = useCallback((incoming: IncomingCallData) => {
    setHeldCall(prev => prev ?? null); // keep existing held if any (shouldn't happen)
    setActiveCall(current => {
      if (current) setHeldCall(current); // park the current call
      return {
        roomName: incoming.roomName,
        callType: incoming.callType,
        targetUserId: incoming.callerId,
        isInitiator: false,
        participantName: incoming.callerName,
      };
    });
    invokeHub('AcceptCall', incoming.roomName, incoming.callerId);
    setIncomingCall(null);
  }, [invokeHub]);

  const resumeHeldCall = useCallback(() => {
    setHeldCall(held => {
      if (!held) return null;
      setActiveCall(held); // promote held → active
      return null;
    });
  }, []);

  const endHeldCall = useCallback(() => {
    setHeldCall(held => {
      if (!held) return null;
      invokeHub('EndCall', held.roomName, held.targetUserId);
      setCallToast({ type: 'ended' });
      return null;
    });
  }, [invokeHub]);

  const declineWhileBusy = useCallback((incoming: IncomingCallData) => {
    invokeHub('BusyReject', incoming.roomName, incoming.callerId);
    setIncomingCall(null);
  }, [invokeHub]);

  // Called by held VideoCallModal's onClose AFTER endCall() has already
  // cleaned up WebRTC and signalled the remote — just clears context state.
  const clearHeldCall = useCallback(() => setHeldCall(null), []);



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
      heldCall, holdCurrentAndAnswer, resumeHeldCall, endHeldCall, clearHeldCall, declineWhileBusy,
      invokeHub, onCallEvent, offCallEvent,
      onHubEvent, offHubEvent,
      callToast, showCallToast, dismissCallToast,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
