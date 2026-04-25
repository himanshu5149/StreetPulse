import { VendorSession } from './types';
import { addHours } from 'date-fns';

export const MOCK_SESSIONS: VendorSession[] = [
  {
    id: '1',
    vendorId: 'v1',
    vendorName: "Auntie's Momo",
    dishName: 'Buff Momo',
    description: 'Freshly steamed momos with spicy tomato chutney.',
    price: 150,
    currency: 'NPR',
    location: { lat: 27.70076, lng: 85.30014 },
    status: 'open',
    openedAt: new Date().toISOString(),
    closesAt: addHours(new Date(), 4).toISOString(),
    photoUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c170db76?q=80&w=800&auto=format&fit=crop',
    tags: ['spicy', 'steamed', 'local'],
    viewCount: 42
  },
  {
    id: '2',
    vendorId: 'v2',
    vendorName: 'Seoul Street Toast',
    dishName: 'Gilgeori Toast',
    description: 'Buttery toast with egg, cabbage, and ham.',
    price: 3500,
    currency: 'KRW',
    location: { lat: 37.5665, lng: 126.9780 },
    status: 'open',
    openedAt: new Date().toISOString(),
    closesAt: addHours(new Date(), 2).toISOString(),
    photoUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=800&auto=format&fit=crop',
    tags: ['breakfast', 'buttery', 'quick'],
    viewCount: 128
  }
];
