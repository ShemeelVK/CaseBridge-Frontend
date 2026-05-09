import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Search, Building2,
  Circle, Star, Briefcase, Plus, Shield
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { caseService } from '../../services/caseService';
import { firmService, type FirmMembers } from '../../services/firmService';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { useSignalR } from '../../hooks/useSignalR';
import ChatWindow from '../../components/chat/ChatWindow';
import type { Case } from '../../types/case.types';
import type { Associate } from '../../services/firmService';
import { useNotifications } from '../../context/NotificationContext';

const MessagesPage = () => {
  const { user, accessToken } = useAuth();
  const { clearUnread, roomUnread, setActiveRoom } = useNotifications();
  const [searchParams] = useSearchParams();
  const axiosPrivate = useAxiosPrivate();
  const [cases, setCases] = useState<Case[]>([]);
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [senior, setSenior] = useState<Associate | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<{ id: number; title: string; type: 'internal' | 'external'; targetUserId?: number; isUnassigned?: boolean } | null>(null);
  const [incomingCaseIds, setIncomingCaseIds] = useState<Set<number>>(new Set());
  // lastMessage preview and unread badge per caseId
  const [channelMeta, setChannelMeta] = useState<Record<number, { lastMessage: string; hasUnread: boolean }>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'cases' | 'firm'>('cases');
  const casesRef = useRef<Case[]>([]);
  const selectedChatRef = useRef(selectedChat);
  const fetchCasesRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Background SignalR connection for sidebar unread preview updates only
  const hubUrl = (() => {
    const casesApiUrl = import.meta.env.VITE_CASES_API_URL || 'http://localhost:5035/api';
    const base = casesApiUrl.replace(/\/api(\/v\d+)?$/, '');
    return `${base.replace(/\/$/, '')}/case-chat-hub`;
  })();
  const { isConnected: bgConnected, joinRoom: bgJoinRoom, on: bgOn, off: bgOff } = useSignalR(hubUrl, accessToken);

  const isLawyerUser = user?.userType === 'Lawyer' || user?.userType === 'Junior';

  // Keep refs in sync so the listener closure always has fresh data
  useEffect(() => { casesRef.current = cases; }, [cases]);
  useEffect(() => {
    selectedChatRef.current = selectedChat;
    // Tell NotificationContext which room is active so it skips counting its messages
    setActiveRoom(selectedChat?.type === 'external' ? selectedChat.id : null);
  }, [selectedChat, setActiveRoom]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let casesData: Case[] = [];
        let membersData: FirmMembers | null = null;

        if (user?.userType === 'Client') {
          casesData = await caseService.getClientCases();
        } else {
          casesData = await caseService.getFirmChatCases();
          // Fetch firm members (senior and colleagues)
          membersData = await firmService.getMyAssociates(axiosPrivate);
          setAssociates(membersData.associates || []);
          if (membersData.senior) {
            setSenior(membersData.senior);
          }
        }
        setCases(casesData);

        // Handle URL Parameters for auto-selecting chat
        const urlCaseId = searchParams.get('caseId');
        const urlTargetUserId = searchParams.get('targetUserId');

        if (urlCaseId) {
          const targetCase = casesData.find(c => c.id === parseInt(urlCaseId));
          if (targetCase) {
            setSelectedChat({ id: targetCase.id, title: targetCase.title, type: 'external', isUnassigned: targetCase.assignedFirmId == null });
          }
        } else if (urlTargetUserId && membersData) {
          const id = parseInt(urlTargetUserId);
          const targetMember = (membersData.associates.find(a => a.Id === id)) || (membersData.senior?.Id === id ? membersData.senior : null);
          if (targetMember) {
            setSelectedChat({ id: 0, title: targetMember.FullName, type: 'internal', targetUserId: targetMember.Id });
          }
        }
      } catch (err) {
        console.error('Failed to load messaging data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Store fetchData in a ref so the listener can call it for brand-new channels
    fetchCasesRef.current = fetchData;
  }, [user, axiosPrivate, searchParams]);

  // Background: join all case rooms so real-time messages arrive
  useEffect(() => {
    if (!bgConnected || cases.length === 0) return;
    cases.forEach(c => {
      bgJoinRoom(c.id, 'external', null);
    });
  }, [bgConnected, cases, bgJoinRoom]);

  // Background: listen for incoming messages — update sidebar + auto-surface conversation
  useEffect(() => {
    const handleIncoming = (msg: any) => {
      const caseId = msg.caseId as number;
      const currentCases = casesRef.current;
      const currentSelected = selectedChatRef.current;

      // If the message is for the currently open chat, ignore (ChatWindow handles rendering)
      if (currentSelected?.id === caseId) return;

      const relatedCase = currentCases.find(c => c.id === caseId);

      if (!relatedCase) {
        // Brand-new channel: re-fetch cases so the sidebar shows it, then join its room
        fetchCasesRef.current().then(() => {
          bgJoinRoom(caseId, 'external', null);
        });
        return;
      }

      // Update last message preview only (sound + global badge handled by NotificationContext)
      setChannelMeta(prev => ({
        ...prev,
        [caseId]: {
          lastMessage: msg.text || '',
          hasUnread: msg.senderId !== user?.id
        }
      }));

      // Move this case to top of list
      setCases(prev => {
        const others = prev.filter(c => c.id !== caseId);
        return [relatedCase, ...others];
      });

      // Mark as incoming so it passes the sidebar filter
      setIncomingCaseIds(prev => new Set(prev).add(caseId));
      // Badge and sound are handled by NotificationContext — user opens manually
    };

    bgOn('ReceiveMessage', handleIncoming);
    return () => bgOff('ReceiveMessage');
  }, [bgOn, bgOff, bgJoinRoom, user?.id]);

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.lawyerName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // The backend already filters out irrelevant cases. 
    // If the API returns it, we should show it (it's either active or a dropped case with history).
    return matchesSearch;
  });

  const filteredAssociates = associates.filter(a => 
    a.FullName.toLowerCase().includes(searchTerm.toLowerCase()) && a.Id !== user?.id
  );

  return (
    <div className="h-[calc(100vh-80px)] flex bg-[#f8f9fb] overflow-hidden">
      
      {/* Sidebar: Conversation List */}
      <div className={`
        w-full md:w-[400px] bg-white flex flex-col border-r border-gray-100 shadow-sm z-20
        ${selectedChat ? 'hidden md:flex' : 'flex'}
      `}>
        {/* Sidebar Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-law-navy">Messages</h1>
            <button className="p-2 bg-law-navy/5 text-law-navy rounded-xl hover:bg-law-navy/10 transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-accent-gold/30 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent-gold/5 transition-all text-sm"
            />
          </div>

          {/* Navigation Tabs (Lawyer only) */}
          {isLawyerUser && (
            <div className="flex p-1 bg-gray-50 rounded-xl mb-2">
              <button 
                onClick={() => setActiveTab('cases')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'cases' ? 'bg-white text-law-navy shadow-sm' : 'text-gray-400 hover:text-law-navy'}`}
              >
                <Briefcase className="w-3.5 h-3.5" /> Case Channels
              </button>
              <button 
                onClick={() => setActiveTab('firm')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'firm' ? 'bg-white text-law-navy shadow-sm' : 'text-gray-400 hover:text-law-navy'}`}
              >
                <Building2 className="w-3.5 h-3.5" /> Firm Office
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Conversation List */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1 custom-scrollbar">
          
          <AnimatePresence mode="wait">
            {activeTab === 'cases' ? (
              <motion.div
                key="cases-tab"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-1"
              >
                {loading ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-8 h-8 border-3 border-law-navy/10 border-t-law-navy rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs text-gray-400 font-medium tracking-wide">Syncing secure channels...</p>
                  </div>
                ) : filteredCases.length === 0 ? (
                  <div className="py-20 text-center">
                    <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-400 font-medium">No active case channels</p>
                  </div>
                ) : filteredCases.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedChat({ id: c.id, title: c.title, type: 'external', isUnassigned: c.assignedFirmId == null });
                      setChannelMeta(prev => prev[c.id] ? { ...prev, [c.id]: { ...prev[c.id], hasUnread: false } } : prev);
                      clearUnread(c.id);
                    }}
                    className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all group mb-1 ${selectedChat?.id === c.id && selectedChat.type === 'external' ? 'bg-law-navy text-white shadow-xl shadow-law-navy/20' : 'hover:bg-gray-50'}`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${selectedChat?.id === c.id ? 'bg-white/20' : 'bg-accent-gold/10 text-accent-gold'}`}>
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="font-bold truncate text-[15px]">
                          {user?.userType === 'Client' ? (c.lawyerName || 'Private Lawyer') : (c.clientName || 'Private Client')}
                        </h4>
                        {(roomUnread[c.id] ?? 0) > 0 && (
                          <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ml-2">
                            {roomUnread[c.id]}
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] truncate opacity-70 ${selectedChat?.id === c.id ? 'text-white' : 'text-law-slate'}`}>
                        {channelMeta[c.id]?.lastMessage || c.category}
                      </p>
                    </div>
                  </button>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="firm-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                {/* Section: Firm HQ Removed */}

                {/* Section: Direct Messages */}
                <div className="space-y-1">
                  <p className="px-4 text-[10px] font-bold text-law-slate uppercase tracking-widest mb-2 opacity-50">Direct Messages</p>
                  
                  {senior && (
                    <button
                      onClick={() => setSelectedChat({ id: 0, title: senior.FullName, type: 'internal', targetUserId: senior.Id })}
                      className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${selectedChat?.targetUserId === senior.Id ? 'bg-law-navy text-white shadow-xl shadow-law-navy/20' : 'hover:bg-gray-50'}`}
                    >
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-2xl bg-accent-gold text-law-navy flex items-center justify-center font-bold text-lg border-2 border-accent-gold/20 shadow-sm">
                          {senior.FullName.charAt(0)}
                        </div>
                        <div className="absolute -top-1 -right-1 p-1 bg-accent-gold rounded-lg shadow-sm border border-white">
                          <Star className="w-2.5 h-2.5 text-law-navy fill-law-navy" />
                        </div>
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <h4 className="font-bold text-[15px] truncate">{senior.FullName}</h4>
                        <p className={`text-[11px] font-bold tracking-tight uppercase ${selectedChat?.targetUserId === senior.Id ? 'text-white/70' : 'text-accent-gold'}`}>Senior Advocate</p>
                      </div>
                    </button>
                  )}

                  {filteredAssociates.map(a => (
                    <button
                      key={a.Id}
                      onClick={() => setSelectedChat({ id: 0, title: a.FullName, type: 'internal', targetUserId: a.Id })}
                      className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${selectedChat?.targetUserId === a.Id ? 'bg-law-navy text-white shadow-xl shadow-law-navy/20' : 'hover:bg-gray-50'}`}
                    >
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center font-bold text-lg text-law-navy border border-gray-200 shadow-sm">
                          {a.FullName.charAt(0)}
                        </div>
                        <Circle className="w-3.5 h-3.5 absolute -bottom-1 -right-1 text-green-500 fill-green-500 border-2 border-white rounded-full" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <h4 className="font-bold text-[15px] truncate">{a.FullName}</h4>
                        <p className={`text-[11px] font-medium opacity-60 ${selectedChat?.targetUserId === a.Id ? 'text-white/70' : 'text-law-slate'}`}>Associate</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Content: Chat Window */}
      <div className="flex-1 flex flex-col relative bg-white md:m-4 md:rounded-3xl shadow-2xl shadow-law-navy/5 overflow-hidden">
        <AnimatePresence mode="wait">
          {selectedChat ? (
            <motion.div 
              key={`${selectedChat.id}-${selectedChat.targetUserId}-${selectedChat.type}`} 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 1.02 }} 
              className="absolute inset-0"
            >
              <ChatWindow
                caseId={selectedChat.id}
                caseTitle={selectedChat.title}
                roomType={selectedChat.type}
                targetUserId={selectedChat.targetUserId}
                isUnassigned={selectedChat.isUnassigned}
                onClose={() => setSelectedChat(null)}
              />
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-12 bg-gray-50/50">
              <div className="relative mb-8">
                <div className="w-32 h-32 bg-white rounded-[40px] shadow-2xl flex items-center justify-center animate-pulse">
                  <MessageSquare className="w-14 h-14 text-accent-gold" />
                </div>
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-law-navy rounded-2xl shadow-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-serif font-bold text-law-navy mb-4">Secure Firm Communications</h2>
              <p className="text-law-slate max-w-sm leading-relaxed text-sm">
                Select a case channel or firm member to start a protected, encrypted conversation. 
                <br />
                <span className="font-bold text-law-navy opacity-80 mt-2 block italic text-xs">Law-Abiding & Compliant.</span>
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MessagesPage;
