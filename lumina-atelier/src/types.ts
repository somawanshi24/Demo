
export interface Variant {
  color?: string;
  size?: string;
}

export interface StoreItem {
  id: string;
  name: string;
  gender: 'Men' | 'Women';
  category: 'Tops' | 'Bottoms' | 'Dresses' | 'Footwear' | 'Accessories';
  price: number;
  rating: number;
  imageUrl: string;
  description: string;
  color?: string;
  pattern?: string;
  dataset?: string;
  variants?: Variant[];
}

export interface StyleResult {
  imageUrl: string;
  suggestion: string;
  matchedItemIds: string[];
}

export interface HistoryItem {
  id: string;
  originalUrl: string;
  styledUrl: string;
  prompt: string;
  suggestion: string;
  matchedItemIds: string[];
  timestamp: number;
}
