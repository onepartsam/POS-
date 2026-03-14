import { useState, useEffect } from 'react';
import { Minus, Plus, CheckCircle2, ChevronDown, ShoppingCart, HelpCircle, CreditCard, XCircle } from 'lucide-react';
import { CartItem } from '../types';
import { useTenant } from '../App';
import ConfirmModal from './ConfirmModal';

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onClear: () => void;
  onCheckout?: (discount: number, tax: number, total: number) => void;
}

export default function Cart({ items, onUpdateQuantity, onClear, onCheckout }: CartProps) {
  const { currentTenant } = useTenant();
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [discountCodes, setDiscountCodes] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{code: string, type: string, value: number, minSpending: number} | null>(null);
  const [discountError, setDiscountError] = useState('');
  const [isCheckoutConfirmOpen, setIsCheckoutConfirmOpen] = useState(false);

  useEffect(() => {
    if (currentTenant) {
      fetch(`/api/payment-methods?tenantId=${currentTenant.id}`)
        .then(res => res.json())
        .then(data => {
          setPaymentMethods(data);
          if (data.length > 0) setSelectedPaymentMethod(data[0].id.toString());
        });
      
      fetch(`/api/discount-codes?tenantId=${currentTenant.id}`)
        .then(res => res.json())
        .then(data => setDiscountCodes(data));

      fetch(`/api/taxes?tenantId=${currentTenant.id}`)
        .then(res => res.json())
        .then(data => setTaxes(data));
    }
  }, [currentTenant]);

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleApplyDiscount = () => {
    setDiscountError('');
    if (!discountCodeInput.trim()) {
      setAppliedDiscount(null);
      return;
    }
    
    const code = discountCodes.find(c => c.code.toLowerCase() === discountCodeInput.trim().toLowerCase());
    if (code) {
      if (code.min_spending > 0 && subtotal < code.min_spending) {
        setDiscountError(`Minimum spending of $${code.min_spending} required`);
        setAppliedDiscount(null);
      } else {
        setAppliedDiscount({ 
          code: code.code, 
          type: code.discount_type, 
          value: code.discount_value,
          minSpending: code.min_spending
        });
      }
    } else {
      setDiscountError('Invalid discount code');
      setAppliedDiscount(null);
    }
  };

  const handleCheckoutClick = () => {
    if (items.length === 0) return;
    setIsCheckoutConfirmOpen(true);
  };

  const confirmCheckout = () => {
    setIsCheckoutConfirmOpen(false);
    onCheckout?.(discount, totalTax, total);
  };

  let discount = 0;
  if (appliedDiscount) {
    if (appliedDiscount.type === 'percent') {
      discount = subtotal * (appliedDiscount.value / 100);
    } else {
      discount = Math.min(subtotal, appliedDiscount.value);
    }
  }

  const taxableAmount = Math.max(0, subtotal - discount);
  const totalTax = taxes.reduce((sum, tax) => sum + (taxableAmount * (tax.percentage / 100)), 0);
  const total = taxableAmount + totalTax;

  return (
    <div className="w-full lg:w-96 bg-white border-l border-gray-200 flex flex-col h-full shrink-0">
      <div className="p-6 border-b border-gray-100 shrink-0">
        <h2 className="text-xl font-semibold text-gray-900">Cart Details</h2>
        <p className="text-sm text-gray-500 mt-1">Details of all transactions</p>
      </div>

      <div className="px-6 py-4 flex justify-between items-center shrink-0">
        <span className="font-medium text-gray-900">{items.length} Items Selected</span>
        <button onClick={onClear} className="text-sm text-red-500 hover:text-red-600 font-medium">Delete All</button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
            <ShoppingCart size={48} className="opacity-20" />
            <p>Your cart is empty</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.cartItemId} className="flex gap-4 p-3 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="w-16 h-20 rounded-xl overflow-hidden bg-white shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover mix-blend-multiply" />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] text-gray-500 mb-0.5">{item.category}</div>
                  <h4 className="text-sm font-medium text-gray-900 line-clamp-1">{item.name}</h4>
                  <div className="flex flex-wrap gap-3 mt-1">
                    {item.selectedVariations && Object.entries(item.selectedVariations).map(([key, value]) => {
                      const isColor = value.startsWith('#') && (value.length === 4 || value.length === 7);
                      return (
                        <div key={key} className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400">{key}</span>
                          {isColor ? (
                            <div className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: value }} title={value} />
                          ) : (
                            <span className="text-[11px] font-medium text-gray-700">{value}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-2 py-1">
                    <button onClick={() => onUpdateQuantity(item.cartItemId, -1)} className="text-gray-500 hover:text-black">
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                    <button onClick={() => onUpdateQuantity(item.cartItemId, 1)} className="text-gray-500 hover:text-black">
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="font-semibold text-gray-900">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-6 bg-white border-t border-gray-100 shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] z-10">
        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-1.5 block">Payment Method</label>
          <div className="relative">
            <select 
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="w-full appearance-none px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-black/5"
            >
              {paymentMethods.length === 0 && <option value="">No payment methods available</option>}
              {paymentMethods.map(method => (
                <option key={method.id} value={method.id}>{method.name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="mb-6">
          <label className="text-xs text-gray-500 mb-1.5 block">Discount Code</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={discountCodeInput}
                onChange={(e) => {
                  setDiscountCodeInput(e.target.value);
                  setAppliedDiscount(null);
                  setDiscountError('');
                }}
                placeholder="Enter code"
                className={`w-full px-4 py-2.5 bg-gray-50 border ${discountError ? 'border-red-300' : 'border-gray-200'} rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-black/5`}
              />
              {appliedDiscount && <CheckCircle2 size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />}
              {discountError && <XCircle size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" />}
            </div>
            <button 
              onClick={handleApplyDiscount}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-xl transition-colors"
            >
              Apply
            </button>
          </div>
          {discountError && <p className="text-xs text-red-500 mt-1">{discountError}</p>}
          {appliedDiscount && (
            <p className="text-xs text-emerald-600 mt-1">
              {appliedDiscount.type === 'percent' ? `${appliedDiscount.value}%` : `$${appliedDiscount.value}`} discount applied!
            </p>
          )}
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 flex items-center gap-1">Total Product Price <HelpCircle size={12} className="opacity-50" /></span>
            <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 flex items-center gap-1">Discount <HelpCircle size={12} className="opacity-50" /></span>
            <span className="font-medium text-emerald-600">-${discount.toFixed(2)}</span>
          </div>
          {taxes.map(tax => (
            <div key={tax.id} className="flex justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-1">{tax.name} ({tax.percentage}%) <HelpCircle size={12} className="opacity-50" /></span>
              <span className="font-medium text-gray-900">${(taxableAmount * (tax.percentage / 100)).toFixed(2)}</span>
            </div>
          ))}
          <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
            <span className="font-semibold text-gray-900 flex items-center gap-1">Grand Total <HelpCircle size={14} className="opacity-50" /></span>
            <span className="text-xl font-bold text-gray-900">${total.toFixed(2)}</span>
          </div>
        </div>

        <button 
          onClick={handleCheckoutClick} 
          disabled={items.length === 0 || paymentMethods.length === 0}
          className="w-full bg-black text-white py-3.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
        >
          <CreditCard size={18} />
          Proceed to Payment
        </button>
      </div>

      <ConfirmModal
        isOpen={isCheckoutConfirmOpen}
        title="Confirm Checkout"
        message={`Are you sure you want to proceed to payment for $${total.toFixed(2)}?`}
        onConfirm={confirmCheckout}
        onCancel={() => setIsCheckoutConfirmOpen(false)}
        confirmText="Proceed"
        confirmColor="bg-black hover:bg-gray-800"
      />
    </div>
  );
}
