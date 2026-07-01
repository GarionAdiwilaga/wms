import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoginPage } from './pages/auth/LoginPage';
import { useAuthStore } from './store/auth-store';
import { CategoriesPage } from './pages/master-data/CategoriesPage';
import { BranchesPage } from './pages/master-data/BranchesPage';
import { SuppliersPage } from './pages/master-data/SuppliersPage';
import { UsersPage } from './pages/master-data/UsersPage';
import { ItemsPage } from './pages/master-data/ItemsPage';
import { ItemDetailPage } from './pages/master-data/ItemDetailPage';
import { UOMPage } from './pages/settings/UOMPage';
import { BranchStocksPage } from './pages/inventory/BranchStocksPage';
import { StockInPage } from './pages/operations/StockInPage';
import { OutboundPage } from './pages/operations/OutboundPage';
import { HistoryPage } from './pages/operations/HistoryPage';
import { TransfersPage } from './pages/operations/TransfersPage';
import { TransferCreatePage } from './pages/operations/TransferCreatePage';
import { TransferDetailPage } from './pages/operations/TransferDetailPage';
import { TransferReceivePage } from './pages/operations/TransferReceivePage';
import { StockOpnamePage } from './pages/operations/StockOpnamePage';
import { StockOpnameDetailPage } from './pages/operations/StockOpnameDetailPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';

// Reports
import { StockReportPage } from './pages/reports/StockReportPage';
import { LowStockReportPage } from './pages/reports/LowStockReportPage';
import { ItemHistoryReportPage } from './pages/reports/ItemHistoryReportPage';
import { InventoryMovementReportPage } from './pages/reports/InventoryMovementReportPage';
import { TransferVarianceReportPage } from './pages/reports/TransferVarianceReportPage';
import { AuditLogReportPage } from './pages/reports/AuditLogReportPage';
import { AnalyticsPage } from './pages/reports/AnalyticsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const token = useAuthStore((state) => state.token);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/login" element={!token ? <LoginPage /> : <Navigate to="/" replace />} />
            
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/master-data/items" element={<ItemsPage />} />
                <Route path="/master-data/items/:id" element={<ItemDetailPage />} />
                <Route path="/master-data/categories" element={<CategoriesPage />} />
                <Route path="/master-data/branches" element={<BranchesPage />} />
                <Route path="/master-data/suppliers" element={<SuppliersPage />} />
                <Route path="/master-data/users" element={<UsersPage />} />
                <Route path="/inventory/branch-stocks" element={<BranchStocksPage />} />
                <Route path="/operations/stock-in" element={<StockInPage />} />
                <Route path="/operations/outbound" element={<OutboundPage />} />
                <Route path="/operations/transfers" element={<TransfersPage />} />
                <Route path="/operations/transfers/new" element={<TransferCreatePage />} />
                <Route path="/operations/transfers/:id" element={<TransferDetailPage />} />
                <Route path="/operations/transfers/:id/receive" element={<TransferReceivePage />} />
                <Route path="/operations/stock-opname" element={<StockOpnamePage />} />
                <Route path="/operations/stock-opname/:id" element={<StockOpnameDetailPage />} />
                <Route path="/operations/history" element={<HistoryPage />} />
                
                {/* Reports & Analytics */}
                <Route path="/reports/stock" element={<StockReportPage />} />
                <Route path="/reports/low-stock" element={<LowStockReportPage />} />
                <Route path="/reports/item-history" element={<ItemHistoryReportPage />} />
                <Route path="/reports/item-history/:itemId" element={<ItemHistoryReportPage />} />
                <Route path="/reports/movements" element={<InventoryMovementReportPage />} />
                <Route path="/reports/transfer-variance" element={<TransferVarianceReportPage />} />
                <Route path="/reports/audit-logs" element={<AuditLogReportPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />

                <Route path="/settings/uom" element={<UOMPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
