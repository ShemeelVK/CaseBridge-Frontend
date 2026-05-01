import { useState, useEffect, type JSX } from 'react';
import { Briefcase, Plus, Clock, CheckCircle, AlertCircle, Search, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { caseService } from '../../services/caseService';
import type { Case } from '../../types/case.types';
import { useNavigate } from 'react-router-dom';

const statusConfig: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  '1': { label: 'Open',       color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  '2': { label: 'In Progress',color: 'bg-blue-100 text-blue-700',       icon: <Clock className="w-3.5 h-3.5" /> },
  '3': { label: 'Closed',     color: 'bg-gray-100 text-gray-600',       icon: <AlertCircle className="w-3.5 h-3.5" /> },
  'Open':        { label: 'Open',        color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  'InProgress':  { label: 'In Progress', color: 'bg-blue-100 text-blue-700',       icon: <Clock className="w-3.5 h-3.5" /> },
  'Closed':      { label: 'Closed',      color: 'bg-gray-100 text-gray-600',       icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

const ClientCasesPage = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const data = await caseService.getClientCases();
        setCases(data);
      } catch (err) {
        toast.error('Failed to load your cases');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, []);

  const filtered = cases.filter(c =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-serif text-law-navy mb-2">My Cases</h1>
          <p className="text-law-slate">Track all your submitted legal cases</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search cases..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-gold transition-all w-full md:w-64 shadow-sm"
            />
          </div>
          <button
            onClick={() => navigate('/client/post-case')}
            className="btn-gold px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Post New Case</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-10 h-10 border-4 border-law-navy/20 border-t-law-navy rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center text-center shadow-sm"
        >
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <Briefcase className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-law-navy mb-2">No Cases Found</h3>
          <p className="text-law-slate max-w-md mb-6">
            {searchTerm ? 'No cases match your search.' : "You haven't posted any cases yet."}
          </p>
          {!searchTerm && (
            <button
              onClick={() => navigate('/client/post-case')}
              className="text-accent-gold font-medium hover:text-[#F3C35C] flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Post your first case
            </button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((c, index) => {
            const statusKey = String(c.status);
            const status = statusConfig[statusKey] ?? { label: c.status, color: 'bg-gray-100 text-gray-600', icon: <AlertCircle className="w-3.5 h-3.5" /> };

            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.07 }}
                className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group cursor-pointer relative overflow-hidden"
                onClick={() => navigate(`/marketplace/case/${c.id}`)}
              >
                {/* Accent bar */}
                <div className="absolute top-0 left-0 w-1 h-full bg-accent-gold rounded-l-2xl" />

                <div className="flex items-start justify-between mb-4 pl-3">
                  <div>
                    <h3 className="text-lg font-bold text-law-navy group-hover:text-accent-gold transition-colors line-clamp-1">
                      {c.title}
                    </h3>
                    <span className="text-xs text-law-slate">{c.category}</span>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                    {status.icon}
                    {status.label}
                  </span>
                </div>

                <p className="text-sm text-law-slate line-clamp-2 pl-3 mb-5">{c.description}</p>

                <div className="flex items-center justify-between pl-3 pt-4 border-t border-gray-100">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-law-navy">
                      Budget: <span className="text-accent-gold">₹{c.budget.toLocaleString()}</span>
                    </span>
                    {c.createdAt && (
                      <span className="text-xs text-gray-400">
                        {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>

                  {c.assignedFirmId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/client/messages?caseId=${c.id}`);
                      }}
                      className="p-2.5 bg-law-navy text-white rounded-xl hover:bg-law-navy/90 transition-all shadow-md flex items-center gap-2 text-xs font-bold"
                    >
                      <MessageSquare className="w-4 h-4" /> Start Chat
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClientCasesPage;
