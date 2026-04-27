export interface Location {
  lat: number;
  lng: number;
}

export type SessionStatus = 'open' | 'closed';

export interface VendorSession {
  id: string;
  vendorId: string;
  vendorName: string;
  dishName: string;
  description?: string;
  price: number;
  currency: string;
  location: Location;
  status: SessionStatus;
  openedAt: string; // ISO String
  closesAt: string; // ISO String
  photoUrl?: string;
  tags: string[];
  viewCount: number;
  // StreetPulse Enhancements
  category?: string;
  priceRange?: 'budget' | 'mid' | 'premium';
  isVeg?: boolean;
  spiceLevel?: 'mild' | 'medium' | 'hot' | 'extra-hot';
  whatsappNumber?: string;
  lastVerifiedAt?: string;
  verificationCount: number;
  verifiedBy: string[];
  whatsappTaps: number;
  extensionCount: number;
  activeViewers?: number;
}

export interface Vendor {
  id: string;
  displayName: string;
  photoURL?: string;
  whatsappNumber?: string;
  totalSessions: number;
  totalRatings: number;
  avgRating: number;
  isVerifiedVendor: boolean;
  createdAt: string;
}

export interface UserAlert {
  id: string;
  userId: string;
  radiusKm: number;
  enabled: boolean;
  keywords: string[];
}

export interface Rating {
  vendorId: string;
  sessionId: string;
  raterUID: string;
  score: number; // 1-3
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  sessionId: string;
  vendorId: string;
  isRead: boolean;
  createdAt: string;
}
