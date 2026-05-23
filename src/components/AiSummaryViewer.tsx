import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, BookOpen } from 'lucide-react';

interface AiSummaryViewerProps {
  summary: string;
  isCompact?: boolean;
}

const AiSummaryViewer: React.FC<AiSummaryViewerProps> = ({ summary, isCompact = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!summary) return null;

  const maxLength = isCompact ? 100 : 250;
  const isLong = summary.length > maxLength;
  const displaySummary = isExpanded || !isLong ? summary : `${summary.substring(0, maxLength)}...`;

  return (
    <>
      {/* Compact Teaser Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] border border-[#e2e8f0] p-6 shadow-sm group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-accent-gold/20 transition-colors duration-500"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-law-navy/5 border border-law-navy/10">
                <Sparkles className="w-4 h-4 text-accent-gold animate-pulse" />
              </div>
              <h3 className="text-sm font-bold text-law-navy font-serif uppercase tracking-wider">AI Case Summary</h3>
            </div>
            {isLong && (
              <button 
                onClick={() => setIsExpanded(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-law-navy text-white text-xs font-semibold hover:bg-accent-gold transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" /> Read Full
              </button>
            )}
          </div>
          
          <div className="text-law-slate text-[15px] leading-relaxed relative">
            <p className="whitespace-pre-wrap">{displaySummary}</p>
          </div>
        </div>
      </div>

      {/* Full Screen Modal */}
      <AnimatePresence>
        {isExpanded && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpanded(false)}
              className="absolute inset-0 bg-law-navy/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-law-navy to-law-slate text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
                    <Sparkles className="w-5 h-5 text-accent-gold" />
                  </div>
                  <div>
                    <h2 className="text-xl font-serif font-bold tracking-wide">Comprehensive AI Summary</h2>
                    <p className="text-xs text-white/70">Generated from uploaded case documents</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsExpanded(false)}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="p-6 md:p-8 overflow-y-auto bg-[#fafafa]">
                <div className="prose prose-sm sm:prose-base max-w-none text-law-slate leading-loose font-serif">
                  <p className="whitespace-pre-wrap">{summary}</p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-gray-100 bg-white flex justify-end">
                <button 
                  onClick={() => setIsExpanded(false)}
                  className="px-6 py-2.5 rounded-xl border border-gray-200 text-law-navy font-semibold hover:bg-gray-50 transition-colors"
                >
                  Close Summary
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AiSummaryViewer;
