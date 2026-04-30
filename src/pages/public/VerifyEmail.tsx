import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email address...');
  const verificationStarted = useRef(false);

  useEffect(() => {
    if (verificationStarted.current) return;
    verificationStarted.current = true;

    const verify = async () => {
      const email = searchParams.get('email');
      const token = searchParams.get('token');

      if (!email || !token) {
        setStatus('error');
        setMessage('Invalid verification link. Please check your email and try again.');
        return;
      }

      try {
        await authService.verifyEmail(email, token);
        setStatus('success');
        setMessage('Your email has been verified successfully! You can now sign in to your account.');
        toast.success('Email verified successfully!');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data || 'Verification failed. The link may have expired.');
        toast.error('Verification failed');
      }
    };

    verify();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-law-navy opacity-[0.03] rounded-full blur-3xl"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card w-full max-w-md p-10 text-center z-10"
      >
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-16 h-16 text-law-navy animate-spin mb-6" />
            <h2 className="text-2xl font-serif font-bold text-law-navy mb-2">Verifying...</h2>
            <p className="text-law-slate">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <ShieldCheck className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-serif font-bold text-law-navy mb-4">Account Verified</h2>
            <p className="text-law-slate mb-8">{message}</p>
            <button 
              onClick={() => navigate('/login')}
              className="btn-primary w-full py-3 flex items-center justify-center"
            >
              Go to Login <ArrowRight className="ml-2 w-5 h-5" />
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-3xl font-serif font-bold text-law-navy mb-4">Verification Failed</h2>
            <p className="text-law-slate mb-8">{message}</p>
            <button 
              onClick={() => navigate('/register')}
              className="btn-primary w-full py-3"
            >
              Back to Registration
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
