export type OrderStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
export type OrderStatusFilter = 'all' | OrderStatus;
export type OrderPaymentMethod = 'alipay' | 'wechat' | 'usdt';

export interface RechargeOrder {
  createdAt: string;
  creditedAmountUsd: number;
  feeRate: number;
  id: number;
  orderNumber: string;
  paidAmountUsd: number;
  paymentMethod: OrderPaymentMethod;
  status: OrderStatus;
}

export const orderStatusFilters: OrderStatusFilter[] = [
  'all',
  'pending',
  'completed',
  'failed',
  'refunded',
  'cancelled',
];

export const demoRechargeOrders: RechargeOrder[] = [
  {
    createdAt: '2026-08-04T18:24:00+08:00',
    creditedAmountUsd: 10,
    feeRate: 3,
    id: 45,
    orderNumber: 'pay_20260804n4Jd1Mcm',
    paidAmountUsd: 10.3,
    paymentMethod: 'usdt',
    status: 'cancelled',
  },
  {
    createdAt: '2026-08-04T18:23:51+08:00',
    creditedAmountUsd: 10,
    feeRate: 3,
    id: 44,
    orderNumber: 'pay_20260804304Jei287Wb',
    paidAmountUsd: 10.3,
    paymentMethod: 'alipay',
    status: 'cancelled',
  },
  {
    createdAt: '2026-08-04T18:23:41+08:00',
    creditedAmountUsd: 20,
    feeRate: 3,
    id: 42,
    orderNumber: 'pay_202608045DCi78f2',
    paidAmountUsd: 20.6,
    paymentMethod: 'usdt',
    status: 'cancelled',
  },
  {
    createdAt: '2026-08-04T18:22:30+08:00',
    creditedAmountUsd: 20,
    feeRate: 3,
    id: 41,
    orderNumber: 'pay_20260804eHMGaguJ',
    paidAmountUsd: 20.6,
    paymentMethod: 'wechat',
    status: 'failed',
  },
  {
    createdAt: '2026-08-04T18:20:08+08:00',
    creditedAmountUsd: 20,
    feeRate: 3,
    id: 40,
    orderNumber: 'pay_20260804RwzPtC2B',
    paidAmountUsd: 20.6,
    paymentMethod: 'usdt',
    status: 'pending',
  },
  {
    createdAt: '2026-08-04T18:19:31+08:00',
    creditedAmountUsd: 20,
    feeRate: 3,
    id: 39,
    orderNumber: 'pay_20260804H1xPloNJ',
    paidAmountUsd: 20.6,
    paymentMethod: 'usdt',
    status: 'refunded',
  },
  {
    createdAt: '2026-08-04T18:14:58+08:00',
    creditedAmountUsd: 20,
    feeRate: 3,
    id: 38,
    orderNumber: 'pay_20260804EevAv536',
    paidAmountUsd: 20.6,
    paymentMethod: 'usdt',
    status: 'cancelled',
  },
  {
    createdAt: '2026-08-04T18:06:30+08:00',
    creditedAmountUsd: 20,
    feeRate: 3,
    id: 37,
    orderNumber: 'pay_20260804w8KaEN0Y',
    paidAmountUsd: 20.6,
    paymentMethod: 'alipay',
    status: 'completed',
  },
  {
    createdAt: '2026-07-18T18:31:52+08:00',
    creditedAmountUsd: 5,
    feeRate: 3,
    id: 13,
    orderNumber: 'pay_20260718T9sQ93hs',
    paidAmountUsd: 5.15,
    paymentMethod: 'usdt',
    status: 'completed',
  },
  {
    createdAt: '2026-07-18T18:30:12+08:00',
    creditedAmountUsd: 5,
    feeRate: 3,
    id: 12,
    orderNumber: 'pay_202607184irBWrvc',
    paidAmountUsd: 5.15,
    paymentMethod: 'wechat',
    status: 'cancelled',
  },
];

export function formatOrderCurrency(language: string | undefined, amount: number) {
  return new Intl.NumberFormat(language, {
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    style: 'currency',
  }).format(amount);
}

export function formatOrderDate(language: string | undefined, createdAt: string) {
  return new Intl.DateTimeFormat(language, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(createdAt));
}
