import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, User, Mail, ShieldCheck, ArrowRight, ArrowLeft, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<'Client' | 'Lawyer' | ''>('');
  
  // Google Auth States
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);
  const [googleToken, setGoogleToken] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    password: '',
    phoneNumber: '',
    address: '',
    clientType: 'Individual',
    enrollmentNumber: '',
    specialization: '',
    firmBio: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Password & Enrollment validation states
  const [validations, setValidations] = useState({
    length: false,
    specialChar: false,
    uppercase: false,
    enrollmentValid: true, 
  });
  const [showValidations, setShowValidations] = useState(false);

  useEffect(() => {
    const enrollmentRegex = /^([A-Z]{2,3}\/\d+\/\d{4})|(AOR-\d{4}-\d{4})$/;
    
    setValidations({
      length: isGoogleAuth || formData.password.length >= 8,
      specialChar: isGoogleAuth || /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
      uppercase: isGoogleAuth || /[A-Z]/.test(formData.password),
      enrollmentValid: role === 'Lawyer' ? enrollmentRegex.test(formData.enrollmentNumber) : true,
    });
  }, [formData.password, formData.enrollmentNumber, role, isGoogleAuth]);

  const handleRoleSelect = (selectedRole: 'Client' | 'Lawyer') => {
    setRole(selectedRole);
    setStep(2);
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (credentialResponse.credential) {
      try {
        // Attempt to log in the user immediately
        const data = await authService.googleLogin({
            idToken: credentialResponse.credential,
            loginOnly: true
        });
        
        // If successful, they exist! Log them in.
        login(data);
        toast.success(`Welcome back, ${data.fullName}!`);
        const rolePaths: Record<string, string> = { Client: '/client/dashboard', Lawyer: '/lawyer/dashboard' };
        navigate(rolePaths[data.userType] || '/');

      } catch (err: any) {
        // If they get a 404, they don't exist. Proceed to registration Step 2.
        if (err.response?.status === 404) {
          const decoded: any = jwtDecode(credentialResponse.credential);
          setFormData(prev => ({ 
            ...prev, 
            email: decoded.email, 
            fullName: decoded.name || '',
            password: 'GoogleUser123!' // Dummy to pass normal validations
          }));
          setIsGoogleAuth(true);
          setGoogleToken(credentialResponse.credential);
          setStep(2);
        } else {
          toast.error('Failed to process Google sign-in.');
        }
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isGoogleAuth) {
         // Unified Google Registration Flow
         const data = await authService.googleLogin({
             idToken: googleToken,
             userType: role,
             phoneNumber: formData.phoneNumber,
             address: formData.address,
             clientType: formData.clientType,
             enrollmentNumber: formData.enrollmentNumber,
             specialization: formData.specialization,
             firmBio: formData.firmBio
         });
         login(data);
         toast.success(`Welcome to CaseBridge, ${data.fullName}!`);
         const rolePaths: Record<string, string> = { Client: '/client/dashboard', Lawyer: '/lawyer/dashboard' };
         navigate(rolePaths[data.userType] || '/');
         return; // Bypass the email verification modal
      }

      // Normal Flow
      if (role === 'Client') {
        await authService.registerClient({
          email: formData.email,
          fullName: formData.fullName,
          password: formData.password,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
          clientType: formData.clientType
        });
      } else {
        await authService.registerLawyer({
          email: formData.email,
          fullName: formData.fullName,
          password: formData.password,
          enrollmentNumber: formData.enrollmentNumber,
          specialization: formData.specialization,
          firmBio: formData.firmBio
        });
      }
      setShowModal(true);
    } catch (err: any) {
      setError(err.response?.data || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background styling */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-law-navy opacity-[0.03] rounded-full blur-3xl"></div>
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] bg-accent-gold opacity-[0.05] rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-2xl z-10">
        {!showModal ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 md:p-10"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-serif font-bold text-law-navy">Join CaseBridge</h2>
              <p className="text-law-slate mt-2">
                {step === 1 ? 'Select how you want to use the platform' : 'Tell us a bit about yourself'}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md mb-6 text-sm border border-red-200 text-center">
                {error}
              </div>
            )}

            {/* Step 1: Role Selection */}
            <AnimatePresence mode="wait">
              {step === 1 && (
                <>
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="grid md:grid-cols-2 gap-6"
                  >
                    <button
                      onClick={() => handleRoleSelect('Client')}
                      className="flex flex-col items-center p-8 border-2 border-gray-100 rounded-xl hover:border-accent-gold hover:bg-white transition-all group"
                    >
                      <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-accent-gold/10 transition-colors">
                        <User className="w-8 h-8 text-law-navy group-hover:text-accent-gold transition-colors" />
                      </div>
                      <h3 className="text-xl font-bold text-law-navy mb-2">I need a lawyer</h3>
                      <p className="text-sm text-law-slate text-center">Find expert legal representation and post your case to our marketplace.</p>
                    </button>

                    <button
                      onClick={() => handleRoleSelect('Lawyer')}
                      className="flex flex-col items-center p-8 border-2 border-gray-100 rounded-xl hover:border-accent-gold hover:bg-white transition-all group"
                    >
                      <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-accent-gold/10 transition-colors">
                        <Briefcase className="w-8 h-8 text-law-navy group-hover:text-accent-gold transition-colors" />
                      </div>
                      <h3 className="text-xl font-bold text-law-navy mb-2">I am a legal professional</h3>
                      <p className="text-sm text-law-slate text-center">Join the marketplace, claim cases, and manage your firm associates.</p>
                    </button>
                  </motion.div>

                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-100"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-law-slate font-serif italic">Or join quickly with</span>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => toast.error('Google Sign-up Failed')}
                      theme="outline"
                      width="100%"
                      text="signup_with"
                    />
                  </div>
                </>
              )}

              {/* Step 2: Details */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <button 
                    onClick={() => setStep(1)}
                    className="flex items-center text-sm text-law-slate hover:text-law-navy mb-6 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to role selection
                  </button>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* Role Selection if missing (from Google Auth Step 1 bypass) */}
                    {isGoogleAuth && !role && (
                      <div className="mb-4 p-4 border border-accent-gold bg-accent-gold/5 rounded-lg">
                        <label className="block text-sm font-bold text-law-navy mb-2">Please select your account type:</label>
                        <select 
                          required 
                          value={role} 
                          onChange={(e) => setRole(e.target.value as 'Client' | 'Lawyer')} 
                          className="input-field border-accent-gold"
                        >
                          <option value="">Select Account Type...</option>
                          <option value="Client">I am a Client (Need Legal Help)</option>
                          <option value="Lawyer">I am a Lawyer (Offer Legal Services)</option>
                        </select>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-law-navy mb-1">Full Name</label>
                        <input required type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className={`input-field ${isGoogleAuth ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`} placeholder="John Doe" disabled={isGoogleAuth} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-law-navy mb-1">Email</label>
                        <input required type="email" name="email" value={formData.email} onChange={handleInputChange} className={`input-field ${isGoogleAuth ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`} placeholder="john@example.com" disabled={isGoogleAuth} />
                      </div>
                    </div>

                    {!isGoogleAuth && (
                      <div>
                        <label className="block text-sm font-medium text-law-navy mb-1">Password</label>
                        <input 
                          required 
                          type="password" 
                          name="password" 
                          value={formData.password} 
                          onChange={handleInputChange} 
                          onFocus={() => setShowValidations(true)}
                          onBlur={() => setShowValidations(false)}
                          className="input-field" 
                          placeholder="••••••••" 
                        />
                        
                        <AnimatePresence>
                          {showValidations && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 p-3 bg-white/50 border border-gray-100 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-2">
                                <div className="flex items-center space-x-2 text-xs">
                                  {validations.length ? <ShieldCheck className="w-3 h-3 text-green-500" /> : <X className="w-3 h-3 text-gray-300" />}
                                  <span className={validations.length ? 'text-green-600' : 'text-law-slate'}>8+ Characters</span>
                                </div>
                                <div className="flex items-center space-x-2 text-xs">
                                  {validations.specialChar ? <ShieldCheck className="w-3 h-3 text-green-500" /> : <X className="w-3 h-3 text-gray-300" />}
                                  <span className={validations.specialChar ? 'text-green-600' : 'text-law-slate'}>Special Symbol</span>
                                </div>
                                <div className="flex items-center space-x-2 text-xs">
                                  {validations.uppercase ? <ShieldCheck className="w-3 h-3 text-green-500" /> : <X className="w-3 h-3 text-gray-300" />}
                                  <span className={validations.uppercase ? 'text-green-600' : 'text-law-slate'}>Capital Letter</span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Conditional Fields for Client */}
                    {role === 'Client' && (
                      <>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-law-navy mb-1">Phone Number</label>
                            <input required type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} className="input-field" placeholder="+1 (555) 000-0000" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-law-navy mb-1">Client Type</label>
                            <select name="clientType" value={formData.clientType} onChange={handleInputChange} className="input-field">
                              <option value="Individual">Individual</option>
                              <option value="Corporate">Corporate</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-law-navy mb-1">Address</label>
                          <textarea required name="address" value={formData.address} onChange={handleInputChange} className="input-field h-24 resize-none" placeholder="123 Main St..."></textarea>
                        </div>
                      </>
                    )}

                    {/* Conditional Fields for Lawyer */}
                    {role === 'Lawyer' && (
                      <>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-law-navy mb-1">Enrollment Number</label>
                            <input 
                              required 
                              type="text" 
                              name="enrollmentNumber" 
                              value={formData.enrollmentNumber} 
                              onChange={handleInputChange} 
                              className={`input-field ${!validations.enrollmentValid && formData.enrollmentNumber ? 'border-red-500 focus:ring-red-500' : ''}`} 
                              placeholder="DL/3456/2020 or AOR-1234-2022" 
                            />
                            {!validations.enrollmentValid && formData.enrollmentNumber && (
                              <p className="text-[10px] text-red-500 mt-1">Invalid format. Use DL/XXXX/YYYY or AOR-XXXX-YYYY</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-law-navy mb-1">Specialization</label>
                            <select 
                              required 
                              name="specialization" 
                              value={formData.specialization} 
                              onChange={handleInputChange} 
                              className="input-field"
                            >
                              <option value="">Select Specialization</option>
                              <option value="Corporate Law">Corporate Law</option>
                              <option value="Criminal Law">Criminal Law</option>
                              <option value="Divorce & Family Law">Divorce & Family Law</option>
                              <option value="Civil Litigation">Civil Litigation</option>
                              <option value="Intellectual Property">Intellectual Property</option>
                              <option value="Real Estate Law">Real Estate Law</option>
                              <option value="Taxation Law">Taxation Law</option>
                              <option value="General Practice">General Practice</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-law-navy mb-1">Firm Bio (Optional)</label>
                          <textarea name="firmBio" value={formData.firmBio} onChange={handleInputChange} className="input-field h-24 resize-none" placeholder="Tell us about your firm..."></textarea>
                        </div>
                      </>
                    )}

                    <button 
                      type="submit" 
                      disabled={loading || !role || !validations.length || !validations.specialChar || !validations.uppercase || !validations.enrollmentValid} 
                      className="w-full btn-primary py-3 mt-6 flex items-center justify-center"
                    >
                      {loading ? 'Processing...' : (
                        <>Create Account <ArrowRight className="ml-2 w-5 h-5" /></>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="text-center mt-8 text-law-slate text-sm border-t border-gray-100 pt-6">
              Already have an account? <Link to="/login" className="text-law-navy font-semibold hover:text-accent-gold transition-colors">Sign in here</Link>
            </div>
          </motion.div>
        ) : (
          /* Email Verification Modal State */
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-10 text-center relative"
          >
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-law-navy" />
            </div>
            <h2 className="text-3xl font-serif font-bold text-law-navy mb-4">Check your inbox</h2>
            <p className="text-law-slate mb-8 max-w-md mx-auto leading-relaxed">
              We've sent a verification link to <span className="font-semibold text-law-navy">{formData.email}</span>. 
              Please click the link in that email to activate your account.
            </p>
            
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center text-sm text-green-600 bg-green-50 px-4 py-2 rounded-full mb-2">
                <ShieldCheck className="w-4 h-4 mr-2" /> Waiting for verification...
              </div>
              <button onClick={() => window.location.href='/login'} className="btn-primary w-full max-w-xs py-3">
                Return to Login
              </button>
              <button className="text-sm text-law-slate hover:text-law-navy transition-colors">
                Didn't receive the email? Resend
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
