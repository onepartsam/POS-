import { useState, useEffect } from 'react';
import { useTenant } from '../App';
import { Eye, Printer, X, Mail } from 'lucide-react';

const formatInvoiceDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Singapore',
  };
  const formatter = new Intl.DateTimeFormat('en-GB', options);
  const parts = formatter.formatToParts(date);
  
  const day = parts.find(p => p.type === 'day')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const year = parts.find(p => p.type === 'year')?.value;
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;
  const dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value.toUpperCase();
  
  return `${day} ${month} ${year}, ${hour}:${minute}${dayPeriod} (GMT+8)`;
};

export default function Invoices() {
  const { currentTenant } = useTenant();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  useEffect(() => {
    if (currentTenant) {
      fetchInvoices();
    }
  }, [currentTenant]);

  const fetchInvoices = () => {
    fetch(`/api/invoices?tenantId=${currentTenant?.id}`)
      .then(res => res.json())
      .then(setInvoices);
  };

  const handleViewInvoice = async (id: number) => {
    try {
      const res = await fetch(`/api/invoices/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedInvoice(data);
      }
    } catch (err) {
      console.error('Failed to fetch invoice details', err);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setInvoices(invoices.map(inv => inv.id === id ? { ...inv, status: newStatus } : inv));
        if (selectedInvoice?.id === id) {
          setSelectedInvoice({ ...selectedInvoice, status: newStatus });
        }
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = async () => {
    const email = window.prompt('Enter email address to send invoice:');
    if (!email) return;

    try {
      const res = await fetch(`/api/invoices/${selectedInvoice.id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        alert('Invoice sent successfully!');
      } else {
        alert('Failed to send invoice.');
      }
    } catch (err) {
      console.error('Failed to send email', err);
      alert('Failed to send email.');
    }
  };

  if (!currentTenant) return <div className="p-8">Please select a tenant first.</div>;

  return (
    <div className="p-8 w-full">
      <h1 className="text-2xl font-bold mb-6 print:hidden">Invoices</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto print:hidden">
        <table className="w-full text-left min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Invoice ID</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Date</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Status</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500">Total</th>
              <th className="px-6 py-3 text-sm font-medium text-gray-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoices.map(invoice => (
              <tr key={invoice.id}>
                <td 
                  className="px-6 py-4 text-sm font-medium text-blue-600 cursor-pointer hover:underline"
                  onClick={() => handleViewInvoice(invoice.id)}
                >
                  #{invoice.id.toString().padStart(5, '0')}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{formatInvoiceDate(invoice.created_at)}</td>
                <td className="px-6 py-4 text-sm">
                  <select 
                    value={invoice.status || 'Completed'} 
                    onChange={(e) => handleStatusChange(invoice.id, e.target.value)}
                    className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer focus:ring-2 focus:ring-black/5 ${
                      invoice.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      invoice.status === 'Void' ? 'bg-red-100 text-red-800' :
                      'bg-green-100 text-green-800'
                    }`}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                    <option value="Void">Void</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">${invoice.total.toFixed(2)}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleViewInvoice(invoice.id)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-block"
                    title="View Invoice"
                  >
                    <Eye size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No invoices found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:static print:bg-white print:block">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto print:shadow-none print:max-w-none print:mx-0 print:p-0 print:max-h-none print:overflow-visible">
            <div className="flex justify-between items-start mb-6 print:hidden">
              <h2 className="text-2xl font-bold">Invoice #{selectedInvoice.id.toString().padStart(5, '0')}</h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePrint}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Printer size={20} />
                  <span className="text-sm font-medium">Print</span>
                </button>
                <button 
                  onClick={handleEmail}
                  disabled={!currentTenant.smtp_host || !currentTenant.smtp_user || !currentTenant.smtp_pass}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  title={(!currentTenant.smtp_host || !currentTenant.smtp_user || !currentTenant.smtp_pass) ? "Configure SMTP in Settings to send emails" : "Email Invoice"}
                >
                  <Mail size={20} />
                  <span className="text-sm font-medium">Email</span>
                </button>
                <button 
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div className="print:block">
              <div className="hidden print:block mb-8">
                <h1 className="text-3xl font-bold">{currentTenant.name}</h1>
                {currentTenant.address && <p className="text-gray-600 mt-2 whitespace-pre-wrap">{currentTenant.address}</p>}
                {currentTenant.contact_number && <p className="text-gray-600 mt-1">Contact: {currentTenant.contact_number}</p>}
                {currentTenant.registration_number && <p className="text-gray-600 mt-1">Registration No: {currentTenant.registration_number}</p>}
                <h2 className="text-xl text-gray-500 mt-6">Invoice #{selectedInvoice.id.toString().padStart(5, '0')}</h2>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Date</h3>
                  <p className="text-gray-900">{formatInvoiceDate(selectedInvoice.created_at)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                  <p className={`font-medium ${
                    selectedInvoice.status === 'Pending' ? 'text-yellow-600' :
                    selectedInvoice.status === 'Void' ? 'text-red-600' :
                    'text-green-600'
                  }`}>
                    {selectedInvoice.status || 'Completed'}
                  </p>
                </div>
              </div>

              <table className="w-full text-left mb-8">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="py-3 text-sm font-medium text-gray-500">Item</th>
                    <th className="py-3 text-sm font-medium text-gray-500 text-center">Qty</th>
                    <th className="py-3 text-sm font-medium text-gray-500 text-right">Price</th>
                    <th className="py-3 text-sm font-medium text-gray-500 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedInvoice.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-4">
                        <div className="font-medium text-gray-900">{item.product_name}</div>
                        {item.variations && (
                          <div className="text-xs text-gray-500 mt-1">
                            {Object.entries(JSON.parse(item.variations)).map(([k, v]) => `${k}: ${v}`).join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="py-4 text-center text-gray-900">{item.quantity}</td>
                      <td className="py-4 text-right text-gray-900">${item.price.toFixed(2)}</td>
                      <td className="py-4 text-right font-medium text-gray-900">${(item.quantity * item.price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end print:justify-start">
                <div className="w-64 print:w-full">
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="text-gray-900">${(selectedInvoice.total - selectedInvoice.tax + selectedInvoice.discount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="text-gray-900">-${selectedInvoice.discount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-gray-500">Tax</span>
                    <span className="text-gray-900">${selectedInvoice.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-3 border-t border-gray-200 mt-2">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="font-bold text-gray-900">${selectedInvoice.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
                <p>Powered by POS+</p>
                <p>Find out more at www.pos-plus.com</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
