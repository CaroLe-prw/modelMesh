export type ApiKeyStatus = 'active' | 'paused';

export const apiKeyOptionalColumnIds = [
  'key',
  'concurrency',
  'usage',
  'rateLimits',
  'expiry',
  'status',
  'lastUsedAt',
  'lastUsedIp',
  'ipWhitelist',
  'ipBlacklist',
  'createdAt',
] as const;

export type ApiKeyOptionalColumnId = (typeof apiKeyOptionalColumnIds)[number];

export const defaultApiKeyVisibleColumnIds = [
  'key',
  'concurrency',
  'usage',
  'lastUsedAt',
  'lastUsedIp',
  'createdAt',
] as const satisfies readonly ApiKeyOptionalColumnId[];

export interface ApiKeyItem {
  concurrency: number;
  createdAt: string;
  dailyLimitUsd: number;
  dailyUsageUsd: number;
  expiresAt: string | null;
  fiveHourLimitUsd: number;
  fiveHourUsageUsd: number;
  id: string;
  ipBlacklist: string;
  ipRestrictionEnabled: boolean;
  ipWhitelist: string;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  maskedKey: string;
  name: string;
  quotaLimitUsd: number;
  rateLimitEnabled: boolean;
  status: ApiKeyStatus;
  usageLast30Days: number;
  usageToday: number;
  weeklyLimitUsd: number;
  weeklyUsageUsd: number;
}

export interface ApiKeyDraft {
  customKey: string | null;
  dailyLimitUsd: number;
  expiresAt: string | null;
  fiveHourLimitUsd: number;
  ipBlacklist: string;
  ipRestrictionEnabled: boolean;
  ipWhitelist: string;
  name: string;
  quotaLimitUsd: number;
  rateLimitEnabled: boolean;
  weeklyLimitUsd: number;
}

export const apiKeyStatusOptions: ApiKeyStatus[] = ['active', 'paused'];
