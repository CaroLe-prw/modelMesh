import type { MerchantChannel } from '@/features/account/api/merchant-channels';

export type MerchantModelStatus = 'draft' | 'published' | 'review';
export type MerchantRequestStatus = 'approved' | 'changesRequested' | 'pending';
export type MerchantRequestType = 'channelAccess' | 'modelReview' | 'quotaAdjustment';
export type MerchantSettlementCurrency = 'USD' | 'USDT';
export type MerchantSettlementMethod = 'bank' | 'usdt';
export type MerchantUsageStatus = 'failed' | 'succeeded';
export type MerchantWithdrawalStatus = 'paid' | 'processing' | 'rejected';

export interface MerchantModel {
  channel: string;
  contextWindow: string;
  id: string;
  inputPrice: number;
  model: string;
  outputPrice: number;
  status: MerchantModelStatus;
  updatedAt: string;
}

export interface MerchantUsageLog {
  apiKey: string;
  cost: number;
  createdAt: string;
  id: string;
  latencyMs: number;
  model: string;
  status: MerchantUsageStatus;
  tokens: number;
}

export interface MerchantRequest {
  id: string;
  status: MerchantRequestStatus;
  subjectKey: 'channelExpansion' | 'modelPricing' | 'quotaIncrease';
  submittedAt: string;
  type: MerchantRequestType;
  updatedAt: string;
}

export interface MerchantWithdrawal {
  amount: number;
  createdAt: string;
  id: string;
  method: MerchantSettlementMethod;
  status: MerchantWithdrawalStatus;
}

export interface MerchantSettlementAccount {
  account: string;
  currency: MerchantSettlementCurrency;
  entity: string;
  id: string;
  isDefault: boolean;
  method: MerchantSettlementMethod;
}

export const merchantChannels: MerchantChannel[] = [
  {
    apiKeyConfigured: true,
    baseUrl: 'https://api.openai.com/v1',
    channelId: 1,
    createdAt: '2026-08-09T04:20:00Z',
    description: 'Official direct connection',
    id: 'channel-northstar',
    latencyMs: 842,
    modelCount: 8,
    name: 'Northstar Global',
    provider: 'OpenAI',
    providerId: 'openai',
    reviewNote: '',
    status: 'active',
    successRate: 99.96,
    availableModels: ['gpt-5', 'gpt-5-mini'],
    supportedModels: ['gpt-5', 'gpt-5-mini'],
    updatedAt: '2026-08-09T04:26:00Z',
  },
  {
    apiKeyConfigured: true,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    channelId: 2,
    createdAt: '2026-08-09T04:10:00Z',
    description: 'APAC provider route',
    id: 'channel-vertex',
    latencyMs: 1_180,
    modelCount: 5,
    name: 'Vertex APAC',
    provider: 'Google Vertex AI',
    providerId: 'google',
    reviewNote: '',
    status: 'offline',
    successRate: 97.82,
    availableModels: ['gemini-2.5-pro'],
    supportedModels: ['gemini-2.5-pro'],
    updatedAt: '2026-08-09T04:18:00Z',
  },
  {
    apiKeyConfigured: true,
    baseUrl: 'https://api.anthropic.com/v1',
    channelId: 3,
    createdAt: '2026-08-09T04:00:00Z',
    description: 'Official direct connection',
    id: 'channel-anthropic',
    latencyMs: 934,
    modelCount: 4,
    name: 'Anthropic Direct',
    provider: 'Anthropic',
    providerId: 'anthropic',
    reviewNote: '',
    status: 'active',
    successRate: 99.71,
    availableModels: ['claude-sonnet-4'],
    supportedModels: ['claude-sonnet-4'],
    updatedAt: '2026-08-09T04:12:00Z',
  },
  {
    apiKeyConfigured: true,
    baseUrl: 'https://api.example.com/v1',
    channelId: 4,
    createdAt: '2026-08-09T03:30:00Z',
    description: 'Backup compatible endpoint',
    id: 'channel-backup',
    latencyMs: 0,
    modelCount: 3,
    name: 'Backup Pool',
    provider: 'OpenAI Compatible',
    providerId: 'openai',
    reviewNote: '',
    status: 'offline',
    successRate: 0,
    availableModels: ['gpt-4.1-mini'],
    supportedModels: ['gpt-4.1-mini'],
    updatedAt: '2026-08-09T03:45:00Z',
  },
];

