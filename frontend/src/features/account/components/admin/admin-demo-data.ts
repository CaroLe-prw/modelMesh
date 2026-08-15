import type { MerchantUsageStatus } from '@/features/account/components/merchant/merchant-demo-data';

export type AdminAuditOutcome = 'failed' | 'succeeded';
export type AdminCatalogAction = 'priceChange' | 'publish' | 'unpublish' | 'violation';
export type AdminCatalogKind = 'channel' | 'model';
export type AdminLedgerDirection = 'credit' | 'debit';
export type AdminLedgerType = 'merchantRevenue' | 'topup' | 'usage' | 'withdrawal';
export type AdminMerchantStatus = 'active' | 'pending' | 'suspended';
export type AdminReconciliationStatus = 'matched' | 'mismatch' | 'pending';
export type AdminReviewStatus = 'approved' | 'pending' | 'rejected';
export type AdminRiskSeverity = 'critical' | 'high' | 'low' | 'medium';
export type AdminRiskStatus = 'investigating' | 'open' | 'resolved';
export type AdminRiskType = 'amount' | 'frequency' | 'login' | 'usage';
export type AdminWithdrawalStatus = 'approved' | 'pending' | 'rejected';

export interface AdminLedgerEntry {
  account: string;
  amountMicrousd: number;
  createdAt: string;
  direction: AdminLedgerDirection;
  id: string;
  reconciliationStatus: AdminReconciliationStatus;
  reference: string;
  type: AdminLedgerType;
}

export interface AdminCatalogReview {
  action: AdminCatalogAction;
  createdAt: string;
  detail: string;
  id: string;
  kind: AdminCatalogKind;
  merchant: string;
  name: string;
  priceMicrousd?: number;
  status: AdminReviewStatus;
}

export interface AdminRiskAlert {
  createdAt: string;
  id: string;
  ip: string;
  principal: string;
  severity: AdminRiskSeverity;
  status: AdminRiskStatus;
  summaryKey: 'amountSpike' | 'callBurst' | 'impossibleTravel' | 'repeatedFailures';
  type: AdminRiskType;
}

export interface AdminMerchant {
  balanceMicrousd: number;
  channelCount: number;
  createdAt: string;
  email: string;
  id: string;
  modelCount: number;
  name: string;
  status: AdminMerchantStatus;
}

export interface AdminUsageLog {
  costMicrousd: number;
  createdAt: string;
  id: string;
  latencyMs: number;
  merchant: string;
  model: string;
  status: MerchantUsageStatus;
  tokens: number;
  user: string;
}

export interface AdminWithdrawalReview {
  account: string;
  amountMicrousd: number;
  createdAt: string;
  currency: 'USD' | 'USDT';
  id: string;
  merchant: string;
  reviewedAt?: string;
  status: AdminWithdrawalStatus;
}

export interface AdminAuditLog {
  actionKey: 'loginFailed' | 'merchantApproved' | 'routeUpdated' | 'withdrawalApproved';
  actor: string;
  createdAt: string;
  id: string;
  ip: string;
  outcome: AdminAuditOutcome;
  target: string;
}

export const adminLedgerEntries: AdminLedgerEntry[] = [
  {
    account: 'user_470481357',
    amountMicrousd: 100_000_000,
    createdAt: '2026-08-09T04:30:00Z',
    direction: 'credit',
    id: 'ledger_01K24N8M3C',
    reconciliationStatus: 'matched',
    reference: 'topup_01K24N7V9S',
    type: 'topup',
  },
  {
    account: 'user_470481357',
    amountMicrousd: 38_200,
    createdAt: '2026-08-09T04:28:12Z',
    direction: 'debit',
    id: 'ledger_01K24N5F1A',
    reconciliationStatus: 'matched',
    reference: 'req_01K24N5E8T',
    type: 'usage',
  },
  {
    account: 'merchant_0047',
    amountMicrousd: 31_940,
    createdAt: '2026-08-09T04:28:12Z',
    direction: 'credit',
    id: 'ledger_01K24N5F1B',
    reconciliationStatus: 'matched',
    reference: 'req_01K24N5E8T',
    type: 'merchantRevenue',
  },
  {
    account: 'merchant_0031',
    amountMicrousd: 2_450_000_000,
    createdAt: '2026-08-07T01:18:00Z',
    direction: 'debit',
    id: 'ledger_01K1X94DRQ',
    reconciliationStatus: 'pending',
    reference: 'wd_01K1X94C2M',
    type: 'withdrawal',
  },
  {
    account: 'user_928401662',
    amountMicrousd: 6_400,
    createdAt: '2026-08-09T04:25:19Z',
    direction: 'debit',
    id: 'ledger_01K24MZ91P',
    reconciliationStatus: 'mismatch',
    reference: 'req_01K24MZ8KS',
    type: 'usage',
  },
];

