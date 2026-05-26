import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, PhoneMissed } from 'lucide-react';

interface IncomingCallModalProps {
  callerName: string;
  callType: 'video' | 'audio';
  onAccept: () => void;
  onReject: () => void;
  // When the user is already on another call
  isOnCall?: boolean;
  currentCallParticipant?: string;
  onHoldAndAnswer?: () => void;
  onDeclineBusy?: () => void;
}

// Generate a classic phone ring using Web Audio API
const useRingtone = (active: boolean) => {
  const ctxRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!active) { stopRef.current(); return; }

    const ctx = new AudioContext();
    ctxRef.current = ctx;
    let stopped = false;

    const playRing = (startAt: number) => {
      if (stopped) return;
      [480, 440].forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, startAt);
        gain.gain.linearRampToValueAtTime(0.18, startAt + 0.05);
        gain.gain.setValueAtTime(0.18, startAt + 0.95);
        gain.gain.linearRampToValueAtTime(0, startAt + 1.0);
        osc.start(startAt);
        osc.stop(startAt + 1.0);
      });
    };

    let i = 0;
    const schedule = () => {
      if (stopped) return;
      playRing(ctx.currentTime + i * 3.0);
      i++;
      setTimeout(schedule, 3000);
    };
    schedule();

    stopRef.current = () => { stopped = true; ctx.close().catch(() => {}); };
    return () => { stopped = true; ctx.close().catch(() => {}); };
  }, [active]);
};

const IncomingCallModal = ({
  callerName, callType, onAccept, onReject,
  isOnCall, currentCallParticipant, onHoldAndAnswer, onDeclineBusy
}: IncomingCallModalProps) => {
  // Only ring if not already on a call (would be confusing over an active call)
  useRingtone(!isOnCall);

  const initials = callerName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
        >
          {/* "On Call" warning banner */}
          {isOnCall && (
            <div className="px-5 py-2.5 bg-yellow-500/15 border-b border-yellow-500/20 flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-yellow-400" />
              <p className="text-yellow-300 text-xs font-semibold">
                Active call with {currentCallParticipant ?? 'someone'}
              </p>
            </div>
          )}

          {/* Top accent bar */}
          <div className="h-0.5 w-full bg-blue-500" />

          {/* Main content */}
          <div className="px-8 pt-7 pb-6 flex flex-col items-center gap-4">
            {/* Pulsing avatar */}
            <div className="relative flex items-center justify-center">
              {!isOnCall && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.55, 1], opacity: [0.2, 0, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute w-28 h-28 rounded-full bg-blue-500/30"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                    className="absolute w-28 h-28 rounded-full bg-blue-500/20"
                  />
                </>
              )}
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-xl">
                {initials || '?'}
              </div>
            </div>

            {/* Caller info */}
            <div className="text-center">
              <p className="text-blue-400/70 text-xs font-semibold uppercase tracking-[0.15em] mb-1">
                Incoming {callType === 'video' ? 'Video' : 'Voice'} Call
              </p>
              <h3 className="text-white text-xl font-bold">{callerName}</h3>
            </div>

            {/* Animated sound waves (only when not on another call) */}
            {!isOnCall && (
              <div className="flex items-end gap-1 h-5 opacity-50">
                {[1, 0.6, 1, 0.4, 0.8, 0.5, 1].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ scaleY: [h, 1 - h + 0.2, h] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                    className="w-1 bg-blue-400 rounded-full origin-bottom"
                    style={{ height: `${h * 20}px` }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Actions ───────────────────────────────────────────────────── */}
          {isOnCall ? (
            /* On-call mode: Hold & Answer OR Decline */
            <div className="px-6 pb-7 flex flex-col gap-3">
              {/* Hold & Answer */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onHoldAndAnswer}
                className="w-full py-3.5 rounded-2xl bg-green-600 hover:bg-green-500 flex items-center justify-center gap-2.5 shadow-lg shadow-green-900/40 transition-colors font-semibold text-white text-sm"
              >
                {callType === 'video'
                  ? <Video className="w-5 h-5" />
                  : <Phone className="w-5 h-5" />
                }
                Hold Current & Answer
              </motion.button>
              {/* Decline (busy) */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onDeclineBusy}
                className="w-full py-3.5 rounded-2xl bg-white/8 hover:bg-white/12 border border-white/10 flex items-center justify-center gap-2.5 transition-colors font-semibold text-white/70 text-sm"
              >
                <PhoneMissed className="w-5 h-5 text-red-400" />
                Decline
              </motion.button>
            </div>
          ) : (
            /* Normal mode: Decline + Accept */
            <div className="px-8 pb-8 flex items-center justify-center gap-10">
              <div className="flex flex-col items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onReject}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center shadow-lg shadow-red-900/50 transition-colors"
                >
                  <PhoneOff className="w-7 h-7 text-white" />
                </motion.button>
                <span className="text-white/40 text-xs font-medium">Decline</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <motion.button
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onAccept}
                  className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center shadow-lg shadow-green-900/50 transition-colors"
                >
                  {callType === 'video'
                    ? <Video className="w-7 h-7 text-white" />
                    : <Phone className="w-7 h-7 text-white" />
                  }
                </motion.button>
                <span className="text-white/40 text-xs font-medium">Accept</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default IncomingCallModal;
