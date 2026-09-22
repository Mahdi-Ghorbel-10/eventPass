import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, CreditCard, Smartphone, 
  Wallet, ArrowRight, Download, CheckCircle2, 
  Sparkles, QrCode, ArrowLeft, RefreshCw 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EventData, Ticket, PaymentMethod } from '../types';
import { generateTicketHash, generateQrDataUrl } from '../utils/qrUtils';
import { EventCoverSlider } from './EventCoverSlider';

interface BuyerCheckoutProps {
  event: EventData;
  onTicketPurchased: (ticket: Ticket) => void;
  onNavigateToGateWithTicket?: (ticket: Ticket) => void;
  onBackToStudio: () => void;
}

export const BuyerCheckout: React.FC<BuyerCheckoutProps> = ({
  event,
  onTicketPurchased,
  onNavigateToGateWithTicket,
  onBackToStudio,
}) => {
  // Selection state
  const [selectedTierId, setSelectedTierId] = useState<string>(
    event.tiers.find(t => t.soldCount < t.capacity)?.id || event.tiers[0]?.id || ''
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [buyerName, setBuyerName] = useState<string>('Mehdi Ghorbel');
  const [buyerEmail, setBuyerEmail] = useState<string>('mehdi.ghorbel@insat.ucar.tn');
  const [buyerPhone, setBuyerPhone] = useState<string>('+216 98 440 219');
  const [selectedGateway, setSelectedGateway] = useState<PaymentMethod>('clictopay');

  // Checkout flow state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activePaymentModal, setActivePaymentModal] = useState<boolean>(false);
  const [completedTicket, setCompletedTicket] = useState<Ticket | null>(null);
  const [ticketQrUrl, setTicketQrUrl] = useState<string>('');

  const selectedTier = event.tiers.find(t => t.id === selectedTierId) || event.tiers[0];
  const totalPrice = (selectedTier ? selectedTier.price : 0) * quantity;

  // When ticket is purchased, generate its QR code
  useEffect(() => {
    if (completedTicket) {
      generateQrDataUrl(completedTicket.qrHash, 300).then(setTicketQrUrl);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [completedTicket]);

  const handleInitiatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName || !buyerEmail || !buyerPhone || !selectedTier) return;
    setActivePaymentModal(true);
  };

  const handleConfirmSimulatedPayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const ticketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
      const qrHash = generateTicketHash(ticketId, event.id, event.secretKey);
      
      const newTicket: Ticket = {
        id: ticketId,
        eventId: event.id,
        tierId: selectedTier.id,
        tierName: selectedTier.name,
        buyerName,
        buyerEmail,
        buyerPhone,
        price: selectedTier.price,
        currency: 'TND',
        paymentMethod: selectedGateway,
        qrHash,
        status: 'VALID',
        createdAt: new Date().toISOString(),
      };

      onTicketPurchased(newTicket);
      setCompletedTicket(newTicket);
      setIsProcessing(false);
      setActivePaymentModal(false);
    }, 1200);
  };

  return (
    <div className="max-w-2xl mx-auto pb-12">
      {/* Top back bar */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBackToStudio}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Organizer Dashboard</span>
        </button>
        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
          White-Label Checkout URL: tickets.waveform.tn
        </span>
      </div>

      {!completedTicket ? (
        /* ============ CHECKOUT VIEW ============ */
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm">
          {/* Interactive Event Cover Slider */}
          <EventCoverSlider 
            event={event} 
            showEventOverlay={true}
            aspectRatio="aspect-[16/9] sm:aspect-[21/9]"
          />

          {/* Checkout Body Form */}
          <form onSubmit={handleInitiatePayment} className="p-6 sm:p-8 space-y-6">
            {/* Step 1: Select Tier */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                1. Select Ticket Tier
              </label>
              
              <div className="space-y-3">
                {event.tiers.map((tier) => {
                  const isSoldOut = tier.soldCount >= tier.capacity;
                  const isSelected = selectedTierId === tier.id;
                  return (
                    <div
                      key={tier.id}
                      onClick={() => !isSoldOut && setSelectedTierId(tier.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSoldOut
                          ? 'opacity-50 border-slate-800 bg-slate-950/40 cursor-not-allowed'
                          : isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                          : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${isSelected ? 'text-emerald-400' : 'text-white'}`}>
                            {tier.name}
                          </span>
                          {tier.badge && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isSoldOut ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-300'
                            }`}>
                              {tier.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{tier.description}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-lg font-black font-mono text-emerald-400">
                          {tier.price} <span className="text-xs font-sans text-slate-400">TND</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {isSoldOut ? 'Sold Out' : `${tier.capacity - tier.soldCount} left`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Buyer Credentials (Zero Friction: No Passwords) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  2. Attendee Contact (Zero Registration)
                </label>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> No password needed
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Full Name (matches ID at door) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Yassine Mansour"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Email (for PDF & QR Backup) *</label>
                    <input
                      type="email"
                      required
                      placeholder="yassine@example.com"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Phone (Tunisian Mobile) *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+216 98 000 000"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Payment Method Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                3. Choose Payment Method
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* ClicToPay */}
                <div
                  onClick={() => setSelectedGateway('clictopay')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    selectedGateway === 'clictopay'
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-md shadow-indigo-500/10'
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-sm text-white">ClicToPay</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Carte Bancaire (BIAT, Attijari, BNA) & e-Dinar
                  </p>
                </div>

                {/* Konnect */}
                <div
                  onClick={() => setSelectedGateway('konnect')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    selectedGateway === 'konnect'
                      ? 'border-purple-500 bg-purple-500/10 shadow-md shadow-purple-500/10'
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Smartphone className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-sm text-white">Konnect</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Instant Card & Digital Wallet
                  </p>
                </div>

                {/* Flouci */}
                <div
                  onClick={() => setSelectedGateway('flouci')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    selectedGateway === 'flouci'
                      ? 'border-cyan-500 bg-cyan-500/10 shadow-md shadow-cyan-500/10'
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-sm text-white">Flouci</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    App 1-Tap Pay & D17 QR
                  </p>
                </div>
              </div>
            </div>

            {/* Total & Pay Button */}
            <div className="pt-4 border-t border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Total Due (No Hidden Fees):</span>
                <span className="text-2xl font-black font-mono text-emerald-400">
                  {totalPrice} <span className="text-sm font-sans">TND</span>
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-base shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
              >
                <span>Pay {totalPrice} TND with {selectedGateway.toUpperCase()}</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </button>

              <p className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Encrypted direct payment verified via Cloud Run Function.</span>
              </p>
            </div>
          </form>
        </div>
      ) : (
        /* ============ TICKET PASS CONFIRMATION SCREEN ============ */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-white">Ticket Confirmed!</h2>
            <p className="text-xs text-slate-300">
              Payment verified via {completedTicket.paymentMethod.toUpperCase()}. Your pass is ready for gate scan.
            </p>
          </div>

          {/* Physical / Digital Ticket Card */}
          <div className="bg-white text-slate-950 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            {/* Cutout notch effect */}
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-900 rounded-full" />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-900 rounded-full" />

            <div className="border-b border-dashed border-slate-300 pb-5 mb-5 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mb-1">
                {completedTicket.tierName}
              </span>
              <h3 className="text-lg font-black tracking-tight">{event.title}</h3>
              <p className="text-xs text-slate-600 mt-1">
                {event.date} • {event.venue}, {event.city}
              </p>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="p-2 border-2 border-slate-900 rounded-2xl bg-white shadow-sm">
                {ticketQrUrl && <img src={ticketQrUrl} alt="Ticket QR" className="w-52 h-52" />}
              </div>
              <div className="mt-3 text-center">
                <span className="text-[11px] font-mono text-slate-500 block">CRYPTOGRAPHIC QR HASH</span>
                <span className="text-xs font-mono font-bold tracking-widest text-slate-800">
                  {completedTicket.qrHash}
                </span>
              </div>
            </div>

            {/* Attendee Details Bar */}
            <div className="border-t border-dashed border-slate-300 pt-4 mt-4 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Attendee</span>
                <span className="font-bold text-slate-900">{completedTicket.buyerName}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Ticket ID</span>
                <span className="font-mono font-bold text-slate-900">{completedTicket.id}</span>
              </div>
            </div>
          </div>

          {/* Quick Testing Shortcut */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Interactive Gate Testing</span>
            </div>
            <p className="text-xs text-slate-300">
              Want to see how fast the bouncer scans this ticket at the entrance?
            </p>
            <button
              onClick={() => onNavigateToGateWithTicket && onNavigateToGateWithTicket(completedTicket)}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              <span>Test Scan This Ticket at Gate Scanner</span>
            </button>
          </div>

          {/* Download & Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => alert(`Simulated PDF Ticket download for ${completedTicket.id}`)}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Ticket</span>
            </button>
            <button
              onClick={() => {
                setCompletedTicket(null);
                setQuantity(1);
              }}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Buy Another Ticket</span>
            </button>
          </div>
        </div>
      )}

      {/* Payment Gateway Simulation Modal */}
      {activePaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 space-y-5 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <CreditCard className="w-6 h-6" />
            </div>

            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                Direct Merchant Redirection
              </span>
              <h3 className="text-lg font-bold text-white mt-1">
                {selectedGateway === 'clictopay' && 'ClicToPay (SMT Server)'}
                {selectedGateway === 'konnect' && 'Konnect Gateway'}
                {selectedGateway === 'flouci' && 'Flouci Mobile Pay'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Simulating secure webhook signature verification on Google Cloud Run Python function.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
              Amount: <span className="font-bold text-emerald-400">{totalPrice} TND</span>
            </div>

            <div className="space-y-2">
              <button
                disabled={isProcessing}
                onClick={handleConfirmSimulatedPayment}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying HMAC Webhook...</span>
                  </>
                ) : (
                  <span>Authorize & Pay {totalPrice} TND</span>
                )}
              </button>

              <button
                disabled={isProcessing}
                onClick={() => setActivePaymentModal(false)}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