export const adminCatalogReviews: AdminCatalogReview[] = [
  {
    action: 'publish',
    createdAt: '2026-08-09T03:42:00Z',
    detail: 'gpt-5 · 128K context',
    id: 'review_01K24JEDPA',
    kind: 'model',
    merchant: 'Northstar AI',
    name: 'gpt-5',
    priceMicrousd: 12_500_000,
    status: 'pending',
  },
  {
    action: 'priceChange',
    createdAt: '2026-08-08T09:24:00Z',
    detail: 'Output price / 1M tokens',
    id: 'review_01K22NPG2R',
    kind: 'model',
    merchant: 'Alloy Cloud',
    name: 'claude-sonnet-4',
    priceMicrousd: 18_000_000,
    status: 'pending',
  },
  {
    action: 'violation',
    createdAt: '2026-08-07T06:12:00Z',
    detail: 'Credential validation failed repeatedly',
    id: 'review_01K1Y2E3XF',
    kind: 'channel',
    merchant: 'SwiftGate',
    name: 'SwiftGate Primary',
    status: 'rejected',
  },
  {
    action: 'unpublish',
    createdAt: '2026-08-06T02:30:00Z',
    detail: 'Provider maintenance window',
    id: 'review_01K1SN9C7M',
    kind: 'model',
    merchant: 'Vertex Relay',
    name: 'gemini-2.5-pro',
    status: 'approved',
  },
];

export const adminRiskAlerts: AdminRiskAlert[] = [
  {
    createdAt: '2026-08-09T04:31:20Z',
    id: 'risk_01K24NBQ7C',
    ip: '203.0.113.42',
    principal: 'user_204883105',
    severity: 'critical',
    status: 'open',
    summaryKey: 'impossibleTravel',
    type: 'login',
  },
  {
    createdAt: '2026-08-09T04:29:03Z',
    id: 'risk_01K24N6ZP4',
    ip: '198.51.100.88',
    principal: 'sk-••••8d2f',
    severity: 'high',
    status: 'investigating',
    summaryKey: 'callBurst',
    type: 'frequency',
  },
  {
    createdAt: '2026-08-09T04:21:42Z',
    id: 'risk_01K24MPG6H',
    ip: '192.0.2.19',
    principal: 'merchant_0047',
    severity: 'medium',
    status: 'open',
    summaryKey: 'amountSpike',
    type: 'amount',
  },
  {
    createdAt: '2026-08-08T10:56:12Z',
    id: 'risk_01K22RZ3MW',
    ip: '203.0.113.42',
    principal: 'risk-review@example.com',
    severity: 'low',
    status: 'resolved',
    summaryKey: 'repeatedFailures',
    type: 'usage',
  },
];

export const adminMerchants: AdminMerchant[] = [
  {
    balanceMicrousd: 4_826_720_000,
    channelCount: 4,
    createdAt: '2026-07-12T06:20:00Z',
    email: 'ops@northstar.example',
    id: 'merchant_0047',
    modelCount: 20,
    name: 'Northstar AI',
    status: 'active',
  },
  {
    balanceMicrousd: 1_205_400_000,
    channelCount: 2,
    createdAt: '2026-07-26T03:15:00Z',
    email: 'hello@vertexrelay.example',
    id: 'merchant_0053',
    modelCount: 9,
    name: 'Vertex Relay',
    status: 'pending',
  },
  {
    balanceMicrousd: 860_250_000,
    channelCount: 3,
    createdAt: '2026-06-18T09:42:00Z',
    email: 'team@alloycloud.example',
    id: 'merchant_0031',
    modelCount: 14,
    name: 'Alloy Cloud',
    status: 'active',
  },
  {
    balanceMicrousd: 0,
    channelCount: 1,
    createdAt: '2026-05-08T12:06:00Z',
    email: 'admin@swiftgate.example',
    id: 'merchant_0018',
    modelCount: 3,
    name: 'SwiftGate',
    status: 'suspended',
  },
  {
    balanceMicrousd: 2_140_800_000,
    channelCount: 3,
    createdAt: '2026-08-08T13:42:00Z',
    email: 'ops@blueorbit.example',
    id: 'merchant_0062',
    modelCount: 12,
    name: 'Blue Orbit',
    status: 'pending',
  },
  {
    balanceMicrousd: 936_450_000,
    channelCount: 2,
    createdAt: '2026-08-08T09:16:00Z',
    email: 'team@novabridge.example',
    id: 'merchant_0061',
    modelCount: 7,
    name: 'Nova Bridge',
    status: 'pending',
  },
  {
    balanceMicrousd: 510_000_000,
    channelCount: 1,
    createdAt: '2026-08-07T15:08:00Z',
    email: 'hello@arcmesh.example',
    id: 'merchant_0060',
    modelCount: 5,
    name: 'ArcMesh',
    status: 'pending',
  },
  {
    balanceMicrousd: 188_320_000,
    channelCount: 1,
    createdAt: '2026-08-07T08:36:00Z',
    email: 'admin@cloudharbor.example',
    id: 'merchant_0059',
    modelCount: 4,
    name: 'Cloud Harbor',
    status: 'pending',
  },
];

