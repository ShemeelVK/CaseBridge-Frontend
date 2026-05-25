import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Paperclip, MoreVertical,
  CheckCheck, Building2, Phone, Video, Smile,
  ChevronLeft, RotateCcw, AlertCircle, Clock,
  X, FileText, ZoomIn
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSignalR } from '../../hooks/useSignalR';
import { caseService } from '../../services/caseService';
import { buildRoomKey, loadFromStorage, saveToStorage, mergeMessages } from '../../utils/chatStorage';
import type { StoredMessage } from '../../utils/chatStorage';
import DocumentViewerModal from '../shared/DocumentViewerModal';
import type { AttachmentItem } from '../shared/DocumentViewerModal';
import { useNotifications } from '../../context/NotificationContext';
import type { CallEventData } from '../../context/NotificationContext';
import { toast } from 'react-hot-toast';

type MessageStatus = 'sending' | 'sent' | 'failed';

const ACCEPTED_EXTS = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'webp'];
const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'image/jpeg', 'image/png', 'image/webp',
];
const MAX_FILE_SIZE_MB = 20;
const MAX_FILES = 5;

interface PendingFile {
  id: string;          // local uuid for React key
  file: File;
  status: 'uploading' | 'done' | 'error';
  documentId?: number;
  error?: string;
}

interface MessageAttachment {
  fileUrl: string;
  fileName: string;
}

interface Message {
  id: number;
  senderId: number;
  senderName: string;
  content: string;
  timestamp: string;
  isMe: boolean;
  status: MessageStatus;
  attachments?: MessageAttachment[];
}

interface ChatWindowProps {
  caseId: number;
  caseTitle: string;
  roomType: 'internal' | 'external';
  targetUserId?: number | null;   // For DMs only; case chats resolve on the backend
  participantName?: string;       // The OTHER person's display name
  isUnassigned?: boolean;
  onClose?: () => void;
}

// ─── Ext helpers ─────────────────────────────────────────────────────────────
const getExt = (name: string) => name.split('.').pop()?.toUpperCase() ?? 'FILE';
const IMAGE_EXTS = new Set(['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF']);
const EXT_BADGE: Record<string, string> = {
  PDF: 'bg-red-100 text-red-600',
  DOC: 'bg-blue-100 text-blue-600', DOCX: 'bg-blue-100 text-blue-600',
  TXT: 'bg-gray-100 text-gray-500',
  JPG: 'bg-purple-100 text-purple-600', JPEG: 'bg-purple-100 text-purple-600',
  PNG: 'bg-purple-100 text-purple-600', WEBP: 'bg-purple-100 text-purple-600',
};

