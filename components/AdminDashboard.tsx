
import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, CartesianGrid } from 'recharts';
import { User, SystemError } from '../types';

interface AdminDashboardProps {
  currentUser: User;
}

const mockErrorData = [
  { country: 'United States', errors: 12 },
  { country: 'Germany', errors: 5 },
  { country: 'Japan', errors: 2 },
  { country: 'United Kingdom', errors: 8 },
  { country: 'Brazil', errors: 15 },
  { country: 'India', errors: 4 },
  { country: 'Australia', errors: 1 },
  { country: 'Canada', errors: 3 }
];

const COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#6366f1', '#ec4899', '#64748b'];

const SECTIONS = {
  SYSTEM: 'SYSTEM',
  ANALYTICS: 'ANALYTICS',
  ACTIVITY: 'ACTIVITY',
  USERS: 'USERS'
};

interface DashboardSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  controls?: React.ReactNode;
}

const DashboardSection: React.FC<DashboardSectionProps> = ({ title, icon, children, isOpen, onToggle, controls }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6 transition-all duration-300">
      <div 
        onClick={onToggle}
        className={`w-full px-6 py-4 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${isOpen ? 'border-b border-slate-100 dark:border-slate-800/50' : 'rounded-b-xl'}`}
      >
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">{title}</h3>
        </div>
        <div className="flex items-center gap-4">
            {controls}
            <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        </div>
      </div>
      {isOpen && (
        <div className="p-6 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const [activeSessions, setActiveSessions] = React.useState(1); // Default to 1 (Current User)
  const [userPage, setUserPage] = useState(1);
  const [isDetailedView, setIsDetailedView] = useState(false);
  const usersPerPage = 10;

  // Persistence State
  const [sectionOrder, setSectionOrder] = useState<string[]>([SECTIONS.SYSTEM, SECTIONS.ANALYTICS, SECTIONS.ACTIVITY, SECTIONS.USERS]);
  const [sectionStates, setSectionStates] = useState<Record<string, boolean>>({
      [SECTIONS.SYSTEM]: true,
      [SECTIONS.ANALYTICS]: true,
      [SECTIONS.ACTIVITY]: true,
      [SECTIONS.USERS]: true
  });

  // Load persistence
  useEffect(() => {
    try {
        const savedOrder = localStorage.getItem('admin_dashboard_order');
        const savedStates = localStorage.getItem('admin_dashboard_states');
        if (savedOrder) setSectionOrder(JSON.parse(savedOrder));
        if (savedStates) setSectionStates(JSON.parse(savedStates));
    } catch (e) {
        console.error("Failed to load dashboard prefs", e);
    }
  }, []);

  const updateOrder = (newOrder: string[]) => {
      setSectionOrder(newOrder);
      localStorage.setItem('admin_dashboard_order', JSON.stringify(newOrder));
  };

  const toggleSection = (id: string) => {
      const newStates = { ...sectionStates, [id]: !sectionStates[id] };
      setSectionStates(newStates);
      localStorage.setItem('admin_dashboard_states', JSON.stringify(newStates));
  };

  const moveSection = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
      e.stopPropagation();
      const newOrder = [...sectionOrder];
      if (direction === 'up' && index > 0) {
          [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      } else if (direction === 'down' && index < newOrder.length - 1) {
          [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      }
      updateOrder(newOrder);
  };

  // Real-ish Active Session Count (In this client-only demo, it's just the current user)
  React.useEffect(() => {
     setActiveSessions(1);
  }, []);

  const { allUsers, leaderboardUsers, locationStats, systemErrors } = useMemo(() => {
    try {
      const stored = localStorage.getItem('beforeeach_users');
      const parsedUsers: User[] = stored ? JSON.parse(stored) : [];
      
      const countries = ['USA', 'Germany', 'Japan', 'UK', 'Brazil', 'India', 'Canada', 'France'];
      const usersWithDetails = parsedUsers.map(u => ({
          ...u,
          activityScore: Math.floor(Math.random() * 2500),
          location: countries[Math.floor(Math.random() * countries.length)]
      }));

      const locCounts: Record<string, number> = {};
      usersWithDetails.forEach(u => {
        locCounts[u.location] = (locCounts[u.location] || 0) + 1;
      });

      const stats = Object.entries(locCounts)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count);

      const sortedByActivity = [...usersWithDetails].sort((a, b) => b.activityScore - a.activityScore);

      // Generate errors linked to users
      const errors: SystemError[] = Array.from({ length: 25 }).map((_, i) => {
        const randomUser = usersWithDetails.length > 0 
            ? usersWithDetails[Math.floor(Math.random() * usersWithDetails.length)]
            : { id: 'unknown', email: 'system@internal' };
            
        return {
            id: `ERR-${1000 + i}`,
            timestamp: Date.now() - (i * 1000 * 60 * 2),
            code: i % 3 === 0 ? 'API_TIMEOUT' : i % 5 === 0 ? 'AUTH_FAIL' : 'GEN_LIMIT_EXCEEDED',
            message: i % 3 === 0 ? 'Gemini API connection timed out' : i % 5 === 0 ? 'Failed 2FA verification' : 'Daily limit exceeded',
            severity: i % 3 === 0 ? 'WARNING' : i % 7 === 0 ? 'CRITICAL' : 'INFO',
            region: ['US-EAST', 'EU-WEST', 'AP-SOUTH'][i % 3],
            userAffected: randomUser.id,
            userEmail: randomUser.email
        };
      });

      return {
          allUsers: usersWithDetails,
          leaderboardUsers: sortedByActivity.slice(0, 10),
          locationStats: stats,
          systemErrors: errors
      };
    } catch {
      return { allUsers: [], leaderboardUsers: [], locationStats: [], systemErrors: [] };
    }
  }, []);

  const registeredUsersCount = allUsers.length;
  const maskEmail = (email: string) => {
      const [name, domain] = email.split('@');
      if (!name || !domain) return email;
      const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name}***`;
      return `${maskedName}@${domain}`;
  };
  const paginatedUsers = allUsers.slice((userPage - 1) * usersPerPage, userPage * usersPerPage);
  const totalPages = Math.ceil(allUsers.length / usersPerPage);

  const renderSystemOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        </div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Active Sessions (Live)</h3>
        <div className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 flex items-baseline gap-2">
            {activeSessions}
            <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
        </div>
        <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center font-medium">
            Verified Online (You)
        </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        </div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Total Registered Users</h3>
        <div className="text-4xl font-extrabold text-purple-600 dark:text-purple-400">
            {registeredUsersCount}
        </div>
        <p className="text-xs text-slate-500 mt-2">Locally stored accounts</p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">System Status</h3>
        <div className="flex items-center gap-3 mt-4">
            <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-lg font-bold text-slate-700 dark:text-slate-200">All Systems Operational</span>
        </div>
        <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
                <span>Gemini API</span>
                <span className="text-blue-500 font-bold">Standby</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
                <span>Latency</span>
                <span className="text-slate-700 dark:text-slate-300">~45ms</span>
            </div>
        </div>
        </div>

        {isDetailedView && (
        <>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 animate-fade-in">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">CPU Usage</h3>
            <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold text-slate-800 dark:text-white">42%</span>
                <span className="text-xs text-slate-400 mb-1">Average (15m)</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '42%' }}></div>
            </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 animate-fade-in">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Memory Usage</h3>
            <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold text-slate-800 dark:text-white">3.2</span>
                <span className="text-xs text-slate-400 mb-1">GB / 8.0 GB</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '40%' }}></div>
            </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 animate-fade-in">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Network I/O</h3>
            <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold text-slate-800 dark:text-white">125</span>
                <span className="text-xs text-slate-400 mb-1">MB/s Outbound</span>
            </div>
            <div className="flex gap-1 mt-3">
                <div className="w-1 h-4 bg-green-500 rounded-sm opacity-40"></div>
                <div className="w-1 h-6 bg-green-500 rounded-sm opacity-60"></div>
                <div className="w-1 h-3 bg-green-500 rounded-sm opacity-50"></div>
                <div className="w-1 h-8 bg-green-500 rounded-sm opacity-80"></div>
                <div className="w-1 h-5 bg-green-500 rounded-sm opacity-60"></div>
                <div className="w-1 h-7 bg-green-500 rounded-sm opacity-100"></div>
            </div>
            </div>
        </>
        )}
    </div>
  );

  const renderAnalytics = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex-1 min-h-[400px]">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Unique Users by Location (All Time)
            </h3>
            <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                data={locationStats}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                <XAxis type="number" hide />
                <YAxis 
                    dataKey="country" 
                    type="category" 
                    width={80} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#fff', borderRadius: '8px' }}
                    cursor={{fill: 'transparent'}}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                    {locationStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
                </BarChart>
            </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex-1 min-h-[400px]">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Errors Reported by Region
            </h3>
            <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                data={mockErrorData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                <defs>
                    <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <XAxis dataKey="country" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#fff', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="errors" stroke="#ef4444" fillOpacity={1} fill="url(#colorErrors)" />
                </AreaChart>
            </ResponsiveContainer>
            </div>
        </div>
    </div>
  );

  const renderActivity = () => (
    <div className={`grid grid-cols-1 ${isDetailedView ? 'lg:grid-cols-2' : ''} gap-6`}>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col h-[400px]">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                User Activity Leaderboard
            </h3>
            <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
                <table className="w-full text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 text-xs uppercase tracking-wider">
                            <th className="text-left py-2 w-16 px-2">Rank</th>
                            <th className="text-left py-2 px-2">User</th>
                            <th className="text-right py-2 px-2">XP / Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboardUsers.map((u, i) => {
                            let rankIcon = <span className="text-slate-500 font-mono">#{i + 1}</span>;
                            if (i === 0) rankIcon = <span className="text-xl">🥇</span>;
                            if (i === 1) rankIcon = <span className="text-xl">🥈</span>;
                            if (i === 2) rankIcon = <span className="text-xl">🥉</span>;

                            let rowBg = '';
                            if (i === 0) rowBg = 'bg-yellow-50 dark:bg-yellow-900/10';
                            if (i === 1) rowBg = 'bg-slate-100 dark:bg-slate-800/30';
                            if (i === 2) rowBg = 'bg-orange-50 dark:bg-orange-900/10';

                            return (
                            <tr key={u.id} className={`border-b border-slate-200 dark:border-slate-700/50 ${rowBg}`}>
                                <td className="py-3 px-2 text-center">
                                    {rankIcon}
                                </td>
                                <td className="py-3 px-2 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs ring-2 ring-white dark:ring-slate-800 flex-shrink-0">
                                        {u.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{u.name}</span>
                                        <span className="text-[10px] text-slate-400 truncate">{maskEmail(u.email)}</span>
                                    </div>
                                </td>
                                <td className="text-right px-2 font-bold text-slate-700 dark:text-slate-200">
                                    {u.activityScore}
                                </td>
                            </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>

        {isDetailedView && (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col h-[400px] animate-fade-in">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Detailed Error Logs
            </h3>
            <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
                <table className="w-full text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                        <tr className="text-slate-500 text-left border-b border-slate-200 dark:border-slate-700">
                            <th className="px-3 py-2">Time</th>
                            <th className="px-3 py-2">Severity</th>
                            <th className="px-3 py-2">Message</th>
                            <th className="px-3 py-2">User Email</th>
                        </tr>
                    </thead>
                    <tbody>
                        {systemErrors.map((err) => (
                            <tr key={err.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/20">
                                <td className="px-3 py-2 text-slate-400 whitespace-nowrap">
                                    {new Date(err.timestamp).toLocaleTimeString()}
                                </td>
                                <td className="px-3 py-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        err.severity === 'CRITICAL' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                        err.severity === 'WARNING' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                        'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                    }`}>
                                        {err.severity}
                                    </span>
                                </td>
                                <td className="px-3 py-2 text-slate-700 dark:text-slate-300 truncate max-w-[150px]" title={err.message}>
                                    {err.message}
                                </td>
                                <td className="px-3 py-2 font-mono text-slate-500 truncate">
                                    {err.userEmail || 'N/A'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
        )}
    </div>
  );

  const renderUsers = () => (
    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <tr className="text-slate-500 dark:text-slate-400 font-medium">
                        <th className="px-4 py-3">User ID</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Email (Masked)</th>
                        <th className="px-4 py-3">Joined Date</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {paginatedUsers.map(user => (
                        <tr key={user.id} className="hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs text-slate-400">{user.id}</td>
                            <td className="px-4 py-3">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'}`}>
                                    {user.role}
                                </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{user.name}</td>
                            <td className="px-4 py-3 text-slate-500 font-mono">{maskEmail(user.email)}</td>
                            <td className="px-4 py-3 text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                        </tr>
                    ))}
                    {paginatedUsers.length === 0 && (
                        <tr><td colSpan={5} className="text-center py-6 text-slate-400">No users found.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="mt-4 flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-4">
            <span className="text-xs text-slate-500">
                Page {userPage} of {Math.max(1, totalPages)} (Total {allUsers.length} users)
            </span>
            <div className="flex gap-2">
                <button 
                disabled={userPage === 1}
                onClick={() => setUserPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                Previous
                </button>
                <button 
                disabled={userPage >= totalPages}
                onClick={() => setUserPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                Next
                </button>
            </div>
        </div>
    </div>
  );

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white overflow-y-auto animate-fade-in">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400">
            System overview and real-time metrics for {currentUser.name}
          </p>
        </div>

        {/* Detailed View Toggle Slider */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
           <span className={`text-xs font-bold uppercase transition-colors ${!isDetailedView ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>Standard</span>
           <button 
             onClick={() => setIsDetailedView(!isDetailedView)}
             className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none ${isDetailedView ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
             title="Toggle Detailed Analytics"
           >
              <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${isDetailedView ? 'translate-x-6' : 'translate-x-0'}`} />
           </button>
           <span className={`text-xs font-bold uppercase transition-colors ${isDetailedView ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>Detailed</span>
        </div>
      </div>

      {sectionOrder.map((id, index) => {
          const isOpen = sectionStates[id];
          const isFirst = index === 0;
          const isLast = index === sectionOrder.length - 1;
          
          const controls = (
            <div className="flex items-center gap-1 mr-2" onClick={(e) => e.stopPropagation()}>
                <button 
                    onClick={(e) => moveSection(index, 'up', e)} 
                    disabled={isFirst}
                    className={`p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors ${isFirst ? 'opacity-30 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400'}`}
                    title="Move Up"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                </button>
                <button 
                    onClick={(e) => moveSection(index, 'down', e)} 
                    disabled={isLast}
                    className={`p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors ${isLast ? 'opacity-30 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400'}`}
                    title="Move Down"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
            </div>
          );

          if (id === SECTIONS.SYSTEM) {
              return (
                <DashboardSection 
                    key={id}
                    title="System Overview"
                    isOpen={isOpen}
                    onToggle={() => toggleSection(id)}
                    controls={controls}
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                    }
                >
                    {renderSystemOverview()}
                </DashboardSection>
              );
          }
          if (id === SECTIONS.ANALYTICS) {
              return (
                <DashboardSection 
                    key={id}
                    title="Analytics & Monitoring"
                    isOpen={isOpen}
                    onToggle={() => toggleSection(id)}
                    controls={controls}
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    }
                >
                    {renderAnalytics()}
                </DashboardSection>
              );
          }
          if (id === SECTIONS.ACTIVITY) {
              return (
                <DashboardSection 
                    key={id}
                    title="Activity & Logs"
                    isOpen={isOpen}
                    onToggle={() => toggleSection(id)}
                    controls={controls}
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                >
                    {renderActivity()}
                </DashboardSection>
              );
          }
          if (id === SECTIONS.USERS) {
            return (
                <DashboardSection 
                    key={id}
                    title="User Management"
                    isOpen={isOpen}
                    onToggle={() => toggleSection(id)}
                    controls={controls}
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    }
                >
                    {renderUsers()}
                </DashboardSection>
              );
          }
          return null;
      })}

    </div>
  );
};

export default AdminDashboard;
