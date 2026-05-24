import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Home,
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Wrench,
  FileText,
  Settings,
  ChevronDown,
  Sparkles,
  Bell,
  Megaphone,
  TrendingUp,
} from 'lucide-react';

const FINANCE_ITEMS = [
  { to: '/finance', label: '財務總覽', exact: true },
  { to: '/finance/workbench', label: '收款工作台', exact: false },
  { to: '/finance/rent', label: '租金管理', exact: false },
  { to: '/finance/utilities', label: '水電帳單', exact: false },
  { to: '/finance/expenses', label: '支出記錄', exact: false },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [financeOpen, setFinanceOpen] = useState(location.pathname.startsWith('/finance'));
  const [urgentCount, setUrgentCount] = useState(0);

  useEffect(() => {
    api.get('/dashboard').then((r) => {
      const d = r.data;
      setUrgentCount((d.rentSummary?.overdueCount ?? 0) + (d.pendingMaintenance ?? 0));
    }).catch(() => {});
  }, [location.pathname]);

  const isFinanceActive = location.pathname.startsWith('/finance');

  function handleLogout() { logout(); navigate('/login'); }

  return (
    <div className="flex h-screen bg-warm overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-100 flex-shrink-0">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center flex-shrink-0">
              <Home className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-bold text-gray-800 text-sm leading-tight">RentMate</div>
              <div className="text-xs text-gray-400">房東管理平台</div>
            </div>
          </div>
        </div>

        {/* Workspace box */}
        <div className="mx-3 mt-3 mb-1 bg-warm rounded-xl p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-400">目前工作區</span>
            </div>
            <span className="text-xs bg-brand/10 text-brand px-1.5 py-0.5 rounded-full font-medium">擁有者</span>
          </div>
          <div className="font-semibold text-gray-700 text-sm">{user?.name}</div>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-5 h-5 bg-brand rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">{user?.name?.charAt(0)}</span>
            </div>
            <span className="text-xs text-gray-400">擁有者登入中</span>
          </div>
        </div>

        {/* Urgent alert strip */}
        {urgentCount > 0 && (
          <button
            onClick={() => navigate('/finance/workbench')}
            className="mx-3 mb-1 flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2 w-[calc(100%-1.5rem)] hover:bg-red-100 transition-colors"
          >
            <Bell className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            <span className="text-xs text-red-600 font-medium">{urgentCount} 項需要優先處理</span>
            <span className="ml-auto w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center font-bold">{urgentCount}</span>
          </button>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          <SidebarLink to="/" label="總覽" icon={LayoutDashboard} exact />
          <SidebarLink to="/properties" label="房務" icon={Building2} />
          <SidebarLink to="/tenants" label="租客" icon={Users} />

          {/* 帳務 submenu */}
          <div>
            <button
              onClick={() => setFinanceOpen(!financeOpen)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                isFinanceActive ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4" />
                帳務
              </div>
              <ChevronDown className={`w-3 h-3 transition-transform ${financeOpen ? 'rotate-180' : ''}`} />
            </button>
            {financeOpen && (
              <div className="ml-3 mt-0.5 border-l-2 border-gray-100 pl-3 space-y-0.5">
                {FINANCE_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.exact}
                    className={({ isActive }) =>
                      `block px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isActive ? 'text-brand bg-brand/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          <SidebarLink to="/listings" label="空房刊登" icon={Megaphone} />
          <SidebarLink to="/roi" label="投報分析" icon={TrendingUp} />
          <SidebarLink to="/maintenance" label="報修" icon={Wrench} />
          <SidebarLink to="/contracts" label="合約" icon={FileText} />
          <SidebarLink to="/settings" label="設定" icon={Settings} />
        </nav>

        {/* Bottom tip */}
        <div className="mx-3 mb-3 bg-warm rounded-xl p-3 border border-gray-100">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-brand" />
            <span className="text-xs font-semibold text-gray-600">使用小秘訣</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed mb-2">建立收款提醒，自動掌握每月收租進度</p>
          <button onClick={() => navigate('/settings')} className="w-full text-xs bg-brand text-white rounded-lg py-1.5 font-medium hover:bg-brand-dark transition-colors">
            立即設定
          </button>
        </div>

        <div className="px-4 pb-3 text-xs text-gray-300">RentMate 房東管理後台 v1.0.0</div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-50 shadow-lg">
          {[
            { to: '/', label: '總覽', icon: LayoutDashboard, exact: true },
            { to: '/properties', label: '房務', icon: Building2, exact: false },
            { to: '/finance', label: '帳務', icon: CreditCard, exact: false },
            { to: '/maintenance', label: '報修', icon: Wrench, exact: false },
            { to: '/settings', label: '設定', icon: Settings, exact: false },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${isActive ? 'text-brand' : 'text-gray-400'}`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-brand' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                  {isActive && <div className="w-1 h-1 rounded-full bg-brand" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

function SidebarLink({ to, label, icon: Icon, exact }: { to: string; label: string; icon: React.FC<{className?: string}>; exact?: boolean }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
          isActive ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-50'
        }`
      }
    >
      <Icon className="w-4 h-4" />
      {label}
    </NavLink>
  );
}
