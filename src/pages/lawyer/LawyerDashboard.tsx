import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Users, Briefcase, AlertCircle, FileCheck, ChevronRight, CheckCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { odataApi } from '../../services/api';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { firmService } from '../../services/firmService';

const LawyerDashboard = () => {
  const { user } = useContext(AuthContext) || {};
  const axiosPrivate = useAxiosPrivate();

  const [activeCount, setActiveCount]     = useState<number>(0);
  const [closedCount, setClosedCount]     = useState<number>(0);
  const [pendingReviews, setPendingReviews] = useState<number>(0);
  const [membersCount, setMembersCount]   = useState<number>(0);
  const [recentCases, setRecentCases]     = useState<any[]>([]);
  const [juniorWorkload, setJuniorWorkload] = useState<any[]>([]);
  const [closedCasesRaw, setClosedCasesRaw] = useState<any[]>([]);
  const [chartFilter, setChartFilter]     = useState<'3M' | '6M' | '1Y'>('6M');
  const [chartData, setChartData]         = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fire all requests at the SAME TIME in parallel
        const [activeRes, closedCountRes, reviewsRes, recentRes, workloadRes, membersRes, closedDataRes] = await Promise.all([
          // OData: Active cases
          odataApi.get("/odata/firm/FirmCases/$count?$filter=Status eq 'Open' or Status eq 'InReview' or Status eq 'Reopened'"),
          // OData: Closed cases count
          odataApi.get("/odata/firm/FirmCases/$count?$filter=Status eq 'Closed'"),
          // OData: Pending Reviews
          odataApi.get("/odata/firm/FirmCases/$count?$filter=Status eq 'InReview'"),
          // OData: Recent active cases
          odataApi.get("/odata/firm/FirmCases?$filter=Status ne 'Closed'&$orderby=CreatedAt desc&$top=4&$select=Id,Title,Category,Status,LawyerName,ClientName,CreatedAt"),
          // OData: Workload grouping
          odataApi.get("/odata/firm/FirmCases?$filter=Status ne 'Closed' and AcceptedByUserId ne null&$select=LawyerName"),
          // REST API: Firm Members count
          firmService.getMyAssociates(axiosPrivate),
          // OData: Closed cases for Chart
          odataApi.get("/odata/firm/FirmCases?$filter=Status eq 'Closed'&$select=Budget,CreatedAt")
        ]);

        setActiveCount(activeRes.data);
        setClosedCount(closedCountRes.data);
        setPendingReviews(reviewsRes.data);
        setRecentCases(recentRes.data.value);
        
        // Members = Senior + Juniors
        setMembersCount(1 + (membersRes.associates?.length || 0));

        // Group workload by LawyerName in JS
        const counts: Record<string, number> = {};
        (workloadRes.data.value as any[]).forEach((c) => {
          if (c.LawyerName) counts[c.LawyerName] = (counts[c.LawyerName] || 0) + 1;
        });
        const workloadArr = Object.entries(counts)
          .map(([name, active]) => ({
            name,
            active,
            load: Math.min(Math.round((active / 8) * 100), 100), // 8 cases = 100% capacity
          }))
          .sort((a, b) => b.active - a.active);
        setJuniorWorkload(workloadArr);

        setClosedCasesRaw(closedDataRes.data.value);

      } catch (error) {
        console.error('Failed to fetch lawyer dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [axiosPrivate]);

  // Generate Chart Data based on Filter
  useEffect(() => {
    if (!closedCasesRaw) return;
    const monthsCount = chartFilter === '3M' ? 3 : chartFilter === '6M' ? 6 : 12;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const range = [...Array(monthsCount)].map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (monthsCount - 1 - i));
      return { name: monthNames[d.getMonth()], amount: 0, year: d.getFullYear(), month: d.getMonth() };
    });

    closedCasesRaw.forEach(c => {
      if (!c.CreatedAt) return;
      const d = new Date(c.CreatedAt);
      const entry = range.find(e => e.month === d.getMonth() && e.year === d.getFullYear());
      if (entry) {
        entry.amount += (c.Budget || 0);
      }
    });
    setChartData(range);
  }, [closedCasesRaw, chartFilter]);

  // Status badge colour helper
  const statusBadge = (status: string) => {
    switch (status) {
      case 'Open':     return 'bg-blue-50 text-blue-700';
      case 'InReview': return 'bg-yellow-50 text-yellow-700';
      case 'Closed':   return 'bg-gray-100 text-gray-500';
      case 'Reopened': return 'bg-orange-50 text-orange-700';
      default:         return 'bg-gray-50 text-gray-600';
    }
  };

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
        <div className="bg-gradient-to-br from-law-navy to-slate-800 text-white rounded-2xl p-6 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 rounded-xl bg-white/10 text-white shadow-sm group-hover:scale-110 transition-transform">
              <Briefcase className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-4xl font-serif tracking-tight font-bold mb-1 relative z-10">{loading ? '...' : activeCount}</h3>
          <p className="text-sm font-semibold opacity-90 relative z-10">Active Cases</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-2xl p-6 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 rounded-xl bg-white/20 text-white shadow-sm group-hover:scale-110 transition-transform">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-4xl font-serif tracking-tight font-bold mb-1 relative z-10">{loading ? '...' : closedCount}</h3>
          <p className="text-sm font-semibold opacity-90 relative z-10">Closed Cases</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-purple-700 text-white rounded-2xl p-6 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 rounded-xl bg-white/10 text-white shadow-sm group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-4xl font-serif tracking-tight font-bold mb-1 relative z-10">{loading ? '...' : membersCount}</h3>
          <p className="text-sm font-semibold opacity-90 relative z-10">Firm Members</p>
        </div>

        <div className="bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-2xl p-6 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 rounded-xl bg-white/20 text-white shadow-sm group-hover:scale-110 transition-transform">
              <FileCheck className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-4xl font-serif tracking-tight font-bold mb-1 relative z-10">{loading ? '...' : pendingReviews}</h3>
          <p className="text-sm font-semibold opacity-90 relative z-10">Pending Reviews</p>
        </div>
      </div>

      {/* Earnings Chart */}
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mt-8 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-law-navy">Revenue Over Time</h2>
          <select 
            value={chartFilter} 
            onChange={(e) => setChartFilter(e.target.value as any)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-law-slate font-medium focus:outline-none focus:border-accent-gold"
          >
            <option value="3M">Last 3 Months</option>
            <option value="6M">Last 6 Months</option>
            <option value="1Y">Last Year</option>
          </select>
        </div>
        <div className="h-72 w-full">
          {loading ? (
            <div className="h-full flex items-center justify-center text-law-slate">Loading chart data...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#9ca3af', fontSize: 12}} 
                  tickFormatter={(value) => value >= 1000 ? `₹${value/1000}k` : `₹${value}`} 
                  dx={-10} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                  labelStyle={{ color: '#1a2b4c', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom Two Panels */}
      <div className="grid lg:grid-cols-2 gap-8">

        {/* Recent Firm Cases (Real Data) */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-law-navy">Recent Cases</h2>
            <button className="text-sm text-accent-gold hover:text-law-navy font-bold flex items-center transition-colors">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="py-8 text-center text-law-slate">Loading firm cases...</div>
            ) : recentCases.length === 0 ? (
              <div className="py-8 text-center text-law-slate">No active cases in the firm yet.</div>
            ) : (
              recentCases.map((c: any) => (
                <div key={c.Id} className="p-4 rounded-2xl border border-gray-100 hover:border-accent-gold/30 hover:bg-gray-50/50 transition-colors cursor-pointer group flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 shrink-0">{c.Category}</span>
                    </div>
                    <h3 className="text-sm font-bold text-law-navy group-hover:text-accent-gold transition-colors truncate">{c.Title}</h3>
                    <p className="text-xs text-law-slate mt-1 truncate">
                      Client: {c.ClientName || '—'} · {c.LawyerName ? `Atty. ${c.LawyerName}` : 'Unassigned'}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full shrink-0 ${statusBadge(c.Status)}`}>
                    {c.Status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lawyer Workload Progress Bars (Real Data) */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-law-navy mb-6">Lawyer Workload</h2>
          <div className="space-y-6">
            {loading ? (
              <div className="text-center text-law-slate py-4">Calculating firm workload...</div>
            ) : juniorWorkload.length === 0 ? (
              <div className="text-center text-law-slate py-4">No active assigned cases in the firm.</div>
            ) : (
              juniorWorkload.map((lawyer, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-law-navy">
                        {lawyer.name.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-law-navy">{lawyer.name}</span>
                    </div>
                    <span className="text-xs font-medium text-law-slate">{lawyer.active} active</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ${
                        lawyer.load > 80 ? 'bg-red-500' : lawyer.load > 60 ? 'bg-accent-gold' : 'bg-green-500'
                      }`}
                      style={{ width: `${lawyer.load}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
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
