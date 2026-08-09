export type UsageRequestType = 'stream' | 'sync';
export type UsageBillingMode = 'tokens' | 'request';
export type UsageOptionalColumnId =
  | 'model'
  | 'reasoningEffort'
  | 'endpoint'
  | 'ip'
  | 'requestType'
  | 'billingMode'
  | 'tokens'
  | 'cost'
  | 'latency'
  | 'createdAt';

export const usageOptionalColumnIds: UsageOptionalColumnId[] = [
  'model',
  'reasoningEffort',
  'endpoint',
  'ip',
  'requestType',
  'billingMode',
  'tokens',
  'cost',
  'latency',
  'createdAt',
];

export interface UsageRecord {
  apiKey: string;
  billingMode: UsageBillingMode;
  cacheTokens: number;
  costUsd: number;
  createdAt: string;
  durationMs: number;
  endpoint: string;
  firstTokenMs: number | null;
  id: number;
  inputTokens: number;
  ip: string;
  model: string;
  outputTokens: number;
  reasoningEffort: '—' | 'Low' | 'Medium' | 'High' | 'XHigh';
  requestType: UsageRequestType;
}

export type UsageDistributionDatum = {
  cost: number;
  name: string;
  requests: number;
  tokens: number;
};

export const usageRecords: UsageRecord[] = [
  {
    id: 1,
    apiKey: 'daily-agent',
    model: 'gpt-5.6-terra',
    reasoningEffort: 'High',
    endpoint: '/v1/responses',
    ip: '45.61.235.131',
    requestType: 'stream',
    billingMode: 'tokens',
    inputTokens: 1834,
    outputTokens: 150,
    cacheTokens: 87_600,
    costUsd: 0.001379,
    firstTokenMs: 7160,
    durationMs: 7260,
    createdAt: '2026/08/06 11:00:08',
  },
  {
    id: 2,
    apiKey: 'daily-agent',
    model: 'gpt-5.6-terra',
    reasoningEffort: '—',
    endpoint: '/v1/chat/completions',
    ip: '45.61.235.131',
    requestType: 'sync',
    billingMode: 'tokens',
    inputTokens: 550,
    outputTokens: 5,
    cacheTokens: 3800,
    costUsd: 0.000116,
    firstTokenMs: null,
    durationMs: 3060,
    createdAt: '2026/08/06 11:00:02',
  },
  {
    id: 3,
    apiKey: 'codex-route',
    model: 'gpt-5.6-sol',
    reasoningEffort: 'XHigh',
    endpoint: '/v1/responses',
    ip: '103.86.44.72',
    requestType: 'stream',
    billingMode: 'tokens',
    inputTokens: 1302,
    outputTokens: 578,
    cacheTokens: 126_700,
    costUsd: 0.002093,
    firstTokenMs: 50_970,
    durationMs: 64_000,
    createdAt: '2026/08/06 10:59:54',
  },
  {
    id: 4,
    apiKey: 'eval-suite',
    model: 'claude-opus-5',
    reasoningEffort: 'High',
    endpoint: '/v1/messages',
    ip: '18.167.32.90',
    requestType: 'stream',
    billingMode: 'request',
    inputTokens: 272,
    outputTokens: 64,
    cacheTokens: 87_300,
    costUsd: 0.001126,
    firstTokenMs: 7260,
    durationMs: 10_210,
    createdAt: '2026/08/06 10:59:49',
  },
  {
    id: 5,
    apiKey: 'nightly-jobs',
    model: 'gpt-5.6-luna',
    reasoningEffort: 'XHigh',
    endpoint: '/v1/responses',
    ip: '8.218.112.17',
    requestType: 'stream',
    billingMode: 'tokens',
    inputTokens: 2082,
    outputTokens: 276,
    cacheTokens: 130_800,
    costUsd: 0.00192,
    firstTokenMs: 14_390,
    durationMs: 19_980,
    createdAt: '2026/08/06 10:59:42',
  },
  {
    id: 6,
    apiKey: 'codex-route',
    model: 'gpt-5.6-sol',
    reasoningEffort: 'High',
    endpoint: '/v1/responses',
    ip: '103.86.44.72',
    requestType: 'stream',
    billingMode: 'tokens',
    inputTokens: 1839,
    outputTokens: 317,
    cacheTokens: 85_400,
    costUsd: 0.001473,
    firstTokenMs: 11_320,
    durationMs: 11_710,
    createdAt: '2026/08/06 10:59:35',
  },
  {
    id: 7,
    apiKey: 'playground',
    model: 'grok-4.5',
    reasoningEffort: 'XHigh',
    endpoint: '/v1/responses',
    ip: '116.92.26.118',
    requestType: 'stream',
    billingMode: 'tokens',
    inputTokens: 95_852,
    outputTokens: 133,
    cacheTokens: 15_100,
    costUsd: 0.011779,
    firstTokenMs: 25_000,
    durationMs: 27_000,
    createdAt: '2026/08/06 10:59:27',
  },
  {
    id: 8,
    apiKey: 'daily-agent',
    model: 'gpt-5.6-terra',
    reasoningEffort: 'Medium',
    endpoint: '/v1/responses',
    ip: '45.61.235.131',
    requestType: 'stream',
    billingMode: 'tokens',
    inputTokens: 307,
    outputTokens: 265,
    cacheTokens: 183_700,
    costUsd: 0.002432,
    firstTokenMs: 11_070,
    durationMs: 16_980,
    createdAt: '2026/08/06 10:59:20',
  },
  {
    id: 9,
    apiKey: 'eval-suite',
    model: 'claude-opus-5',
    reasoningEffort: 'High',
    endpoint: '/v1/messages',
    ip: '18.167.32.90',
    requestType: 'stream',
    billingMode: 'request',
    inputTokens: 195,
    outputTokens: 428,
    cacheTokens: 84_700,
    costUsd: 0.001348,
    firstTokenMs: 15_130,
    durationMs: 15_640,
    createdAt: '2026/08/06 10:59:14',
  },
  {
    id: 10,
    apiKey: 'nightly-jobs',
    model: 'gpt-5.6-luna',
    reasoningEffort: 'Medium',
    endpoint: '/v1/chat/completions',
    ip: '8.218.112.17',
    requestType: 'stream',
    billingMode: 'tokens',
    inputTokens: 1192,
    outputTokens: 112,
    cacheTokens: 182_700,
    costUsd: 0.002416,
    firstTokenMs: 18_270,
    durationMs: 20_690,
    createdAt: '2026/08/06 10:59:07',
  },
  {
    id: 11,
    apiKey: 'codex-route',
    model: 'gpt-5.6-sol',
    reasoningEffort: '—',
    endpoint: '/v1/chat/completions',
    ip: '103.86.44.72',
    requestType: 'sync',
    billingMode: 'tokens',
    inputTokens: 596,
    outputTokens: 5,
    cacheTokens: 3800,
    costUsd: 0.000121,
    firstTokenMs: null,
    durationMs: 6000,
    createdAt: '2026/08/06 10:58:58',
  },
  {
    id: 12,
    apiKey: 'playground',
    model: 'grok-4.5',
    reasoningEffort: 'XHigh',
    endpoint: '/v1/responses',
    ip: '116.92.26.118',
    requestType: 'stream',
    billingMode: 'tokens',
    inputTokens: 1710,
    outputTokens: 228,
    cacheTokens: 125_700,
    costUsd: 0.001878,
    firstTokenMs: 15_220,
    durationMs: 23_940,
    createdAt: '2026/08/06 10:58:49',
  },
];

