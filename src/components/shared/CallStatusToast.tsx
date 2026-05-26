import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneOff, PhoneMissed, WifiOff, Clock } from 'lucide-react';

export type CallToastType = 'ended' | 'declined' | 'cancelled' | 'missed' | 'failed' | 'busy';

export interface CallToastData {
  type: CallToastType;
  duration?: number; // seconds the call lasted (for 'ended')
}

const CONFIG: Record<CallToastType, {
  Icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: (duration?: number) => string;
  accentColor: string;
}> = {
  ended: {
    Icon: PhoneOff,
    iconBg: 'bg-gray-700',
    iconColor: 'text-gray-300',
    title: 'Call Ended',
    subtitle: (d) => d ? `Duration: ${formatDur(d)}` : 'The call has ended',
    accentColor: '#6b7280',
  },
  declined: {
    Icon: PhoneOff,
    iconBg: 'bg-red-900/80',
    iconColor: 'text-red-300',
    title: 'Call Declined',
    subtitle: () => 'The other person declined your call',
    accentColor: '#ef4444',
  },
  cancelled: {
    Icon: PhoneMissed,
    iconBg: 'bg-orange-900/80',
    iconColor: 'text-orange-300',
    title: 'Call Cancelled',
    subtitle: () => 'The caller hung up before connecting',
    accentColor: '#f97316',
  },
  missed: {
    Icon: PhoneMissed,
    iconBg: 'bg-yellow-900/80',
    iconColor: 'text-yellow-300',
    title: 'Missed Call',
    subtitle: () => 'You missed an incoming call',
    accentColor: '#eab308',
  },
  failed: {
    Icon: WifiOff,
    iconBg: 'bg-red-900/80',
    iconColor: 'text-red-300',
    title: 'Connection Failed',
    subtitle: () => 'Could not establish a peer connection',
    accentColor: '#ef4444',
  },
  busy: {
    Icon: PhoneOff,
    iconBg: 'bg-orange-900/80',
    iconColor: 'text-orange-300',
    title: 'Line Busy',
    subtitle: () => 'The other person is already on a call',
    accentColor: '#f97316',
  },
};

function formatDur(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

interface Props {
  toast: CallToastData | null;
  onDismiss: () => void;
}

const DISPLAY_MS = 4500;

const CallStatusToast = ({ toast, onDismiss }: Props) => {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, DISPLAY_MS);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  const cfg = toast ? CONFIG[toast.type] : null;

  return (
    <AnimatePresence>
      {toast && cfg && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -12 }}
          transition={{ type: 'spring', damping: 22, stiffness: 320 }}
          className="fixed inset-0 z-[300] flex items-start justify-center pt-6 pointer-events-none"
        >
          {/* Card */}
          <div
            className="pointer-events-auto w-72 rounded-3xl overflow-hidden shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(30,41,59,0.97) 100%)',
              backdropFilter: 'blur(24px)',
              border: `1px solid ${cfg.accentColor}33`,
              boxShadow: `0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px ${cfg.accentColor}22`,
            }}
          >
            {/* Accent top bar */}
            <div className="h-0.5 w-full" style={{ background: cfg.accentColor }} />

            <div className="px-6 py-5 flex items-center gap-4">
              {/* Icon */}
              <div className={`w-12 h-12 rounded-2xl ${cfg.iconBg} flex items-center justify-center shrink-0`}>
                <cfg.Icon className={`w-6 h-6 ${cfg.iconColor}`} />
              </div>

              {/* Text */}
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm leading-tight">{cfg.title}</p>
                <p className="text-white/45 text-xs mt-0.5 leading-snug">
                  {cfg.subtitle(toast.duration)}
                </p>
              </div>

              {/* Duration badge for ended calls */}
              {toast.type === 'ended' && toast.duration !== undefined && (
                <div className="shrink-0 flex items-center gap-1 bg-white/8 rounded-full px-2.5 py-1">
                  <Clock className="w-3 h-3 text-white/40" />
                  <span className="text-white/50 text-[11px] font-mono font-semibold">
                    {formatDur(toast.duration)}
                  </span>
                </div>
              )}
            </div>

            {/* Auto-dismiss progress bar */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: DISPLAY_MS / 1000, ease: 'linear' }}
              className="h-0.5 origin-left"
              style={{ background: cfg.accentColor, opacity: 0.5 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CallStatusToast;
