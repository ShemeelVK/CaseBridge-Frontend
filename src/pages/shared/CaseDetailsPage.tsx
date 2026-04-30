import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { caseService } from '../../services/caseService';
import type { Case } from '../../types/case.types';
import { ArrowLeft, Briefcase, DollarSign, Calendar, Clock, CheckCircle, User, ShieldCheck, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const CaseDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext) || {};
  
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    const fetchCaseDetails = async () => {
      if (!id) return;
      try {
        const data = await caseService.getCaseById(parseInt(id));
        setCaseData(data);
      } catch (error) {
        toast.error('Failed to load case details');
        // Fallback for visual demo if backend is offline
        setCaseData({ 
          id: parseInt(id), 
          clientId: 101, 
          title: 'Sample Corporate Case ' + id, 
          category: 'Corporate', 
          description: 'This is a highly detailed view of the case. It contains all the necessary information for a lawyer to make an informed decision on whether to claim it. The client is seeking immediate assistance regarding a complex legal matter involving multiple jurisdictions and corporate entities. \n\nRequirements:\n- Must have 5+ years of corporate law experience.\n- Must be licensed in the state of NY.\n- Budget is firm at the stated amount.', 
          budget: 15000, 
          status: 'Open', 
          lastModifiedByUserId: 101, 
          createdAt: new Date().toISOString() 
        });
      } finally {
        setLoading(false);
      }
    };
    fetchCaseDetails();
  }, [id]);

  const handleClaim = async () => {
    if (!caseData) return;
    setClaiming(true);
    try {
      await caseService.claimCase(caseData.id);
      setClaimed(true);
      toast.success('Case successfully claimed! It has been added to your dashboard.');
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

  const getStatusText = (status: string | number | undefined) => {
    if (status === 1 || status === 'Open') return 'Open';
    if (status === 2 || status === 'InReview') return 'In Review';
    if (status === 3 || status === 'Closed') return 'Closed';
    return String(status || 'Unknown');
  };

  const currentStatus = getStatusText(caseData?.status);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-law-navy/20 border-t-law-navy rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-law-navy">Case not found</h2>
        <button onClick={() => navigate('/marketplace')} className="mt-4 text-accent-gold hover:underline">Back to Marketplace</button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-8 pb-12"
    >
      <button 
        onClick={() => navigate('/marketplace')}
        className="flex items-center gap-2 text-law-slate hover:text-law-navy transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Marketplace
      </button>

      {/* Header Banner */}
      <div className="bg-law-navy rounded-3xl p-8 md:p-12 shadow-lg relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-gold opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8 justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1.5 bg-white/10 border border-white/20 text-white text-xs font-bold rounded-md flex items-center gap-1.5">
                <Briefcase className="w-4 h-4" /> {caseData.category}
              </span>
              <span className="px-3 py-1.5 bg-green-500/20 text-green-300 border border-green-500/30 text-xs font-bold rounded-full">
                {currentStatus}
              </span>
              <span className="text-white/60 text-sm">Case #{caseData.id}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-serif font-bold leading-tight mb-4">{caseData.title}</h1>
            <div className="flex items-center gap-6 text-white/70 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Posted {formatDate(caseData.createdAt)}
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shrink-0 w-full md:w-64">
            <p className="text-white/70 text-sm font-medium mb-1">Approved Budget</p>
            <p className="text-4xl font-bold text-accent-gold">${caseData.budget.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Left Column: Description */}
        <div className="md:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <h2 className="text-xl font-bold text-law-navy mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent-gold" /> Comprehensive Overview
            </h2>
            <div className="prose prose-law max-w-none text-law-slate leading-relaxed whitespace-pre-wrap">
              {caseData.description}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <h2 className="text-xl font-bold text-law-navy mb-6 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-accent-gold" /> Client Preferences
            </h2>
            <ul className="space-y-4 text-law-slate">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <span>Client prefers communication via CaseBridge secure messaging.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <span>Requires initial consultation within 48 hours of claiming.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Action & Meta */}
        <div className="space-y-6">
          
          {(user?.userType === 'Lawyer' || user?.userType === 'Junior') && (
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm sticky top-28">
              <h3 className="font-bold text-law-navy mb-4">Action Center</h3>
              <button 
                onClick={handleClaim}
                disabled={claiming || claimed || currentStatus !== 'Open'}
                className={`w-full py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  claimed 
                    ? 'bg-green-500 text-white cursor-default' 
                    : 'bg-law-navy hover:bg-law-navy/90 text-white shadow-lg shadow-law-navy/20 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {claimed ? (
                  <><CheckCircle className="w-5 h-5" /> Case Claimed</>
                ) : claiming ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Claim This Case'
                )}
              </button>
              {!claimed && (
                <p className="text-xs text-center text-law-slate mt-4">
                  Claiming this case binds your firm to the initial consultation requirements.
                </p>
              )}
            </div>
          )}

          <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
            <h3 className="font-bold text-law-navy mb-4">Timeline Info</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-law-slate shadow-sm">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-law-slate font-medium">Expected Resolution</p>
                  <p className="text-sm font-bold text-law-navy">Standard Processing</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
};

export default CaseDetailsPage;
