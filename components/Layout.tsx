import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Box, ShoppingBag, LogOut,
  Menu, PieChart, ChevronRight, Bell, TrendingUp
} from 'lucide-react';
import Notifications from './Notifications';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

// ─── NAV ITEM (stable outside Layout) ────────────────
const NavItem: React.FC<{
  page: string; icon: any; label: string;
  currentPage: string; onNavigate: (page: string) => void;
  onMobileClose?: () => void;
}> = ({ page, icon: Icon, label, currentPage, onNavigate, onMobileClose }) => {
  const isActive = currentPage === page;
  return (
    <button
      onClick={() => { onNavigate(page); onMobileClose?.(); }}
      className={`relative w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${isActive
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
    >
      <Icon size={20} className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
      <span className="font-medium tracking-wide text-sm flex-1 text-left">{label}</span>
      {isActive && <ChevronRight size={16} className="opacity-50" />}
    </button>
  );
};



// ─── MAIN LAYOUT COMPONENT ───────────────────────────

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate }) => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex font-sans">
      {/* Sidebar - Desktop (Dark Theme) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-4 h-screen sticky top-0 z-30 shadow-2xl">
        <div className="flex items-center gap-3 px-2 mb-8 mt-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
            <span className="text-white font-bold text-lg">I</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Invenio<span className="text-indigo-400">AI</span></h1>
            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold mt-0.5">Inventory OS</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5">
          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-3 px-4">Menu</div>
          <NavItem page="dashboard" icon={LayoutDashboard} label="Dashboard" currentPage={currentPage} onNavigate={onNavigate} />
          <NavItem page="inventory" icon={Box} label="Inventory" currentPage={currentPage} onNavigate={onNavigate} />
          <NavItem page="sales" icon={ShoppingBag} label="Sales" currentPage={currentPage} onNavigate={onNavigate} />
          <NavItem page="analytics" icon={PieChart} label="Analytics" currentPage={currentPage} onNavigate={onNavigate} />
          <NavItem page="forecasting" icon={TrendingUp} label="Forecasting" currentPage={currentPage} onNavigate={onNavigate} />
        </nav>

        {/* User Profile Snippet */}
        <div className="mt-auto pt-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 mb-4 group cursor-pointer p-2 rounded-xl hover:bg-slate-800 transition-colors">
            <div className="relative">
              <div className="w-9 h-9 rounded-full border-2 border-slate-700 shadow-sm bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">{user?.name?.charAt(0) || 'U'}</span>
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate capitalize tracking-wide">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-red-600/10 hover:border-red-600/50 rounded-xl transition-all duration-200 text-sm font-medium border border-slate-800 group"
          >
            <LogOut size={16} className="group-hover:text-red-500 transition-colors" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
        {/* Mobile Header */}
        <header className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center sticky top-0 z-20 shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">I</span>
            </div>
            <span className="font-bold text-white">Invenio AI</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors relative group"
              >
                <Bell size={20} className="group-hover:scale-110 transition-transform" />
                {unreadCount > 0 && (
                  <>
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full text-[10px] font-bold text-white flex items-center justify-center border-2 border-slate-900 shadow-lg animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-rose-500 rounded-full animate-ping opacity-75"></span>
                  </>
                )}
              </button>
              <Notifications isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} onUnreadCountChange={setUnreadCount} />
            </div>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg">
              <Menu size={24} />
            </button>
          </div>
        </header>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-slate-900 border-b border-slate-800 z-50 p-4 shadow-xl space-y-2 animate-in slide-in-from-top-2 text-white">
            <NavItem page="dashboard" icon={LayoutDashboard} label="Dashboard" currentPage={currentPage} onNavigate={onNavigate} onMobileClose={() => setIsMobileMenuOpen(false)} />
            <NavItem page="inventory" icon={Box} label="Inventory" currentPage={currentPage} onNavigate={onNavigate} onMobileClose={() => setIsMobileMenuOpen(false)} />
            <NavItem page="sales" icon={ShoppingBag} label="Sales" currentPage={currentPage} onNavigate={onNavigate} onMobileClose={() => setIsMobileMenuOpen(false)} />
            <NavItem page="analytics" icon={PieChart} label="Analytics" currentPage={currentPage} onNavigate={onNavigate} onMobileClose={() => setIsMobileMenuOpen(false)} />
            <NavItem page="forecasting" icon={TrendingUp} label="Forecasting" currentPage={currentPage} onNavigate={onNavigate} onMobileClose={() => setIsMobileMenuOpen(false)} />
            <div className="h-px bg-slate-800 my-2"></div>
            <button onClick={logout} className="w-full text-left px-4 py-3 text-red-400 font-medium flex items-center gap-2">
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        )}

        {/* Top Bar (Desktop) */}
        <div className="hidden md:flex justify-between items-center px-6 py-4 bg-white/50 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200/50">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight capitalize flex items-center gap-2">
            {currentPage === 'inventory' && <Box size={18} className="text-indigo-500" />}
            {currentPage === 'dashboard' && <LayoutDashboard size={18} className="text-indigo-500" />}
            {currentPage === 'sales' && <ShoppingBag size={18} className="text-indigo-500" />}
            {currentPage === 'analytics' && <PieChart size={18} className="text-indigo-500" />}
            {currentPage === 'forecasting' && <TrendingUp size={18} className="text-indigo-500" />}
            {currentPage}
          </h2>
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2.5 bg-white hover:bg-indigo-50 rounded-xl shadow-sm hover:shadow-md transition-all group border border-slate-200 hover:border-indigo-200"
              >
                <Bell size={20} className="text-slate-600 group-hover:text-indigo-600 group-hover:scale-110 transition-all" />
                {unreadCount > 0 && (
                  <>
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1.5 border-2 border-white shadow-lg animate-pulse">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-400 rounded-full animate-ping opacity-60"></span>
                  </>
                )}
              </button>
              <Notifications isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} onUnreadCountChange={setUnreadCount} />
            </div>
            <div className="h-6 w-px bg-slate-200"></div>
            <div className="text-xs text-slate-500 font-medium">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;