import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, DollarSign, Calendar, ChevronRight } from 'lucide-react';
import type { Case } from '../../types/case.types';
import { useNavigate } from 'react-router-dom';

interface CasePreviewModalProps {
  caseData: Case;
  onClose: () => void;
}

const CasePreviewModal = ({ caseData, onClose }: CasePreviewModalProps) => {
  const navigate = useNavigate();

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Recent';
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleViewDetails = () => {
    onClose();
    navigate(`/marketplace/case/${caseData.id}`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-law-navy/40 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gray-50 border-b border-gray-100 p-6 flex justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2.5 py-1 bg-white text-law-navy border border-gray-200 text-xs font-bold rounded-md flex items-center gap-1.5 shadow-sm">
                  <Briefcase className="w-3 h-3 text-law-slate" /> {caseData.category}
                </span>
                <span className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-100 text-xs font-bold rounded-full">
                  {caseData.status}
                </span>
              </div>
              <h2 className="text-xl font-bold text-law-navy pr-8 line-clamp-2">{caseData.title}</h2>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white border border-gray-200 text-law-slate hover:bg-gray-100 flex items-center justify-center transition-colors shrink-0 shadow-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto">
            <p className="text-sm text-law-slate mb-6 line-clamp-4 leading-relaxed">
              {caseData.description}
            </p>

            <div className="flex flex-wrap gap-6 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-accent-gold/10 flex items-center justify-center text-accent-gold">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-law-slate font-bold uppercase tracking-wider">Budget</p>
                  <p className="text-sm font-bold text-law-navy">${caseData.budget.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-law-slate font-bold uppercase tracking-wider">Posted</p>
                  <p className="text-sm font-bold text-law-navy">{formatDate(caseData.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                  <span className="text-xs font-bold">{caseData.clientName?.charAt(0) || 'C'}</span>
                </div>
                <div>
                  <p className="text-[10px] text-law-slate font-bold uppercase tracking-wider">Client</p>
                  <p className="text-sm font-bold text-law-navy truncate max-w-[120px]">{caseData.clientName || 'Private Client'}</p>
                </div>
              </div>
            </div>

            <button 
              onClick={handleViewDetails}
              className="w-full py-3.5 px-6 rounded-xl font-bold flex items-center justify-center gap-2 bg-law-navy hover:bg-law-navy/90 text-white transition-all shadow-md hover:shadow-lg"
            >
              View Full Details <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CasePreviewModal;
