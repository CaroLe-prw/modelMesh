import { Outlet } from 'react-router-dom';
import { AccountSidebar } from '@/features/account/components/account-sidebar';

export function AccountShell() {
  return (
    <section className="relative z-10 min-h-[calc(100vh-188px)] border-b border-border">
      <div className="hero-grid absolute inset-0 -z-10 opacity-35" aria-hidden="true" />
      <div className="mx-auto grid w-full max-w-[1440px] gap-4 px-3 py-5 sm:gap-6 sm:px-4 sm:py-8 lg:grid-cols-[248px_minmax(0,1fr)] lg:items-start lg:gap-7 lg:py-10">
        <aside className="lg:sticky lg:top-6">
          <AccountSidebar />
        </aside>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </section>
  );
}
