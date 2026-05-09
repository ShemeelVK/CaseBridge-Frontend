import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, Paperclip, MoreVertical, 
  CheckCheck, Building2, Phone, Video, Smile,
  ChevronLeft, RotateCcw, AlertCircle, Clock
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSignalR } from '../../hooks/useSignalR';
import { caseService } from '../../services/caseService';
import { buildRoomKey, loadFromStorage, saveToStorage, mergeMessages } from '../../utils/chatStorage';
import type { StoredMessage } from '../../utils/chatStorage';

// 'sending' = optimistic, not yet confirmed  |  'sent' = confirmed by server  |  'failed' = invoke threw
type MessageStatus = 'sending' | 'sent' | 'failed';

interface Message {
  id: number;           // positive = real server ID, negative = temp client ID
  senderId: number;
  senderName: string;
  content: string;
  timestamp: string;
  isMe: boolean;
  status: MessageStatus;
}

interface ChatWindowProps {
  caseId: number;
  caseTitle: string;
  roomType: 'internal' | 'external';
  targetUserId?: number | null;
  isUnassigned?: boolean;
  onClose?: () => void;
}

const ChatWindow = ({ caseId, caseTitle, roomType, targetUserId, isUnassigned, onClose }: ChatWindowProps) => {
  const { user, accessToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  // Stable room key — recomputed only when room identity changes
  const roomKey = user?.id ? buildRoomKey(user.id, caseId, roomType, targetUserId) : null;
  
  const getHubUrl = () => {
    // Correctly strip /api or /api/v1 from the end
    const casesApiUrl = import.meta.env.VITE_CASES_API_URL || 'http://localhost:5035/api';
    const base = casesApiUrl.replace(/\/api(\/v\d+)?$/, '');
    return `${base.replace(/\/$/, '')}/case-chat-hub`;
  };
  
  const hubUrl = getHubUrl();
  const { isConnected, joinRoom, sendMessage, on, off } = useSignalR(hubUrl, accessToken);
 
  // Log connection status for debugging
  useEffect(() => {
    if (isConnected) console.log("✅ Chat Connected to Room:", caseId);
  }, [isConnected, caseId]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 1. INSTANT LOAD: show cached messages immediately, before backend responds
  useEffect(() => {
    if (!roomKey) return;
    const cached = loadFromStorage(roomKey);
    if (cached.length > 0) {
      setMessages(cached.map(m => ({ ...m, status: 'sent' as MessageStatus })));
    }
  }, [roomKey]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await caseService.getChatHistory(caseId, roomType, targetUserId || undefined);
        const backendMsgs: StoredMessage[] = history.map((msg: any) => ({
          id: msg.id,
          senderId: msg.senderId,
          senderName: msg.senderName,
          content: msg.messageText,
          timestamp: msg.sendAt,
          isMe: msg.senderId === user?.id,
        }));

        // 2. MERGE: backend is source of truth — reconcile with local cache
        const cached = roomKey ? loadFromStorage(roomKey) : [];
        const merged = mergeMessages(backendMsgs, cached);

        // 3. PERSIST the merged result back to localStorage
        if (roomKey) saveToStorage(roomKey, merged);

        setMessages(merged.map(m => ({ ...m, status: 'sent' as MessageStatus })));
      } catch (err) {
        console.error('Failed to load history:', err);
        // On failure, keep showing whatever was in localStorage
      }
    };

    if (isConnected) {
      joinRoom(caseId, roomType, targetUserId);
      loadHistory();
    }
  }, [isConnected, caseId, roomType, targetUserId, joinRoom, user?.id, roomKey]);

  // Real-time receiver — reconciles optimistic messages and persists confirmed ones
  useEffect(() => {
    const handleReceive = (msg: any) => {
      const confirmed: Message = {
        id: msg.id || Date.now(),
        senderId: msg.senderId,
        senderName: msg.senderName,
        content: msg.text,
        timestamp: msg.timestamp || new Date().toISOString(),
        isMe: msg.senderId === user?.id,
        status: 'sent',
      };

      // Compute the next message list OUTSIDE the state updater to avoid
      // side effects inside React's state updater (forbidden in Strict Mode)
      setMessages(prev => {
        let next: Message[];

        if (confirmed.isMe) {
          // Replace the matching optimistic (tempId < 0) entry
          const tempIdx = prev.findIndex(
            m => m.id < 0 && m.content === confirmed.content && m.status === 'sending'
          );
          if (tempIdx !== -1) {
            next = [...prev];
            next[tempIdx] = confirmed;
          } else {
            if (prev.some(m => m.id === confirmed.id)) return prev;
            next = [...prev, confirmed];
          }
        } else {
          if (prev.some(m => m.id === confirmed.id)) return prev;
          next = [...prev, confirmed];
        }

        // Persist OUTSIDE via a microtask — never call localStorage inside a state updater
        if (roomKey) {
          const toStore: StoredMessage[] = next
            .filter(m => m.id > 0)
            .map(({ id, senderId, senderName, content, timestamp, isMe }) =>
              ({ id, senderId, senderName, content, timestamp, isMe })
            );
          // queueMicrotask keeps this outside the React render cycle
          queueMicrotask(() => saveToStorage(roomKey, toStore));
        }

        return next;
      });
    };

    on('ReceiveMessage', handleReceive);
    return () => { off('ReceiveMessage'); };
  }, [on, off, user?.id, roomKey]);

  // Retry a failed optimistic message
  const handleRetry = useCallback(async (tempId: number) => {
    const msg = messages.find(m => m.id === tempId);
    if (!msg) return;
    setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'sending' } : m));
    try {
      await sendMessage(caseId, roomType, msg.content, targetUserId);
    } catch {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
    }
  }, [messages, caseId, roomType, targetUserId, sendMessage]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !isConnected) return;

    // --- OPTIMISTIC: render instantly with a negative temp ID ---
    const tempId = -Date.now();
    const optimistic: Message = {
      id: tempId,
      senderId: user?.id ?? 0,
      senderName: user?.fullName ?? 'Me',
      content: text,
      timestamp: new Date().toISOString(),
      isMe: true,
      status: 'sending',
    };
    setMessages(prev => [...prev, optimistic]);
    setInputText('');

    try {
      await sendMessage(caseId, roomType, text, targetUserId);
      // SignalR echo -> handleReceive replaces the optimistic entry with confirmed data
    } catch {
      setMessages(prev =>
        prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m)
      );
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      
      {/* Header: Professional Look */}
      <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="md:hidden p-2 -ml-2 text-gray-400 hover:text-law-navy transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="relative">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm ${
              roomType === 'internal' && !targetUserId ? 'bg-law-navy text-white' : 'bg-accent-gold/10 text-law-navy border border-accent-gold/20'
            }`}>
              {roomType === 'internal' && !targetUserId ? <Building2 className="w-6 h-6" /> : (caseTitle.charAt(0))}
            </div>
            {isConnected && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-4 border-white rounded-full"></div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-law-navy truncate leading-tight">{caseTitle}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                roomType === 'internal' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
              }`}>
                {roomType === 'internal' ? 'Internal Team' : 'Client Channel'}
              </span>
              <span className="text-[10px] text-gray-400 font-medium">• 2 Participants</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-400 hover:text-law-navy hover:bg-gray-50 rounded-xl transition-all"><Phone className="w-4 h-4" /></button>
          <button className="p-2 text-gray-400 hover:text-law-navy hover:bg-gray-50 rounded-xl transition-all"><Video className="w-4 h-4" /></button>
          <button className="p-2 text-gray-400 hover:text-law-navy hover:bg-gray-50 rounded-xl transition-all"><MoreVertical className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed"
      >
        <div className="flex justify-center mb-8">
          <span className="px-4 py-1.5 bg-gray-100/80 backdrop-blur-sm text-gray-500 text-[10px] font-bold uppercase tracking-widest rounded-full shadow-sm">
            End-to-End Encrypted
          </span>
        </div>

        {messages.map((msg, idx) => (
          <div 
            key={msg.id || idx}
            className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}
          >
            {!msg.isMe && (
              <span className="text-[10px] font-bold text-law-slate ml-4 mb-1 opacity-60">
                {msg.senderName}
              </span>
            )}
            <div className={`group flex items-end gap-2 max-w-[85%] md:max-w-[70%] ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`px-5 py-3.5 rounded-2xl shadow-sm text-sm leading-relaxed transition-opacity ${
                msg.isMe 
                  ? 'bg-law-navy text-white rounded-tr-none' 
                  : 'bg-white text-law-navy border border-gray-100 rounded-tl-none'
              } ${msg.status === 'sending' ? 'opacity-60' : 'opacity-100'}`}>
                {msg.content}
                <div className={`flex items-center justify-end gap-1.5 mt-1 text-[9px] ${
                  msg.isMe ? 'text-white/60' : 'text-law-slate/60'
                }`}>
                  {formatTimestamp(msg.timestamp)}
                  {msg.isMe && (
                    msg.status === 'sending' ? (
                      <Clock className="w-3 h-3 animate-pulse" />
                    ) : msg.status === 'failed' ? (
                      <AlertCircle className="w-3 h-3 text-red-400" />
                    ) : (
                      <CheckCheck className="w-3 h-3" />
                    )
                  )}
                </div>
              </div>
            </div>
            {/* Retry button for failed messages */}
            {msg.isMe && msg.status === 'failed' && (
              <button
                onClick={() => handleRetry(msg.id)}
                className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-700 mt-1 mr-1 font-semibold transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Failed — tap to retry
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Input Area: Standard Messaging Look */}
      <div className="p-4 md:p-6 bg-white border-t border-gray-100">
        {isUnassigned && roomType === 'external' && (
          <div className="mb-3 text-center text-xs font-bold text-amber-600 bg-amber-50 py-2.5 px-4 rounded-xl border border-amber-100 shadow-sm">
            {user?.userType === 'Client' 
              ? "Your case is awaiting assignment. Chat will unlock once an advocate claims your file."
              : "This case is currently unassigned. Chat is in read-only historical mode."}
          </div>
        )}
        <form onSubmit={handleSend} className={`flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100 transition-all ${!isUnassigned ? 'focus-within:ring-2 focus-within:ring-accent-gold/20 focus-within:border-accent-gold/40' : 'opacity-70 cursor-not-allowed'}`}>
          <div className="flex items-center gap-1">
            <button type="button" disabled={isUnassigned} className="p-2.5 text-law-slate hover:text-law-navy hover:bg-gray-200 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed" title="Attach Document">
              <Paperclip className="w-5 h-5" />
            </button>
            <button type="button" disabled={isUnassigned} className="p-2.5 text-law-slate hover:text-law-navy hover:bg-gray-200 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed" title="Add Emoji">
              <Smile className="w-5 h-5" />
            </button>
          </div>
          
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isUnassigned}
            placeholder={isUnassigned ? "Chat is disabled..." : "Type a professional message..."}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-law-navy placeholder:text-gray-400 py-3 disabled:cursor-not-allowed"
          />

          <button
            type="submit"
            disabled={isUnassigned || !inputText.trim() || !isConnected}
            className={`p-3 rounded-xl transition-all shadow-md ${
              !isUnassigned && inputText.trim() && isConnected 
                ? 'bg-law-navy text-white hover:scale-105 active:scale-95' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="text-[10px] text-center text-gray-400 mt-3 font-medium">
          Press Enter to send. Messages are logged for case records.
        </p>
      </div>
    </div>
  );
};

export default ChatWindow;
