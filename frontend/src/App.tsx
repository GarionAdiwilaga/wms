import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { useAuthStore } from './store/auth-store';
import { CategoriesPage } from './pages/master-data/CategoriesPage';
import { BranchesPage } from './pages/master-data/BranchesPage';
import { SuppliersPage } from './pages/master-data/SuppliersPage';
import { UsersPage } from './pages/master-data/UsersPage';
import { ItemsPage } from './pages/master-data/ItemsPage';
import { UOMPage } from './pages/settings/UOMPage';

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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!token ? <LoginPage /> : <Navigate to="/" replace />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Navigate to="/master-data/items" replace />} />
              <Route path="/master-data/items" element={<ItemsPage />} />
              <Route path="/master-data/categories" element={<CategoriesPage />} />
              <Route path="/master-data/branches" element={<BranchesPage />} />
              <Route path="/master-data/suppliers" element={<SuppliersPage />} />
              <Route path="/master-data/users" element={<UsersPage />} />
              <Route path="/settings/uom" element={<UOMPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
