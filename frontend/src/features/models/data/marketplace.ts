import type { Signal } from '@/components/common/signal-bars';

export type BrandId = 'openai' | 'anthropic' | 'deepseek' | 'google' | 'xai' | 'moonshot';
export type MerchantTag = 'stable' | 'lowCost' | 'fast' | 'quality';

export interface ModelBrand {
  id: BrandId;
  name: string;
  merchantCount: number;
  mark: string;
}

export interface CatalogModel {
  id: string;
  brandId: BrandId;
  name: string;
  inputFrom: number;
  outputFrom: number;
  merchantCount: number;
}

export interface TokenOption {
  id: string;
  name: string;
  maskedKey: string;
  status: 'active' | 'idle';
}

export interface MerchantTemplate {
  id: string;
  name: string;
  descriptionKey: string;
  priceFactor: number;
  realtimeRate: number;
  successRate: number;
  latency: number;
  tags: MerchantTag[];
  lastSuccessKey: string;
  signals: Signal[];
}

export const brands: ModelBrand[] = [
  { id: 'openai', name: 'OpenAI', merchantCount: 41, mark: 'O' },
  { id: 'anthropic', name: 'Anthropic', merchantCount: 24, mark: 'A' },
  { id: 'deepseek', name: 'DeepSeek', merchantCount: 18, mark: 'D' },
  { id: 'google', name: 'Google', merchantCount: 20, mark: 'G' },
  { id: 'xai', name: 'xAI', merchantCount: 12, mark: 'X' },
  { id: 'moonshot', name: 'Moonshot', merchantCount: 11, mark: 'M' },
];

export const catalogModels: CatalogModel[] = [
  {
    id: 'gpt-5.6-sol',
    brandId: 'openai',
    name: 'gpt-5.6-sol',
    inputFrom: 0.012,
    outputFrom: 0.072,
    merchantCount: 18,
  },
  {
    id: 'gpt-5.6-luna',
    brandId: 'openai',
    name: 'gpt-5.6-luna',
    inputFrom: 0.006,
    outputFrom: 0.036,
    merchantCount: 16,
  },
  {
    id: 'gpt-5.6-terra',
    brandId: 'openai',
    name: 'gpt-5.6-terra',
    inputFrom: 0.0204,
    outputFrom: 0.1224,
    merchantCount: 14,
  },
  {
    id: 'gpt-5.4',
    brandId: 'openai',
    name: 'gpt-5.4',
    inputFrom: 0.0128,
    outputFrom: 0.0768,
    merchantCount: 21,
  },
  {
    id: 'claude-sonnet-4.8',
    brandId: 'anthropic',
    name: 'claude-sonnet-4.8',
    inputFrom: 0.018,
    outputFrom: 0.09,
    merchantCount: 15,
  },
  {
    id: 'claude-opus-4.8',
    brandId: 'anthropic',
    name: 'claude-opus-4.8',
    inputFrom: 0.0492,
    outputFrom: 0.246,
    merchantCount: 9,
  },
  {
    id: 'claude-haiku-4.5',
    brandId: 'anthropic',
    name: 'claude-haiku-4.5',
    inputFrom: 0.008,
    outputFrom: 0.04,
    merchantCount: 17,
  },
  {
    id: 'deepseek-v4-flash',
    brandId: 'deepseek',
    name: 'deepseek-v4-flash',
    inputFrom: 0.0106,
    outputFrom: 0.0212,
    merchantCount: 19,
  },
  {
    id: 'deepseek-v4-pro',
    brandId: 'deepseek',
    name: 'deepseek-v4-pro',
    inputFrom: 0.012,
    outputFrom: 0.024,
    merchantCount: 13,
  },
  {
    id: 'deepseek-v3',
    brandId: 'deepseek',
    name: 'deepseek-v3',
    inputFrom: 0.0098,
    outputFrom: 0.0196,
    merchantCount: 22,
  },
  {
    id: 'gemini-2.5-pro',
    brandId: 'google',
    name: 'gemini-2.5-pro',
    inputFrom: 0.018,
    outputFrom: 0.09,
    merchantCount: 14,
  },
  {
    id: 'gemini-2.5-flash',
    brandId: 'google',
    name: 'gemini-2.5-flash',
    inputFrom: 0.004,
    outputFrom: 0.02,
    merchantCount: 20,
  },
  {
    id: 'grok-4.5',
    brandId: 'xai',
    name: 'grok-4.5',
    inputFrom: 0.0179,
    outputFrom: 0.0536,
    merchantCount: 12,
  },
  {
    id: 'grok-4-fast',
    brandId: 'xai',
    name: 'grok-4-fast',
    inputFrom: 0.009,
    outputFrom: 0.027,
    merchantCount: 9,
  },
  {
    id: 'kimi-k2',
    brandId: 'moonshot',
    name: 'kimi-k2',
    inputFrom: 0.011,
    outputFrom: 0.044,
    merchantCount: 11,
  },
  {
    id: 'kimi-k2-thinking',
    brandId: 'moonshot',
    name: 'kimi-k2-thinking',
    inputFrom: 0.016,
    outputFrom: 0.064,
    merchantCount: 8,
  },
];

