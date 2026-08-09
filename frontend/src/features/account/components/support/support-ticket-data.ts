export type SupportTicketCategory = 'account' | 'billing' | 'other' | 'technical';
export type SupportTicketStatus = 'inProgress' | 'open' | 'resolved';
export type SupportTicketStatusFilter = 'all' | SupportTicketStatus;

export interface SupportTicket {
  category: SupportTicketCategory;
  createdAt: string;
  description: string;
  id: string;
  status: SupportTicketStatus;
  subject: string;
  translated: boolean;
  updatedAt: string;
}

export interface NewSupportTicket {
  category: SupportTicketCategory;
  description: string;
  subject: string;
}

export const supportTicketStatusFilters: SupportTicketStatusFilter[] = [
  'all',
  'open',
  'inProgress',
  'resolved',
];

export const supportTicketCategories: SupportTicketCategory[] = [
  'technical',
  'billing',
  'account',
  'other',
];

export const demoSupportTickets: SupportTicket[] = [
  {
    id: 'SUP-20260807-003',
    subject: 'pages.account.sections.support.demo.apiKeySubject',
    description: 'pages.account.sections.support.demo.apiKeyDescription',
    category: 'technical',
    status: 'open',
    createdAt: '2026-08-07T07:30:00Z',
    updatedAt: '2026-08-07T07:30:00Z',
    translated: true,
  },
  {
    id: 'SUP-20260805-002',
    subject: 'pages.account.sections.support.demo.billingSubject',
    description: 'pages.account.sections.support.demo.billingDescription',
    category: 'billing',
    status: 'inProgress',
    createdAt: '2026-08-05T03:20:00Z',
    updatedAt: '2026-08-06T09:45:00Z',
    translated: true,
  },
  {
    id: 'SUP-20260801-001',
    subject: 'pages.account.sections.support.demo.profileSubject',
    description: 'pages.account.sections.support.demo.profileDescription',
    category: 'account',
    status: 'resolved',
    createdAt: '2026-08-01T02:10:00Z',
    updatedAt: '2026-08-02T06:15:00Z',
    translated: true,
  },
];

export function formatSupportTicketDate(language: string | undefined, value: string): string {
  return new Intl.DateTimeFormat(language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
