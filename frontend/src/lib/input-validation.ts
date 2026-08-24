export function isEmailInputValid(value: string): boolean {
  if (value.length === 0 || value.length > 254 || /\s/.test(value)) return false;
  const separator = value.indexOf('@');
  if (separator <= 0 || separator !== value.lastIndexOf('@')) return false;
  const domain = value.slice(separator + 1);
  return (
    domain.length > 0 && domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.')
  );
}
