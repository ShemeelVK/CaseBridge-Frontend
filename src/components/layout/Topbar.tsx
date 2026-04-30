import { useContext, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Bell, Search, Menu, LogOut, Settings, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface TopbarProps {
  onMenuClick: () => void;
}

const Topbar = ({ onMenuClick }: TopbarProps) => {
  const { user, logout } = useContext(AuthContext) || {};
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    if (logout) {
      logout();
      navigate('/login');
    }
  };

  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="p-2 rounded-lg text-law-slate hover:bg-gray-100 transition-colors lg:hidden"
        >
          <Menu className="w-6 h-6" />
        </button>
        
        <div className="hidden md:flex items-center bg-gray-50 rounded-full px-4 py-2 border border-gray-100 focus-within:border-accent-gold focus-within:ring-2 focus-within:ring-accent-gold/20 transition-all w-96">
          <Search className="w-5 h-5 text-gray-400 mr-2" />
          <input 
            type="text" 
            placeholder="Search cases, lawyers, or documents..." 
            className="bg-transparent border-none focus:outline-none w-full text-sm text-law-navy"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative p-2 text-law-slate hover:text-accent-gold transition-colors">
          <Bell className="w-6 h-6" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        <div className="relative">
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 p-1 pr-3 rounded-full hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-law-navy to-blue-900 flex items-center justify-center text-white font-bold shadow-md">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-bold text-law-navy leading-tight">{user?.fullName || 'User'}</p>
              <p className="text-xs text-law-slate">{user?.userType || 'Role'}</p>
            </div>
          </button>

          <AnimatePresence>
            {showProfileMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 overflow-hidden"
              >
                <div className="px-4 py-2 border-b border-gray-50 mb-2 md:hidden">
                  <p className="text-sm font-bold text-law-navy">{user?.fullName}</p>
                  <p className="text-xs text-law-slate">{user?.userType}</p>
                </div>
                
                <button className="w-full text-left px-4 py-2 text-sm text-law-slate hover:bg-primary-50 hover:text-law-navy flex items-center gap-2 transition-colors">
                  <UserIcon className="w-4 h-4" /> Profile
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-law-slate hover:bg-primary-50 hover:text-law-navy flex items-center gap-2 transition-colors">
                  <Settings className="w-4 h-4" /> Settings
                </button>
                <div className="h-px bg-gray-100 my-2"></div>
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
