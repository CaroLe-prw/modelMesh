import {
  ChartNoAxesColumnIncreasing,
  CircleDollarSign,
  FileText,
  Gift,
  KeyRound,
  MessageSquareText,
  Route,
  ShieldCheck,
  Store,
  UserRound,
  UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import { AccountApiKeysSection } from '@/features/account/components/sections/account-api-keys-section';
import { AccountBillingSection } from '@/features/account/components/sections/account-billing-section';
import { AccountOrdersSection } from '@/features/account/components/sections/account-orders-section';
import { AccountProfileSection } from '@/features/account/components/sections/account-profile-section';
import { AccountRedeemSection } from '@/features/account/components/sections/account-redeem-section';
import { AccountReferralsSection } from '@/features/account/components/sections/account-referrals-section';
import { AccountRouteAccessSection } from '@/features/account/components/sections/account-route-access-section';
import { AccountSupportSection } from '@/features/account/components/sections/account-support-section';
import { AccountUsageSection } from '@/features/account/components/sections/account-usage-section';

const routeElements: Readonly<Record<string, ReactElement>> = {
  'account.api-keys': <AccountApiKeysSection />,
  'account.usage': <AccountUsageSection />,
  'account.billing': <AccountBillingSection />,
  'account.orders': <AccountOrdersSection />,
  'account.redeem': <AccountRedeemSection />,
  'account.referrals': <AccountReferralsSection />,
  'account.profile': <AccountProfileSection />,
  'account.support': <AccountSupportSection audience="personal" />,
  'merchant.support': <AccountSupportSection audience="merchant" />,
  'admin.support': <AccountSupportSection audience="admin" />,
  'admin.route-access': <AccountRouteAccessSection />,
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
  store: Store,
  'shield-check': ShieldCheck,
  route: Route,
};

export function accountRouteElement(routeKey: string): ReactElement | undefined {
  return routeElements[routeKey];
}

export function accountRouteIcon(iconKey: string): LucideIcon {
  return routeIcons[iconKey] ?? Route;
}
