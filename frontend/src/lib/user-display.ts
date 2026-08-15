export function userDisplayName(email: string): string {
  const [localPart] = email.split('@', 1);

  return localPart || email;
}
