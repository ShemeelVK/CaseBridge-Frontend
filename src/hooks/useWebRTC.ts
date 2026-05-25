import { useEffect, useRef, useState, useCallback } from 'react';
import { useNotifications } from '../context/NotificationContext';
import type { CallEventData } from '../context/NotificationContext';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.relay.metered.ca:80' },
  { urls: 'turn:global.relay.metered.ca:80', username: '0bd5e2e25d923eadc0b911d5', credential: '7hj0mnpiCBR5W7gS' },
  { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: '0bd5e2e25d923eadc0b911d5', credential: '7hj0mnpiCBR5W7gS' },
  { urls: 'turn:global.relay.metered.ca:443', username: '0bd5e2e25d923eadc0b911d5', credential: '7hj0mnpiCBR5W7gS' },
  { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: '0bd5e2e25d923eadc0b911d5', credential: '7hj0mnpiCBR5W7gS' },
];

export type CallState = 'ringing' | 'connecting' | 'connected' | 'failed' | 'ended';

interface UseWebRTCOptions {
  roomName: string;
  targetUserId: number;
  callType: 'video' | 'audio';
  isInitiator: boolean;
}

export const useWebRTC = ({ roomName, targetUserId, callType, isInitiator }: UseWebRTCOptions) => {
  const { invokeHub, onHubEvent, offHubEvent, onCallEvent, offCallEvent } = useNotifications();

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  // FIX 1: Buffer incoming offer if localStream not yet ready
  const pendingOfferRef = useRef<any>(null);
  const offerPendingRef = useRef(false);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callState, setCallState] = useState<CallState>('ringing');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(callType === 'audio');

  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

  const createPC = useCallback((): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.ontrack = (e) => { if (e.streams[0]) setRemoteStream(e.streams[0]); };
    pc.onicecandidate = (e) => {
      if (e.candidate) invokeHub('RelayIceCandidate', roomName, targetUserId, JSON.stringify(e.candidate));
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setCallState('connected');
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') setCallState('failed');
    };
    pcRef.current = pc;
    return pc;
  }, [roomName, targetUserId, invokeHub]);

  const flushCandidates = useCallback(async () => {
    for (const c of pendingCandidatesRef.current) {
      try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ }
    }
    pendingCandidatesRef.current = [];
  }, []);

  // ── Process incoming offer (non-initiator) ─────────────────────────────────
  const processOffer = useCallback(async (data: any, stream: MediaStream) => {
    try {
      const pc = createPC();
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      setCallState('connecting');
      await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.sdp)));
      await flushCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      invokeHub('RelayAnswer', roomName, targetUserId, JSON.stringify(pc.localDescription));
    } catch (err) {
      console.error('[WebRTC] processOffer error:', err);
      setCallState('failed');
    }
  }, [createPC, flushCandidates, invokeHub, roomName, targetUserId]);

  // ── Get user media ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices.getUserMedia({ video: callType === 'video', audio: true })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        setLocalStream(stream);
        // FIX 1b: If offer already buffered, process it now
        if (!isInitiator && pendingOfferRef.current) {
          processOffer(pendingOfferRef.current, stream);
          pendingOfferRef.current = null;
        }
        // FIX: If CallAccepted already fired before media was ready
        if (isInitiator && offerPendingRef.current) {
          offerPendingRef.current = false;
          sendOffer(stream);
        }
      })
      .catch(() => setCallState('failed'));
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Send offer (initiator) ─────────────────────────────────────────────────
  const sendOffer = useCallback(async (stream: MediaStream) => {
    try {
      const pc = createPC();
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      setCallState('connecting');
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: callType === 'video' });
      await pc.setLocalDescription(offer);
      invokeHub('RelayOffer', roomName, targetUserId, JSON.stringify(pc.localDescription));
    } catch (err) {
      console.error('[WebRTC] sendOffer error:', err);
      setCallState('failed');
    }
  }, [createPC, invokeHub, roomName, targetUserId, callType]);

  // ── Initiator: start offer when CallAccepted fires ─────────────────────────
  useEffect(() => {
    if (!isInitiator) return;
    const handler = (event: CallEventData) => {
      if (event.type !== 'accepted') return;
      if (localStreamRef.current) {
        sendOffer(localStreamRef.current);
      } else {
        offerPendingRef.current = true;
      }
    };
    onCallEvent(handler);
    return () => offCallEvent(handler);
  }, [isInitiator, sendOffer, onCallEvent, offCallEvent]);

  // ── Non-initiator: listen for offer ───────────────────────────────────────
  useEffect(() => {
    if (isInitiator) return;
    const handler = (data: any) => {
      if (data.roomName !== roomName) return;
      if (localStreamRef.current) {
        processOffer(data, localStreamRef.current);
      } else {
        // FIX 1a: Buffer the offer — media not ready yet
        pendingOfferRef.current = data;
      }
    };
    onHubEvent('ReceiveOffer', handler);
    return () => offHubEvent('ReceiveOffer', handler);
  }, [isInitiator, roomName, processOffer, onHubEvent, offHubEvent]);

  // ── Initiator: handle answer ───────────────────────────────────────────────
  useEffect(() => {
    if (!isInitiator) return;
    const handler = async (data: any) => {
      if (data.roomName !== roomName) return;
      try {
        await pcRef.current?.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.sdp)));
        await flushCandidates();
      } catch (err) { console.error('[WebRTC] setAnswer error:', err); }
    };
    onHubEvent('ReceiveAnswer', handler);
    return () => offHubEvent('ReceiveAnswer', handler);
  }, [isInitiator, roomName, flushCandidates, onHubEvent, offHubEvent]);

  // ── Both: handle ICE candidates ────────────────────────────────────────────
  useEffect(() => {
    const handler = async (data: any) => {
      if (data.roomName !== roomName) return;
      try {
        const c = JSON.parse(data.candidate);
        if (pcRef.current?.remoteDescription) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(c));
        } else {
          pendingCandidatesRef.current.push(c);
        }
      } catch { /* ignore */ }
    };
    onHubEvent('ReceiveIceCandidate', handler);
    return () => offHubEvent('ReceiveIceCandidate', handler);
  }, [roomName, onHubEvent, offHubEvent]);

  // ── Controls ───────────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsMuted(!track.enabled); }
  }, []);

  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsCameraOff(!track.enabled); }
  }, []);

  const endCall = useCallback(() => {
    // Signal the other side immediately — don't wait for ICE failure timeout
    invokeHub('EndCall', roomName, targetUserId);
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    setCallState('ended');
  }, [invokeHub, roomName, targetUserId]);

  // ── Listen for remote side ending the call (immediate close) ─────────────
  useEffect(() => {
    const handler = (data: any) => {
      if (data.roomName !== roomName) return;
      pcRef.current?.close();
      pcRef.current = null;
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      setCallState('ended');
    };
    onHubEvent('CallEnded', handler);
    return () => offHubEvent('CallEnded', handler);
  }, [roomName, onHubEvent, offHubEvent]);

  useEffect(() => () => {
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  return { localStream, remoteStream, callState, isMuted, isCameraOff, toggleMic, toggleCamera, endCall };
};
