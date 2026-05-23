import { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, Briefcase, Hash, Search, UserMinus, X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { firmService } from '../../services/firmService';
import type { Associate } from '../../services/firmService';
import AddAssociateModal from '../../components/firm/AddAssociateModal';
import { toast } from 'react-hot-toast';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';

const AssociatesPage = () => {
  const axiosPrivate = useAxiosPrivate();
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Removal State
  const [associateToRemove, setAssociateToRemove] = useState<Associate | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const fetchAssociates = async () => {
    try {
      setLoading(true);
      const data = await firmService.getMyAssociates(axiosPrivate);
      setAssociates(data.associates || []);
    } catch (error) {
      toast.error('Failed to load associates');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssociates();
  }, []);

  const handleRemoveConfirm = async () => {
    if (!associateToRemove) return;
    try {
      setIsRemoving(true);
      await firmService.removeJuniorAssociate(axiosPrivate, associateToRemove.Id);
      toast.success('Junior associate successfully removed.');
      setAssociateToRemove(null);
      fetchAssociates(); // refresh list
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove associate.');
    } finally {
      setIsRemoving(false);
    }
  };

  const filteredAssociates = associates.filter(a => 
    (a.FullName ?? '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (a.Specialization ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-serif text-law-navy mb-2">Firm Associates</h1>
          <p className="text-law-slate">Manage your junior lawyers and firm members</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search associates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-gold transition-all w-full md:w-64 shadow-sm"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-gold px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <UserPlus className="w-5 h-5" />
            <span className="font-medium">Add Associate</span>
          </button>
        </div>
      </div>

      {/* Grid of Associates */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-10 h-10 border-4 border-law-navy/20 border-t-law-navy rounded-full animate-spin"></div>
        </div>
      ) : filteredAssociates.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center justify-center text-center shadow-sm"
        >
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <Users className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-law-navy mb-2">No Associates Found</h3>
          <p className="text-law-slate max-w-md mx-auto mb-6">
            {searchTerm ? 'No associates match your search criteria.' : "You haven't added any junior associates to your firm yet."}
          </p>
          {!searchTerm && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="text-accent-gold font-medium hover:text-[#F3C35C] flex items-center gap-2 transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              Add your first associate
            </button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssociates.map((associate, index) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              key={associate.Id}
              className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
            >
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent-gold/5 rounded-bl-[100px] -z-0 transition-transform group-hover:scale-110"></div>
              
              <div className="flex items-start gap-4 mb-6 relative z-10">
                <div className="w-14 h-14 bg-law-navy text-white rounded-full flex items-center justify-center font-bold text-xl shadow-sm">
                  {(associate.FullName ?? '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-law-navy">{associate.FullName}</h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-gold/10 text-accent-gold text-xs font-semibold uppercase tracking-wider mt-1">
                    Junior Lawyer
                  </span>
                </div>
              </div>

              <div className="space-y-3 relative z-10">
                <div className="flex items-center gap-3 text-law-slate text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{associate.Email}</span>
                </div>
                <div className="flex items-center gap-3 text-law-slate text-sm">
                  <Hash className="w-4 h-4 text-gray-400" />
                  <span>{associate.EnrollmentNumber}</span>
                </div>
                {associate.Specialization && (
                  <div className="flex items-center gap-3 text-law-slate text-sm">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <span>{associate.Specialization}</span>
                  </div>
                )}
              </div>
              
              {/* Quick actions that appear on hover */}
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => setAssociateToRemove(associate)}
                  className="flex items-center gap-1.5 text-sm font-bold text-red-500 hover:text-red-700 transition-colors"
                >
                  <UserMinus className="w-4 h-4" />
                  Remove
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <AddAssociateModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchAssociates}
      />

      {/* Inline Remove Confirmation Modal */}
      <AnimatePresence>
        {associateToRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isRemoving && setAssociateToRemove(null)}
              className="absolute inset-0 bg-law-navy/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6"
            >
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-law-navy mb-2">
                Remove {associateToRemove.FullName}?
              </h3>
              <p className="text-law-slate text-sm leading-relaxed mb-6">
                Are you sure you want to remove this junior associate from your firm? 
                This action will <strong className="text-law-navy font-bold">automatically reassign all of their active cases back to you</strong>.
                This action cannot be undone.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setAssociateToRemove(null)}
                  disabled={isRemoving}
                  className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 text-law-navy font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveConfirm}
                  disabled={isRemoving}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isRemoving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    'Remove Associate'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AssociatesPage;
