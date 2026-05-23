import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, User, Sparkles, ShieldCheck, Lightbulb, ChevronRight } from 'lucide-react';
import { aiService } from '../services/aiService';
import ReactMarkdown from 'react-markdown';

interface AiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: number;
  caseDetails?: string;
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

const AiChatModal: React.FC<AiChatModalProps> = ({ isOpen, onClose, caseId, caseDetails }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'ai',
          content: 'Hello! I am your AI Legal Assistant. I have analyzed all the documents uploaded to this case. Ask me anything!'
        }
      ]);
    }
  }, [isOpen, messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input };
    
    // Create the history payload, filtering out the initial welcome message
    // Map 'ai' to 'model' for the backend mapping logic to pick up correctly
    const currentHistory = messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({
        role: m.role === 'ai' ? 'model' : 'user',
        text: m.content
      }));
      
    // Append the new message to the payload
    currentHistory.push({ role: 'user', text: userMessage.content });

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const answer = await aiService.askQuestion({ 
        caseId, 
        caseDetails,
        history: currentHistory 
      });
      const aiMessage: Message = { id: (Date.now() + 1).toString(), role: 'ai', content: answer };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', content: "I'm sorry, I encountered an error analyzing the case documents." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-law-navy/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 md:inset-auto md:w-[600px] md:h-[700px] bg-white rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden z-50 md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 border border-white/40 ring-1 ring-black/5"
          >
            {/* Header */}
            <div className="relative p-6 shrink-0 overflow-hidden bg-gradient-to-br from-law-navy via-[#1e293b] to-law-navy shadow-md">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
              <div className="absolute top-0 right-0 w-48 h-48 bg-accent-gold opacity-20 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/4 animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500 opacity-20 rounded-full blur-[30px] translate-y-1/2 -translate-x-1/4"></div>
              <div className="relative z-10 flex justify-between items-center text-white">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 shadow-inner">
                    <Sparkles className="w-5 h-5 text-accent-gold" />
                  </div>
                  <div>
                    <h3 className="font-bold font-serif text-lg leading-tight">AI Case Assistant</h3>
                    <p className="text-xs text-white/70">Powered by CaseBridge AI</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-gray-50 to-[#f8fafc]">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-md ${msg.role === 'user' ? 'bg-gradient-to-br from-law-navy to-[#1e293b] text-white' : 'bg-gradient-to-br from-white to-gray-50 text-accent-gold border border-gray-100/80 ring-1 ring-black/5'}`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                    <div className={`p-4 rounded-2xl text-[15px] shadow-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-law-navy to-[#1e293b] text-white rounded-tr-sm shadow-md' 
                      : 'bg-white text-law-slate border border-gray-100 rounded-tl-sm ring-1 ring-black/5'
                  }`}>
                    {msg.role === 'ai' ? (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold text-law-navy">{children}</strong>,
                          ol: ({ children }) => <ol className="list-decimal list-outside ml-4 space-y-1.5 mt-1">{children}</ol>,
                          ul: ({ children }) => <ul className="list-disc list-outside ml-4 space-y-1.5 mt-1">{children}</ul>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Suggestions for New Chat */}
              {messages.length === 1 && !isLoading && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col gap-2 mt-4 ml-12"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-law-navy/60 uppercase tracking-wider mb-1 ml-1">
                    <Lightbulb className="w-3.5 h-3.5 text-accent-gold" /> Suggested Questions
                  </div>
                  {[
                    "Can you summarize the main arguments in this case?",
                    "What is the total budget or financial claim?",
                    "Are there any critical deadlines mentioned?",
                    "Who are the primary parties involved?"
                  ].map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(suggestion)}
                      className="text-left py-2.5 px-4 bg-white hover:bg-gray-50 border border-gray-100 rounded-xl text-[13px] text-law-slate hover:text-law-navy transition-all shadow-sm ring-1 ring-black/5 flex items-center justify-between group max-w-[85%]"
                    >
                      {suggestion}
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-accent-gold transition-colors" />
                    </button>
                  ))}
                </motion.div>
              )}

              {/* Loader */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 max-w-[85%]"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-white to-gray-50 text-accent-gold border border-gray-100 ring-1 ring-black/5 flex items-center justify-center shrink-0 shadow-md">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-gray-100 rounded-tl-sm shadow-sm ring-1 ring-black/5 flex items-center gap-3">
                    {/* RGB Animated Loader */}
                    <div className="flex gap-1">
                      <motion.div 
                        animate={{ scale: [1, 1.5, 1], backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#3b82f6'] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                        className="w-2 h-2 rounded-full"
                      />
                      <motion.div 
                        animate={{ scale: [1, 1.5, 1], backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#3b82f6'] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                        className="w-2 h-2 rounded-full"
                      />
                      <motion.div 
                        animate={{ scale: [1, 1.5, 1], backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#3b82f6'] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                        className="w-2 h-2 rounded-full"
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-400 ml-2">Analyzing documents...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Security Notice */}
            <div className="bg-gray-50/80 px-6 py-2.5 flex items-center justify-center gap-2 border-t border-gray-100">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <p className="text-[11px] text-gray-500 font-medium">
                Enterprise Grade Security. Your documents are 100% secured and never shared with third parties.
              </p>
            </div>

            {/* Input Area */}
            <div className="p-5 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
              <form onSubmit={handleSend} className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question about the case documents..."
                  className="w-full bg-gray-50/80 border border-gray-200 rounded-2xl py-4 pl-5 pr-14 outline-none focus:bg-white focus:border-accent-gold focus:ring-4 focus:ring-accent-gold/10 transition-all text-[15px] text-law-navy shadow-inner"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 w-11 h-11 rounded-xl bg-gradient-to-br from-law-navy to-[#1e293b] hover:from-[#1e293b] hover:to-[#0f172a] text-white flex items-center justify-center transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AiChatModal;
