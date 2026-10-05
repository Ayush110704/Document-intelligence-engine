import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  UploadCloud,
  GitFork,
  BarChart3,
  FileClock,
  Search,
  LogOut,
} from 'lucide-react';

const STORAGE_KEY = 'docflow_documents';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
 
  useEffect(() => {
    const load = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const all = stored ? JSON.parse(stored) : [];
        setPendingCount(all.filter((d) => d.status === 'Pending').length);
      } catch {
        setPendingCount(0);
      }
    };
    load();
    const onCustom = () => load();
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) load();
    };
    window.addEventListener('documentsUpdated', onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('documentsUpdated', onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: FileText, label: 'Documents', path: '/documents', badge: pendingCount },
    { icon: UploadCloud, label: 'Upload', path: '/upload' },
    { icon: GitFork, label: 'Workflows', path: '/workflows' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: FileClock, label: 'Audit Logs', path: '/audit-logs' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('docflow_auth');
    sessionStorage.clear();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* SIDEBAR */}
      <div className="w-64 bg-[#0f172a] text-slate-300 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800 z-30">
        <div className="p-6 flex items-center gap-3 mb-4 flex-shrink-0">
          <div className="bg-blue-600 text-white p-2 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <span className="text-xl font-bold text-white tracking-tight">DocFlow</span>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={index}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`h-5 w-5 ${
                        isActive ? 'text-white' : 'text-slate-400'
                      }`}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.badge > 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-white text-blue-600'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex-shrink-0 border-t border-slate-800 p-4">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="h-9 w-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              A
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">Ayush</p>
              <p className="text-xs text-slate-400 truncate">ayush@docflow.io</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-red-600 px-4 py-2.5 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="ml-64 flex flex-col min-h-screen">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search documents..."
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
              />
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;