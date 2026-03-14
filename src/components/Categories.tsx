import React, { useState, useEffect } from 'react';
import { useTenant } from '../App';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export default function Categories() {
  const { currentTenant } = useTenant();
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [itemToDelete, setItemToDelete] = useState<{ id: number, name: string } | null>(null);

  useEffect(() => {
    if (currentTenant) {
      fetchCategories();
    }
  }, [currentTenant]);

  const fetchCategories = async () => {
    const res = await fetch(`/api/categories?tenantId=${currentTenant?.id}`);
    const data = await res.json();
    setCategories(data);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName) return;
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: currentTenant?.id, name: newCategoryName })
    });
    if (res.ok) {
      setNewCategoryName('');
      fetchCategories();
    }
  };

  const handleDeleteCategory = async (id: number) => {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (res.ok) fetchCategories();
  };

  const handleEditCategoryClick = (category: any) => {
    setEditingCategoryId(category.id);
    setEditCategoryName(category.name);
  };

  const handleSaveEditCategory = async (id: number) => {
    if (!editCategoryName) return;
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editCategoryName })
    });
    if (res.ok) {
      setEditingCategoryId(null);
      fetchCategories();
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    await handleDeleteCategory(itemToDelete.id);
    setItemToDelete(null);
  };

  return (
    <div className="p-8 w-full max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Categories Management</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Add New Category</h2>
        <form onSubmit={handleAddCategory} className="flex gap-4 mb-6">
          <input 
            type="text" 
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            placeholder="Category Name" 
            required
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:outline-none"
          />
          <button type="submit" className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 flex items-center gap-2">
            <Plus size={18} /> Add Category
          </button>
        </form>
        
        <div className="space-y-2">
          {categories.map(category => (
            <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              {editingCategoryId === category.id ? (
                <div className="flex items-center gap-2 flex-1 mr-4">
                  <input 
                    type="text" 
                    value={editCategoryName}
                    onChange={e => setEditCategoryName(e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              ) : (
                <span className="font-medium text-gray-800">{category.name}</span>
              )}
              <div className="flex items-center gap-1">
                {editingCategoryId === category.id ? (
                  <>
                    <button onClick={() => handleSaveEditCategory(category.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Save">
                      <Check size={18} />
                    </button>
                    <button onClick={() => setEditingCategoryId(null)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors" title="Cancel">
                      <X size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleEditCategoryClick(category)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => setItemToDelete({ id: category.id, name: category.name })} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Delete">
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">No categories configured.</p>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={itemToDelete !== null}
        title="Delete Category"
        message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
        confirmText="Delete"
      />
    </div>
  );
}
