import React from 'react';
import { LayoutGrid, ShoppingCart, CreditCard, Truck, Database, HelpCircle, Settings, LogOut, Users, X, Calculator, Tag } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTenant } from '../App';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { currentTenant, setCurrentTenant } = useTenant();
  
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-20 bg-white border-r border-gray-200 flex flex-col items-center py-6 h-full shrink-0 print:hidden
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Mobile Close Button */}
        {isOpen && (
          <button 
            className="md:hidden absolute -right-9 top-6 p-2 text-white bg-black/50 hover:bg-black/70 rounded-r-lg transition-colors"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        )}
        
        <div className="w-12 h-12 mb-8 cursor-pointer relative overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center">
          <Calculator size={32} className="text-black" />
        </div>
        
        <nav className="flex-1 flex flex-col gap-6 w-full items-center">
          <NavItem to="/" icon={<ShoppingCart size={22} />} active={location.pathname === '/'} onClick={onClose} />
          <NavItem to="/inventory" icon={<Database size={22} />} active={location.pathname === '/inventory'} onClick={onClose} />
          <NavItem to="/categories" icon={<Tag size={22} />} active={location.pathname === '/categories'} onClick={onClose} />
          <NavItem to="/invoices" icon={<CreditCard size={22} />} active={location.pathname === '/invoices'} onClick={onClose} />
          {currentTenant?.is_super_admin && (
            <NavItem to="/admin" icon={<Users size={22} />} active={location.pathname === '/admin'} onClick={onClose} />
          )}
        </nav>

        <div className="flex flex-col gap-6 w-full items-center mt-auto">
          <NavItem to="/manual" icon={<HelpCircle size={22} />} active={location.pathname === '/manual'} onClick={onClose} />
          <NavItem to="/settings" icon={<Settings size={22} />} active={location.pathname === '/settings'} onClick={onClose} />
          <button 
            onClick={() => setCurrentTenant(null)}
            className="p-3 rounded-xl transition-colors text-red-500 hover:bg-red-50"
            title="Sign Out"
          >
            <LogOut size={22} />
          </button>
        </div>
      </aside>
    </>
  );
}

function NavItem({ to, icon, active, onClick }: { to: string; icon: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={`p-3 rounded-xl transition-colors ${active ? 'bg-gray-100 text-black' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}
    >
      {icon}
    </Link>
  );
}
