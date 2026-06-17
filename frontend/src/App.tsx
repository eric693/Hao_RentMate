import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import Tenants from './pages/Tenants';
import Contracts from './pages/Contracts';
import Finance from './pages/Finance';
import CollectionWorkbench from './pages/CollectionWorkbench';
import RentManagement from './pages/RentManagement';
import UtilityBills from './pages/UtilityBills';
import ExpenseRecords from './pages/ExpenseRecords';
import Reconciliation from './pages/Reconciliation';
import TaxReport from './pages/TaxReport';
import Maintenance from './pages/Maintenance';
import Settings from './pages/Settings';
import SignContract from './pages/SignContract';
import Listings from './pages/Listings';
import ROIAnalysis from './pages/ROIAnalysis';
import RentComps from './pages/RentComps';
import TenantLogin from './pages/TenantLogin';
import TenantPortal from './pages/TenantPortal';
import UserManagement from './pages/UserManagement';

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
      </BrowserRouter>
    </AuthProvider>
  );
}
