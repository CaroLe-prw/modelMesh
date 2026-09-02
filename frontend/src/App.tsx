import { Navigate, Route, Routes } from 'react-router-dom';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { Toaster } from '@/components/ui/sonner';
import { AccountRouteContent } from '@/features/account/components/account-route-content';
import { GuestOnlyRoute, ProtectedRoute } from '@/features/auth/components/protected-route';
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
  const { isDark, toggleTheme } = useTheme();
  useDocumentLocale();

  return (
    <div className="app flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader isDark={isDark} onToggleTheme={toggleTheme} />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/models" element={<ModelsPage />} />
          </Route>
          <Route element={<ProtectedRoute renderOutletWhileLoading />}>
            <Route element={<AccountPage />}>
              <Route path="/account/*" element={<AccountRouteContent />} />
              <Route path="/merchant/*" element={<AccountRouteContent />} />
              <Route path="/admin/*" element={<AccountRouteContent />} />
            </Route>
          </Route>
          <Route path="/routing" element={<RoutingPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route element={<GuestOnlyRoute />}>
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
          </Route>
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </main>
      <SiteFooter />
      <Toaster
        closeButton
        position="top-right"
        richColors
        theme={isDark ? 'dark' : 'light'}
        toastOptions={{ duration: 4000 }}
      />
    </div>
  );
}

export default App;
