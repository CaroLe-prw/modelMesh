import { useState } from 'react';
import { ProfileDetailsCards } from '@/features/account/components/profile/profile-details-cards';
import { ProfileOverviewCard } from '@/features/account/components/profile/profile-overview-card';
import { ProfileSecurityCards } from '@/features/account/components/profile/profile-security-cards';
import { logout as logoutRequest } from '@/features/auth/api/auth';
import { useAuth } from '@/features/auth/context/auth-context';
import { userDisplayName } from '@/lib/user-display';

export function ProfilePanel() {
  const { setGuest, state } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string>();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (state.status !== 'authenticated') {
    return null;
  }

  const displayName = userDisplayName(state.user.email);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logoutRequest();
    } catch {
      // The API client clears the local token even when the server cannot complete logout.
    } finally {
      setGuest();
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-4 sm:gap-5">
      <ProfileOverviewCard
        avatarUrl={avatarUrl}
        displayName={displayName}
        email={state.user.email}
        isLoggingOut={isLoggingOut}
        onLogout={() => void handleLogout()}
        userId={state.user.id}
      />
      <ProfileDetailsCards
        avatarUrl={avatarUrl}
        displayName={displayName}
        email={state.user.email}
        onAvatarChange={setAvatarUrl}
      />
      <ProfileSecurityCards />
    </div>
  );
}
