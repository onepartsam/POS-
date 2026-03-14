import { Product } from './types';

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Cotton - Linen Long Shirt',
    price: 24.94,
    category: "Men's Wear",
    stock: 50,
    image: 'https://images.unsplash.com/photo-1596755094514-f87e32f85e2c?auto=format&fit=crop&q=80&w=400&h=500',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['#1e3a8a', '#e5e7eb', '#bfdbfe', '#86efac', '#93c5fd']
  },
  {
    id: '2',
    name: 'Straight Fit - Washed Denim',
    price: 21.93,
    category: "Men's Wear",
    stock: 30,
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=400&h=500',
    sizes: ['32', '33', '34', '35', '36'],
    colors: ['#111827', '#4b5563', '#6b7280']
  },
  {
    id: '3',
    name: 'Textured Knit Polo Shirt',
    price: 31.89,
    category: "Men's Wear",
    stock: 25,
    image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&q=80&w=400&h=500',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['#fef3c7', '#111827', '#451a03']
  },
  {
    id: '4',
    name: 'Fabric Shoulder Bag',
    price: 45.00,
    category: "Accessories",
    stock: 15,
    image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&q=80&w=400&h=500',
    sizes: ['SM', 'MD', 'LG'],
    colors: ['#fef3c7']
  },
  {
    id: '5',
    name: 'Penny Dress Loafers',
    price: 89.99,
    category: "Men's Wear",
    stock: 10,
    image: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&q=80&w=400&h=500',
    sizes: ['40', '41', '42', '43', '44'],
    colors: ['#000000']
  },
  {
    id: '6',
    name: 'Sun Print T-Shirt',
    price: 18.50,
    category: "Men's Wear",
    stock: 100,
    image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=400&h=500',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['#1e3a8a']
  }
];

export const categories = ["All Products", "Men's Wear", "Women's Wear", "Kids Wear", "Accessories"];