export const modelDistribution: UsageDistributionDatum[] = [
  { name: 'gpt-5.6-luna', requests: 23_815, tokens: 2_580_000_000, cost: 22.03 },
  { name: 'gpt-5.6-sol', requests: 4968, tokens: 281_180_000, cost: 53.81 },
  { name: 'gpt-5.6-terra', requests: 3519, tokens: 245_020_000, cost: 14.29 },
  { name: 'claude-opus-5', requests: 521, tokens: 47_380_000, cost: 10.93 },
  { name: 'grok-4.5', requests: 883, tokens: 10_470_000, cost: 2.29 },
];

export const apiKeyDistribution: UsageDistributionDatum[] = [
  { name: 'codex-route', requests: 12_861, tokens: 1_310_000_000, cost: 41.24 },
  { name: 'daily-agent', requests: 11_442, tokens: 1_050_000_000, cost: 31.82 },
  { name: 'nightly-jobs', requests: 6932, tokens: 512_000_000, cost: 17.45 },
  { name: 'eval-suite', requests: 2719, tokens: 226_000_000, cost: 8.64 },
  { name: 'playground', requests: 1281, tokens: 82_000_000, cost: 4.2 },
];

export const endpointDistribution: UsageDistributionDatum[] = [
  { name: '/v1/responses', requests: 27_618, tokens: 2_810_000_000, cost: 70.28 },
  { name: '/v1/chat/completions', requests: 6309, tokens: 311_770_000, cost: 26.63 },
  { name: '/v1/messages', requests: 1308, tokens: 60_840_000, cost: 14.79 },
];

export const tokenTrend = [
  { time: '00:00', input: 18, output: 10, cacheRead: 28, cacheWrite: 3 },
  { time: '02:00', input: 34, output: 16, cacheRead: 115, cacheWrite: 8 },
  { time: '04:00', input: 22, output: 12, cacheRead: 42, cacheWrite: 5 },
  { time: '06:00', input: 28, output: 13, cacheRead: 31, cacheWrite: 4 },
  { time: '08:00', input: 86, output: 24, cacheRead: 210, cacheWrite: 11 },
  { time: '10:00', input: 47, output: 19, cacheRead: 98, cacheWrite: 7 },
  { time: '12:00', input: 39, output: 18, cacheRead: 55, cacheWrite: 6 },
  { time: '14:00', input: 102, output: 31, cacheRead: 286, cacheWrite: 14 },
  { time: '16:00', input: 54, output: 21, cacheRead: 124, cacheWrite: 8 },
  { time: '18:00', input: 118, output: 35, cacheRead: 318, cacheWrite: 16 },
  { time: '20:00', input: 63, output: 23, cacheRead: 174, cacheWrite: 9 },
  { time: '22:00', input: 42, output: 17, cacheRead: 76, cacheWrite: 6 },
];

export const usageFilterOptions = {
  apiKeys: ['codex-route', 'daily-agent', 'eval-suite', 'nightly-jobs', 'playground'],
  models: ['claude-opus-5', 'gpt-5.6-luna', 'gpt-5.6-sol', 'gpt-5.6-terra', 'grok-4.5'],
  endpoints: ['/v1/chat/completions', '/v1/messages', '/v1/responses'],
} as const;
