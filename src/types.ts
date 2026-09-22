export type PaymentMethod = 'clictopay' | 'konnect' | 'flouci' | 'cash_door' | 'seller_cash';

export interface TicketTier {
  id: string;
  name: string;
  price: number; // in TND
  capacity: number;
  soldCount: number;
  description: string;
  badge?: string;
}

export interface EventData {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  bannerUrl: string;
  coverImages: string[]; // Event cover image slider/carousel gallery
  pinCode: string; // 6 digits, e.g. "839204"
  secretKey: string;
  tiers: TicketTier[];
  enabledGateways: {
    clictopay: boolean;
    konnect: boolean;
    flouci: boolean;
  };
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string;
  status: 'active' | 'draft' | 'ended';
}

export type TicketStatus = 'VALID' | 'CHECKED_IN' | 'REFUNDED';

export interface Ticket {
  id: string;
  eventId: string;
  tierId: string;
  tierName: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  price: number;
  currency: string;
  paymentMethod: PaymentMethod;
  qrHash: string; // e.g. "TKT-8910:a7c29e1f4b"
  status: TicketStatus;
  createdAt: string;
  checkedInAt?: string;
  checkedInBy?: string; // Bouncer / Gate ID
  isDoorCash?: boolean;
  soldBySeller?: string; // Seller / Ambassador name who collected cash
  emailSent?: boolean;
  emailSentAt?: string;
}

export interface DoorCashRecord {
  id: string;
  eventId: string;
  tierId: string;
  tierName: string;
  amount: number;
  staffName: string;
  buyerName: string;
  buyerPhone: string;
  timestamp: string;
  ticketId: string;
  sellerRole?: string;
}

export interface SellerProfile {
  id: string;
  eventId?: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  location?: string;
  pin: string; // 6-digit Event PIN
  status?: 'ACTIVE' | 'SUSPENDED';
  totalSalesCount?: number;
  totalSalesTnd?: number;
}

export interface BouncerSession {
  staffName: string;
  gateName: string;
  pairedPin: string;
  isPaired: boolean;
  offlineSyncTimestamp: string;
}
