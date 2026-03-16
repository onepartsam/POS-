import React, { useState, useEffect } from 'react';
import { useTenant } from '../App';
import { Trash2, Edit2, X, Check } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export default function AdminPanel() {
  const { currentTenant } = useTenant();
  const [tenants, setTenants] = useState<any[]>([]);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantUsername, setNewTenantUsername] = useState('');
  const [newTenantEmail, setNewTenantEmail] = useState('');
  const [newTenantContact, setNewTenantContact] = useState('');
  const [newTenantPassword, setNewTenantPassword] = useState('');
  const [newTenantRole, setNewTenantRole] = useState<'Free' | 'Premium' | 'Admin'>('Free');
  const isAdmin = currentTenant?.role?.toLowerCase() === 'admin' || (currentTenant as any)?.is_super_admin;

  const [editingTenantId, setEditingTenantId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [tenantToDelete, setTenantToDelete] = useState<{ id: number, name: string } | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetch(`/api/tenants?tenantId=${currentTenant?.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setTenants(data);
        });
    }
  }, [currentTenant, isAdmin]);

  if (!isAdmin) {
    return (
      <div className="p-8 w-full">
        <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100">
          <h2 className="text-lg font-bold">Access Denied</h2>
          <p>You do not have Super Admin rights to view this page.</p>
        </div>
      </div>
    );
  }

  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName || !newTenantUsername || !newTenantPassword) return;
    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: newTenantName, 
        username: newTenantUsername,
        email: newTenantEmail,
        contact_number: newTenantContact,
        password: newTenantPassword, 
        role: newTenantRole 
      })
    });
    const data = await res.json();
    if (res.ok) {
      setTenants([...tenants, { 
        id: data.id, 
        name: newTenantName, 
        username: newTenantUsername,
        email: newTenantEmail,
        contact_number: newTenantContact,
        created_at: new Date().toISOString(), 
        role: data.role 
      }]);
      setNewTenantName('');
      setNewTenantUsername('');
      setNewTenantEmail('');
      setNewTenantContact('');
      setNewTenantPassword('');
      setNewTenantRole('Free');
    } else {
      alert(data.error || 'Failed to add tenant');
    }
  };

  const handleEditClick = (tenant: any) => {
    setEditingTenantId(tenant.id);
    setEditFormData({
      name: tenant.name,
      username: tenant.username,
      email: tenant.email,
      contact_number: tenant.contact_number,
      password: '', // Leave blank unless changing
      role: tenant.role
    });
  };

  const handleSaveEdit = async (id: number) => {
    const res = await fetch(`/api/tenants/${id}?tenantId=${currentTenant?.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editFormData)
    });
    
    if (res.ok) {
      setTenants(tenants.map(t => t.id === id ? { ...t, ...editFormData } : t));
      setEditingTenantId(null);
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to update tenant');
    }
  };

  const handleDeleteTenant = async (id: number) => {
    const res = await fetch(`/api/tenants/${id}?tenantId=${currentTenant.id}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      setTenants(tenants.filter(t => t.id !== id));
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete tenant');
    }
  };

  const confirmDelete = async () => {
    if (!tenantToDelete) return;
    await handleDeleteTenant(tenantToDelete.id);
    setTenantToDelete(null);
  };

  return (
    <div className="p-8 w-full">
      <h1 className="text-2xl font-bold mb-6">Admin Panel - Manage Tenants</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
        <h2 className="text-lg font-semibold mb-4">Add New Tenant</h2>
        <form onSubmit={handleAddTenant} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input 
              type="text" 
              value={newTenantName}
              onChange={e => setNewTenantName(e.target.value)}
              placeholder="Store Name" 
              required
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:outline-none"
            />
            <input 
              type="text" 
              value={newTenantUsername}
              onChange={e => setNewTenantUsername(e.target.value)}
              placeholder="Username" 
              required
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:outline-none"
            />
            <input 
              type="email" 
              value={newTenantEmail}
              onChange={e => setNewTenantEmail(e.target.value)}
              placeholder="Email" 
              required
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:outline-none"
            />
            <input 
              type="tel" 
              value={newTenantContact}
              onChange={e => setNewTenantContact(e.target.value)}
              placeholder="Contact Number" 
              required
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:outline-none"
            />
            <input 
              type="password" 
              value={newTenantPassword}
              onChange={e => setNewTenantPassword(e.target.value)}
              placeholder="Password" 
              required
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:outline-none"
            />
            <div className="flex items-center gap-4">
              <select 
                value={newTenantRole}
                onChange={e => setNewTenantRole(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black/5 focus:outline-none bg-white text-sm"
              >
                <option value="Free">Free</option>
                <option value="Premium">Premium</option>
                <option value="Admin">Admin</option>
              </select>
              <button type="submit" className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 ml-auto">
                Add Tenant
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-left min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">ID</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Name</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Username</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Contact</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Role</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Created At</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tenants.map(tenant => (
              <tr key={tenant.id}>
                <td className="px-6 py-4 text-sm text-gray-900">{tenant.id}</td>
                {editingTenantId === tenant.id ? (
                  <td colSpan={4} className="px-6 py-4">
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="text" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} 
                        className="px-2 py-1 border rounded text-sm" placeholder="Name"
                      />
                      <input 
                        type="text" value={editFormData.username} onChange={e => setEditFormData({...editFormData, username: e.target.value})} 
                        className="px-2 py-1 border rounded text-sm" placeholder="Username"
                      />
                      <input 
                        type="email" value={editFormData.email} onChange={e => setEditFormData({...editFormData, email: e.target.value})} 
                        className="px-2 py-1 border rounded text-sm" placeholder="Email"
                      />
                      <input 
                        type="tel" value={editFormData.contact_number} onChange={e => setEditFormData({...editFormData, contact_number: e.target.value})} 
                        className="px-2 py-1 border rounded text-sm" placeholder="Contact"
                      />
                      <input 
                        type="password" value={editFormData.password} onChange={e => setEditFormData({...editFormData, password: e.target.value})} 
                        className="px-2 py-1 border rounded text-sm" placeholder="New Password (optional)"
                      />
                      <select 
                        value={editFormData.role} 
                        onChange={e => setEditFormData({...editFormData, role: e.target.value})} 
                        className="px-2 py-1 border rounded text-sm bg-white"
                      >
                        <option value="Free">Free</option>
                        <option value="Premium">Premium</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>
                  </td>
                ) : (
                  <>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{tenant.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{tenant.username}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div>{tenant.email}</div>
                      <div>{tenant.contact_number}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {tenant.role === 'Admin' ? (
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">Admin</span>
                      ) : tenant.role === 'Premium' ? (
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-medium">Premium</span>
                      ) : (
                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">Free</span>
                      )}
                    </td>
                  </>
                )}
                <td className="px-6 py-4 text-sm text-gray-500">{new Date(tenant.created_at).toLocaleString()}</td>
                <td className="px-6 py-4 text-right whitespace-nowrap">
                  {editingTenantId === tenant.id ? (
                    <>
                      <button onClick={() => handleSaveEdit(tenant.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors inline-block mr-2" title="Save">
                        <Check size={18} />
                      </button>
                      <button onClick={() => setEditingTenantId(null)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors inline-block" title="Cancel">
                        <X size={18} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEditClick(tenant)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-block mr-2" title="Edit Tenant">
                        <Edit2 size={18} />
                      </button>
                      {tenant.id !== currentTenant?.id && (
                        <button onClick={() => setTenantToDelete({ id: tenant.id, name: tenant.name })} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-block" title="Delete Tenant">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={tenantToDelete !== null}
        title="Delete Tenant"
        message={`Are you sure you want to delete "${tenantToDelete?.name}" and all their data? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setTenantToDelete(null)}
        confirmText="Delete Tenant"
      />
    </div>
  );
}
