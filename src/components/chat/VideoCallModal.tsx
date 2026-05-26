import { useEffect, useRef, useState } from 'react';
import {
  Mic, MicOff, Video, VideoOff, Phone,
  Maximize2, Minimize2, Signal, User, PauseCircle, PlayCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebRTC } from '../../hooks/useWebRTC';
import { useNotifications } from '../../context/NotificationContext';

interface VideoCallModalProps {
  roomName: string;
  targetUserId: number;
  callType: 'video' | 'audio';
  isInitiator: boolean;
  participantName?: string;
  isHeld?: boolean;  // This call is on hold (minimized mode)
  onClose: () => void;
  onResume?: () => void; // Promote held call back to active
}

const VideoCallModal = ({
  roomName, targetUserId, callType, isInitiator, participantName,
  isHeld = false, onClose, onResume
}: VideoCallModalProps) => {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [duration, setDuration] = useState(0);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevIsHeld = useRef(false);

  const { showCallToast, endHeldCall } = useNotifications();

  const {
    localStream, remoteStream, callState,
    isMuted, isCameraOff, isRemoteHeld,
    toggleMic, toggleCamera, holdCall, resumeCall, endCall
  } = useWebRTC({ roomName, targetUserId, callType, isInitiator });

  // When isHeld prop toggles, mute/unmute the WebRTC tracks
  useEffect(() => {
    if (isHeld && !prevIsHeld.current) holdCall();
    else if (!isHeld && prevIsHeld.current) resumeCall();
    prevIsHeld.current = isHeld;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHeld]);

  // Attach streams to video elements
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  // Show toast + auto-close when call ends or fails
  useEffect(() => {
    if (callState === 'ended') {
      showCallToast({ type: 'ended', duration });
      onClose();
    } else if (callState === 'failed') {
      showCallToast({ type: 'failed' });
      onClose();
    }
  }, [callState, onClose, showCallToast, duration]);

  // Call duration timer
  useEffect(() => {
    if (callState !== 'connected') return;
    const timer = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, [callState]);

  // Auto-hide controls after 4s of no interaction
  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (callState === 'connected' && remoteStream) {
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 4000);
    }
  };

  useEffect(() => {
    resetControlsTimer();
    return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState, remoteStream]);

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleEnd = () => { endCall(); };

  const statusText =
    callState === 'ringing' ? (isInitiator ? 'Ringing…' : 'Incoming call…')
    : callState === 'connecting' ? 'Connecting…'
    : callState === 'connected' ? formatDuration(duration)
    : 'Reconnecting…';

  const displayName = participantName || 'Participant';
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // ── Minimized held-call card ───────────────────────────────────────────────
  if (isHeld) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-6 right-6 z-[210] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.98) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(250,204,21,0.3)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(250,204,21,0.1)',
          minWidth: '220px',
        }}
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
          {initials || <User className="w-5 h-5" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{displayName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            <p className="text-yellow-400/80 text-xs font-medium">On Hold · {formatDuration(duration)}</p>
          </div>
        </div>

        {/* Resume */}
        <button
          onClick={onResume}
          title="Resume call"
          className="w-9 h-9 rounded-full bg-green-600 hover:bg-green-500 flex items-center justify-center transition-colors shadow-lg"
        >
          <PlayCircle className="w-5 h-5 text-white" />
        </button>

        {/* End held call */}
        <button
          onClick={() => { endCall(); }}
          title="End held call"
          className="w-9 h-9 rounded-full bg-red-600/80 hover:bg-red-500 flex items-center justify-center transition-colors shadow-lg"
        >
          <Phone className="w-4 h-4 text-white rotate-[135deg]" />
        </button>
      </motion.div>
    );
 }

  return (
    <div
      className="fixed inset-0 z-[200] bg-gray-950 flex flex-col overflow-hidden"
      onMouseMove={resetControlsTimer}
      onClick={resetControlsTimer}
    >
      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden">

        {/* Remote video (full screen) */}
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          /* Waiting / ringing state */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-8"
            style={{ background: 'radial-gradient(ellipse at center, #1e293b 0%, #0f172a 70%)' }}>
            <div className="relative flex items-center justify-center">
              {/* Pulse rings */}
              <motion.div
                animate={{ scale: [1, 1.6, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="absolute w-40 h-40 rounded-full border border-blue-400/30"
              />
              <motion.div
                animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: 0.4 }}
                className="absolute w-40 h-40 rounded-full border border-blue-400/40"
              />
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-2xl shadow-blue-900/60 text-4xl font-bold text-white">
                {initials || <User className="w-14 h-14" />}
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-white text-2xl font-bold mb-2">{displayName}</h2>
              <p className="text-blue-400/80 text-sm font-medium tracking-widest uppercase">
                {statusText}
              </p>
            </div>
          </div>
        )}

        {/* Top gradient overlay */}
        <div className="absolute inset-x-0 top-0 h-28 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)' }} />

        {/* Bottom gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-36 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }} />

        {/* ── Top bar ────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="absolute top-0 inset-x-0 px-6 py-4 flex items-center justify-between z-10"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${callState === 'connected' ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`} />
                <div>
                  <p className="text-white font-semibold text-sm leading-tight">{displayName}</p>
                  <p className="text-white/50 text-xs font-medium tracking-wide">{statusText}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {callState === 'connected' && (
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur rounded-full px-3 py-1">
                    <Signal className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-white/70 text-xs font-mono font-bold">{formatDuration(duration)}</span>
                  </div>
                )}
                <button
                  onClick={() => setIsFullscreen(f => !f)}
                  className="p-2 rounded-full bg-white/10 backdrop-blur hover:bg-white/20 transition-colors"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Local video PiP ───────────────────────────────────────────── */}
        {callType === 'video' && localStream && (
          <div className="absolute bottom-24 right-5 w-44 h-28 rounded-2xl overflow-hidden border border-white/20 shadow-2xl z-10 ring-1 ring-white/10">
            <video ref={localVideoRef} autoPlay playsInline muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            {isCameraOff && (
              <div className="absolute inset-0 bg-gray-800/95 flex items-center justify-center">
                <VideoOff className="w-7 h-7 text-gray-400" />
              </div>
            )}
            <div className="absolute bottom-2 left-2">
              <span className="text-white/60 text-[10px] font-medium bg-black/40 px-1.5 py-0.5 rounded">You</span>
            </div>
          </div>
        )}

        {/* Audio call avatar during connected state */}
        {callType === 'audio' && callState === 'connected' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-4xl font-bold text-white shadow-2xl">
              {initials || <User className="w-12 h-12" />}
            </div>
            <p className="text-white text-lg font-semibold">{displayName}</p>
            <p className="text-green-400/80 text-sm tracking-wide">Connected · {formatDuration(duration)}</p>
          </div>
        )}

        {/* isRemoteHeld overlay: the OTHER side put this call on hold */}
        {isRemoteHeld && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          >
            <PauseCircle className="w-14 h-14 text-yellow-400/80" />
            <p className="text-white font-semibold text-lg">{displayName} put you on hold</p>
            <p className="text-white/40 text-sm">Waiting for them to resume…</p>
          </div>
        )}

        {/* ── Control bar ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 inset-x-0 flex items-center justify-center z-10"
            >
              <div className="flex items-center gap-3 bg-gray-900/80 backdrop-blur-xl px-6 py-3.5 rounded-2xl border border-white/10 shadow-2xl">

                {/* Mute */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={toggleMic}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                      isMuted ? 'bg-red-500/90 shadow-lg shadow-red-900/40' : 'bg-white/15 hover:bg-white/25'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
                  </button>
                  <span className="text-white/40 text-[10px] font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
                </div>

                {/* Camera (video only) */}
                {callType === 'video' && (
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={toggleCamera}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                        isCameraOff ? 'bg-red-500/90 shadow-lg shadow-red-900/40' : 'bg-white/15 hover:bg-white/25'
                      }`}
                    >
                      {isCameraOff ? <VideoOff className="w-5 h-5 text-white" /> : <Video className="w-5 h-5 text-white" />}
                    </button>
                    <span className="text-white/40 text-[10px] font-medium">{isCameraOff ? 'Show' : 'Hide'}</span>
                  </div>
                )}

                {/* Divider */}
                <div className="w-px h-10 bg-white/10 mx-1" />

                {/* Hold (only when connected) */}
                {callState === 'connected' && (
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={holdCall}
                      title="Put on hold"
                      className="w-12 h-12 rounded-full bg-yellow-600/80 hover:bg-yellow-500 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                    >
                      <PauseCircle className="w-5 h-5 text-white" />
                    </button>
                    <span className="text-white/40 text-[10px] font-medium">Hold</span>
                  </div>
                )}

                {/* End call */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={handleEnd}
                    className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 active:bg-red-700 flex items-center justify-center shadow-xl shadow-red-900/50 transition-all hover:scale-105 active:scale-95"
                  >
                    <Phone className="w-6 h-6 text-white rotate-[135deg]" />
                  </button>
                  <span className="text-white/40 text-[10px] font-medium">End</span>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VideoCallModal;
