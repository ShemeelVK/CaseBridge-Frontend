import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { CheckCircle, Clock, FileText, Calendar, ChevronRight } from 'lucide-react';

const JuniorDashboard = () => {
  const { user } = useContext(AuthContext) || {};

  return (
    <div className="space-y-8 pb-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-gold opacity-[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-100 opacity-20 rounded-full blur-2xl translate-y-1/4 -translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-serif text-law-navy mb-2">My Workspace</h1>
            <p className="text-law-slate">Welcome, {user?.fullName?.split(' ')[0]}. Here are your assigned tasks for today.</p>
          </div>
          <div className="flex items-center gap-4 bg-gray-50 px-5 py-3 rounded-xl border border-gray-100">
            <div className="text-right">
              <p className="text-xs text-law-slate uppercase font-bold tracking-wider mb-1">Senior Partner</p>
              <p className="text-sm font-bold text-law-navy">Harvey Specter</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-law-navy text-white flex items-center justify-center font-bold text-sm">HS</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Tasks Due Today', value: '3', icon: Clock, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'In Progress', value: '4', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pending Review', value: '2', icon: Clock, color: 'text-accent-gold', bg: 'bg-accent-gold/10' },
          { label: 'Completed (Week)', value: '12', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
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

      {/* Task List & Upcoming Schedule */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Task List */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-law-navy">My Assigned Tasks</h2>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-xs font-bold bg-law-navy text-white rounded-full">All</button>
              <button className="px-3 py-1 text-xs font-bold text-law-slate hover:bg-gray-100 rounded-full transition-colors">High Priority</button>
            </div>
          </div>
          
          <div className="space-y-4">
            {[
              { task: 'Draft Settlement Agreement', case: 'Smith vs. Acme Corp', priority: 'High', due: 'Today, 5:00 PM', status: 'In Progress' },
              { task: 'Research Property Precedents', case: 'Estate of M. Johnson', priority: 'Medium', due: 'Tomorrow', status: 'Not Started' },
              { task: 'Review Contract Clauses', case: 'TechCorp Merger', priority: 'High', due: 'Oct 24', status: 'In Progress' },
              { task: 'Prepare Deposition Summary', case: 'State vs. Doe', priority: 'Low', due: 'Oct 26', status: 'Pending Review' }
            ].map((item, i) => (
              <div key={i} className="p-5 rounded-2xl border border-gray-100 hover:border-accent-gold/30 hover:bg-gray-50/50 transition-colors cursor-pointer group flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className={`mt-1 w-5 h-5 rounded-full border-2 flex shrink-0 items-center justify-center ${item.status === 'Pending Review' ? 'border-accent-gold bg-accent-gold/10' : 'border-gray-300'}`}>
                    {item.status === 'Pending Review' && <CheckCircle className="w-3 h-3 text-accent-gold" />}
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold transition-colors ${item.status === 'Pending Review' ? 'text-gray-400 line-through' : 'text-law-navy group-hover:text-accent-gold'}`}>
                      {item.task}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-law-slate font-medium">{item.case}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span className={`text-xs font-bold ${item.priority === 'High' ? 'text-red-500' : item.priority === 'Medium' ? 'text-yellow-600' : 'text-blue-500'}`}>
                        {item.priority} Priority
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4 hidden md:block">
                  <span className="text-xs font-bold text-law-slate block mb-1">Due {item.due}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                    item.status === 'In Progress' ? 'bg-blue-50 text-blue-700' :
                    item.status === 'Pending Review' ? 'bg-yellow-50 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-law-navy">Today's Schedule</h2>
            <button className="p-2 text-law-slate hover:bg-gray-50 rounded-lg transition-colors">
              <Calendar className="w-5 h-5" />
            </button>
          </div>

          <div className="relative border-l-2 border-gray-100 ml-3 space-y-8 py-2">
            {[
              { time: '09:00 AM', title: 'Daily Standup', type: 'Meeting' },
              { time: '11:30 AM', title: 'Client Call (Smith)', type: 'Call' },
              { time: '02:00 PM', title: 'Drafting Focus Time', type: 'Deep Work' },
              { time: '04:30 PM', title: 'Review with Senior', type: 'Meeting' }
            ].map((event, i) => (
              <div key={i} className="relative pl-6">
                <div className="absolute w-3 h-3 bg-white border-2 border-accent-gold rounded-full -left-[7.5px] top-1.5"></div>
                <span className="text-xs font-bold text-accent-gold mb-1 block">{event.time}</span>
                <h4 className="text-sm font-bold text-law-navy">{event.title}</h4>
                <span className="text-xs text-law-slate">{event.type}</span>
              </div>
            ))}
          </div>

          <button className="w-full mt-8 py-3 text-sm font-bold text-law-navy border border-gray-200 rounded-xl hover:border-accent-gold hover:text-accent-gold transition-colors flex justify-center items-center">
            View Full Calendar <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default JuniorDashboard;
