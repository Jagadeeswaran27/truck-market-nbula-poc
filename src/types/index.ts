export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  rating: number;
  salesCount: number;
  createdAt: Date;
  emailVerified: boolean;
}

export interface Location {
  address: string;
  latitude: number;
  longitude: number;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  condition: 'New' | 'Like New' | 'Good' | 'Fair';
  category: string;
  images: string[];
  dropLocations: Location[];
  status: 'active' | 'sold';
  createdBy: string;
  createdAt: Date;
}

export interface Chat {
  id: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  participants: string[];
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  productTitle?: string;
  productImage?: string;
  otherUserName?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: Date;
}