export const tokenOptions: TokenOption[] = [
  { id: 'production', name: 'Production', maskedKey: 'mm_live_••••8A2C', status: 'active' },
  { id: 'development', name: 'Development', maskedKey: 'mm_test_••••17F4', status: 'idle' },
];

export const merchantTemplates: MerchantTemplate[] = [
  {
    id: 'northstar',
    name: 'Northstar',
    descriptionKey: 'northstar',
    priceFactor: 1,
    realtimeRate: 0.0625,
    successRate: 99,
    latency: 3.47,
    tags: ['stable', 'lowCost'],
    lastSuccessKey: 'justNow',
    signals: ['good', 'good', 'good', 'good', 'good', 'good', 'good', 'good'],
  },
  {
    id: 'vertex-relay',
    name: 'Vertex Relay',
    descriptionKey: 'vertexRelay',
    priceFactor: 0.87,
    realtimeRate: 0.0543,
    successRate: 95,
    latency: 3.84,
    tags: ['stable', 'fast'],
    lastSuccessKey: 'oneMinute',
    signals: ['good', 'good', 'good', 'good', 'warn', 'good', 'good', 'good'],
  },
  {
    id: 'alloy-cloud',
    name: 'Alloy Cloud',
    descriptionKey: 'alloyCloud',
    priceFactor: 1.14,
    realtimeRate: 0.0717,
    successRate: 98,
    latency: 5.56,
    tags: ['quality', 'stable'],
    lastSuccessKey: 'twoMinutes',
    signals: ['good', 'good', 'good', 'good', 'good', 'warn', 'good', 'good'],
  },
  {
    id: 'swift-gate',
    name: 'SwiftGate',
    descriptionKey: 'swiftGate',
    priceFactor: 0.72,
    realtimeRate: 0.045,
    successRate: 87,
    latency: 5.82,
    tags: ['lowCost'],
    lastSuccessKey: 'fiveMinutes',
    signals: ['warn', 'warn', 'good', 'good', 'good', 'good', 'good', 'good'],
  },
  {
    id: 'atlas-route',
    name: 'Atlas Route',
    descriptionKey: 'atlasRoute',
    priceFactor: 1.08,
    realtimeRate: 0.0675,
    successRate: 100,
    latency: 2.72,
    tags: ['fast', 'quality'],
    lastSuccessKey: 'justNow',
    signals: ['good', 'good', 'good', 'good', 'good', 'good', 'good', 'good'],
  },
  {
    id: 'nebula-api',
    name: 'Nebula API',
    descriptionKey: 'nebulaApi',
    priceFactor: 0.64,
    realtimeRate: 0.04,
    successRate: 76,
    latency: 7.26,
    tags: ['lowCost'],
    lastSuccessKey: 'twelveMinutes',
    signals: ['good', 'warn', 'bad', 'bad', 'good', 'warn', 'good', 'good'],
  },
];

export function formatUsd(value: number) {
  return `$${value < 0.01 ? value.toFixed(6) : value.toFixed(4)}`;
}
