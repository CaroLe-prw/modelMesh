import { apiClient } from '@/lib/api-client';
import { clearAccessToken, saveAccessToken } from '@/lib/access-token';

export interface AuthUser {
  id: number;
  email: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  user: AuthUser;
}

interface LoginResponse extends AuthResponse {
  accessToken: string;
}

export async function register(credentials: AuthCredentials): Promise<AuthUser> {
  clearAccessToken();
  const response = await apiClient.post<AuthResponse, AuthCredentials>(
    '/auth/register',
    credentials,
  );

  return response.user;
}

export async function login(credentials: AuthCredentials): Promise<AuthUser> {
  clearAccessToken();
  const response = await apiClient.post<LoginResponse, AuthCredentials>('/auth/login', credentials);
  saveAccessToken(response.accessToken);

  return response.user;
}

export function getCurrentUser(): Promise<AuthUser> {
  return apiClient.get<AuthUser>('/auth/me');
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post<void>('/auth/logout');
  } finally {
    clearAccessToken();
  }
}
