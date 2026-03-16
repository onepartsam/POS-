import React from 'react';
import { ShoppingCart, Database, CreditCard, Users, Settings, HelpCircle } from 'lucide-react';

export default function Manual() {
  return (
    <div className="p-4 md:p-8 w-full space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Instruction Manual</h1>
        <p className="text-gray-600">Welcome to your Point of Sale system. This guide will help you understand how to use the various features available to you.</p>
      </div>

      <div className="space-y-6">
        {/* POS Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ShoppingCart size={24} />
            </div>
            <h2 className="text-xl font-semibold">Point of Sale (POS)</h2>
          </div>
          <div className="space-y-3 text-gray-600">
            <p>The POS screen is where you process customer transactions.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Adding Items:</strong> Click on any product in the grid to add it to the cart. You can also use the search bar to find specific items.</li>
              <li><strong>Adjusting Quantities:</strong> In the cart, use the + and - buttons to change quantities, or click the trash icon to remove an item.</li>
              <li><strong>Applying Discounts:</strong> Enter a valid discount code in the "Discount Code" field and click Apply.</li>
              <li><strong>Checkout:</strong> Once all items are added, click "Checkout" to process the payment. You can select the payment method and complete the sale.</li>
            </ul>
          </div>
        </section>

        {/* Inventory Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <Database size={24} />
            </div>
            <h2 className="text-xl font-semibold">Inventory Management</h2>
          </div>
          <div className="space-y-3 text-gray-600">
            <p>Manage your products, stock levels, and pricing.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Adding Products:</strong> Click "Add Product" to create a new item. You'll need to provide a name, price, stock quantity, and optional image URL.</li>
              <li><strong>Editing Products:</strong> Click the edit (pencil) icon next to any product to update its details.</li>
              <li><strong>Stock Tracking:</strong> The system automatically deducts stock when items are sold through the POS. Low stock items will be highlighted.</li>
            </ul>
          </div>
        </section>

        {/* Invoices Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <CreditCard size={24} />
            </div>
            <h2 className="text-xl font-semibold">Invoices & History</h2>
          </div>
          <div className="space-y-3 text-gray-600">
            <p>View and manage past transactions.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Viewing History:</strong> All completed sales appear here chronologically.</li>
              <li><strong>Invoice Details:</strong> Click the eye icon or the Invoice ID to view the full receipt details.</li>
              <li><strong>Printing:</strong> From the invoice details view, click the "Print" button to generate a physical receipt or save as PDF.</li>
            </ul>
          </div>
        </section>

        {/* Settings Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <Settings size={24} />
            </div>
            <h2 className="text-xl font-semibold">Settings</h2>
          </div>
          <div className="space-y-3 text-gray-600">
            <p>Configure your store preferences and account details.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Account Settings:</strong> Update your login credentials, email, and contact information.</li>
              <li><strong>Store Information:</strong> Set your store's address and registration number (these appear on printed invoices).</li>
              <li><strong>Taxes:</strong> Configure tax rates that apply to your sales.</li>
              <li><strong>Payment Methods:</strong> Add or remove accepted payment methods (e.g., Cash, Credit Card).</li>
              <li><strong>Discount Codes:</strong> Create promotional codes with percentage or fixed amount discounts.</li>
            </ul>
          </div>
        </section>

        {/* Admin Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <Users size={24} />
            </div>
            <h2 className="text-xl font-semibold">Admin Panel (Super Admin Only)</h2>
          </div>
          <div className="space-y-3 text-gray-600">
            <p>Manage multiple stores and tenants.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Tenant Management:</strong> Create new store accounts, reset passwords, and manage access levels.</li>
              <li><strong>Global Oversight:</strong> Super admins can view and manage all tenants within the system.</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
