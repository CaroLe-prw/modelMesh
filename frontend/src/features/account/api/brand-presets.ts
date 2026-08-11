import { apiClient } from '@/lib/api-client';

export interface BrandPreset {
  avatarSvg: string;
  id: string;
  name: string;
  sortOrder: number;
  subtitle: string;
}

export function listBrandPresets(signal?: AbortSignal): Promise<BrandPreset[]> {
  return apiClient.get<BrandPreset[]>('/admin/brand-presets', { signal });
}

export function findBrandPreset(
  presets: BrandPreset[],
  name: string,
  identifier: string,
): BrandPreset | undefined {
  const normalizedName = name.trim().toLocaleLowerCase();
  const normalizedIdentifier = identifier.trim().toLocaleLowerCase();

  return presets.find((preset) => {
    const candidates = [preset.id, preset.name, preset.subtitle].map((value) =>
      value.toLocaleLowerCase(),
    );
    return (
      candidates.includes(normalizedIdentifier) ||
      (normalizedName.length > 0 && candidates.includes(normalizedName))
    );
  });
}

export function brandAvatarDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
