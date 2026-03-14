import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import POS from './components/POS';
import AdminPanel from './components/AdminPanel';
import Inventory from './components/Inventory';
import Invoices from './components/Invoices';
import Settings from './components/Settings';
import Auth from './components/Auth';
import Manual from './components/Manual';
import { LogOut, Menu } from 'lucide-react';

interface Tenant {
  id: number;
  name: string;
  is_super_admin?: boolean;
  tax_percentage?: number;
  logo_url?: string;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  setCurrentTenant: (t: Tenant | null) => void;
}

const TenantContext = createContext<TenantContextType>({ currentTenant: null, setCurrentTenant: () => {} });
export const useTenant = () => useContext(TenantContext);

export default function App() {
  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(() => {
    const saved = localStorage.getItem('currentTenant');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const setCurrentTenant = (tenant: Tenant | null) => {
    setCurrentTenantState(tenant);
    if (tenant) {
      localStorage.setItem('currentTenant', JSON.stringify(tenant));
    } else {
      localStorage.removeItem('currentTenant');
    }
  };

  if (!currentTenant) {
    return (
      <TenantContext.Provider value={{ currentTenant, setCurrentTenant }}>
        <Auth />
      </TenantContext.Provider>
    );
  }

  return (
    <TenantContext.Provider value={{ currentTenant, setCurrentTenant }}>
      <BrowserRouter>
        <div className="h-screen w-full flex bg-gray-50 overflow-hidden font-sans print:h-auto print:overflow-visible print:bg-white">
          <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
          
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto print:overflow-visible print:block">
            {/* Global Header */}
            <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-2 flex justify-between md:justify-end items-center text-sm shrink-0 print:hidden">
              <button 
                className="md:hidden p-2 -ml-2 text-gray-500 hover:text-black"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu size={20} />
              </button>
              <div className="flex items-center">
                <span className="text-gray-500 mr-3">Store: <span className="font-medium text-black">{currentTenant.name}</span></span>
                <button 
                  onClick={() => setCurrentTenant(null)}
                  className="flex items-center gap-1 text-gray-500 hover:text-black transition-colors"
                  title="Sign out"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            </div>

            <Routes>
              <Route path="/" element={<POS />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/manual" element={<Manual />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </TenantContext.Provider>
  );
}
