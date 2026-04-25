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
}

export interface UserAlert {
  id: string;
  userId: string;
  radiusKm: number;
  enabled: boolean;
  keywords: string[];
}
