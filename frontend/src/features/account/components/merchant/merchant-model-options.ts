export interface MerchantModelIdentity {
  channelId: string;
  id: string;
  modelId: number;
}

export function filterAvailableMerchantModelOptions<T extends { id: number }>(
  options: readonly T[],
  listings: readonly MerchantModelIdentity[],
  channelId: string,
  editingListingId?: string,
): T[] {
  const listedModelIds = new Set(
    listings
      .filter((listing) => listing.channelId === channelId && listing.id !== editingListingId)
      .map((listing) => listing.modelId),
  );

  return options.filter((option) => !listedModelIds.has(option.id));
}
