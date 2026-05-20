import './App.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';
import Nav from './components/Nav';
import Footer from './components/Footer';
import AuthCallback from './components/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Analyze from './pages/Analyze';
import DashboardList from './pages/DashboardList';
import Dashboard from './pages/Dashboard';
import Method from './pages/Method';
import Pricing from './pages/Pricing';
import Login from './pages/Login';
import VisualizeStudio from './pages/VisualizeStudio';
import Workspace from './pages/Workspace';
import UpgradeCart from './pages/UpgradeCart';
import ListingRewrite from './pages/ListingRewrite';
import Portfolio from './pages/Portfolio';
import PortfolioIntelligence from './pages/PortfolioIntelligence';
import AssetDetail from './pages/AssetDetail';
import AddAsset from './pages/AddAsset';
import Propul8Index from './pages/Propul8Index';
import Vision from './pages/Vision';
import Operate from './pages/Operate';
import DashboardHome from './pages/DashboardHome';
import InvestLanding from './pages/invest/InvestLanding';
import InvestDashboard from './pages/invest/InvestDashboard';
import InvestPortfolio from './pages/invest/InvestPortfolio';
import InvestmentMemo from './pages/invest/InvestmentMemo';
import EnterVela from './pages/EnterVela';
import Reports from './pages/Reports';

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  const isInvest = location.pathname.startsWith('/invest');
  const isDarkShell = isInvest || location.pathname.startsWith('/dashboard/demo');
  return (
    <div className={isDarkShell ? 'vela-invest' : ''}>
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/method" element={<Method />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/enter" element={<EnterVela />} />
          <Route path="/reports" element={<Reports />} />
          {/* Propul8 OPERATE — public asset-optimization entry */}
          <Route path="/operate" element={<Operate />} />
          {/* Propul8 INVEST — public investor terminal */}
          <Route path="/invest" element={<InvestLanding />} />
          <Route path="/invest/asset/:assetId" element={<InvestDashboard />} />
          <Route path="/invest/portfolio" element={<InvestPortfolio />} />
          <Route path="/invest/memo/:assetId" element={<InvestmentMemo />} />
          <Route path="/dashboard/demo" element={<DashboardHome />} />
          <Route path="/market-trends" element={<DashboardHome />} />
          <Route path="/dashboard/asset/demo" element={<Dashboard />} />
          <Route
            path="/analyze"
            element={
              <ProtectedRoute>
                <Analyze />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/:propertyId"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/visualize/demo/:upgradeIdx" element={<VisualizeStudio />} />
          <Route path="/workspace/demo/:upgradeIdx/:conceptKey" element={<Workspace />} />
          <Route path="/upgrade/demo/:upgradeIdx" element={<UpgradeCart />} />
          <Route path="/listing/demo/:upgradeIdx" element={<ListingRewrite />} />
          <Route path="/portfolio/demo" element={<PortfolioIntelligence />} />
          <Route path="/portfolio/add" element={<AddAsset />} />
          <Route path="/asset/:id" element={<AssetDetail />} />
          <Route path="/index-explained" element={<Propul8Index />} />
          <Route path="/vision" element={<Vision />} />
          <Route
            path="/portfolio"
            element={<PortfolioIntelligence />}
          />
          <Route
            path="/visualize/:propertyId/:upgradeIdx"
            element={
              <ProtectedRoute>
                <VisualizeStudio />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspace/:propertyId/:upgradeIdx/:conceptKey"
            element={
              <ProtectedRoute>
                <Workspace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upgrade/:propertyId/:upgradeIdx"
            element={
              <ProtectedRoute>
                <UpgradeCart />
              </ProtectedRoute>
            }
          />
          <Route
            path="/listing/:propertyId/:upgradeIdx"
            element={
              <ProtectedRoute>
                <ListingRewrite />
              </ProtectedRoute>
            }
          />
          {/* Catch-all — old / unknown URLs gracefully fall back to landing. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <Toaster theme="light" />
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
