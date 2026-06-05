import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Briefcase, MessageSquare, Clock, FileText, ChevronRight } from 'lucide-react';
import { odataApi } from '../../services/api';

// Helper: map the CaseStatus enum value to a Tailwind badge colour class
const statusBadge = (status: string) => {
  switch (status) {
    case 'Open':     return 'bg-blue-50 text-blue-700';
    case 'InReview': return 'bg-yellow-50 text-yellow-700';
    case 'Closed':   return 'bg-gray-100 text-gray-500';
    case 'Reopened': return 'bg-orange-50 text-orange-700';
    default:         return 'bg-gray-50 text-gray-600';
  }
};

const ClientDashboard = () => {
  const { user } = useContext(AuthContext) || {};

  const [activeCount, setActiveCount] = useState<number>(0);
  const [closedCount, setClosedCount] = useState<number>(0);
  const [recentCases, setRecentCases] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // NOTE: CaseStatus enum is stored as a string in the DB.
        // Valid values: Open, InReview, Closed, Reopened

        // Fire all 3 requests at the SAME TIME in parallel — no sequential waiting
        const [activeRes, closedRes, recentRes] = await Promise.all([
          odataApi.get("/odata/client/ClientCases/$count?$filter=Status eq 'Open' or Status eq 'Reopened'"),
          odataApi.get("/odata/client/ClientCases/$count?$filter=Status eq 'Closed'"),
          odataApi.get("/odata/client/ClientCases?$filter=Status ne 'Closed'&$orderby=CreatedAt desc&$top=3&$select=Id,Title,Category,Status,LawyerName,CreatedAt"),
        ]);

        setActiveCount(activeRes.data);
        setClosedCount(closedRes.data);
        // OData always wraps list responses inside a ".value" array
        setRecentCases(recentRes.data.value);

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []); // [] = runs once on mount; re-runs every time user navigates back to this page

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
          <button className="btn-gold py-3 px-6 shrink-0 whitespace-nowrap">Find a Lawyer</button>
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
              <FileText className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-4xl font-serif tracking-tight font-bold mb-1 relative z-10">{loading ? '...' : closedCount}</h3>
          <p className="text-sm font-semibold opacity-90 relative z-10">Closed Cases</p>
        </div>

        <div className="bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-2xl p-6 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden opacity-80">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 rounded-xl bg-white/20 text-white shadow-sm group-hover:scale-110 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-4xl font-serif tracking-tight font-bold mb-1 relative z-10">—</h3>
          <p className="text-sm font-semibold opacity-90 relative z-10">Pending Messages</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-purple-700 text-white rounded-2xl p-6 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden opacity-80">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 rounded-xl bg-white/10 text-white shadow-sm group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-4xl font-serif tracking-tight font-bold mb-1 relative z-10">—</h3>
          <p className="text-sm font-semibold opacity-90 relative z-10">Upcoming Appts</p>
        </div>
      </div>

      {/* Active Cases List + Messages sidebar */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-law-navy">Active Cases</h2>
            <button className="text-sm text-accent-gold hover:text-law-navy font-bold flex items-center transition-colors">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="py-8 text-center text-law-slate">Loading your cases...</div>
            ) : recentCases.length === 0 ? (
              <div className="py-8 text-center text-law-slate">You don't have any active cases right now.</div>
            ) : (
              recentCases.map((c: any) => (
                <div key={c.Id} className="p-5 rounded-2xl border border-gray-100 hover:border-accent-gold/30 hover:bg-gray-50/50 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700">{c.Category}</span>
                        <span className="text-xs text-law-slate">Case #{c.Id}</span>
                      </div>
                      <h3 className="text-lg font-bold text-law-navy group-hover:text-accent-gold transition-colors">{c.Title}</h3>
                    </div>
                    {/* Status badge — colour driven by real CaseStatus enum value */}
                    <span className={`px-3 py-1 text-xs font-bold rounded-full shrink-0 ml-2 ${statusBadge(c.Status)}`}>
                      {c.Status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-law-slate mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center font-bold text-[10px] text-law-navy">
                        {c.LawyerName ? c.LawyerName.charAt(0) : '?'}
                      </div>
                      <span>{c.LawyerName || 'Awaiting Assignment'}</span>
                    </div>
                    {c.CreatedAt && (
                      <span className="flex items-center gap-1 text-xs opacity-60">
                        <Clock className="w-3 h-3" />
                        {new Date(c.CreatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Messages — placeholder until chat preview is built */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm opacity-60">
          <h2 className="text-xl font-bold text-law-navy mb-6">Recent Messages</h2>
          <p className="text-sm text-law-slate">Chat previews coming soon...</p>
          <button disabled className="w-full mt-8 py-3 text-sm font-bold text-law-navy border border-gray-200 rounded-xl cursor-not-allowed">
            View Inbox
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
