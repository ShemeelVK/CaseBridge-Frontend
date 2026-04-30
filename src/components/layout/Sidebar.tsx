import { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  MessageSquare, 
  FileText, 
  Settings,
  Scale,
  Calendar,
  X,
  Globe
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { user } = useContext(AuthContext) || {};

  const getNavLinks = () => {
    switch (user?.userType) {
      case 'Lawyer':
        return [
          { name: 'Firm Dashboard', icon: LayoutDashboard, path: '/lawyer/dashboard' },
          { name: 'Active Cases', icon: Briefcase, path: '/lawyer/cases' },
          { name: 'Marketplace', icon: Globe, path: '/marketplace' },
          { name: 'Associates', icon: Users, path: '/lawyer/associates' },
          { name: 'Messages', icon: MessageSquare, path: '/lawyer/messages' },
        ];
      case 'Junior':
        return [
          { name: 'My Tasks', icon: LayoutDashboard, path: '/junior/dashboard' },
          { name: 'Case Files', icon: FileText, path: '/junior/cases' },
          { name: 'Marketplace', icon: Globe, path: '/marketplace' },
          { name: 'Schedule', icon: Calendar, path: '/junior/schedule' },
          { name: 'Messages', icon: MessageSquare, path: '/junior/messages' },
        ];
      case 'Client':
        return [
          { name: 'My Dashboard', icon: LayoutDashboard, path: '/client/dashboard' },
          { name: 'My Cases', icon: Briefcase, path: '/client/cases' },
          { name: 'Marketplace', icon: Globe, path: '/marketplace' },
          { name: 'Find Lawyer', icon: Scale, path: '/client/find-lawyer' },
          { name: 'Messages', icon: MessageSquare, path: '/client/messages' },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-law-navy/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen bg-law-navy text-white w-72 z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col shadow-2xl lg:shadow-none`}>
        
        {/* Logo Area */}
        <div className="h-20 flex items-center justify-between px-8 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent-gold rounded flex items-center justify-center">
              <Scale className="w-5 h-5 text-law-navy" />
            </div>
            <span className="text-2xl font-serif font-bold tracking-wide">CaseBridge</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-2 text-white/70 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-8 px-4 flex flex-col gap-2">
          <p className="px-4 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Menu</p>
          
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.name}
                to={link.path}
                className={({ isActive }) => 
                  `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive 
                      ? 'bg-accent-gold/10 text-accent-gold font-medium' 
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                <span>{link.name}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-white/10">
          <NavLink
            to="/settings"
            className="flex items-center gap-4 px-4 py-3 rounded-xl text-white/70 hover:bg-white/5 hover:text-white transition-all duration-200 group"
          >
            <Settings className="w-5 h-5 transition-transform group-hover:rotate-90" />
            <span>Settings</span>
          </NavLink>
        </div>

      </aside>
    </>
  );
};

export default Sidebar;
