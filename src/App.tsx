import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { CadastroPage } from './pages/CadastroPage';
import { DashboardPage } from './pages/DashboardPage';
import { PacientesPage } from './pages/PacientesPage';
import { DetalhesPacientePage } from './pages/DetalhesPacientePage';
import { CadastroPacientePage } from './pages/CadastroPacientePage';
import './index.css';

// Redirect to dashboard if already logged in
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

import { Layout } from './components/Layout';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/cadastro"
        element={
          <PublicRoute>
            <CadastroPage />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pacientes"
        element={
          <ProtectedRoute>
            <Layout>
              <PacientesPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pacientes/novo"
        element={
          <ProtectedRoute>
            <Layout>
              <CadastroPacientePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pacientes/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <DetalhesPacientePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pacientes/:id/editar"
        element={
          <ProtectedRoute>
            <Layout>
              <CadastroPacientePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
