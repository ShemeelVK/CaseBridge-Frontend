import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  Briefcase, Search, Filter, CheckCircle2, XCircle, Clock,
  IndianRupee, Calendar, ChevronDown, AlertTriangle, Users, MessageSquare
} from 'lucide-react';
import { caseService } from '../../services/caseService';
import { firmService, type Associate } from '../../services/firmService';
import type { Case } from '../../types/case.types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  Open: {
    label: 'Open',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  InProgress: {
    label: 'In Progress',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <Briefcase className="w-3.5 h-3.5" />,
  },
  Closed: {
    label: 'Closed',
    color: 'bg-green-50 text-green-700 border-green-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
};

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

type ConfirmAction = { type: 'close' | 'drop'; caseId: number; title: string } | null;

const FirmCasesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const axiosPrivate = useAxiosPrivate();
  const isLawyer = user?.userType === 'Lawyer';

  const [cases, setCases] = useState<Case[]>([]);
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [casesData, membersData] = await Promise.all([
        caseService.getFirmCases(),
        isLawyer ? firmService.getMyAssociates(axiosPrivate) : Promise.resolve({ associates: [] })
      ]);
      setCases(casesData);
      setAssociates(membersData.associates || []);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [isLawyer]);

  const filtered = cases.filter(c => {
    const matchSearch =
      (c.title ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.category ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleAction = async (type: 'close' | 'drop', id: number) => {
    setActionLoading(id);
    setConfirm(null);
    try {
      if (type === 'close') {
        await caseService.closeCase(id);
        toast.success('Case marked as closed.');
      } else {
        await caseService.dropCase(id);
        toast.success('Case dropped and returned to marketplace.');
      }
      await fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Action failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const stats = {
    total: cases.length,
    open: cases.filter(c => c.status === 'Open').length,
    inProgress: cases.filter(c => c.status === 'InProgress').length,
    closed: cases.filter(c => c.status === 'Closed').length,
    totalBudget: cases.reduce((sum, c) => sum + (c.budget ?? 0), 0),
  };

  // Top categories
  const categoryMap: Record<string, number> = {};
  cases.forEach(c => {
    if (c.category) categoryMap[c.category] = (categoryMap[c.category] ?? 0) + 1;
  });
  const topCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // Junior performance stats (for Lawyer)
  const juniorStats = associates.map(a => {
    const assignedCases = cases.filter(c => c.acceptedByUserid === a.Id);
    return {
      id: a.Id,
      name: a.FullName,
      total: assignedCases.length,
      open: assignedCases.filter(c => c.status === 'Open').length,
      inProgress: assignedCases.filter(c => c.status === 'InProgress').length,
      closed: assignedCases.filter(c => c.status === 'Closed').length
    };
  }).filter(j => j.total > 0);

  const myCases = cases.filter(c => c.acceptedByUserid === user?.id);
  const juniorCases = cases.filter(c => c.acceptedByUserid !== user?.id && c.acceptedByUserid != null);

  const CaseCard = ({ c, i }: { c: Case; i: number }) => {
    const statusCfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG['Open'];
    const isActing = actionLoading === c.id;
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05 }}
        className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.color}`}>
                {statusCfg.icon} {statusCfg.label}
              </span>
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider bg-gray-50 px-2.5 py-1 rounded-md">
                {c.category}
              </span>
            </div>
            <h3 className="text-lg font-bold text-law-navy mb-1 truncate">{c.title}</h3>
            
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-law-navy/10 flex items-center justify-center">
                <Users className="w-3 h-3 text-law-navy" />
              </div>
              <span className="text-xs font-medium text-law-slate">
                Handled by: <span className="text-law-navy font-semibold">
                  {c.acceptedByUserid === user?.id 
                    ? 'Me (Senior Lawyer)' 
                    : associates.find(a => a.Id === c.acceptedByUserid)?.FullName || 'Unassigned / Associate'}
                </span>
              </span>
            </div>

            <p className="text-sm text-law-slate line-clamp-2 mb-3">{c.description}</p>
            <div className="flex items-center gap-5 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5" />
                ₹{c.budget?.toLocaleString('en-IN')}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(c.createdAt)}
              </span>
            </div>
          </div>

          {(isLawyer || c.acceptedByUserid === user?.id) && c.status !== 'Closed' && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => navigate(`/${user?.userType.toLowerCase()}/messages?caseId=${c.id}`)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-law-navy/5 text-law-navy border border-law-navy/10 text-sm font-medium hover:bg-law-navy/10 transition-colors"
              >
                <MessageSquare className="w-4 h-4" /> Chat
              </button>
              <button
                onClick={() => setConfirm({ type: 'close', caseId: c.id, title: c.title })}
                disabled={isActing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-50 text-green-700 border border-green-200 text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" /> Close
              </button>
              <button
                onClick={() => setConfirm({ type: 'drop', caseId: c.id, title: c.title })}
                disabled={isActing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {isActing
                  ? <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                  : <><XCircle className="w-4 h-4" /> Drop</>
                }
              </button>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-serif text-law-navy mb-2">
          {isLawyer ? 'Firm Cases' : 'Cases'}
        </h1>
        <p className="text-law-slate">
          {isLawyer
            ? 'Manage active cases claimed by your firm.'
            : 'Cases assigned to your firm that you are working on.'}
        </p>
      </div>

      {/* Stats Dashboard */}
      <div className={`grid grid-cols-2 ${isLawyer ? 'lg:grid-cols-5' : 'lg:grid-cols-3'} gap-4 mb-6`}>
        {(isLawyer 
          ? [
              { label: 'Total Cases', value: stats.total, color: 'bg-law-navy', textColor: 'text-white', sub: 'All firm cases', icon: <Briefcase className="w-5 h-5 opacity-70" /> },
              { label: 'My Cases', value: myCases.length, color: 'bg-accent-gold', textColor: 'text-law-navy', sub: 'Assigned to me', icon: <Users className="w-5 h-5 opacity-70" /> },
              { label: 'Open', value: stats.open, color: 'bg-blue-50', textColor: 'text-blue-700', sub: 'Awaiting work', icon: <Clock className="w-5 h-5 text-blue-400" /> },
              { label: 'In Progress', value: stats.inProgress, color: 'bg-amber-50', textColor: 'text-amber-700', sub: 'Being handled', icon: <Briefcase className="w-5 h-5 text-amber-400" /> },
              { label: 'Associates', value: associates.length, color: 'bg-law-navy/5', textColor: 'text-law-navy', sub: 'In your firm', icon: <Users className="w-5 h-5 text-law-navy/40" /> },
            ]
          : [
              { label: 'My Cases', value: myCases.length, color: 'bg-accent-gold', textColor: 'text-law-navy', sub: 'Active Assignments', icon: <Users className="w-5 h-5 opacity-70" /> },
              { label: 'In Progress', value: stats.inProgress, color: 'bg-amber-50', textColor: 'text-amber-700', sub: 'Current work', icon: <Briefcase className="w-5 h-5 text-amber-400" /> },
              { label: 'Closed', value: stats.closed, color: 'bg-green-50', textColor: 'text-green-700', sub: 'Completed', icon: <CheckCircle2 className="w-5 h-5 text-green-500" /> },
            ]
        ).map((stat: any) => (
          <div key={stat.label} className={`${stat.color} rounded-2xl p-5 shadow-sm`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-sm font-medium ${stat.textColor} opacity-80`}>{stat.label}</span>
              {stat.icon}
            </div>
            <p className={`text-3xl font-bold ${stat.textColor}`}>{stat.value}</p>
            <p className={`text-xs mt-1 ${stat.textColor} opacity-60`}>{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Secondary row: Budget + Category breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">

        {/* Total budget */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-accent-gold/10 flex items-center justify-center shrink-0">
            <IndianRupee className="w-7 h-7 text-accent-gold" />
          </div>
          <div>
            <p className="text-sm text-law-slate mb-0.5">Total Case Budget</p>
            <p className="text-2xl font-bold text-law-navy">
              ₹{stats.totalBudget.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Across all {stats.total} cases</p>
          </div>
        </div>

        {/* Top categories */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-law-navy mb-3">Top Practice Areas</p>
          {topCategories.length === 0 ? (
            <p className="text-sm text-gray-400">No data yet</p>
          ) : (
            <div className="space-y-2">
              {topCategories.map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs text-law-slate w-36 truncate">{cat}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-accent-gold h-1.5 rounded-full transition-all"
                      style={{ width: `${(count / stats.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-law-navy w-4 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Junior Performance Breakdown (Lawyer Only) */}
        {isLawyer && juniorStats.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-law-navy">Associate Workload Overview</p>
              <span className="text-xs text-law-slate font-medium">{juniorStats.length} Active Juniors</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {juniorStats.map(j => (
                <div key={j.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="font-bold text-law-navy mb-2">{j.name}</p>
                  <div className="flex gap-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">
                      {j.inProgress} In Progress
                    </span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">
                      {j.closed} Closed
                    </span>
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-[10px] font-bold rounded uppercase">
                      {j.total} Total
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title or category..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-gold transition-all shadow-sm"
          />
        </div>
        <div className="relative">
          <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-gold transition-all shadow-sm appearance-none text-sm text-gray-700"
          >
            {['All', 'Open', 'InProgress', 'Closed'].map(s => (
              <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s === 'InProgress' ? 'In Progress' : s}</option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-10 h-10 border-4 border-law-navy/20 border-t-law-navy rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100 p-16 flex flex-col items-center text-center shadow-sm"
        >
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <Briefcase className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-law-navy mb-2">No Cases Found</h3>
          <p className="text-law-slate max-w-sm">
            {searchTerm || statusFilter !== 'All'
              ? 'No cases match your filters.'
              : 'Your firm has no active cases yet. Browse the marketplace to claim cases.'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-12">
          {/* Section: My Cases (For Lawyer) or All Cases (For Junior) */}
          {(isLawyer ? myCases.length > 0 : true) && (
            <div>
              {isLawyer && <h2 className="text-xl font-bold text-law-navy mb-4 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-accent-gold rounded-full"></div>
                My Active Cases
              </h2>}
              <div className="space-y-4">
                {(isLawyer ? myCases : filtered).map((c, i) => (
                  <CaseCard key={c.id} c={c} i={i} />
                ))}
              </div>
            </div>
          )}

          {/* Section: Junior Assignments (For Lawyer Only) */}
          {isLawyer && juniorCases.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-law-navy mb-4 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-law-navy/20 rounded-full"></div>
                Associate Assignments
              </h2>
              <div className="space-y-4">
                {juniorCases.map((c, i) => (
                  <CaseCard key={c.id} c={c} i={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${confirm.type === 'close' ? 'bg-green-50' : 'bg-red-50'}`}>
              <AlertTriangle className={`w-6 h-6 ${confirm.type === 'close' ? 'text-green-600' : 'text-red-500'}`} />
            </div>
            <h3 className="text-lg font-bold text-law-navy mb-2">
              {confirm.type === 'close' ? 'Close this case?' : 'Drop this case?'}
            </h3>
            <p className="text-sm text-law-slate mb-6">
              {confirm.type === 'close'
                ? `"${confirm.title}" will be marked as Closed. This action cannot be undone.`
                : `"${confirm.title}" will be dropped and returned to the marketplace. The client will need to find a new lawyer.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(confirm.type, confirm.caseId)}
                className={`flex-1 px-4 py-2.5 rounded-xl text-white font-semibold transition-colors ${confirm.type === 'close' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}
              >
                {confirm.type === 'close' ? 'Yes, Close' : 'Yes, Drop'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default FirmCasesPage;
