import React, { useState, useEffect, useRef } from 'react';
import { useTenant } from '../App';
import { Pencil, Trash2, Plus, X, Upload } from 'lucide-react';
import { Variation } from '../types';

export default function Inventory() {
  const { currentTenant } = useTenant();
  const [products, setProducts] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [productToDelete, setProductToDelete] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '', sku: '', price: '', category: '', image: '', stock: '',
    variations: [] as { name: string; options: string }[]
  });

  useEffect(() => {
    if (currentTenant) {
      fetchProducts();
    }
  }, [currentTenant]);

  const fetchProducts = () => {
    fetch(`/api/products?tenantId=${currentTenant?.id}`)
      .then(res => res.json())
      .then(setProducts);
  };

  const resetForm = () => {
    setFormData({ name: '', sku: '', price: '', category: '', image: '', stock: '', variations: [] });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEditClick = (product: any) => {
    setFormData({
      name: product.name,
      sku: product.sku || '',
      price: product.price.toString(),
      category: product.category,
      image: product.image || '',
      stock: product.stock.toString(),
      variations: product.variations?.map((v: Variation) => ({
        name: v.name,
        options: v.options.join(', ')
      })) || []
    });
    setEditingId(product.id);
    setIsAdding(true);
  };

  const handleDeleteProduct = (product: any) => {
    setProductToDelete(product);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    try {
      const res = await fetch(`/api/products/${productToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts(products.filter(p => p.id !== productToDelete.id));
      }
    } catch (err) {
      console.error('Failed to delete product', err);
    } finally {
      setProductToDelete(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 960;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/webp', 0.8);
          setFormData({ ...formData, image: dataUrl });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;
    
    const parsedVariations = formData.variations
      .filter(v => v.name.trim() && v.options.trim())
      .map(v => ({
        name: v.name.trim(),
        options: v.options.split(',').map(o => o.trim()).filter(Boolean)
      }));

    const payload = {
      tenant_id: currentTenant.id,
      name: formData.name,
      sku: formData.sku,
      price: parseFloat(formData.price),
      category: formData.category,
      image: formData.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
      stock: parseInt(formData.stock),
      variations: parsedVariations
    };

    try {
      if (editingId) {
        const res = await fetch(`/api/products/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) fetchProducts();
      } else {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) fetchProducts();
      }
      resetForm();
    } catch (err) {
      console.error('Failed to save product', err);
    }
  };

  const handleUpdateStock = async (id: number, newStock: number) => {
    if (newStock < 0) return;
    try {
      const res = await fetch(`/api/products/${id}/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock })
      });
      if (res.ok) {
        setProducts(products.map(p => p.id === id ? { ...p, stock: newStock } : p));
      }
    } catch (err) {
      console.error('Failed to update stock', err);
    }
  };

  const addVariationField = () => {
    setFormData({
      ...formData,
      variations: [...formData.variations, { name: '', options: '' }]
    });
  };

  const removeVariationField = (index: number) => {
    const newVariations = [...formData.variations];
    newVariations.splice(index, 1);
    setFormData({ ...formData, variations: newVariations });
  };

  const updateVariationField = (index: number, field: 'name' | 'options', value: string) => {
    const newVariations = [...formData.variations];
    newVariations[index][field] = value;
    setFormData({ ...formData, variations: newVariations });
  };

  if (!currentTenant) return <div className="p-8">Please select a tenant first.</div>;

  return (
    <div className="p-8 w-full max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        <button 
          onClick={() => isAdding ? resetForm() : setIsAdding(true)}
          className="bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800"
        >
          {isAdding ? 'Cancel' : 'Add Product'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <h2 className="text-lg font-semibold mb-4">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input required type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input required type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
              <input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
              <input required type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
              <div className="flex gap-2 items-center">
                <input 
                  type="text" 
                  placeholder="Image URL"
                  value={formData.image} 
                  onChange={e => setFormData({...formData, image: e.target.value})} 
                  className="flex-1 px-3 py-2 border rounded-lg" 
                />
                <span className="text-gray-500 text-sm">or</span>
                <input 
                  type="file" 
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden" 
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Upload size={16} />
                  Upload Image
                </button>
              </div>
              {formData.image && (
                <div className="mt-2">
                  <img src={formData.image} alt="Preview" className="h-20 w-20 object-cover rounded border" />
                </div>
              )}
            </div>

            <div className="col-span-2 mt-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Variations (e.g., Size, Color, Material)</label>
                <button type="button" onClick={addVariationField} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  <Plus size={16} /> Add Variation
                </button>
              </div>
              {formData.variations.map((variation, index) => (
                <div key={index} className="flex gap-4 mb-3 items-start">
                  <div className="flex-1">
                    <input type="text" placeholder="Variation Name (e.g. Size)" value={variation.name} onChange={e => updateVariationField(index, 'name', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div className="flex-[2]">
                    <input type="text" placeholder="Options (comma separated, e.g. S, M, L)" value={variation.options} onChange={e => updateVariationField(index, 'options', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <button type="button" onClick={() => removeVariationField(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <X size={20} />
                  </button>
                </div>
              ))}
              {formData.variations.length === 0 && (
                <p className="text-sm text-gray-500 italic">No variations added. Product will have no options.</p>
              )}
            </div>

            <div className="col-span-2 mt-4">
              <button type="submit" className="w-full bg-black text-white py-2 rounded-lg font-medium">
                {editingId ? 'Update Product' : 'Save Product'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Product</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">SKU</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Category</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Price</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Stock</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map(product => (
              <tr key={product.id}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={product.image} alt={product.name} className="w-10 h-10 rounded object-cover bg-gray-100" />
                    <div>
                      <span className="font-medium text-gray-900 block">{product.name}</span>
                      {product.variations?.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {product.variations.map((v: Variation) => v.name).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{product.sku}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{product.category}</td>
                <td className="px-6 py-4 text-sm text-gray-900">${product.price.toFixed(2)}</td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleUpdateStock(product.id, product.stock - 1)} className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded hover:bg-gray-200 text-gray-600">-</button>
                    <span className="w-8 text-center font-medium">{product.stock}</span>
                    <button onClick={() => handleUpdateStock(product.id, product.stock + 1)} className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded hover:bg-gray-200 text-gray-600">+</button>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleEditClick(product)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDeleteProduct(product)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No products found. Add some to get started.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold mb-2">Delete Product</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-semibold text-gray-900">"{productToDelete.name}"</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
