export interface Variation {
  name: string;
  options: string[];
}

export interface Category {
  id: number;
  tenant_id: number;
  name: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  sizes?: string[];
  colors?: string[];
  variations?: Variation[];
}

export interface CartItem extends Product {
  cartItemId: string;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
  selectedVariations?: Record<string, string>;
}
