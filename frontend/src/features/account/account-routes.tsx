import {
  Activity,
  Building2,
  ChartNoAxesColumnIncreasing,
  CircleDollarSign,
  ClipboardList,
  FileClock,
  FileText,
  Gift,
  KeyRound,
  LayoutDashboard,
  LibraryBig,
  MessageSquareText,
  PackagePlus,
  PackageCheck,
  RadioTower,
  ReceiptText,
  Route,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Store,
  UserRound,
  Users,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import { AdminAuditLogsSection } from '@/features/account/components/sections/admin-audit-logs-section';
import { AdminCatalogReviewsSection } from '@/features/account/components/sections/admin-catalog-reviews-section';
import { AdminCatalogManagementSection } from '@/features/account/components/sections/admin-catalog-management-section';
import { AdminDashboardSection } from '@/features/account/components/sections/admin-dashboard-section';
import { AdminLedgerSection } from '@/features/account/components/sections/admin-ledger-section';
import { AdminMerchantsSection } from '@/features/account/components/sections/admin-merchants-section';
import { AdminRiskAlertsSection } from '@/features/account/components/sections/admin-risk-alerts-section';
import { AdminSettingsSection } from '@/features/account/components/sections/admin-settings-section';
import { AdminUsageLogsSection } from '@/features/account/components/sections/admin-usage-logs-section';
import { AdminUsersSection } from '@/features/account/components/sections/admin-users-section';
import { AdminWithdrawalsSection } from '@/features/account/components/sections/admin-withdrawals-section';
import { AccountApiKeysSection } from '@/features/account/components/sections/account-api-keys-section';
import { AccountBillingSection } from '@/features/account/components/sections/account-billing-section';
import { AccountMerchantApplicationSection } from '@/features/account/components/sections/account-merchant-application-section';
import { AccountOrdersSection } from '@/features/account/components/sections/account-orders-section';
import { AccountProfileSection } from '@/features/account/components/sections/account-profile-section';
import { AccountRedeemSection } from '@/features/account/components/sections/account-redeem-section';
import { AccountReferralsSection } from '@/features/account/components/sections/account-referrals-section';
import { AccountRouteAccessSection } from '@/features/account/components/sections/account-route-access-section';
import { AccountSupportSection } from '@/features/account/components/sections/account-support-section';
import { AccountUsageSection } from '@/features/account/components/sections/account-usage-section';
import { MerchantChannelsSection } from '@/features/account/components/sections/merchant-channels-section';
import { MerchantDashboardSection } from '@/features/account/components/sections/merchant-dashboard-section';
import { MerchantModelsSection } from '@/features/account/components/sections/merchant-models-section';
import { MerchantProfileSection } from '@/features/account/components/sections/merchant-profile-section';
import { MerchantRequestsSection } from '@/features/account/components/sections/merchant-requests-section';
import { MerchantUsageLogsSection } from '@/features/account/components/sections/merchant-usage-logs-section';
import { MerchantWithdrawalsSection } from '@/features/account/components/sections/merchant-withdrawals-section';

const routeElements: Readonly<Record<string, ReactElement>> = {
  'account.api-keys': <AccountApiKeysSection />,
  'account.usage': <AccountUsageSection />,
  'account.billing': <AccountBillingSection />,
  'account.orders': <AccountOrdersSection />,
  'account.redeem': <AccountRedeemSection />,
  'account.referrals': <AccountReferralsSection />,
  'account.profile': <AccountProfileSection />,
  'account.merchant-application': <AccountMerchantApplicationSection />,
  'account.support': <AccountSupportSection audience="personal" />,
  'merchant.dashboard': <MerchantDashboardSection />,
  'merchant.channels': <MerchantChannelsSection />,
  'merchant.models': <MerchantModelsSection />,
  'merchant.usage-logs': <MerchantUsageLogsSection />,
  'merchant.withdrawals': <MerchantWithdrawalsSection />,
  'merchant.requests': <MerchantRequestsSection />,
  'merchant.profile': <MerchantProfileSection />,
  'merchant.support': <AccountSupportSection audience="merchant" />,
  'admin.dashboard': <AdminDashboardSection />,
  'admin.users': <AdminUsersSection />,
  'admin.merchants': <AdminMerchantsSection />,
  'admin.catalog-management': <AdminCatalogManagementSection />,
  'admin.usage-logs': <AdminUsageLogsSection />,
  'admin.withdrawals': <AdminWithdrawalsSection />,
  'admin.ledger': <AdminLedgerSection />,
  'admin.catalog-reviews': <AdminCatalogReviewsSection />,
  'admin.risk-alerts': <AdminRiskAlertsSection />,
  'admin.audit-logs': <AdminAuditLogsSection />,
  'admin.support': <AccountSupportSection audience="admin" />,
  'admin.route-access': <AccountRouteAccessSection />,
  'admin.settings': <AdminSettingsSection />,
};

const routeIcons: Readonly<Record<string, LucideIcon>> = {
  'key-round': KeyRound,
  usage: ChartNoAxesColumnIncreasing,
  'circle-dollar-sign': CircleDollarSign,
  'file-text': FileText,
  gift: Gift,
  'users-round': UsersRound,
  'user-round': UserRound,
  'message-square-text': MessageSquareText,
  'layout-dashboard': LayoutDashboard,
  'library-big': LibraryBig,
  'radio-tower': RadioTower,
  'package-plus': PackagePlus,
  'package-check': PackageCheck,
  'scroll-text': ScrollText,
  'receipt-text': ReceiptText,
  'wallet-cards': WalletCards,
  'clipboard-list': ClipboardList,
  'building-2': Building2,
  activity: Activity,
  'file-clock': FileClock,
  store: Store,
  'shield-check': ShieldCheck,
  'shield-alert': ShieldAlert,
  settings: Settings,
  users: Users,
  route: Route,
};

export function accountRouteElement(routeKey: string): ReactElement | undefined {
  return routeElements[routeKey];
}

export function accountRouteIcon(iconKey: string): LucideIcon {
  return routeIcons[iconKey] ?? Route;
}
