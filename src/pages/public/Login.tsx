import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, Check, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../services/authService';
import { useAuth } from '../../hooks/useAuth';
import { GoogleLogin } from '@react-oauth/google';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await authService.login({ email, password });
      login(data);
      
      toast.success(`Welcome back, ${data.fullName}!`);
      
      const rolePaths: Record<string, string> = {
        Client: '/client/dashboard',
        Lawyer: '/lawyer/dashboard',
        Junior: '/junior/dashboard',
        Admin: '/admin/dashboard'
      };
      
      navigate(rolePaths[data.userType] || '/');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data || 'An unexpected error occurred.';
      
      if (err.response?.status === 401) {
        toast.error('Invalid email or password.');
      } else if (err.response?.status === 403) {
        toast.error(errorMessage);
      } else {
        toast.error(`Error: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-law-navy opacity-[0.03] rounded-full blur-3xl"></div>
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] bg-accent-gold opacity-[0.05] rounded-full blur-3xl"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card w-full max-w-md p-8 relative z-10"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-law-navy rounded-full flex items-center justify-center shadow-lg">
            <Scale className="text-accent-gold w-8 h-8" />
          </div>
        </div>
        
        <h2 className="text-3xl font-serif font-bold text-center text-law-navy mb-2">Welcome Back</h2>
        <p className="text-center text-law-slate mb-8">Sign in to your CaseBridge account</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-law-navy mb-1" htmlFor="email">Email Address</label>
            <input 
              id="email"
              type="email" 
              required
              className="input-field" 
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-law-navy" htmlFor="password">Password</label>
              <Link to="/forgot-password" className="text-sm text-accent-gold hover:text-accent-gold-dark transition-colors">Forgot password?</Link>
            </div>
            <input 
              id="password"
              type="password" 
              required
              className="input-field" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-primary py-3 text-lg mt-2 relative overflow-hidden group"
          >
            <span className="relative z-10">{loading ? 'Signing in...' : 'Sign In'}</span>
            <div className="absolute inset-0 h-full w-0 bg-primary-800 transition-all duration-300 ease-out group-hover:w-full z-0"></div>
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-law-slate">Or continue with</span>
            </div>
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                if (credentialResponse.credential) {
                  setLoading(true);
                  try {
                    const data = await authService.googleLogin({ idToken: credentialResponse.credential, userType: 'Client' });
                    login(data);
                    toast.success(`Welcome, ${data.fullName}!`);
                    
                    const rolePaths: Record<string, string> = {
                      Client: '/client/dashboard',
                      Lawyer: '/lawyer/dashboard',
                      Junior: '/junior/dashboard',
                      Admin: '/admin/dashboard'
                    };
                    navigate(rolePaths[data.userType] || '/');
                  } catch (err: any) {
                    toast.error('Google Login failed.');
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              onError={() => {
                toast.error('Google Login Failed');
              }}
              useOneTap
              theme="outline"
              width="100%"
            />
          </div>
        </form>

        <p className="text-center mt-8 text-law-slate text-sm">
          Don't have an account? <Link to="/register" className="text-law-navy font-semibold hover:text-accent-gold transition-colors">Register now</Link>
        </p>
      </motion.div>
    </div>
  );
}
