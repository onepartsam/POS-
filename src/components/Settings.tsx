import React, { useState, useEffect } from 'react';
import { useTenant } from '../App';
import { Trash2, Plus, Edit2, Check, X } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export default function Settings() {
  const { currentTenant, setCurrentTenant } = useTenant();
  const [taxes, setTaxes] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [discountCodes, setDiscountCodes] = useState<any[]>([]);
  
  const [newTaxName, setNewTaxName] = useState('');
  const [newTaxPercentage, setNewTaxPercentage] = useState('');
  const [editingTaxId, setEditingTaxId] = useState<number | null>(null);
  const [editTaxName, setEditTaxName] = useState('');
  const [editTaxPercentage, setEditTaxPercentage] = useState('');

  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [editingPaymentMethodId, setEditingPaymentMethodId] = useState<number | null>(null);
  const [editPaymentMethodName, setEditPaymentMethodName] = useState('');
  
  const [newDiscountCode, setNewDiscountCode] = useState('');
  const [newDiscountType, setNewDiscountType] = useState('percent');
  const [newDiscountValue, setNewDiscountValue] = useState('');
  const [newDiscountMinSpending, setNewDiscountMinSpending] = useState('0');
  
  const [editingDiscountCodeId, setEditingDiscountCodeId] = useState<number | null>(null);
  const [editDiscountCode, setEditDiscountCode] = useState('');
  const [editDiscountType, setEditDiscountType] = useState('percent');
  const [editDiscountValue, setEditDiscountValue] = useState('');
  const [editDiscountMinSpending, setEditDiscountMinSpending] = useState('0');

  const [itemToDelete, setItemToDelete] = useState<{ type: 'tax' | 'paymentMethod' | 'discountCode', id: number, name: string } | null>(null);

  const [storeAddress, setStoreAddress] = useState('');
  const [storeRegNumber, setStoreRegNumber] = useState('');
  const [isSavingStore, setIsSavingStore] = useState(false);

  const [accountName, setAccountName] = useState('');
  const [accountUsername, setAccountUsername] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountContact, setAccountContact] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  useEffect(() => {
    if (currentTenant) {
      setStoreAddress(currentTenant.address || '');
      setStoreRegNumber(currentTenant.registration_number || '');
      setAccountName(currentTenant.name || '');
      setAccountUsername(currentTenant.username || '');
      setAccountEmail(currentTenant.email || '');
      setAccountContact(currentTenant.contact_number || '');
      fetchTaxes();
      fetchPaymentMethods();
      fetchDiscountCodes();
    }
  }, [currentTenant]);

  const handleSaveAccountInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;
    
    setIsSavingAccount(true);
    try {
      const res = await fetch(`/api/tenants/${currentTenant.id}?tenantId=${currentTenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: accountName,
          username: accountUsername,
          email: accountEmail,
          contact_number: accountContact,
          password: accountPassword || undefined,
          address: currentTenant.address,
          registration_number: currentTenant.registration_number,
          is_super_admin: currentTenant.is_super_admin
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setCurrentTenant(data.tenant);
        setAccountPassword('');
        alert('Account information saved successfully.');
      } else {
        alert(data.error || 'Failed to save account information.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save account information.');
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleSaveStoreInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;
    
    setIsSavingStore(true);
    try {
      const res = await fetch(`/api/tenants/${currentTenant.id}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tax_percentage: currentTenant.tax_percentage,
          address: storeAddress,
          registration_number: storeRegNumber
        })
      });
      
      if (res.ok) {
        setCurrentTenant({
          ...currentTenant,
          address: storeAddress,
          registration_number: storeRegNumber
        });
        alert('Store information saved successfully.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save store information.');
    } finally {
      setIsSavingStore(false);
    }
  };

  const fetchTaxes = async () => {
    const res = await fetch(`/api/taxes?tenantId=${currentTenant?.id}`);
    const data = await res.json();
    setTaxes(data);
  };

  const fetchPaymentMethods = async () => {
    const res = await fetch(`/api/payment-methods?tenantId=${currentTenant?.id}`);
    const data = await res.json();
    setPaymentMethods(data);
  };

  const fetchDiscountCodes = async () => {
    const res = await fetch(`/api/discount-codes?tenantId=${currentTenant?.id}`);
    const data = await res.json();
    setDiscountCodes(data);
  };

  const handleAddTax = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaxName || !newTaxPercentage) return;
    const res = await fetch('/api/taxes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: currentTenant?.id, name: newTaxName, percentage: parseFloat(newTaxPercentage) })
    });
    if (res.ok) {
      setNewTaxName('');
      setNewTaxPercentage('');
      fetchTaxes();
    }
  };

  const handleDeleteTax = async (id: number) => {
    const res = await fetch(`/api/taxes/${id}`, { method: 'DELETE' });
    if (res.ok) fetchTaxes();
  };

  const handleEditTaxClick = (tax: any) => {
    setEditingTaxId(tax.id);
    setEditTaxName(tax.name);
    setEditTaxPercentage(tax.percentage.toString());
  };

  const handleSaveEditTax = async (id: number) => {
    if (!editTaxName || !editTaxPercentage) return;
    const res = await fetch(`/api/taxes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editTaxName, percentage: parseFloat(editTaxPercentage) })
    });
    if (res.ok) {
      setEditingTaxId(null);
      fetchTaxes();
    }
  };

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaymentMethod) return;
    const res = await fetch('/api/payment-methods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: currentTenant?.id, name: newPaymentMethod })
    });
    if (res.ok) {
      setNewPaymentMethod('');
      fetchPaymentMethods();
    }
  };

  const handleDeletePaymentMethod = async (id: number) => {
    const res = await fetch(`/api/payment-methods/${id}`, { method: 'DELETE' });
    if (res.ok) fetchPaymentMethods();
  };

  const handleEditPaymentMethodClick = (method: any) => {
    setEditingPaymentMethodId(method.id);
    setEditPaymentMethodName(method.name);
  };

  const handleSaveEditPaymentMethod = async (id: number) => {
    if (!editPaymentMethodName) return;
    const res = await fetch(`/api/payment-methods/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editPaymentMethodName })
    });
    if (res.ok) {
      setEditingPaymentMethodId(null);
      fetchPaymentMethods();
    }
  };

  const handleAddDiscountCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiscountCode || !newDiscountValue) return;
    const res = await fetch('/api/discount-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        tenant_id: currentTenant?.id, 
        code: newDiscountCode, 
        discount_type: newDiscountType,
        discount_value: parseFloat(newDiscountValue),
        min_spending: parseFloat(newDiscountMinSpending) || 0
      })
    });
    if (res.ok) {
      setNewDiscountCode('');
      setNewDiscountValue('');
      setNewDiscountMinSpending('0');
      fetchDiscountCodes();
    }
  };

  const handleDeleteDiscountCode = async (id: number) => {
    const res = await fetch(`/api/discount-codes/${id}`, { method: 'DELETE' });
    if (res.ok) fetchDiscountCodes();
  };

  const handleEditDiscountCodeClick = (code: any) => {
    setEditingDiscountCodeId(code.id);
    setEditDiscountCode(code.code);
    setEditDiscountType(code.discount_type);
    setEditDiscountValue(code.discount_value.toString());
    setEditDiscountMinSpending(code.min_spending.toString());
  };

  const handleSaveEditDiscountCode = async (id: number) => {
    if (!editDiscountCode || !editDiscountValue) return;
    const res = await fetch(`/api/discount-codes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        code: editDiscountCode, 
        discount_type: editDiscountType,
        discount_value: parseFloat(editDiscountValue),
        min_spending: parseFloat(editDiscountMinSpending) || 0
      })
    });
    if (res.ok) {
      setEditingDiscountCodeId(null);
      fetchDiscountCodes();
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const { type, id } = itemToDelete;
    
    if (type === 'tax') {
      await handleDeleteTax(id);
    } else if (type === 'paymentMethod') {
      await handleDeletePaymentMethod(id);
    } else if (type === 'discountCode') {
      await handleDeleteDiscountCode(id);
    }
    
    setItemToDelete(null);
  };

  return (
    <div className="p-8 w-full max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Store Settings</h1>
      
      {/* Account Settings */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Account Settings</h2>
        <form onSubmit={handleSaveAccountInfo} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input 
                type="text" 
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input 
                type="text" 
                value={accountUsername}
                onChange={e => setAccountUsername(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input 
                type="email" 
                value={accountEmail}
                onChange={e => setAccountEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
              <input 
                type="tel" 
                value={accountContact}
                onChange={e => setAccountContact(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password (leave blank to keep current)</label>
            <input 
              type="password" 
              value={accountPassword}
              onChange={e => setAccountPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:outline-none"
            />
          </div>
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={isSavingAccount}
              className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingAccount ? 'Saving...' : 'Save Account'}
            </button>
          </div>
        </form>
      </div>

      {/* Store Information */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Store Information</h2>
        <form onSubmit={handleSaveStoreInfo} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Store Address</label>
            <textarea 
              value={storeAddress}
              onChange={e => setStoreAddress(e.target.value)}
              placeholder="217 Henderson Rd, #02-06, Singapore 159555" 
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number / Tax ID</label>
            <input 
              type="text" 
              value={storeRegNumber}
              onChange={e => setStoreRegNumber(e.target.value)}
              placeholder="e.g. REG-123456789" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:outline-none"
            />
          </div>
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={isSavingStore}
              className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingStore ? 'Saving...' : 'Save Information'}
            </button>
          </div>
        </form>
      </div>

      {/* Tax Settings */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Taxes</h2>
        <form onSubmit={handleAddTax} className="flex gap-4 mb-6">
          <input 
            type="text" 
            value={newTaxName}
            onChange={e => setNewTaxName(e.target.value)}
            placeholder="Tax Name (e.g. VAT)" 
            required
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:outline-none"
          />
          <input 
            type="number" 
            step="0.01"
            value={newTaxPercentage}
            onChange={e => setNewTaxPercentage(e.target.value)}
            placeholder="Percentage %" 
            required
            className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:outline-none"
          />
          <button type="submit" className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 flex items-center gap-2">
            <Plus size={18} /> Add Tax
          </button>
        </form>
        
        <div className="space-y-2">
          {taxes.map(tax => (
            <div key={tax.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              {editingTaxId === tax.id ? (
                <div className="flex items-center gap-2 flex-1 mr-4">
                  <input 
                    type="text" 
                    value={editTaxName}
                    onChange={e => setEditTaxName(e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input 
                    type="number" 
                    step="0.01"
                    value={editTaxPercentage}
                    onChange={e => setEditTaxPercentage(e.target.value)}
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              ) : (
                <div>
                  <span className="font-medium text-gray-800 mr-3">{tax.name}</span>
                  <span className="text-gray-500 text-sm">{tax.percentage}%</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                {editingTaxId === tax.id ? (
                  <>
                    <button onClick={() => handleSaveEditTax(tax.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Save">
                      <Check size={18} />
                    </button>
                    <button onClick={() => setEditingTaxId(null)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors" title="Cancel">
                      <X size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleEditTaxClick(tax)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => setItemToDelete({ type: 'tax', id: tax.id, name: tax.name })} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Delete">
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {taxes.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">No taxes configured.</p>
          )}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Payment Methods</h2>
        <form onSubmit={handleAddPaymentMethod} className="flex gap-4 mb-6">
          <input 
            type="text" 
            value={newPaymentMethod}
            onChange={e => setNewPaymentMethod(e.target.value)}
            placeholder="e.g. Visa, Cash, PayPal" 
            required
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:outline-none"
          />
          <button type="submit" className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 flex items-center gap-2">
            <Plus size={18} /> Add Method
          </button>
        </form>
        
        <div className="space-y-2">
          {paymentMethods.map(method => (
            <div key={method.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              {editingPaymentMethodId === method.id ? (
                <div className="flex items-center gap-2 flex-1 mr-4">
                  <input 
                    type="text" 
                    value={editPaymentMethodName}
                    onChange={e => setEditPaymentMethodName(e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              ) : (
                <span className="font-medium text-gray-800">{method.name}</span>
              )}
              <div className="flex items-center gap-1">
                {editingPaymentMethodId === method.id ? (
                  <>
                    <button onClick={() => handleSaveEditPaymentMethod(method.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Save">
                      <Check size={18} />
                    </button>
                    <button onClick={() => setEditingPaymentMethodId(null)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors" title="Cancel">
                      <X size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleEditPaymentMethodClick(method)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => setItemToDelete({ type: 'paymentMethod', id: method.id, name: method.name })} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Delete">
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {paymentMethods.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">No payment methods configured.</p>
          )}
        </div>
      </div>

      {/* Discount Codes */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Discount Codes</h2>
        <form onSubmit={handleAddDiscountCode} className="flex flex-col gap-4 mb-6">
          <div className="flex gap-4">
            <input 
              type="text" 
              value={newDiscountCode}
              onChange={e => setNewDiscountCode(e.target.value)}
              placeholder="Code (e.g. SUMMER20)" 
              required
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:outline-none"
            />
            <select
              value={newDiscountType}
              onChange={e => setNewDiscountType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:outline-none bg-white"
            >
              <option value="percent">Percentage (%)</option>
              <option value="fixed">Fixed Amount ($)</option>
            </select>
            <input 
              type="number" 
              step="0.01"
              value={newDiscountValue}
              onChange={e => setNewDiscountValue(e.target.value)}
              placeholder="Value" 
              required
              className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:outline-none"
            />
          </div>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Minimum Spending (Optional)</label>
              <input 
                type="number" 
                step="0.01"
                value={newDiscountMinSpending}
                onChange={e => setNewDiscountMinSpending(e.target.value)}
                placeholder="Min Spending" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:outline-none"
              />
            </div>
            <button type="submit" className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 flex items-center gap-2 h-[42px]">
              <Plus size={18} /> Add Code
            </button>
          </div>
        </form>
        
        <div className="space-y-2">
          {discountCodes.map(code => (
            <div key={code.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              {editingDiscountCodeId === code.id ? (
                <div className="flex items-center gap-2 flex-1 mr-4">
                  <input 
                    type="text" 
                    value={editDiscountCode}
                    onChange={e => setEditDiscountCode(e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <select
                    value={editDiscountType}
                    onChange={e => setEditDiscountType(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                  >
                    <option value="percent">%</option>
                    <option value="fixed">$</option>
                  </select>
                  <input 
                    type="number" 
                    step="0.01"
                    value={editDiscountValue}
                    onChange={e => setEditDiscountValue(e.target.value)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input 
                    type="number" 
                    step="0.01"
                    value={editDiscountMinSpending}
                    onChange={e => setEditDiscountMinSpending(e.target.value)}
                    placeholder="Min"
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              ) : (
                <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-800">{code.code}</span>
                    <span className="text-emerald-600 font-medium">
                      {code.discount_type === 'percent' ? `${code.discount_value}% OFF` : `$${code.discount_value} OFF`}
                    </span>
                  </div>
                  {code.min_spending > 0 && (
                    <span className="text-xs text-gray-500 mt-0.5">Min spending: ${code.min_spending}</span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1">
                {editingDiscountCodeId === code.id ? (
                  <>
                    <button onClick={() => handleSaveEditDiscountCode(code.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Save">
                      <Check size={18} />
                    </button>
                    <button onClick={() => setEditingDiscountCodeId(null)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors" title="Cancel">
                      <X size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleEditDiscountCodeClick(code)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => setItemToDelete({ type: 'discountCode', id: code.id, name: code.code })} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Delete">
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {discountCodes.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">No discount codes configured.</p>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={itemToDelete !== null}
        title={`Delete ${itemToDelete?.type === 'tax' ? 'Tax' : itemToDelete?.type === 'paymentMethod' ? 'Payment Method' : 'Discount Code'}`}
        message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
        confirmText="Delete"
      />
    </div>
  );
}
