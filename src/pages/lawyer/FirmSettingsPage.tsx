import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { 
  Building2, Save, Info, User, Mail, 
  ShieldCheck, LayoutDashboard, Settings
} from 'lucide-react';
import { firmService } from '../../services/firmService';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';

const FirmSettingsPage = () => {
  const axiosPrivate = useAxiosPrivate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<{ fullName: string; email: string; firmBio: string } | null>(null);
  const [bio, setBio] = useState('');

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await firmService.getFirmProfile(axiosPrivate);
      setProfile(data);
      setBio(data.firmBio || '');
    } catch (err) {
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateBio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bio.trim()) {
      toast.error('Bio cannot be empty');
      return;
    }

    try {
      setSaving(true);
      await firmService.updateFirmBio(axiosPrivate, bio);
      toast.success('Firm bio updated successfully!');
      fetchProfile();
    } catch (err) {
      toast.error('Failed to update firm bio');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-12 h-12 border-4 border-law-navy/20 border-t-law-navy rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-law-navy rounded-xl flex items-center justify-center">
            <Settings className="text-white w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold font-serif text-law-navy">Firm Settings</h1>
        </div>
        <p className="text-law-slate">Manage your firm's public profile and account details.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm text-center">
            <div className="w-24 h-24 bg-accent-gold/10 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-md">
              <span className="text-3xl font-bold text-accent-gold">
                {profile?.fullName.charAt(0)}
              </span>
            </div>
            <h2 className="text-xl font-bold text-law-navy mb-1">{profile?.fullName}</h2>
            <p className="text-sm text-law-slate mb-4 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-green-500" /> Senior Advocate
            </p>
            
            <div className="pt-4 border-t border-gray-50 text-left space-y-3">
              <div className="flex items-center gap-3 text-sm text-law-slate">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="truncate">{profile?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-law-slate">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span>Firm Owner</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Settings Form */}
        <div className="md:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-6">
              <Info className="w-5 h-5 text-accent-gold" />
              <h3 className="text-lg font-bold text-law-navy">Firm Biography</h3>
            </div>

            <form onSubmit={handleUpdateBio}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-law-navy mb-2">
                  Public Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent-gold transition-all min-h-[200px] resize-none text-law-slate"
                  placeholder="Describe your firm's history, expertise, and success stories..."
                />
                <p className="mt-2 text-xs text-gray-400 italic">
                  This bio is visible to potential clients in the marketplace.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving || bio === profile?.firmBio}
                  className={`
                    flex items-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all shadow-md
                    ${saving || bio === profile?.firmBio
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                      : 'bg-law-navy text-white hover:bg-law-navy/90 hover:scale-[1.02] active:scale-[0.98]'}
                  `}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>

          {/* Additional Settings Placeholder */}
          <div className="bg-gray-50 rounded-3xl border border-dashed border-gray-300 p-8 text-center">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
              <LayoutDashboard className="text-gray-400 w-6 h-6" />
            </div>
            <p className="text-gray-500 font-medium">More firm settings coming soon</p>
            <p className="text-xs text-gray-400">Account security, notification preferences, and team permissions.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirmSettingsPage;
