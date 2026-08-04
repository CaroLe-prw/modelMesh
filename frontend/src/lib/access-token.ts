const ACCESS_TOKEN_STORAGE_KEY = 'modelmesh-access-token';

export function readAccessToken(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const token = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)?.trim();

  return token || undefined;
}

export function saveAccessToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
}

export function clearAccessToken(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}
