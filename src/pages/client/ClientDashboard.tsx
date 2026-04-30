import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Briefcase, MessageSquare, Clock, FileText, ChevronRight } from 'lucide-react';

const ClientDashboard = () => {
  const { user } = useContext(AuthContext) || {};

  return (
    <div className="space-y-8 pb-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-gold opacity-[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-law-navy opacity-[0.02] rounded-full blur-2xl translate-y-1/4 -translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-serif text-law-navy mb-2">Welcome back, {user?.fullName?.split(' ')[0]}!</h1>
            <p className="text-law-slate">Here is a summary of your legal matters and recent updates.</p>
          </div>
          <button className="btn-gold py-3 px-6 shrink-0 whitespace-nowrap">
            Find a Lawyer
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Cases', value: '2', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pending Messages', value: '5', icon: MessageSquare, color: 'text-accent-gold', bg: 'bg-accent-gold/10' },
          { label: 'Upcoming Appts', value: '1', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Documents', value: '12', icon: FileText, color: 'text-green-600', bg: 'bg-green-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-law-navy mb-1">{stat.value}</h3>
            <p className="text-sm font-medium text-law-slate">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity & Active Cases */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-law-navy">Active Cases</h2>
            <button className="text-sm text-accent-gold hover:text-law-navy font-bold flex items-center transition-colors">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Case Card Placeholder */}
            <div className="p-5 rounded-2xl border border-gray-100 hover:border-accent-gold/30 hover:bg-gray-50/50 transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700">Litigation</span>
                    <span className="text-xs text-law-slate">Case #CB-2026-892</span>
                  </div>
                  <h3 className="text-lg font-bold text-law-navy group-hover:text-accent-gold transition-colors">Smith vs. Acme Corp Property Dispute</h3>
                </div>
                <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full">In Progress</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-law-slate mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-200"></div>
                  <span>Atty. Harvey Specter</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Next hearing: Oct 12</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-gray-100 hover:border-accent-gold/30 hover:bg-gray-50/50 transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-purple-50 text-purple-700">Corporate</span>
                    <span className="text-xs text-law-slate">Case #CB-2026-441</span>
                  </div>
                  <h3 className="text-lg font-bold text-law-navy group-hover:text-accent-gold transition-colors">Business Incorporation & Licensing</h3>
                </div>
                <span className="px-3 py-1 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-full">Pending Review</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-law-slate mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-200"></div>
                  <span>Atty. Jessica Pearson</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Awaiting Documents</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-law-navy mb-6">Recent Messages</h2>
          <div className="space-y-6">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="flex gap-4 cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-primary-50 flex shrink-0 items-center justify-center text-law-navy font-bold border border-transparent group-hover:border-accent-gold transition-colors">
                  A
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className="text-sm font-bold text-law-navy truncate">Atty. Harvey Specter</h4>
                    <span className="text-xs text-law-slate shrink-0">2h ago</span>
                  </div>
                  <p className="text-sm text-law-slate truncate">I have reviewed the documents you sent over yesterday...</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-3 text-sm font-bold text-law-navy border border-gray-200 rounded-xl hover:border-accent-gold hover:text-accent-gold transition-colors">
            View Inbox
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