export const adminUsageLogs: AdminUsageLog[] = [
  {
    costMicrousd: 38_200,
    createdAt: '2026-08-09T04:28:12Z',
    id: 'req_01K24N5E8T',
    latencyMs: 1_284,
    merchant: 'Northstar AI',
    model: 'gpt-5',
    status: 'succeeded',
    tokens: 8_432,
    user: 'user_470481357',
  },
  {
    costMicrousd: 12_700,
    createdAt: '2026-08-09T04:27:48Z',
    id: 'req_01K24N4QVP',
    latencyMs: 976,
    merchant: 'Alloy Cloud',
    model: 'claude-sonnet-4',
    status: 'succeeded',
    tokens: 3_918,
    user: 'user_204883105',
  },
  {
    costMicrousd: 0,
    createdAt: '2026-08-09T04:26:31Z',
    id: 'req_01K24N2AD7',
    latencyMs: 12_006,
    merchant: 'Vertex Relay',
    model: 'gemini-2.5-pro',
    status: 'failed',
    tokens: 0,
    user: 'user_470481357',
  },
  {
    costMicrousd: 6_400,
    createdAt: '2026-08-09T04:25:19Z',
    id: 'req_01K24MZ8KS',
    latencyMs: 718,
    merchant: 'Northstar AI',
    model: 'gpt-5-mini',
    status: 'succeeded',
    tokens: 5_106,
    user: 'user_928401662',
  },
];

export const adminWithdrawalReviews: AdminWithdrawalReview[] = [
  {
    account: '•••• 9016',
    amountMicrousd: 720_000_000,
    createdAt: '2026-08-09T03:52:00Z',
    currency: 'USD',
    id: 'wd_01K24K0AH6',
    merchant: 'Blue Orbit',
    status: 'pending',
  },
  {
    account: 'TRC20 · TV8c••••1Kp4',
    amountMicrousd: 1_960_000_000,
    createdAt: '2026-08-08T14:06:00Z',
    currency: 'USDT',
    id: 'wd_01K23E82WN',
    merchant: 'Nova Bridge',
    status: 'pending',
  },
  {
    account: '•••• 4821',
    amountMicrousd: 1_280_000_000,
    createdAt: '2026-08-08T08:20:00Z',
    currency: 'USD',
    id: 'wd_01K22HC7PT',
    merchant: 'Northstar AI',
    status: 'pending',
  },
  {
    account: 'TRC20 · TP7m••••4Qa1',
    amountMicrousd: 2_450_000_000,
    createdAt: '2026-08-07T01:18:00Z',
    currency: 'USDT',
    id: 'wd_01K1X94C2M',
    merchant: 'Alloy Cloud',
    status: 'pending',
  },
  {
    account: '•••• 3472',
    amountMicrousd: 380_000_000,
    createdAt: '2026-08-06T07:44:00Z',
    currency: 'USD',
    id: 'wd_01K1V4F8ZD',
    merchant: 'ArcMesh',
    status: 'pending',
  },
  {
    account: '•••• 7608',
    amountMicrousd: 860_500_000,
    createdAt: '2026-07-28T03:45:00Z',
    currency: 'USD',
    id: 'wd_01K18BZ42W',
    merchant: 'Vertex Relay',
    reviewedAt: '2026-07-28T06:24:00Z',
    status: 'approved',
  },
  {
    account: '•••• 1932',
    amountMicrousd: 420_000_000,
    createdAt: '2026-07-16T10:10:00Z',
    currency: 'USD',
    id: 'wd_01K0A4Q9RM',
    merchant: 'SwiftGate',
    reviewedAt: '2026-07-16T12:02:00Z',
    status: 'rejected',
  },
];

export const adminAuditLogs: AdminAuditLog[] = [
  {
    actionKey: 'withdrawalApproved',
    actor: 'admin@modelmesh.local',
    createdAt: '2026-08-09T04:22:18Z',
    id: 'audit_01K24MRY2E',
    ip: '192.168.1.18',
    outcome: 'succeeded',
    target: 'wd_01K18BZ42W',
  },
  {
    actionKey: 'routeUpdated',
    actor: 'admin@modelmesh.local',
    createdAt: '2026-08-09T03:48:06Z',
    id: 'audit_01K24JQD6S',
    ip: '192.168.1.18',
    outcome: 'succeeded',
    target: 'merchant.withdrawals',
  },
  {
    actionKey: 'merchantApproved',
    actor: 'ops@modelmesh.local',
    createdAt: '2026-08-08T11:30:44Z',
    id: 'audit_01K22TQK9A',
    ip: '10.0.0.24',
    outcome: 'succeeded',
    target: 'merchant_0053',
  },
  {
    actionKey: 'loginFailed',
    actor: 'unknown',
    createdAt: '2026-08-08T10:56:12Z',
    id: 'audit_01K22RZ1KP',
    ip: '203.0.113.42',
    outcome: 'failed',
    target: 'admin@modelmesh.local',
  },
];

export function formatMicrousd(language: string | undefined, amountMicrousd: number): string {
  return new Intl.NumberFormat(language, {
    currency: 'USD',
    maximumFractionDigits: 4,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(amountMicrousd / 1_000_000);
}
