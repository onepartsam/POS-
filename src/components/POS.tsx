import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart } from 'lucide-react';
import Header from './Header';
import ProductCard from './ProductCard';
import Cart from './Cart';
import { Product, CartItem } from '../types';
import { useTenant } from '../App';
import LoadingSpinner from './LoadingSpinner';

export default function POS() {
  const { currentTenant } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>(['All Products']);
  const [activeCategory, setActiveCategory] = useState('All Products');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (currentTenant) {
      setLoading(true);
      fetch(`/api/products?tenantId=${currentTenant.id}`)
        .then(res => res.json())
        .then(data => {
          setProducts(data);
          const cats = Array.from(new Set(data.map((p: any) => p.category))) as string[];
          setCategories(['All Products', ...cats]);
        })
        .finally(() => setLoading(false));
    }
  }, [currentTenant]);

  const handleAddToCart = (product: Product, variations?: Record<string, string>) => {
    setCartItems(prev => {
      const currentTotalQuantity = prev.filter(item => item.id === product.id).reduce((sum, item) => sum + item.quantity, 0);
      if (currentTotalQuantity >= product.stock) {
        alert(`Cannot add more. Only ${product.stock} in stock.`);
        return prev;
      }

      const existingItemIndex = prev.findIndex(
        item => {
          if (item.id !== product.id) return false;
          // Check if variations match exactly
          const itemVars = item.selectedVariations || {};
          const newVars = variations || {};
          const keys1 = Object.keys(itemVars);
          const keys2 = Object.keys(newVars);
          if (keys1.length !== keys2.length) return false;
          return keys1.every(key => itemVars[key] === newVars[key]);
        }
      );

      if (existingItemIndex >= 0) {
        const newItems = [...prev];
        newItems[existingItemIndex].quantity += 1;
        return newItems;
      }

      return [...prev, {
        ...product,
        cartItemId: Math.random().toString(36).substr(2, 9),
        quantity: 1,
        selectedVariations: variations
      }];
    });
  };

  const handleUpdateQuantity = (cartItemId: string, delta: number) => {
    setCartItems(prev => {
      const itemToUpdate = prev.find(item => item.cartItemId === cartItemId);
      if (!itemToUpdate) return prev;

      if (delta > 0) {
        const currentTotalQuantity = prev.filter(item => item.id === itemToUpdate.id).reduce((sum, item) => sum + item.quantity, 0);
        if (currentTotalQuantity >= itemToUpdate.stock) {
          alert(`Cannot add more. Only ${itemToUpdate.stock} in stock.`);
          return prev;
        }
      }

      return prev.map(item => {
        if (item.cartItemId === cartItemId) {
          const newQuantity = Math.max(0, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const handleClearCart = () => setCartItems([]);

  const handleCheckout = async (discount: number, tax: number, total: number) => {
    if (!currentTenant || cartItems.length === 0) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: currentTenant.id,
          total,
          tax,
          discount,
          items: cartItems
        })
      });
      if (res.ok) {
        alert('Payment successful!');
        setCartItems([]);
        // Refresh products to get updated stock
        setLoading(true);
        fetch(`/api/products?tenantId=${currentTenant.id}`)
          .then(res => res.json())
          .then(data => setProducts(data))
          .finally(() => setLoading(false));
      }
    } catch (err) {
      console.error(err);
      alert('Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === "All Products" || p.category === activeCategory;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = (p.name?.toLowerCase() || '').includes(searchLower) || 
                          (p.sku?.toLowerCase() || '').includes(searchLower);
    return matchesCategory && matchesSearch;
  });

  if (!currentTenant) return <div className="p-8">Please select a tenant first.</div>;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <main className="flex-1 flex overflow-hidden relative">
        {/* Main Products Area */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 lg:p-8">
          {loading && <LoadingSpinner />}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Select Products</h2>
              <p className="text-sm text-gray-500 mt-1">Select a product & proceed to checkout</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search Products" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                />
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === category 
                    ? 'bg-white text-black shadow-sm border border-gray-200' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 pb-20 lg:pb-0">
            {filteredProducts.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onAdd={handleAddToCart} 
              />
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                No products available. Go to Inventory to add some.
              </div>
            )}
          </div>
        </div>

        {/* Mobile Cart Toggle */}
        <button 
          onClick={() => setIsCartOpen(!isCartOpen)}
          className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-black text-white rounded-full shadow-xl flex items-center justify-center z-50"
        >
          <div className="relative">
            <ShoppingCart size={24} />
            {cartItems.length > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-black">
                {cartItems.length}
              </span>
            )}
          </div>
        </button>

        {/* Cart Sidebar */}
        <div className={`
          fixed inset-y-0 right-0 z-40 transform transition-transform duration-300 ease-in-out lg:relative lg:transform-none
          ${isCartOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}>
          <Cart 
            items={cartItems} 
            onUpdateQuantity={handleUpdateQuantity} 
            onClear={handleClearCart} 
            onCheckout={handleCheckout}
          />
        </div>
        
        {/* Mobile Cart Overlay */}
        {isCartOpen && (
          <div 
            className="fixed inset-0 bg-black/20 z-30 lg:hidden backdrop-blur-sm"
            onClick={() => setIsCartOpen(false)}
          />
        )}
      </main>
    </div>
  );
}
