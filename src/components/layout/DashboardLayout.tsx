import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationProvider } from '../../context/NotificationContext';
import { useNotifications } from '../../context/NotificationContext';
import IncomingCallModal from '../chat/IncomingCallModal';
import VideoCallModal from '../chat/VideoCallModal';

// Inner wrapper so it can access NotificationContext
const DashboardContent = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { incomingCall, clearIncomingCall, activeCall, setActiveCall, invokeHub } = useNotifications();

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

      {/* Global: Incoming call notification (works from ANY page) */}
      <AnimatePresence>
        {incomingCall && (
          <IncomingCallModal
            key="incoming-call"
            callerName={incomingCall.callerName}
            callType={incomingCall.callType}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        )}
      </AnimatePresence>

      {/* Global: Active video/audio call */}
      {activeCall && (
        <VideoCallModal
          roomName={activeCall.roomName}
          targetUserId={activeCall.targetUserId}
          callType={activeCall.callType}
          isInitiator={activeCall.isInitiator}
          participantName={activeCall.participantName}
          onClose={() => setActiveCall(null)}
        />
      )}
    </div>
  );
};

const DashboardLayout = () => (
  <NotificationProvider>
    <DashboardContent />
  </NotificationProvider>
);

export default DashboardLayout;
