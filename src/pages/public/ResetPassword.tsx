import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2, ArrowRight, Lock, Eye, EyeOff } from 'lucide-react';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Password validation
  const [validations, setValidations] = useState({
    length: false,
    specialChar: false,
    uppercase: false,
  });
  const [showValidations, setShowValidations] = useState(false);

  useEffect(() => {
    setValidations({
      length: password.length >= 8,
      specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      uppercase: /[A-Z]/.test(password),
    });
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    const email = searchParams.get('email');
    const token = searchParams.get('token');

    if (!email || !token) {
      toast.error('Invalid or missing reset token.');
      setLoading(false);
      return;
    }

    try {
      await authService.resetPassword({
        email,
        token,
        newPassword: password
      });
      setSuccess(true);
      toast.success('Password reset successful!');
    } catch (err: any) {
      toast.error(err.response?.data || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-law-navy opacity-[0.03] rounded-full blur-3xl"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card w-full max-w-md p-10 z-10"
      >
        {!success ? (
          <>
            <h2 className="text-3xl font-serif font-bold text-law-navy mb-2">Reset Password</h2>
            <p className="text-law-slate mb-8">Set a new, secure password for your CaseBridge account.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <label className="block text-sm font-medium text-law-navy mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    required 
                    type={showPassword ? "text" : "password"} 
                    className="input-field pl-10 pr-10" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setShowValidations(true)}
                    onBlur={() => setShowValidations(false)}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-law-navy"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {/* Validation Box */}
                {showValidations && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="mt-3 p-3 bg-white/50 border border-gray-100 rounded-lg space-y-2 text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${validations.length ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className={validations.length ? 'text-green-600' : 'text-law-slate'}>8+ Characters</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${validations.specialChar ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className={validations.specialChar ? 'text-green-600' : 'text-law-slate'}>Special Symbol</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${validations.uppercase ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className={validations.uppercase ? 'text-green-600' : 'text-law-slate'}>Capital Letter</span>
                    </div>
                  </motion.div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-law-navy mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    required 
                    type="password" 
                    className="input-field pl-10" 
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading || !validations.length || !validations.specialChar || !validations.uppercase}
                className="w-full btn-primary py-3 flex items-center justify-center"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Reset Password
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-serif font-bold text-law-navy mb-4">Password Reset!</h2>
            <p className="text-law-slate mb-8">Your password has been updated successfully. You can now log in with your new credentials.</p>
            <button 
              onClick={() => navigate('/login')}
              className="btn-primary w-full py-3 flex items-center justify-center"
            >
              Go to Login <ArrowRight className="ml-2 w-5 h-5" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
