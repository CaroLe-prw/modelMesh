export type MerchantApplicationField = 'avatar' | 'businessName' | 'description' | 'website';

export type MerchantApplicationValidationCode =
  | 'avatarInvalid'
  | 'avatarReadFailed'
  | 'avatarTooLarge'
  | 'avatarUnsupported'
  | 'businessName'
  | 'description'
  | 'website';

export interface MerchantApplicationValidationIssue {
  code: MerchantApplicationValidationCode;
  field: MerchantApplicationField;
}

interface MerchantApplicationDraft {
  avatarUrl: string;
  businessName: string;
  description: string;
  website: string;
}

const avatarDataUrlPrefixes = [
  'data:image/png;base64,',
  'data:image/jpeg;base64,',
  'data:image/webp;base64,',
] as const;
const maxAvatarDataUrlLength = 2_796_300;
const maxAvatarUrlLength = 2_048;
const maxWebsiteLength = 255;
const avatarLoadTimeoutMs = 10_000;

export function validateMerchantApplicationDraft(
  draft: MerchantApplicationDraft,
): MerchantApplicationValidationIssue[] {
  const issues: MerchantApplicationValidationIssue[] = [];
  const businessNameLength = Array.from(draft.businessName).length;
  const descriptionLength = Array.from(draft.description).length;

  if (
    businessNameLength < 2 ||
    businessNameLength > 120 ||
    hasDisallowedControlCharacter(draft.businessName, false)
  ) {
    issues.push({ code: 'businessName', field: 'businessName' });
  }
  if (draft.avatarUrl && !isValidAvatarSource(draft.avatarUrl)) {
    issues.push({ code: 'avatarInvalid', field: 'avatar' });
  }
  if (draft.website && !isValidHttpUrl(draft.website, maxWebsiteLength)) {
    issues.push({ code: 'website', field: 'website' });
  }
  if (
    descriptionLength < 20 ||
    descriptionLength > 2_000 ||
    hasDisallowedControlCharacter(draft.description, true)
  ) {
    issues.push({ code: 'description', field: 'description' });
  }

  return issues;
}

export function canLoadMerchantAvatarSource(source: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;
    const timeout = window.setTimeout(() => finish(false), avatarLoadTimeoutMs);

    function finish(isValid: boolean) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      resolve(isValid);
    }

    image.onload = () => finish(image.naturalWidth > 0 && image.naturalHeight > 0);
    image.onerror = () => finish(false);
    image.src = source;
  });
}

function hasDisallowedControlCharacter(value: string, allowMultiline: boolean): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined || (codePoint > 31 && codePoint !== 127)) return false;

    return !allowMultiline || ![9, 10, 13].includes(codePoint);
  });
}

function isValidAvatarSource(value: string): boolean {
  const dataUrlPrefix = avatarDataUrlPrefixes.find((prefix) => value.startsWith(prefix));
  if (dataUrlPrefix) {
    const payload = value.slice(dataUrlPrefix.length);
    return (
      value.length <= maxAvatarDataUrlLength &&
      payload.length > 0 &&
      /^[A-Za-z0-9+/=]+$/.test(payload)
    );
  }

  return isValidHttpUrl(value, maxAvatarUrlLength);
}

function isValidHttpUrl(value: string, maxLength: number): boolean {
  const address = value.startsWith('https://')
    ? value.slice('https://'.length)
    : value.startsWith('http://')
      ? value.slice('http://'.length)
      : undefined;
  const host = address?.split(/[/?#]/, 1)[0] ?? '';

  return (
    value.length <= maxLength &&
    !/\s/.test(value) &&
    host.length > 0 &&
    host.includes('.') &&
    !host.startsWith('.') &&
    !host.endsWith('.')
  );
}
