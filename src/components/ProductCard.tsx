import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  key?: React.Key;
  product: Product;
  onAdd: (product: Product, variations?: Record<string, string>) => void;
}

export default function ProductCard({ product, onAdd }: ProductCardProps) {
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (product.variations) {
      product.variations.forEach(v => {
        if (v.options.length > 0) {
          initial[v.name] = v.options[0];
        }
      });
    }
    return initial;
  });

  const handleVariationChange = (name: string, option: string) => {
    setSelectedVariations(prev => ({ ...prev, [name]: option }));
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <div className="aspect-[4/5] rounded-xl overflow-hidden bg-gray-50 mb-4 relative">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover mix-blend-multiply" />
      </div>
      
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-medium text-gray-900 text-sm line-clamp-1">{product.name}</h3>
          {product.sku && (
            <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1 rounded">{product.sku}</span>
          )}
        </div>
        
        {/* Dynamic Variations */}
        {product.variations && product.variations.map(variation => (
          <div key={variation.name} className="mt-2">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">{variation.name}</span>
            <div className="flex flex-wrap gap-1.5">
              {variation.options.map(option => {
                const isSelected = selectedVariations[variation.name] === option;
                // Simple heuristic to check if option is a color hex
                const isColor = option.startsWith('#') && (option.length === 4 || option.length === 7);
                
                if (isColor) {
                  return (
                    <button 
                      key={option}
                      onClick={() => handleVariationChange(variation.name, option)}
                      className={`w-5 h-5 rounded-full border-2 ${isSelected ? 'border-gray-400' : 'border-transparent'}`}
                      style={{ backgroundColor: option }}
                      title={option}
                    />
                  );
                }

                return (
                  <button 
                    key={option}
                    onClick={() => handleVariationChange(variation.name, option)}
                    className={`text-[11px] px-2 py-1 rounded border ${isSelected ? 'border-black text-black font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-auto pt-4 flex items-end justify-between">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              ${Math.floor(product.price)}<span className="text-sm text-gray-500">.{(product.price % 1).toFixed(2).substring(2)}</span>
            </div>
            <div className="text-[10px] mt-0.5">
              {product.stock > 0 ? (
                <span className="text-gray-400">{product.stock} in stock</span>
              ) : (
                <span className="text-red-500 font-medium">Out of stock</span>
              )}
            </div>
          </div>
          <button 
            onClick={() => onAdd(product, selectedVariations)}
            disabled={product.stock <= 0}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm active:scale-95 ${
              product.stock > 0 
                ? 'bg-black text-white hover:bg-gray-800' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
