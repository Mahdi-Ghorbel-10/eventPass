import React, { useState } from 'react';
import { 
  DollarSign, User, Mail, Phone, Ticket as TicketIcon, 
  CheckCircle2, Printer, Share2, ArrowRight, 
  History, ShieldCheck, QrCode, 
  Wallet, FileText, Lock, LogIn, LogOut, KeyRound, AlertCircle 
} from 'lucide-react';
import { EventData, Ticket, DoorCashRecord, SellerProfile } from '../types';
import { generateTicketHash } from '../utils/qrUtils';
import { playCashChime } from '../utils/audioFeedback';
import { TicketPdfModal } from './TicketPdfModal';

interface CashTicketSellerProps {
  event: EventData;
  events?: EventData[];
  onSelectEvent?: (eventId: string) => void;
  sellers: SellerProfile[];
  tickets: Ticket[];
  doorCashRecords: DoorCashRecord[];
  onRecordCashSale: (newTicket: Ticket, cashRecord: DoorCashRecord) => void;
  onNavigateToScan: () => void;
  onBackToStudio?: () => void;
}

export const CashTicketSeller: React.FC<CashTicketSellerProps> = ({
  event,
  sellers,
  tickets,
  onRecordCashSale,
  onNavigateToScan,
}) => {
  // Authentication state for Promoter / Seller POS
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [loginEmail, setLoginEmail] = useState<string>(sellers[0]?.email || 'amine@insat.tn');
  const [loginPin, setLoginPin] = useState<string>(event.pinCode);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Current active seller
  const [selectedSellerId, setSelectedSellerId] = useState<string>(sellers[0]?.id || 'sel-1');
  const [customSellerName, setCustomSellerName] = useState<string>('');
  const [isCustomSeller, setIsCustomSeller] = useState<boolean>(false);
  const activeSeller = sellers.find(s => s.id === selectedSellerId) || sellers[0];
  const effectiveSellerName = isCustomSeller && customSellerName.trim() 
    ? customSellerName.trim() 
    : `${activeSeller.name} (${activeSeller.role})`;

  // Form input state
  const availableTiers = event.tiers.filter(t => t.soldCount < t.capacity);
  const defaultTier = availableTiers[0] || event.tiers[0];
  const [selectedTierId, setSelectedTierId] = useState<string>(defaultTier?.id || '');
  const [ticketQuantity, setTicketQuantity] = useState<number>(1);
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerEmail, setBuyerEmail] = useState<string>('');
  const [buyerPhone, setBuyerPhone] = useState<string>('+216 ');
  const [amountTendered, setAmountTendered] = useState<string>('');

  // Post-sale confirmation state
  const [lastIssuedTicket, setLastIssuedTicket] = useState<Ticket | null>(null);
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);
  const [viewingTicketForPdf, setViewingTicketForPdf] = useState<Ticket | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const selectedTier = event.tiers.find(t => t.id === selectedTierId) || defaultTier;
  const unitPrice = selectedTier?.price || 0;
  const totalPrice = unitPrice * ticketQuantity;
  const tenderedNum = parseFloat(amountTendered) || 0;
  const changeDue = tenderedNum >= totalPrice ? tenderedNum - totalPrice : 0;

  // Filter tickets sold by this seller for this event
  const sellerTickets = tickets.filter(
    t => t.eventId === event.id && (t.soldBySeller === effectiveSellerName || t.paymentMethod === 'seller_cash')
  );
  const sellerCashTotal = sellerTickets.reduce((acc, t) => acc + t.price, 0);

  // Handle Cash Ticket Issuance
  const handleIssueCashTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName.trim() || !buyerEmail.trim() || !selectedTier) {
      alert('Please fill in buyer name, valid email address, and select a ticket tier.');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const nowIso = new Date().toISOString();
      const uniqueSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const ticketId = `TKT-${Date.now().toString().slice(-4)}-${uniqueSuffix}`;
      const hash = generateTicketHash(ticketId, event.pinCode, event.secretKey);

      const newTicket: Ticket = {
        id: ticketId,
        eventId: event.id,
        tierId: selectedTier.id,
        tierName: selectedTier.name,
        buyerName: buyerName.trim(),
        buyerEmail: buyerEmail.trim().toLowerCase(),
        buyerPhone: buyerPhone.trim(),
        price: selectedTier.price,
        currency: 'TND',
        paymentMethod: 'seller_cash',
        qrHash: hash,
        status: 'VALID',
        createdAt: nowIso,
        isDoorCash: true,
        soldBySeller: effectiveSellerName,
        emailSent: true,
        emailSentAt: nowIso,
      };

      const cashRecord: DoorCashRecord = {
        id: `cash-sel-${Date.now()}`,
        eventId: event.id,
        tierId: selectedTier.id,
        tierName: selectedTier.name,
        amount: selectedTier.price,
        staffName: effectiveSellerName,
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim(),
        timestamp: nowIso,
        ticketId: ticketId,
        sellerRole: isCustomSeller ? 'Custom Seller' : activeSeller.role,
      };

      onRecordCashSale(newTicket, cashRecord);
      playCashChime();
      setLastIssuedTicket(newTicket);
      setIsProcessing(false);

      // Reset form fields for next sale
      setBuyerName('');
      setBuyerEmail('');
      setBuyerPhone('+216 ');
      setAmountTendered('');
      setTicketQuantity(1);
    }, 450);
  };

  const handleQuickTender = (val: number) => {
    setAmountTendered(val.toString());
  };

  const handleSellerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (loginPin.trim() !== event.pinCode) {
      setLoginError(`Invalid Event PIN (${loginPin}). Expected the 6-digit PIN for "${event.title}".`);
      return;
    }

    if (!loginEmail.trim()) {
      setLoginError('Please enter your registered promoter email address.');
      return;
    }

    const matchedSeller = sellers.find(
      s => s.email.toLowerCase() === loginEmail.trim().toLowerCase()
    );

    if (matchedSeller) {
      setSelectedSellerId(matchedSeller.id);
      setIsCustomSeller(false);
      setIsAuthenticated(true);
    } else {
      // Allow authenticated PIN entry with custom email profile
      setCustomSellerName(`${loginEmail.trim()}`);
      setIsCustomSeller(true);
      setIsAuthenticated(true);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto py-8 px-4 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white">Promoter & Seller Login</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Authenticate with your registered email and the 6-digit Event PIN to unlock the cash ticket register.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Target Event</span>
              <div className="text-sm font-bold text-white truncate max-w-[220px]">{event.title}</div>
              <div className="text-[11px] text-slate-400">{event.venue} • {event.city}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono block">Event PIN</span>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                {event.pinCode}
              </span>
            </div>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleSellerLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Seller Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="e.g. amine@insat.tn"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                6-Digit Event PIN Code
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="6-digit PIN"
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-amber-400 tracking-widest focus:outline-none focus:border-amber-500 font-mono transition-colors font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>Log In to POS Register</span>
            </button>
          </form>

          {/* Quick-Pick Test Accounts */}
          <div className="border-t border-slate-800/80 pt-4 space-y-2">
            <span className="text-[11px] font-medium text-slate-400 block text-center">
              Or 1-click test with registered promoter profiles:
            </span>
            <div className="space-y-1.5">
              {sellers.slice(0, 3).map((seller) => (
                <button
                  key={seller.id}
                  type="button"
                  onClick={() => {
                    setLoginEmail(seller.email);
                    setLoginPin(event.pinCode);
                    setSelectedSellerId(seller.id);
                    setIsCustomSeller(false);
                    setIsAuthenticated(true);
                  }}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 flex items-center justify-between text-xs transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    <div>
                      <span className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                        {seller.name}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">{seller.email}</span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {seller.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Segmented Navigation: SCAN vs SELL */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Promoter & Cash POS Terminal</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Paperless Cash Mode
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Collect cash, issue electronic tickets, and auto-dispatch PDF by email
            </p>
          </div>
        </div>

        {/* Action Controls: Log Out + SCAN vs SELL */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={() => setIsAuthenticated(false)}
            title="Log Out or Switch Seller Account"
            className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
            <span>Switch Seller</span>
          </button>

          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={onNavigateToScan}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 flex items-center justify-center gap-2 transition-all"
            >
              <QrCode className="w-4 h-4 text-cyan-400" />
              <span>Scan Tickets</span>
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <DollarSign className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>Sell Cash Tickets</span>
            </button>
          </div>
        </div>
      </div>

      {/* Seller Identity & Shift Drawer Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Seller Profile Selector */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <User className="w-3.5 h-3.5 text-emerald-400" /> Authorized Seller Profile
            </span>
            <span className="text-[11px] text-emerald-400 font-mono">PIN: {event.pinCode}</span>
          </div>

          {!isCustomSeller ? (
            <div className="space-y-2">
              <select
                value={selectedSellerId}
                onChange={(e) => setSelectedSellerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
              >
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} • {s.role}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Location: {activeSeller.location}</span>
                <button
                  type="button"
                  onClick={() => setIsCustomSeller(true)}
                  className="text-emerald-400 hover:underline"
                >
                  Custom Seller?
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={customSellerName}
                onChange={(e) => setCustomSellerName(e.target.value)}
                placeholder="Enter seller name & campus/location"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsCustomSeller(false)}
                  className="text-[11px] text-slate-400 hover:text-white underline"
                >
                  Back to predefined sellers
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Shift Cash Stats */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Total Cash Collected</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {sellerCashTotal.toLocaleString()} <span className="text-sm font-normal">TND</span>
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Ready for organizer settlement</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Tickets Sold Count & Zero-Paper Banner */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Digital Tickets Issued</span>
            <span className="text-2xl font-black text-white font-mono">
              {sellerTickets.length} <span className="text-xs font-normal text-slate-400">tickets</span>
            </span>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5" /> 0 Paper Waste • 100% Audited
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <TicketIcon className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Two Columns: Selling Form vs Confirmation / History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: The Cash Sale Form */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TicketIcon className="w-4 h-4 text-emerald-400" />
                Issue Cash Paid Ticket
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Replaces printed ticket booklets with cryptographically signed digital passes
              </p>
            </div>
            <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-mono">
              Step 1 of 2
            </span>
          </div>

          <form onSubmit={handleIssueCashTicket} className="space-y-5">
            {/* Step 1: Select Tier */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                1. Select Ticket Tier
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {event.tiers.map((tier) => {
                  const isSelected = tier.id === selectedTierId;
                  const isSoldOut = tier.soldCount >= tier.capacity;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      disabled={isSoldOut}
                      onClick={() => setSelectedTierId(tier.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500 text-white ring-1 ring-emerald-500/50'
                          : isSoldOut
                          ? 'bg-slate-950/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                          : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {tier.badge && (
                        <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500 text-slate-950">
                          {tier.badge}
                        </span>
                      )}
                      <span className="text-xs font-bold block truncate">{tier.name}</span>
                      <span className="text-base font-black text-emerald-400 font-mono block mt-1">
                        {tier.price} <span className="text-[10px] text-slate-400">TND</span>
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {isSoldOut ? 'Sold out' : `${tier.capacity - tier.soldCount} left`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Buyer Information */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                2. Buyer Contact & Delivery
              </label>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Buyer Full Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="e.g. Youssef Baccouche"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Buyer Email (Receives PDF Ticket) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      placeholder="youssef@gmail.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Phone (SMS & WhatsApp Delivery) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      placeholder="+216 20 123 456"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Cash Tendered & Change Calculator */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  3. Cash Settlement
                </span>
                <span className="text-xs text-slate-400">
                  Total to Collect:{' '}
                  <strong className="text-emerald-400 font-mono text-sm">{totalPrice.toFixed(3)} TND</strong>
                </span>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5">
                  Amount Received from Buyer:
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    placeholder={`e.g. ${totalPrice} TND`}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  {/* Quick cash denomination buttons */}
                  {[totalPrice, 50, 100, 200].filter(v => v >= totalPrice).slice(0, 3).map((val, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuickTender(val)}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-[11px] font-mono text-slate-300 hover:text-emerald-400 transition-colors"
                    >
                      {val} TND
                    </button>
                  ))}
                </div>
              </div>

              {tenderedNum > 0 && (
                <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Change to return to buyer:</span>
                  <span className={`font-mono font-bold ${changeDue >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {changeDue >= 0 ? `${changeDue.toFixed(3)} TND` : `Missing ${(totalPrice - tenderedNum).toFixed(3)} TND`}
                  </span>
                </div>
              )}
            </div>

            {/* Submit Cash Sale */}
            <button
              type="submit"
              disabled={isProcessing || !buyerName.trim() || !buyerEmail.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <span>Generating Cryptographic Pass...</span>
              ) : (
                <>
                  <DollarSign className="w-5 h-5 stroke-[2.5]" />
                  <span>Confirm Cash Paid ({totalPrice.toFixed(3)} TND) & Send Ticket</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Just Issued Ticket Preview OR Shift History */}
        <div className="lg:col-span-5 space-y-4">
          {/* Last Issued Ticket Card */}
          {lastIssuedTicket ? (
            <div className="bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-3xl p-5 space-y-4 shadow-xl animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Ticket Issued & Sent!</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Just Now</span>
              </div>

              {/* Delivery pill */}
              <div className="p-3 bg-emerald-900/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-200 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                  <span>PDF Ticket Dispatched</span>
                </div>
                <p className="text-[11px] text-emerald-300/80">
                  Sent to <strong className="text-white">{lastIssuedTicket.buyerEmail}</strong> with high-resolution QR code attached.
                </p>
              </div>

              {/* Ticket Mini Summary */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Ticket ID:</span>
                  <span className="font-mono font-bold text-white">{lastIssuedTicket.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Attendee:</span>
                  <span className="font-medium text-slate-200">{lastIssuedTicket.buyerName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Tier:</span>
                  <span className="text-emerald-400 font-semibold">{lastIssuedTicket.tierName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Payment:</span>
                  <span className="font-mono text-white">{lastIssuedTicket.price} TND (Cash)</span>
                </div>
                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between items-center">
                  <span>Sold By:</span>
                  <span className="font-mono text-emerald-400 truncate max-w-[180px]">
                    {lastIssuedTicket.soldBySeller}
                  </span>
                </div>
              </div>

              {/* Instant Actions for Seller */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setViewingTicketForPdf(lastIssuedTicket);
                    setShowPdfModal(true);
                  }}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>View PDF Ticket</span>
                </button>
                <a
                  href={`https://wa.me/${lastIssuedTicket.buyerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `🎟️ Hello ${lastIssuedTicket.buyerName}! Your e-ticket for ${event.title} is ready: https://eventpass.tn/t/${lastIssuedTicket.id}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-emerald-600/20"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp Link</span>
                </a>
              </div>
            </div>
          ) : (
            /* Helper Card when no ticket issued yet in this session */
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <h4 className="text-sm font-bold text-white">Why Paperless Cash Sales?</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Physical ticket booklets often cause counterfeit fraud, lost stock, and slow post-event reconciliation. With EventPass POS, every cash ticket is instantly signed with HMAC-SHA256, sent to the buyer's inbox as a PDF, and logged under your seller ID.
              </p>
            </div>
          )}

          {/* Seller's Cash Ticket Ledger (History Table) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-emerald-400" />
                My Cash Sales ({sellerTickets.length})
              </h4>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                {sellerCashTotal} TND
              </span>
            </div>

            {sellerTickets.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/60 rounded-xl">
                No tickets sold yet in this session.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {sellerTickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 bg-slate-950/70 hover:bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-white font-medium">{t.buyerName}</strong>
                        <span className="text-[10px] text-emerald-400 font-mono">({t.tierName})</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {t.id} • {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-xs">{t.price} TND</span>
                      <button
                        type="button"
                        onClick={() => {
                          setViewingTicketForPdf(t);
                          setShowPdfModal(true);
                        }}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                        title="View / Print PDF Ticket"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PDF Ticket View & Print Modal */}
      {showPdfModal && viewingTicketForPdf && (
        <TicketPdfModal
          ticket={viewingTicketForPdf}
          event={event}
          sellerName={effectiveSellerName}
          onClose={() => {
            setShowPdfModal(false);
            setViewingTicketForPdf(null);
          }}
        />
      )}
    </div>
  );
};
