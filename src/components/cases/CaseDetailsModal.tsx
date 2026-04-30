import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, DollarSign, Calendar, Clock, CheckCircle } from 'lucide-react';
import type { Case } from '../../types/case.types';
import { caseService } from '../../services/caseService';
import toast from 'react-hot-toast';

interface CaseDetailsModalProps {
  caseData: Case;
  onClose: () => void;
  userRole: string;
}

const CaseDetailsModal = ({ caseData, onClose, userRole }: CaseDetailsModalProps) => {
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await caseService.claimCase(caseData.id);
      setClaimed(true);
      toast.success('Case successfully claimed!');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to claim case.');
    } finally {
      setClaiming(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Recent';
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
          className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-law-navy p-6 md:p-8 text-white relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-gold opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
            
            <div className="relative z-10 flex justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-3 py-1 bg-white/10 text-white text-xs font-bold rounded-md flex items-center gap-1.5">
                    <Briefcase className="w-3 h-3" /> {caseData.category}
                  </span>
                  <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs font-bold rounded-full border border-green-500/30">
                    {caseData.status}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-serif font-bold pr-8">{caseData.title}</h2>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8 overflow-y-auto">
            <div className="grid md:grid-cols-3 gap-8">
              
              <div className="md:col-span-2 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-law-slate uppercase tracking-wider mb-3">Case Description</h3>
                  <div className="prose prose-sm text-law-navy/80 whitespace-pre-wrap">
                    {caseData.description}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <h3 className="text-sm font-bold text-law-slate uppercase tracking-wider mb-4">Case Details</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent-gold/10 flex items-center justify-center text-accent-gold shrink-0">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-law-slate font-medium">Budget</p>
                        <p className="text-sm font-bold text-law-navy">${caseData.budget.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-law-slate font-medium">Posted On</p>
                        <p className="text-sm font-bold text-law-navy">{formatDate(caseData.createdAt)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-law-slate font-medium">Expected Timeline</p>
                        <p className="text-sm font-bold text-law-navy">Standard</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Claim Button - Only visible to Lawyers/Juniors */}
                {(userRole === 'Lawyer' || userRole === 'Junior') && (
                  <div className="pt-4 border-t border-gray-100">
                    <button 
                      onClick={handleClaim}
                      disabled={claiming || claimed || caseData.status !== 'Open'}
                      className={`w-full py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                        claimed 
                          ? 'bg-green-500 text-white cursor-default' 
                          : 'bg-law-navy hover:bg-law-navy/90 text-white shadow-lg shadow-law-navy/20 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      {claimed ? (
                        <><CheckCircle className="w-5 h-5" /> Claimed Successfully</>
                      ) : claiming ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        'Claim This Case'
                      )}
                    </button>
                    <p className="text-xs text-center text-law-slate mt-3">
                      By claiming this case, you agree to the marketplace terms of service.
                    </p>
                  </div>
                )}
              </div>
              
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CaseDetailsModal;
