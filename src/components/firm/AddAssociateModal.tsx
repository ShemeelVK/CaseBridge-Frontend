import React, { useState } from 'react';
import { X, UserPlus, Mail, Lock, Briefcase, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { firmService } from '../../services/firmService';
import type { AddJuniorDto } from '../../services/firmService';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';

const SPECIALIZATIONS = [
  'Civil Litigation',
  'Criminal Defence',
  'Corporate & Business',
  'Family & Matrimonial',
  'Property & Real Estate',
  'Intellectual Property',
  'Employment & Labour',
  'Tax & Finance',
  'Consumer Protection',
  'Constitutional Law',
  'Cyber & Technology Law',
  'Other',
];

interface AddAssociateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddAssociateModal: React.FC<AddAssociateModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const axiosPrivate = useAxiosPrivate();
  const [formData, setFormData] = useState<AddJuniorDto>({
    fullName: '',
    email: '',
    enrollmentNumber: '',
    specialization: '',
    temporaryPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [otherSpecialization, setOtherSpecialization] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await firmService.addJuniorAssociate(axiosPrivate, formData);
      toast.success('Associate added successfully!');
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        fullName: '',
        email: '',
        enrollmentNumber: '',
        specialization: '',
        temporaryPassword: ''
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data || 'Failed to add associate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-law-navy/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-law-navy p-6 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <UserPlus className="w-6 h-6 text-accent-gold" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-serif">Add New Associate</h2>
                  <p className="text-sm text-white/70">Invite a junior lawyer to your firm</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-law-navy mb-1">Full Name *</label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent-gold focus:border-transparent transition-all outline-none"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-law-navy mb-1">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent-gold focus:border-transparent transition-all outline-none"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-law-navy mb-1">Enrollment Number *</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="enrollmentNumber"
                      value={formData.enrollmentNumber}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent-gold focus:border-transparent transition-all outline-none"
                      placeholder="e.g. BAR12345"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-law-navy mb-1">Specialization</label>
                  <select
                    value={SPECIALIZATIONS.slice(0, -1).includes(formData.specialization) ? formData.specialization : (formData.specialization ? 'Other' : '')}
                    onChange={e => {
                      if (e.target.value === 'Other') {
                        setFormData({ ...formData, specialization: '' });
                      } else {
                        setOtherSpecialization('');
                        setFormData({ ...formData, specialization: e.target.value });
                      }
                    }}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent-gold focus:border-transparent transition-all outline-none text-sm text-gray-700"
                  >
                    <option value="">Select a specialization...</option>
                    {SPECIALIZATIONS.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                  {/* Free-text input when Other is selected */}
                  {!SPECIALIZATIONS.slice(0, -1).includes(formData.specialization) && formData.specialization !== '' || 
                   (!SPECIALIZATIONS.slice(0, -1).includes(formData.specialization) && otherSpecialization !== '') ? (
                    <input
                      type="text"
                      placeholder="Describe the specialization..."
                      value={otherSpecialization}
                      onChange={e => {
                        setOtherSpecialization(e.target.value);
                        setFormData({ ...formData, specialization: e.target.value });
                      }}
                      className="mt-2 w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent-gold focus:border-transparent transition-all outline-none text-sm"
                    />
                  ) : null}
                </div>

                <div>
                  <label className="block text-sm font-medium text-law-navy mb-1">Temporary Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="temporaryPassword"
                      value={formData.temporaryPassword}
                      onChange={handleChange}
                      required
                      minLength={8}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent-gold focus:border-transparent transition-all outline-none"
                      placeholder="Must be at least 8 characters"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-1">The associate will use this to log in initially.</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-accent-gold text-law-navy font-bold hover:bg-[#F3C35C] transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-law-navy/30 border-t-law-navy rounded-full animate-spin" />
                  ) : (
                    'Add Associate'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddAssociateModal;
