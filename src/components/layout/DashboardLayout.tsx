import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { AnimatePresence } from 'framer-motion';
import { NotificationProvider } from '../../context/NotificationContext';
import { useNotifications } from '../../context/NotificationContext';
import IncomingCallModal from '../chat/IncomingCallModal';
import VideoCallModal from '../chat/VideoCallModal';
import CallStatusToast from '../shared/CallStatusToast';
import { motion } from 'framer-motion';

// Inner wrapper so it can access NotificationContext
const DashboardContent = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const {
    incomingCall, clearIncomingCall,
    activeCall, setActiveCall,
    heldCall, holdCurrentAndAnswer, resumeHeldCall, clearHeldCall, declineWhileBusy,
    invokeHub,
    callToast, dismissCallToast,
  } = useNotifications();

  // ── Normal accept (no active call) ──────────────────────────────────────────
  const handleAccept = () => {
    if (!incomingCall) return;
    invokeHub('AcceptCall', incomingCall.roomName, incomingCall.callerId);
    setActiveCall({
      roomName: incomingCall.roomName,
      callType: incomingCall.callType,
      targetUserId: incomingCall.callerId,
      isInitiator: false,
      participantName: incomingCall.callerName,
    });
    clearIncomingCall();
  };

  const handleReject = () => {
    if (!incomingCall) return;
    invokeHub('RejectCall', incomingCall.roomName, incomingCall.callerId);
    clearIncomingCall();
  };

  // ── Held-call actions ────────────────────────────────────────────────────────
  const handleHoldAndAnswer = () => {
    if (!incomingCall) return;
    holdCurrentAndAnswer(incomingCall);
  };

  const handleDeclineBusy = () => {
    if (!incomingCall) return;
    declineWhileBusy(incomingCall);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={window.location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global: Incoming call notification */}
      <AnimatePresence>
        {incomingCall && (
          <IncomingCallModal
            key="incoming-call"
            callerName={incomingCall.callerName}
            callType={incomingCall.callType}
            onAccept={handleAccept}
            onReject={handleReject}
            // On-call mode — user is already in a call
            isOnCall={!!activeCall}
            currentCallParticipant={activeCall?.participantName}
            onHoldAndAnswer={handleHoldAndAnswer}
            onDeclineBusy={handleDeclineBusy}
          />
        )}
      </AnimatePresence>

      {/* Global: Active video/audio call (full-screen) */}
      <AnimatePresence>
        {activeCall && (
          <VideoCallModal
            key={`active-${activeCall.roomName}`}
            roomName={activeCall.roomName}
            targetUserId={activeCall.targetUserId}
            callType={activeCall.callType}
            isInitiator={activeCall.isInitiator}
            participantName={activeCall.participantName}
            isHeld={false}
            onClose={() => setActiveCall(null)}
          />
        )}
      </AnimatePresence>

      {/* Global: Held call (minimized pill, bottom-right) */}
      <AnimatePresence>
        {heldCall && (
          <VideoCallModal
            key={`held-${heldCall.roomName}`}
            roomName={heldCall.roomName}
            targetUserId={heldCall.targetUserId}
            callType={heldCall.callType}
            isInitiator={heldCall.isInitiator}
            participantName={heldCall.participantName}
            isHeld={true}
            onResume={resumeHeldCall}
            onClose={clearHeldCall}   // endCall() inside pill signals remote; this just clears state
          />
        )}
      </AnimatePresence>

      {/* Global: Enterprise call status notification (top-center) */}
      <CallStatusToast toast={callToast} onDismiss={dismissCallToast} />
    </div>
  );
};

const DashboardLayout = () => (
  <NotificationProvider>
    <DashboardContent />
  </NotificationProvider>
);

export default DashboardLayout;
