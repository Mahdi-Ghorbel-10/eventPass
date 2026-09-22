import React from 'react';
import { 
  LayoutDashboard, ShoppingBag, QrCode, Server, Sparkles, 
  RotateCcw, Copy, Check, DollarSign, CloudLightning 
} from 'lucide-react';
import { EventData } from '../types';

export type AppMode = 'organizer' | 'buyer' | 'seller' | 'gate' | 'functions' | 'architecture';

interface HeaderNavProps {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  activeEvent: EventData;
  totalTicketsSold: number;
  totalCheckedIn: number;
  totalRevenueTnd: number;
  onResetData: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentMode,
  onSelectMode,
  activeEvent,
  totalTicketsSold,
  totalCheckedIn,
  totalRevenueTnd,
  onResetData,
}) => {
  const [copiedPin, setCopiedPin] = React.useState(false);

  const handleCopyPin = () => {
    navigator.clipboard.writeText(activeEvent.pinCode);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const navItems = [
    {
      id: 'organizer' as AppMode,
      label: 'Organizer Studio',
      icon: LayoutDashboard,
      badge: 'Admin',
    },
    {
      id: 'buyer' as AppMode,
      label: 'Buyer Checkout',
      icon: ShoppingBag,
      badge: 'Public',
    },
    {
      id: 'seller' as AppMode,
      label: 'Cash POS Seller',
      icon: DollarSign,
      badge: 'Ambassador',
    },
    {
      id: 'gate' as AppMode,
      label: 'Gate Scanner',
      icon: QrCode,
      badge: 'Security',
    },
    {
      id: 'functions' as AppMode,
      label: 'Cloud Run Functions',
      icon: CloudLightning,
      badge: 'API Engine',
    },
    {
      id: 'architecture' as AppMode,
      label: 'GCP & Cloud SQL',
      icon: Server,
      badge: 'Docs',
    },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-white text-lg font-mono">
                  EventPass<span className="text-emerald-400">.tn</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  GCP Cloud Run
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Tunisian Ticketing • ClicToPay • Cloud Run Functions
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <nav className="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800/80 overflow-x-auto max-w-full">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentMode === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => onSelectMode(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline">{item.label}</span>
                  <span className="md:hidden">
                    {item.id === 'organizer' && 'Studio'}
                    {item.id === 'buyer' && 'Checkout'}
                    {item.id === 'seller' && 'Seller'}
                    {item.id === 'gate' && 'Gate'}
                    {item.id === 'functions' && 'Functions'}
                    {item.id === 'architecture' && 'Docs'}
                  </span>
                  <span
                    className={`hidden xl:inline-block px-1.5 py-0.2 rounded text-[10px] uppercase tracking-wider font-semibold ${
                      isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Quick Info & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* PIN pill */}
            <button
              onClick={handleCopyPin}
              title="Click to copy 6-digit Gate PIN"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 rounded-lg border border-slate-700 hover:border-emerald-500/50 transition-colors text-xs text-slate-300"
            >
              <span className="text-slate-500 font-mono">PIN:</span>
              <span className="font-mono font-bold text-emerald-400 tracking-wider">
                {activeEvent.pinCode.slice(0, 3)}-{activeEvent.pinCode.slice(3)}
              </span>
              {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {/* Reset data */}
            <button
              onClick={onResetData}
              title="Reset simulation to initial state"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-bar with Live Event State Stats */}
        <div className="py-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400 gap-4 overflow-x-auto">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="font-medium text-slate-300 truncate">
              {activeEvent.title}
            </span>
            <span className="text-slate-500 hidden sm:inline">•</span>
            <span className="text-slate-400 hidden sm:inline">{activeEvent.venue}</span>
          </div>

          <div className="flex items-center gap-4 shrink-0 font-mono">
            <div>
              <span className="text-slate-500">Gross: </span>
              <span className="font-bold text-emerald-400">{totalRevenueTnd.toLocaleString()} TND</span>
            </div>
            <div>
              <span className="text-slate-500">Sold: </span>
              <span className="font-bold text-slate-200">{totalTicketsSold}</span>
            </div>
            <div>
              <span className="text-slate-500">Gate Check-in: </span>
              <span className="font-bold text-cyan-400">
                {totalCheckedIn}/{totalTicketsSold} ({totalTicketsSold > 0 ? Math.round((totalCheckedIn / totalTicketsSold) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
