import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse, PaginationQuery } from '@/lib/pagination';

export type AdminCatalogReviewKind = 'channel' | 'model';
export type AdminCatalogReviewAction = 'priceChange' | 'publish' | 'unpublish' | 'violation';
export type AdminCatalogReviewStatus = 'approved' | 'pending' | 'rejected';
export type AdminCatalogReviewDecision = 'approved' | 'rejected';

export interface AdminCatalogReview {
  action: AdminCatalogReviewAction;
  channelId: number;
  contextWindow: number | null;
  currentOutputPrice: number | null;
  id: string;
  kind: AdminCatalogReviewKind;
  merchant: string;
  modelIdentifier: string | null;
  name: string;
  outputPrice: number | null;
  priceEffectiveAt: string | null;
  proposedOutputPrice: number | null;
  provider: string;
  providerId: string;
  reviewNote: string;
  status: AdminCatalogReviewStatus;
  submittedAt: string;
}

export interface ListAdminCatalogReviewsQuery extends PaginationQuery {
  kind: AdminCatalogReviewKind;
  query?: string;
  status?: AdminCatalogReviewStatus;
}

export interface AdminCatalogReviewUpdate {
  decision: AdminCatalogReviewDecision;
  expectedStatus: AdminCatalogReviewStatus;
  kind: AdminCatalogReviewKind;
  reviewNote: string;
}

export interface AdminCatalogReviewConnectionTest {
  latencyMs: number;
  modelCount: number;
}

export type AdminCatalogReviewModelCheckKey =
  | 'inference'
  | 'inputFidelity'
  | 'outputStructure'
  | 'multiTurnContext'
  | 'parameterCompliance'
  | 'tokenAccounting'
  | 'contentIntegrity'
  | 'stability'
  | 'routingConsistency';

export type AdminCatalogReviewModelCheckStatus = 'failed' | 'passed' | 'warning';
export type AdminCatalogReviewModelIdentityRisk = 'high' | 'low' | 'medium' | 'unverified';

export interface AdminCatalogReviewModelCheck {
  key: AdminCatalogReviewModelCheckKey;
  status: AdminCatalogReviewModelCheckStatus;
}

export interface AdminCatalogReviewModelTest {
  attempts: number;
  averageLatencyMs: number;
  checks: AdminCatalogReviewModelCheck[];
  claimedModel: string;
  identityRisk: AdminCatalogReviewModelIdentityRisk;
  observedModels: string[];
  officialEndpoint: boolean;
  successfulAttempts: number;
  systemFingerprints: string[];
}

export function listAdminCatalogReviews(
  query: ListAdminCatalogReviewsQuery,
  signal?: AbortSignal,
): Promise<PaginatedResponse<AdminCatalogReview>> {
  return apiClient.get<PaginatedResponse<AdminCatalogReview>>('/admin/catalog-reviews', {
    query: {
      kind: query.kind,
      page: query.page,
      pageSize: query.pageSize,
      query: query.query,
      status: query.status,
    },
    signal,
  });
}

export function reviewAdminCatalogItem(
  reviewId: string,
  update: AdminCatalogReviewUpdate,
): Promise<void> {
  return apiClient.post<void, AdminCatalogReviewUpdate>(
    `/admin/catalog-reviews/${reviewId}/review`,
    update,
  );
}

export function testAdminCatalogChannelConnection(
  reviewId: string,
): Promise<AdminCatalogReviewConnectionTest> {
  return apiClient.post<AdminCatalogReviewConnectionTest>(
    `/admin/catalog-reviews/${reviewId}/test-connection`,
  );
}

export function testAdminCatalogModel(reviewId: string): Promise<AdminCatalogReviewModelTest> {
  return apiClient.post<AdminCatalogReviewModelTest>(
    `/admin/catalog-reviews/${reviewId}/test-model`,
  );
}
