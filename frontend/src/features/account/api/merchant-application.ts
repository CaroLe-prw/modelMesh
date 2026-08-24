import { apiClient } from '@/lib/api-client';

export type MerchantApplicationStatus = 'pending' | 'approved' | 'rejected';
export type MerchantAccessStatus = 'active' | 'disabled';

export interface MerchantApplication {
  id: number;
  applicationCode: string;
  businessName: string;
  avatarUrl: string | null;
  website: string | null;
  description: string;
  status: MerchantApplicationStatus;
  merchantAccessStatus: MerchantAccessStatus | null;
  reviewNote: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitMerchantApplicationRequest {
  businessName: string;
  avatarUrl?: string;
  website?: string;
  description: string;
}

export function getMerchantApplication(): Promise<MerchantApplication | null> {
  return apiClient.get<MerchantApplication | null>('/merchant-application');
}

export function submitMerchantApplication(
  request: SubmitMerchantApplicationRequest,
): Promise<MerchantApplication> {
  return apiClient.post<MerchantApplication, SubmitMerchantApplicationRequest>(
    '/merchant-application',
    request,
  );
}
