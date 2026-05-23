import { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Briefcase, DollarSign, ExternalLink, Sparkles } from 'lucide-react';
import { caseService } from '../../services/caseService';
import type { Case } from '../../types/case.types';
import CasePreviewModal from '../../components/cases/CasePreviewModal';
import toast from 'react-hot-toast';

const Marketplace = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const data = await caseService.getOpenCases();
      setCases(data);
    } catch (error) {
      toast.error('Failed to load marketplace cases.');
      // Fallback mock data for visual demonstration if API is unavailable
      setCases([
        { id: 1, clientId: 101, title: 'Corporate Restructuring Dispute', category: 'Corporate', description: 'Seeking experienced counsel for a complex corporate restructuring involving multiple international subsidiaries.', budget: 15000, status: 'Open', lastModifiedByUserId: 101, createdAt: new Date().toISOString() },
        { id: 2, clientId: 102, title: 'Intellectual Property Infringement', category: 'IP Law', description: 'Need representation for a patent infringement case regarding software algorithms.', budget: 8500, status: 'Open', lastModifiedByUserId: 102, createdAt: new Date().toISOString() },
        { id: 3, clientId: 103, title: 'Commercial Lease Agreement Review', category: 'Real Estate', description: 'Require a thorough review and negotiation of a commercial lease for a new office space downtown.', budget: 2000, status: 'Open', lastModifiedByUserId: 103, createdAt: new Date().toISOString() },
        { id: 4, clientId: 104, title: 'Employment Wrongful Termination', category: 'Labor Law', description: 'Former executive seeking representation against wrongful termination claims.', budget: 12000, status: 'Open', lastModifiedByUserId: 104, createdAt: new Date().toISOString() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-8">
      {/* Header Section */}
      <div className="bg-law-navy rounded-3xl p-8 shadow-lg relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-gold opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-500 opacity-20 rounded-full blur-2xl translate-y-1/4 -translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-serif mb-2">Case Marketplace</h1>
            <p className="text-white/70 max-w-xl">Browse open legal matters, find specialized counsel, or claim new cases for your firm.</p>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <input 
                type="text" 
                placeholder="Search cases..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-accent-gold/50 transition-all"
              />
            </div>
            <button className="bg-white/10 hover:bg-white/20 border border-white/20 p-3 rounded-xl transition-colors flex items-center justify-center shrink-0">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Case Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {loading ? (
            // Skeleton Loader
            [1, 2, 3, 4, 5, 6].map((i) => (
              <motion.div 
                key={`skeleton-${i}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-24 h-6 bg-gray-200 rounded-md animate-pulse"></div>
                  <div className="w-16 h-6 bg-gray-100 rounded-full animate-pulse"></div>
                </div>
                <div className="w-full h-8 bg-gray-200 rounded-md mb-3 animate-pulse"></div>
                <div className="w-2/3 h-8 bg-gray-200 rounded-md mb-6 animate-pulse"></div>
                <div className="space-y-2 mb-6">
                  <div className="w-full h-3 bg-gray-100 rounded animate-pulse"></div>
                  <div className="w-4/5 h-3 bg-gray-100 rounded animate-pulse"></div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                  <div className="w-20 h-5 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-8 h-8 bg-gray-100 rounded-full animate-pulse"></div>
                </div>
              </motion.div>
            ))
          ) : filteredCases.length > 0 ? (
            // Actual Case Cards
            filteredCases.map((caseItem, index) => (
              <motion.div 
                key={caseItem.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedCase(caseItem)}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-accent-gold/50 transition-all cursor-pointer group flex flex-col h-full relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-accent-gold opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 bg-law-navy/5 text-law-navy text-xs font-bold rounded-md flex items-center gap-1.5">
                    <Briefcase className="w-3 h-3" /> {caseItem.category}
                  </span>
                  <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full">
                    {caseItem.status}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-law-navy mb-3 line-clamp-2 group-hover:text-accent-gold transition-colors">
                  {caseItem.title}
                </h3>
                
                <p className="text-sm text-law-slate line-clamp-3 mb-4 flex-1">
                  {caseItem.description}
                </p>

                {caseItem.aiSummary && (
                  <div className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-law-navy/80 bg-accent-gold/10 px-2.5 py-1.5 rounded-lg border border-accent-gold/20 w-fit">
                    <Sparkles className="w-3 h-3 text-accent-gold animate-pulse" />
                    AI Summary Available
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-2 text-law-navy font-bold">
                    <DollarSign className="w-4 h-4 text-accent-gold" />
                    ${caseItem.budget.toLocaleString()}
                  </div>
                  <button className="w-8 h-8 rounded-full bg-gray-50 text-law-slate flex items-center justify-center group-hover:bg-law-navy group-hover:text-white transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            // Empty State
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Search className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-law-navy mb-2">No cases found</h3>
              <p className="text-law-slate max-w-md">Try adjusting your search criteria or check back later for new opportunities.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Case Preview Modal */}
      {selectedCase && (
        <CasePreviewModal 
          caseData={selectedCase} 
          onClose={() => setSelectedCase(null)} 
        />
      )}
    </div>
  );
};

export default Marketplace;
