export interface AuthLocationState {
  from?: string;
  registrationCompleted?: boolean;
}

export function resolvePostLoginPath(requestedPath: string | undefined): string {
  if (requestedPath?.startsWith('/') && !requestedPath.startsWith('//')) {
    return requestedPath;
  }

  return '/account';
}
