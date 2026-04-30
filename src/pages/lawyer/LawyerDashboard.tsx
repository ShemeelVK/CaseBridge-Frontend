import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Users, Briefcase, AlertCircle, FileCheck, ChevronRight } from 'lucide-react';

const LawyerDashboard = () => {
  const { user } = useContext(AuthContext) || {};

  return (
    <div className="space-y-8 pb-8">
      {/* Welcome Section */}
      <div className="bg-law-navy rounded-3xl p-8 shadow-lg relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-gold opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-500 opacity-20 rounded-full blur-2xl translate-y-1/4 -translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-serif mb-2">Firm Dashboard</h1>
            <p className="text-white/70">Welcome back, Atty. {user?.fullName?.split(' ')[0]}. Here's your firm's overview.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button className="bg-white/10 hover:bg-white/20 text-white py-3 px-6 rounded-xl font-bold transition-colors">
              Add Junior
            </button>
            <button className="bg-accent-gold hover:bg-yellow-500 text-law-navy py-3 px-6 rounded-xl font-bold transition-colors shadow-lg shadow-accent-gold/20">
              New Case
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Cases', value: '24', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Junior Lawyers', value: '6', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Pending Reviews', value: '12', icon: FileCheck, color: 'text-accent-gold', bg: 'bg-accent-gold/10' },
          { label: 'Action Required', value: '3', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
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

      {/* Task & Team Overview */}
      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* Pending Reviews from Juniors */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-law-navy">Pending Reviews</h2>
            <button className="text-sm text-accent-gold hover:text-law-navy font-bold flex items-center transition-colors">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          
          <div className="space-y-4">
            {[
              { junior: 'Mike Ross', task: 'Draft Settlement Agreement', case: 'Smith vs. Acme Corp', time: '2h ago' },
              { junior: 'Rachel Zane', task: 'Research Precedents', case: 'Estate of M. Johnson', time: '4h ago' },
              { junior: 'Katrina Bennett', task: 'Review Contract Clauses', case: 'TechCorp Merger', time: '5h ago' }
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-2xl border border-gray-100 hover:border-accent-gold/30 hover:bg-gray-50/50 transition-colors cursor-pointer group flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-law-navy group-hover:text-accent-gold transition-colors">{item.task}</h3>
                  <p className="text-xs text-law-slate mt-1">Case: {item.case}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-[10px] font-bold text-law-navy">{item.junior.charAt(0)}</div>
                    <span className="text-xs font-medium text-law-slate">Submitted by {item.junior}</span>
                  </div>
                </div>
                <span className="text-xs text-law-slate shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Firm Performance / Junior Workload */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-law-navy mb-6">Junior Workload</h2>
          <div className="space-y-6">
            {[
              { name: 'Mike Ross', load: 85, active: 4 },
              { name: 'Rachel Zane', load: 60, active: 3 },
              { name: 'Katrina Bennett', load: 95, active: 6 },
              { name: 'Brian Altman', load: 40, active: 2 }
            ].map((junior, i) => (
              <div key={i}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-law-navy">
                      {junior.name.charAt(0)}
                    </div>
                    <span className="text-sm font-bold text-law-navy">{junior.name}</span>
                  </div>
                  <span className="text-xs font-medium text-law-slate">{junior.active} active cases</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-2 rounded-full ${junior.load > 80 ? 'bg-red-500' : junior.load > 60 ? 'bg-accent-gold' : 'bg-green-500'}`} 
                    style={{ width: `${junior.load}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-3 text-sm font-bold text-law-navy border border-gray-200 rounded-xl hover:border-accent-gold hover:text-accent-gold transition-colors">
            Manage Team
          </button>
        </div>
      </div>
    </div>
  );
};

export default LawyerDashboard;
