import { Navigate, Route, Routes } from 'react-router-dom';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { useDocumentLocale } from '@/hooks/use-document-locale';
import { useTheme } from '@/hooks/use-theme';
import { AccountPage } from '@/pages/account-page';
import { AuthPage } from '@/pages/auth-page';
import { FeaturesPage } from '@/pages/features-page';
import { HomePage } from '@/pages/home-page';
import { ModelsPage } from '@/pages/models-page';
import { RoutingPage } from '@/pages/routing-page';
import './App.css';

function App() {
  useTheme();
  useDocumentLocale();

  return (
    <div className="app min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/models" element={<ModelsPage />} />
            <Route path="/account" element={<AccountPage />} />
          </Route>
          <Route path="/routing" element={<RoutingPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </main>
      <SiteFooter />
    </div>
  );
}

export default App;
