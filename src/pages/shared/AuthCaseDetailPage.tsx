import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { caseService } from '../../services/caseService';
import type { Case } from '../../types/case.types';
import {
  ArrowLeft, Briefcase, Calendar, CheckCircle2, Clock,
  FileText, Paperclip, IndianRupee, User, MessageSquare,
  AlertTriangle, ExternalLink, Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import AiChatModal from '../../components/AiChatModal';
import AiSummaryViewer from '../../components/AiSummaryViewer';

const STATUS_STYLES: Record<string, { label: string; dot: string; badge: string }> = {
  Open:     { label: 'Open',      dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  InReview: { label: 'In Review', dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  Reopened: { label: 'Reopened',  dot: 'bg-purple-400',  badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  Closed:   { label: 'Closed',    dot: 'bg-gray-400',    badge: 'bg-gray-50 text-gray-600 border-gray-200' },
};

const EXT_COLORS: Record<string, string> = {
  PDF:  'bg-red-50 text-red-600 border-red-100',
  DOC:  'bg-blue-50 text-blue-600 border-blue-100',
  DOCX: 'bg-blue-50 text-blue-600 border-blue-100',
  TXT:  'bg-gray-50 text-gray-500 border-gray-200',
  JPG:  'bg-purple-50 text-purple-600 border-purple-100',
  JPEG: 'bg-purple-50 text-purple-600 border-purple-100',
  PNG:  'bg-purple-50 text-purple-600 border-purple-100',
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

const getStatusCfg = (status: string | number | undefined) => {
  const s = String(status ?? '');
  return STATUS_STYLES[s] ?? { label: s || 'Unknown', dot: 'bg-gray-400', badge: 'bg-gray-50 text-gray-600 border-gray-200' };
};

// ─── Document card ─────────────────────────────────────────────────────────────
const DocCard = ({ doc }: { doc: { id: number; fileName: string; fileUrl: string; uploadedAt?: string } }) => {
  const ext = doc.fileName.split('.').pop()?.toUpperCase() ?? 'FILE';
  const color = EXT_COLORS[ext] ?? 'bg-gray-50 text-gray-500 border-gray-200';
  return (
    <a
      href={doc.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl hover:border-accent-gold/50 hover:shadow-md transition-all duration-200"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold border ${color} shrink-0`}>
        {ext}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-law-navy truncate group-hover:text-accent-gold transition-colors">
          {doc.fileName}
        </p>
        {doc.uploadedAt && (
          <p className="text-xs text-gray-400 mt-0.5">
            {formatDate(doc.uploadedAt)}
          </p>
        )}
      </div>
      <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-accent-gold transition-colors shrink-0" />
    </a>
  );
};

// ─── Main page ─────────────────────────────────────────────────────────────────
const AuthCaseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const isClient   = user?.userType === 'Client';
  const isFirmUser = user?.userType === 'Lawyer' || user?.userType === 'Junior';
  
  // AI Chat permission logic: Only Firm Users who have claimed the case can use the AI
  const canUseAi = isFirmUser && caseData?.acceptedByUserid === user?.id;

  // Back navigation target based on role
  const backPath = isClient
    ? '/client/cases'
    : `/${user?.userType?.toLowerCase()}/cases`;

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      try {
        let data: Case;
        if (isClient) {
          data = await caseService.getClientCaseById(parseInt(id));
        } else {
          data = await caseService.getFirmCaseById(parseInt(id));
        }
        setCaseData(data);
      } catch (error: any) {
        if (error.response && (error.response.status === 404 || error.response.status === 403 || error.response.status === 401)) {
          toast.error('Case not found or you do not have permission to view it.');
          navigate(backPath);
        } else {
          toast.error('Failed to load case data. Please check your connection or try again.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id, isClient]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-law-navy/20 border-t-law-navy rounded-full animate-spin" />
      </div>
    );
  }

  if (!caseData) return null;

  const statusCfg = getStatusCfg(caseData.status);
  const hasDocuments = Array.isArray(caseData.documents) && caseData.documents.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto pb-16 px-6 space-y-6"
    >
      {/* Back */}
      <button
        onClick={() => navigate(backPath)}
        className="flex items-center gap-2 text-law-slate hover:text-law-navy transition-colors font-medium mt-2"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Cases
      </button>

      {/* ── Hero Banner ─────────────────────────────────────── */}
      <div className="relative bg-law-navy rounded-3xl overflow-hidden shadow-xl">
        {/* decorative glow */}
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-accent-gold/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl" />

        <div className="relative z-10 p-8 md:p-10">
          {/* Status + Category row */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusCfg.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
              {statusCfg.label}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/10 border border-white/20 text-white text-xs font-semibold">
              <Briefcase className="w-3.5 h-3.5" />
              {caseData.category}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-white leading-tight mb-6">
            {caseData.title}
          </h1>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <Calendar className="w-4 h-4" />
              <span>Posted {formatDate(caseData.createdAt)}</span>
            </div>
            {caseData.clientName && (
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <User className="w-4 h-4" />
                <span>{caseData.clientName}</span>
              </div>
            )}
            {caseData.lawyerName && (
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <User className="w-4 h-4" />
                <span>Lawyer: {caseData.lawyerName}</span>
              </div>
            )}
            {/* Budget pill */}
            <div className="ml-auto flex items-center gap-1.5 bg-accent-gold/20 border border-accent-gold/40 px-4 py-2 rounded-2xl">
              <IndianRupee className="w-4 h-4 text-accent-gold" />
              <span className="text-xl font-bold text-accent-gold">
                {caseData.budget.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body grid ───────────────────────────────────────── */}
      <div className="grid md:grid-cols-3 gap-6">

        {/* Left — Description + Documents */}
        <div className="md:col-span-2 space-y-6">

          {/* AI Summary Viewer */}
          {caseData.aiSummary && (
            <AiSummaryViewer summary={caseData.aiSummary} />
          )}

          {/* Description */}
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-law-navy mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent-gold" />
              Case Description
            </h2>
            <p className="text-law-slate leading-relaxed whitespace-pre-wrap text-[15px]">
              {caseData.description}
            </p>
          </div>

          {/* Attached Documents — only when present */}
          {hasDocuments && (
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <h2 className="text-lg font-bold text-law-navy mb-5 flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-accent-gold" />
                Attached Documents
                <span className="ml-auto text-xs font-semibold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                  {caseData.documents!.length} file{caseData.documents!.length !== 1 ? 's' : ''}
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {caseData.documents!.map(doc => (
                  <DocCard key={doc.id} doc={doc} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — Quick Info */}
        <div className="space-y-4">

          {/* Status card */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-law-navy uppercase tracking-wider mb-4">Case Info</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-law-slate">Status</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusCfg.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                  {statusCfg.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-law-slate">Category</span>
                <span className="text-sm font-semibold text-law-navy">{caseData.category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-law-slate">Budget</span>
                <span className="text-sm font-bold text-accent-gold">₹{caseData.budget.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-law-slate">Documents</span>
                <span className="text-sm font-semibold text-law-navy">
                  {hasDocuments ? `${caseData.documents!.length} file${caseData.documents!.length !== 1 ? 's' : ''}` : 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-law-slate">Posted</span>
                <span className="text-sm font-semibold text-law-navy">{formatDate(caseData.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Chat shortcut — only shown when a firm is assigned */}
          {caseData.assignedFirmId && (
            <button
              onClick={() => navigate(`/${user?.userType?.toLowerCase()}/messages?caseId=${caseData.id}`)}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-law-navy text-white font-semibold rounded-2xl hover:bg-law-navy/90 transition-all shadow-lg shadow-law-navy/20 text-sm"
            >
              <MessageSquare className="w-4 h-4" />
              Open Case Chat
            </button>
          )}

          {/* Ask AI button */}
          {canUseAi && (
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="w-full relative group overflow-hidden p-[2px] rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_2rem_-0.5rem_#F3C35C]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-accent-gold via-yellow-200 to-accent-gold opacity-70 group-hover:opacity-100 animate-[spin_3s_linear_infinite]" style={{ backgroundSize: '200% 200%' }}></div>
              <div className="relative flex items-center justify-center gap-2 py-3 px-5 bg-law-navy/95 backdrop-blur-xl rounded-[14px] text-white font-bold text-sm h-full w-full">
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[14px]"></div>
                <Sparkles className="w-4 h-4 text-accent-gold animate-pulse drop-shadow-[0_0_8px_rgba(243,195,92,0.8)]" />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300 group-hover:to-white transition-all">
                  Ask AI Assistant
                </span>
              </div>
            </button>
          )}

          {/* Closed notice */}
          {caseData.status === 'Closed' && (
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm text-law-slate">This case has been closed successfully.</p>
            </div>
          )}
        </div>
      </div>

      <AiChatModal 
        isOpen={isAiModalOpen} 
        onClose={() => setIsAiModalOpen(false)} 
        caseId={caseData.id} 
        caseDetails={`Title: ${caseData.title}\nCategory: ${caseData.category}\nBudget: ₹${caseData.budget}\nStatus: ${caseData.status}\nDescription: ${caseData.description}`}
      />
    </motion.div>
  );
};

export default AuthCaseDetailPage;