// ─── Attachment pill inside a message bubble ──────────────────────────────────
const AttachmentBubble = ({
  attachments, isMe, onView,
}: {
  attachments: MessageAttachment[];
  isMe: boolean;
  onView: (idx: number) => void;
}) => (
  <div className="mt-2 flex flex-col gap-1.5">
    {attachments.map((a, i) => {
      const ext = getExt(a.fileName);
      const isImg = IMAGE_EXTS.has(ext);
      if (isImg) {
        return (
          <button key={i} onClick={() => onView(i)} className="block text-left">
            <img
              src={a.fileUrl}
              alt={a.fileName}
              className="max-w-[220px] max-h-[160px] rounded-xl object-cover hover:opacity-90 transition-opacity border border-white/20 cursor-zoom-in"
            />
          </button>
        );
      }
      return (
        <button
          key={i}
          onClick={() => onView(i)}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border transition-all hover:opacity-80 text-left w-full max-w-[260px] ${
            isMe
              ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
              : 'bg-gray-50 border-gray-200 text-law-navy hover:border-law-navy/30 hover:bg-gray-100'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span className="text-xs font-medium truncate flex-1">{a.fileName}</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
            isMe ? 'bg-white/20 text-white' : (EXT_BADGE[ext] ?? 'bg-gray-200 text-gray-500')
          }`}>{ext}</span>
          <ZoomIn className="w-3.5 h-3.5 shrink-0 opacity-50" />
        </button>
      );
    })}
  </div>
);

// ─── Pending upload queue item ────────────────────────────────────────────────
const PendingItem = ({ pf, onRemove }: { pf: PendingFile; onRemove: () => void }) => {
  const ext = getExt(pf.file.name);
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
      pf.status === 'error'
        ? 'bg-red-50 border-red-200 text-red-600'
        : pf.status === 'done'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
        : 'bg-accent-gold/10 border-accent-gold/30 text-law-navy'
    }`}>
      <FileText className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate max-w-[160px]">{pf.file.name}</span>
      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${EXT_BADGE[ext] ?? 'bg-gray-100 text-gray-500'}`}>{ext}</span>
      {pf.status === 'uploading' && (
        <div className="ml-auto w-3.5 h-3.5 border-2 border-accent-gold/40 border-t-accent-gold rounded-full animate-spin shrink-0" />
      )}
      {pf.status === 'done' && (
        <span className="ml-auto text-emerald-600 text-[10px] font-bold">✓</span>
      )}
      {pf.status === 'error' && (
        <span className="ml-auto text-red-500 text-[10px]" title={pf.error}>!</span>
      )}
      {pf.status !== 'uploading' && (
        <button onClick={onRemove} className="text-gray-400 hover:text-red-500 transition-colors shrink-0 ml-1">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

// ─── Main ChatWindow ──────────────────────────────────────────────────────────
const ChatWindow = ({ caseId, caseTitle, roomType, targetUserId, participantName, isUnassigned, onClose }: ChatWindowProps) => {
  const { user, accessToken } = useAuth();
  const { invokeHub, onCallEvent, offCallEvent, setActiveCall, activeCall } = useNotifications();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Refs to avoid stale closures in call event handlers
  const participantNameRef = useRef(participantName);
  const caseTitleRef = useRef(caseTitle);
  useEffect(() => { participantNameRef.current = participantName; }, [participantName]);
  useEffect(() => { caseTitleRef.current = caseTitle; }, [caseTitle]);

  // Multi-file upload queue
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  // Document viewer modal
  const [viewerAttachments, setViewerAttachments] = useState<AttachmentItem[] | null>(null);
  const [viewerInitialIdx, setViewerInitialIdx] = useState(0);

  const openViewer = useCallback((attachments: MessageAttachment[], idx: number) => {
    setViewerAttachments(attachments.map(a => ({ fileUrl: a.fileUrl, fileName: a.fileName })));
    setViewerInitialIdx(idx);
  }, []);

  const roomKey = user?.id ? buildRoomKey(user.id, caseId, roomType, targetUserId) : null;

  // ── Call handling ─────────────────────────────────────────────────────────
  const initiateCall = useCallback((callType: 'video' | 'audio') => {
    const roomName = `CB-${caseId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setIsCalling(true);
    toast.loading('Calling...', { id: 'call-toast', duration: 30000 });
    // Backend resolves target from caseId; for DMs pass targetUserId explicitly
    invokeHub('InitiateCall', caseId, roomType, roomName, callType, targetUserId ?? null);
  }, [caseId, roomType, targetUserId, invokeHub]);

  useEffect(() => {
    const handler = (event: CallEventData) => {
      if (event.type === 'initiated') {
        toast.dismiss('call-toast');
        setIsCalling(false);
        // Read from refs — always gets the latest value, never stale
        const name = participantNameRef.current || caseTitleRef.current;
        if (activeCall) setActiveCall({ ...activeCall, participantName: name });
      } else if (event.type === 'rejected') {
        toast.dismiss('call-toast');
        toast.error('Call was declined.');
        setActiveCall(null);
        setIsCalling(false);
      }
      // 'accepted' — WebRTC offer is created inside useWebRTC hook
    };
    onCallEvent(handler);
    return () => offCallEvent(handler);
  }, [onCallEvent, offCallEvent, setActiveCall]);

  const getHubUrl = () => {
    const base = (import.meta.env.VITE_CASES_API_URL || 'http://localhost:5035/api').replace(/\/api(\/v\d+)?$/, '');
    return `${base.replace(/\/$/, '')}/case-chat-hub`;
  };

  const { isConnected, joinRoom, sendMessage, on, off } = useSignalR(getHubUrl(), accessToken);

  useEffect(() => {
    if (isConnected) console.log('✅ Chat Connected:', caseId);
  }, [isConnected, caseId]);

  const scrollToBottom = () => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  };
  useEffect(() => { scrollToBottom(); }, [messages]);

  // Instant load from cache
  useEffect(() => {
    if (!roomKey) return;
    const cached = loadFromStorage(roomKey);
    if (cached.length > 0) setMessages(cached.map(m => ({ ...m, status: 'sent' as MessageStatus })));
  }, [roomKey]);

  // Load history from backend
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
          attachments: msg.attachments?.length ? msg.attachments : undefined,
        }));
        const cached = roomKey ? loadFromStorage(roomKey) : [];
        const merged = mergeMessages(backendMsgs, cached);
        if (roomKey) saveToStorage(roomKey, merged);
        setMessages(merged.map(m => ({ ...m, status: 'sent' as MessageStatus })));
      } catch (err) {
        console.error('Failed to load history:', err);
      }
    };
    if (isConnected) {
      joinRoom(caseId, roomType, targetUserId);
      loadHistory();
    }
  }, [isConnected, caseId, roomType, targetUserId, joinRoom, user?.id, roomKey]);

  // Real-time receiver
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
        attachments: msg.attachments?.length ? msg.attachments : undefined,
      };

      setMessages(prev => {
        let next: Message[];
        if (confirmed.isMe) {
          const tempIdx = prev.findIndex(m => m.id < 0 && m.content === confirmed.content && m.status === 'sending');
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
        if (roomKey) {
          const toStore: StoredMessage[] = next.filter(m => m.id > 0)
            .map(({ id, senderId, senderName, content, timestamp, isMe }) => ({ id, senderId, senderName, content, timestamp, isMe }));
          queueMicrotask(() => saveToStorage(roomKey, toStore));
        }
        return next;
      });
    };
    on('ReceiveMessage', handleReceive);
    return () => { off('ReceiveMessage'); };
  }, [on, off, user?.id, roomKey]);

  // ── File selection ────────────────────────────────────────────────────────
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) return `Exceeds ${MAX_FILE_SIZE_MB}MB limit`;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ACCEPTED_TYPES.includes(file.type) && !ACCEPTED_EXTS.includes(ext))
      return `Unsupported type (${ext.toUpperCase()})`;
    return null;
  };

  const uploadFile = useCallback(async (pf: PendingFile) => {
    try {
      const result = await caseService.uploadChatFile(pf.file);
      // result is { documentId: number, url: string, name: string }
      setPendingFiles(prev => prev.map(p =>
        p.id === pf.id ? { ...p, status: 'done', documentId: result.documentId } : p
      ));
    } catch (err) {
      setPendingFiles(prev => prev.map(p =>
        p.id === pf.id ? { ...p, status: 'error', error: 'Upload failed' } : p
      ));
    }
  }, []);

  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';

    const remaining = MAX_FILES - pendingFiles.length;
    const toAdd = files.slice(0, remaining);

    const newEntries: PendingFile[] = toAdd.map(file => {
      const error = validateFile(file);
      return {
        id: `${Date.now()}-${Math.random()}`,
        file,
        status: error ? 'error' : 'uploading',
        error: error ?? undefined,
      };
    });

    setPendingFiles(prev => [...prev, ...newEntries]);

    // Upload valid files immediately in background
    for (const pf of newEntries) {
      if (pf.status === 'uploading') uploadFile(pf);
    }
  }, [pendingFiles, uploadFile]);

  const removeFile = useCallback((id: string) => {
    setPendingFiles(prev => prev.filter(p => p.id !== id));
  }, []);

  // ── Send ──────────────────────────────────────────────────────────────────
  const hasUploadingFiles = pendingFiles.some(p => p.status === 'uploading');
  const validDocIds = pendingFiles.filter(p => p.status === 'done' && p.documentId).map(p => p.documentId!);

  const canSend = !isUnassigned && isConnected && !hasUploadingFiles
    && (!!inputText.trim() || validDocIds.length > 0);

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
    if (!canSend) return;

    const text = inputText.trim();
    const docIds = validDocIds.length > 0 ? [...validDocIds] : null;
    const optimisticAttachments = pendingFiles
      .filter(p => p.status === 'done')
      .map(p => ({ fileUrl: URL.createObjectURL(p.file), fileName: p.file.name }));

    const tempId = -Date.now();
    const optimistic: Message = {
      id: tempId,
      senderId: user?.id ?? 0,
      senderName: user?.fullName ?? 'Me',
      content: text,
      timestamp: new Date().toISOString(),
      isMe: true,
      status: 'sending',
      attachments: optimisticAttachments.length ? optimisticAttachments : undefined,
    };
    setMessages(prev => [...prev, optimistic]);
    setInputText('');
    setPendingFiles([]);

    try {
      await sendMessage(caseId, roomType, text, targetUserId, null, docIds);
    } catch (err: any) {
      alert("SignalR Error: " + err.message);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
    }
  };

  const formatTimestamp = (ts: string) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <div className="flex flex-col h-full bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="md:hidden p-2 -ml-2 text-gray-400 hover:text-law-navy transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="relative">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm ${
                roomType === 'internal' && !targetUserId ? 'bg-law-navy text-white' : 'bg-accent-gold/10 text-law-navy border border-accent-gold/20'
              }`}>
                {roomType === 'internal' && !targetUserId ? <Building2 className="w-6 h-6" /> : caseTitle.charAt(0)}
              </div>
              {isConnected && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-4 border-white rounded-full" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-law-navy truncate leading-tight">{caseTitle}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                  roomType === 'internal' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                }`}>{roomType === 'internal' ? 'Internal Team' : 'Client Channel'}</span>
                <span className="text-[10px] text-gray-400 font-medium">• 2 Participants</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={isUnassigned || isCalling}
              onClick={() => initiateCall('audio')}
              className="p-2 text-gray-400 hover:text-law-navy hover:bg-gray-50 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Voice call"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              disabled={isUnassigned || isCalling}
              onClick={() => initiateCall('video')}
              className="p-2 text-gray-400 hover:text-law-navy hover:bg-gray-50 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Video call"
            >
              <Video className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-400 hover:text-law-navy hover:bg-gray-50 rounded-xl transition-all"><MoreVertical className="w-4 h-4" /></button>
          </div>
        </div>

        {/* ── Messages ───────────────────────────────────────────────────── */}
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
            <div key={msg.id || idx} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
              {!msg.isMe && (
                <span className="text-[10px] font-bold text-law-slate ml-4 mb-1 opacity-60">{msg.senderName}</span>
              )}
              <div className={`group flex items-end gap-2 max-w-[85%] md:max-w-[70%] ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`px-5 py-3.5 rounded-2xl shadow-sm text-sm leading-relaxed transition-opacity ${
                  msg.isMe
                    ? 'bg-law-navy text-white rounded-tr-none'
                    : 'bg-white text-law-navy border border-gray-100 rounded-tl-none'
                } ${msg.status === 'sending' ? 'opacity-60' : 'opacity-100'}`}>
                  {msg.content && <p>{msg.content}</p>}
                  {msg.attachments?.length ? (
                    <AttachmentBubble
                      attachments={msg.attachments}
                      isMe={msg.isMe}
                      onView={(i) => openViewer(msg.attachments!, i)}
                    />
                  ) : null}
                  <div className={`flex items-center justify-end gap-1.5 mt-1 text-[9px] ${msg.isMe ? 'text-white/60' : 'text-law-slate/60'}`}>
                    {formatTimestamp(msg.timestamp)}
                    {msg.isMe && (
                      msg.status === 'sending' ? <Clock className="w-3 h-3 animate-pulse" />
                      : msg.status === 'failed' ? <AlertCircle className="w-3 h-3 text-red-400" />
                      : <CheckCheck className="w-3 h-3" />
                    )}
                  </div>
                </div>
              </div>
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

        {/* ── Input area ─────────────────────────────────────────────────── */}
        <div className="p-4 md:p-6 bg-white border-t border-gray-100">
          {isUnassigned && roomType === 'external' && (
            <div className="mb-3 text-center text-xs font-bold text-amber-600 bg-amber-50 py-2.5 px-4 rounded-xl border border-amber-100 shadow-sm">
              {user?.userType === 'Client'
                ? 'Your case is awaiting assignment. Chat will unlock once an advocate claims your file.'
                : 'This case is currently unassigned. Chat is in read-only historical mode.'}
            </div>
          )}

          {/* Upload queue */}
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {pendingFiles.map(pf => (
                <PendingItem key={pf.id} pf={pf} onRemove={() => removeFile(pf.id)} />
              ))}
            </div>
          )}

          {/* Counter hint */}
          {pendingFiles.length > 0 && (
            <p className="text-[10px] text-gray-400 mb-2 font-medium">
              {pendingFiles.filter(p => p.status === 'done').length}/{pendingFiles.length} file(s) ready
              {pendingFiles.length >= MAX_FILES && ` · max ${MAX_FILES} files`}
            </p>
          )}

          {/* Hidden multi-file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handleFileInputChange}
          />

          <form
            onSubmit={handleSend}
            className={`flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100 transition-all ${
              !isUnassigned ? 'focus-within:ring-2 focus-within:ring-accent-gold/20 focus-within:border-accent-gold/40' : 'opacity-70 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={isUnassigned || pendingFiles.length >= MAX_FILES}
                onClick={() => fileInputRef.current?.click()}
                className={`p-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  pendingFiles.length > 0
                    ? 'text-accent-gold bg-accent-gold/10'
                    : 'text-law-slate hover:text-law-navy hover:bg-gray-200'
                }`}
                title={`Attach files (max ${MAX_FILES})`}
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <button
                type="button"
                disabled={isUnassigned}
                className="p-2.5 text-law-slate hover:text-law-navy hover:bg-gray-200 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Smile className="w-5 h-5" />
              </button>
            </div>

            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              disabled={isUnassigned}
              placeholder={
                hasUploadingFiles ? 'Uploading…'
                : pendingFiles.length > 0 ? 'Add a message or send files…'
                : isUnassigned ? 'Chat is disabled…'
                : 'Type a professional message…'
              }
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-law-navy placeholder:text-gray-400 py-3 disabled:cursor-not-allowed"
            />

            <button
              type="submit"
              disabled={!canSend}
              className={`p-3 rounded-xl transition-all shadow-md ${
                canSend
                  ? 'bg-law-navy text-white hover:scale-105 active:scale-95'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <p className="text-[10px] text-center text-gray-400 mt-3 font-medium">
            Press Enter to send · Up to {MAX_FILES} files per message · Max {MAX_FILE_SIZE_MB}MB each
          </p>
        </div>
      </div>

      {/* ── Document viewer modal ───────────────────────────────────────── */}
      {viewerAttachments && (
        <DocumentViewerModal
          attachments={viewerAttachments}
          initialIndex={viewerInitialIdx}
          onClose={() => setViewerAttachments(null)}
        />
      )}
    </>
  );
};

export default ChatWindow;