export const merchantModels: MerchantModel[] = [
  {
    channel: 'Northstar Global',
    contextWindow: '400K',
    id: 'model-gpt-5',
    inputPrice: 1.25,
    model: 'gpt-5',
    outputPrice: 10,
    status: 'published',
    updatedAt: '2026-08-09T04:20:00Z',
  },
  {
    channel: 'Anthropic Direct',
    contextWindow: '200K',
    id: 'model-claude-sonnet',
    inputPrice: 3,
    model: 'claude-sonnet-4',
    outputPrice: 15,
    status: 'published',
    updatedAt: '2026-08-09T04:08:00Z',
  },
  {
    channel: 'Vertex APAC',
    contextWindow: '1M',
    id: 'model-gemini-pro',
    inputPrice: 1.25,
    model: 'gemini-2.5-pro',
    outputPrice: 10,
    status: 'review',
    updatedAt: '2026-08-09T03:56:00Z',
  },
  {
    channel: 'Northstar Global',
    contextWindow: '128K',
    id: 'model-gpt-mini',
    inputPrice: 0.2,
    model: 'gpt-5-mini',
    outputPrice: 1.5,
    status: 'draft',
    updatedAt: '2026-08-08T12:30:00Z',
  },
];

export const merchantUsageLogs: MerchantUsageLog[] = [
  {
    apiKey: 'sk-••••b72e',
    cost: 0.0382,
    createdAt: '2026-08-09T04:28:12Z',
    id: 'req_01K24N5E8T',
    latencyMs: 1_284,
    model: 'gpt-5',
    status: 'succeeded',
    tokens: 8_432,
  },
  {
    apiKey: 'sk-••••91af',
    cost: 0.0127,
    createdAt: '2026-08-09T04:27:48Z',
    id: 'req_01K24N4QVP',
    latencyMs: 976,
    model: 'claude-sonnet-4',
    status: 'succeeded',
    tokens: 3_918,
  },
  {
    apiKey: 'sk-••••b72e',
    cost: 0,
    createdAt: '2026-08-09T04:26:31Z',
    id: 'req_01K24N2AD7',
    latencyMs: 12_006,
    model: 'gemini-2.5-pro',
    status: 'failed',
    tokens: 0,
  },
  {
    apiKey: 'sk-••••43c1',
    cost: 0.0064,
    createdAt: '2026-08-09T04:25:19Z',
    id: 'req_01K24MZ8KS',
    latencyMs: 718,
    model: 'gpt-5-mini',
    status: 'succeeded',
    tokens: 5_106,
  },
];

export const merchantWithdrawals: MerchantWithdrawal[] = [
  {
    amount: 1_280,
    createdAt: '2026-08-08T08:20:00Z',
    id: 'wd_01K22HC7PT',
    method: 'bank',
    status: 'processing',
  },
  {
    amount: 860.5,
    createdAt: '2026-07-28T03:45:00Z',
    id: 'wd_01K18BZ42W',
    method: 'usdt',
    status: 'paid',
  },
  {
    amount: 420,
    createdAt: '2026-07-16T10:10:00Z',
    id: 'wd_01K0A4Q9RM',
    method: 'bank',
    status: 'rejected',
  },
];

export const merchantSettlementAccounts: MerchantSettlementAccount[] = [
  {
    account: '•••• 4821',
    currency: 'USD',
    entity: 'ModelMesh Labs Ltd.',
    id: 'settlement-bank-usd',
    isDefault: true,
    method: 'bank',
  },
  {
    account: 'TRC20 · TQ9f••••7K2p',
    currency: 'USDT',
    entity: 'ModelMesh Labs Ltd.',
    id: 'settlement-usdt-trc20',
    isDefault: false,
    method: 'usdt',
  },
];

export const merchantRequests: MerchantRequest[] = [
  {
    id: 'mr_01K24FD8BC',
    status: 'pending',
    subjectKey: 'modelPricing',
    submittedAt: '2026-08-09T02:16:00Z',
    type: 'modelReview',
    updatedAt: '2026-08-09T02:16:00Z',
  },
  {
    id: 'mr_01K1Z8CE7N',
    status: 'changesRequested',
    subjectKey: 'channelExpansion',
    submittedAt: '2026-08-06T07:32:00Z',
    type: 'channelAccess',
    updatedAt: '2026-08-08T05:42:00Z',
  },
  {
    id: 'mr_01K1Q2MS4V',
    status: 'approved',
    subjectKey: 'quotaIncrease',
    submittedAt: '2026-08-03T11:08:00Z',
    type: 'quotaAdjustment',
    updatedAt: '2026-08-04T01:24:00Z',
  },
];

export function formatMerchantDate(language: string | undefined, value: string): string {
  return new Intl.DateTimeFormat(language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatUsd(language: string | undefined, value: number): string {
  return new Intl.NumberFormat(language, {
    currency: 'USD',
    maximumFractionDigits: 4,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(value);
}

export function formatMerchantCurrency(
  language: string | undefined,
  value: number,
  currency: string,
): string {
  if (currency === 'USDT') {
    return `USDT ${new Intl.NumberFormat(language, {
      maximumFractionDigits: 4,
      minimumFractionDigits: 2,
    }).format(value)}`;
  }
  return new Intl.NumberFormat(language, {
    currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 4,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(value);
}
