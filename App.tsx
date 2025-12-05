import React, { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { LoginView } from './src/features/auth/LoginView';
import { RegisterView } from './src/features/auth/RegisterView';
import { DashboardView } from './src/features/dashboard/DashboardView';
import { NewDealWizard } from './src/features/deals/NewDealWizard';
import { DealDetailsView } from './src/features/deals/DealDetailsView';
import { useAuth } from './src/hooks/useAuth';

import logoSrc from './public/images/docsales-logo.png';
const FALLBACK_LOGO = "https://web.docsales.com/assets/docsales-logo-86a4aa303d00a400bb6be00dd5c55a06ee69e33609b4cf1cb562856df74baaa0.png";

export default function App() {
  const { isAuthenticated, user, logout } = useAuth();
  const [view, setView] = useState<'dashboard' | 'new-deal' | 'deal-details'>('dashboard');
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  // Reset view to dashboard when user authenticates
  useEffect(() => {
    if (isAuthenticated) {
        setView('dashboard');
    }
  }, [isAuthenticated]);

  const handleDealClick = (dealId: string) => {
      setSelectedDealId(dealId);
      setView('deal-details');
  };

  const handleBackToDashboard = () => {
      setSelectedDealId(null);
      setView('dashboard');
  };

  // Auth Flow
  if (!isAuthenticated) {
      if (authView === 'register') {
          return <RegisterView onNavigateToLogin={() => setAuthView('login')} />;
      }
      return <LoginView onNavigateToRegister={() => setAuthView('register')} />;
  }
  
  // Authenticated Flow
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Persistent Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 h-16 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
           <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('dashboard')}>
               <img 
                 src={logoSrc} 
                 alt="DocSales Logo" 
                 className="h-10 object-contain"
                 onError={(e) => {
                    e.currentTarget.onerror = null; // Prevent infinite loop
                    e.currentTarget.src = FALLBACK_LOGO;
                 }}
               />
           </div>
           <div className="flex items-center gap-4">
               <div className="hidden md:flex flex-col text-right">
                   <span className="text-sm font-semibold text-slate-700">{user?.name}</span>
                   <span className="text-xs text-slate-500">Imobiliária Premium</span>
               </div>
               <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-lg font-bold text-primary border border-slate-200">
                   {user?.name?.charAt(0) || 'U'}
               </div>
               <button onClick={logout} className="text-slate-400 hover:text-slate-600 ml-2">
                   <LogOut className="w-5 h-5" />
               </button>
           </div>
        </div>
      </nav>

      {/* Main Content Router */}
      <main className="min-h-[calc(100vh-64px)]">
          {view === 'dashboard' && <DashboardView onNewDeal={() => setView('new-deal')} onDealClick={handleDealClick} />}
          {view === 'new-deal' && (
            <NewDealWizard 
                onCancel={() => setView('dashboard')} 
                onFinish={() => setView('dashboard')} 
            />
          )}
          {view === 'deal-details' && selectedDealId && (
              <DealDetailsView dealId={selectedDealId} onBack={handleBackToDashboard} />
          )}
      </main>
    </div>
  );
}