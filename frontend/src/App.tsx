import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';

// 路由分包：各頁延遲載入，縮小首次載入體積
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Properties = lazy(() => import('./pages/Properties'));
const Tenants = lazy(() => import('./pages/Tenants'));
const Contracts = lazy(() => import('./pages/Contracts'));
const Finance = lazy(() => import('./pages/Finance'));
const CollectionWorkbench = lazy(() => import('./pages/CollectionWorkbench'));
const RentManagement = lazy(() => import('./pages/RentManagement'));
const UtilityBills = lazy(() => import('./pages/UtilityBills'));
const ExpenseRecords = lazy(() => import('./pages/ExpenseRecords'));
const Reconciliation = lazy(() => import('./pages/Reconciliation'));
const TaxReport = lazy(() => import('./pages/TaxReport'));
const Maintenance = lazy(() => import('./pages/Maintenance'));
const Settings = lazy(() => import('./pages/Settings'));
const SignContract = lazy(() => import('./pages/SignContract'));
const Listings = lazy(() => import('./pages/Listings'));
const ROIAnalysis = lazy(() => import('./pages/ROIAnalysis'));
const RentComps = lazy(() => import('./pages/RentComps'));
const TenantLogin = lazy(() => import('./pages/TenantLogin'));
const TenantPortal = lazy(() => import('./pages/TenantPortal'));
const UserManagement = lazy(() => import('./pages/UserManagement'));

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">載入中...</div>;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-400">載入中...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/sign/:token" element={<SignContract />} />
          {/* 租客端（綁定碼登入，獨立 tenantToken） */}
          <Route path="/tenant/login" element={<TenantLogin />} />
          <Route path="/tenant" element={<TenantPortal />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="properties" element={<Properties />} />
            <Route path="tenants" element={<Tenants />} />
            <Route path="finance" element={<Finance />} />
            <Route path="finance/workbench" element={<CollectionWorkbench />} />
            <Route path="finance/rent" element={<RentManagement />} />
            <Route path="finance/utilities" element={<UtilityBills />} />
            <Route path="finance/reconcile" element={<Reconciliation />} />
            <Route path="finance/expenses" element={<ExpenseRecords />} />
            <Route path="finance/tax" element={<TaxReport />} />
            <Route path="contracts" element={<Contracts />} />
            <Route path="listings" element={<Listings />} />
            <Route path="roi" element={<ROIAnalysis />} />
            <Route path="market" element={<RentComps />} />
            <Route path="maintenance" element={<Maintenance />} />
            <Route path="settings" element={<Settings />} />
            <Route path="users" element={<AdminRoute><UserManagement /></AdminRoute>} />
          </Route>
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
