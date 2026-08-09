import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'virtual:uno.css';
import './i18n';
import './index.css';
import App from './App.tsx';
import { AccountRoutesProvider } from '@/features/account/context/account-routes-provider';
import { AuthProvider } from '@/features/auth/context/auth-provider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AccountRoutesProvider>
          <App />
        </AccountRoutesProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
