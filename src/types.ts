export interface Variation {
  name: string;
  options: string[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  sku?: string;
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
