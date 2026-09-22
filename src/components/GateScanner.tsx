import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, QrCode, CheckCircle2, XCircle, AlertTriangle, 
  Coins, Wifi, WifiOff, RefreshCw, 
  ChevronRight, ShieldAlert, Zap, 
  UserCheck, LogOut, ShieldCheck, DollarSign 
} from 'lucide-react';
import { EventData, Ticket, DoorCashRecord } from '../types';
import { playSuccessChime, playErrorBuzz, playCashChime } from '../utils/audioFeedback';
import { generateTicketHash } from '../utils/qrUtils';

interface GateScannerProps {
  event: EventData;
  events?: EventData[];
  onSelectEvent?: (eventId: string) => void;
  tickets: Ticket[];
  doorCashRecords: DoorCashRecord[];
  onCheckInTicket: (ticketId: string, bouncerName: string) => { success: boolean; ticket?: Ticket; alreadyCheckedInAt?: string; checkedInBy?: string };
  onRecordDoorCash: (record: DoorCashRecord, newTicket: Ticket) => void;
  incomingTestTicket?: Ticket | null;
  onClearIncomingTicket?: () => void;
  onNavigateToSell?: () => void;
}

export const GateScanner: React.FC<GateScannerProps> = ({
  event,
  events,
  onSelectEvent,
  tickets,
  doorCashRecords,
  onCheckInTicket,
  onRecordDoorCash,
  incomingTestTicket,
  onClearIncomingTicket,
  onNavigateToSell,
}) => {
  // Bouncer Shift & Gate Station state
  const [isPaired, setIsPaired] = useState<boolean>(true);
  const [inputEventId, setInputEventId] = useState<string>(event.id);
  const [bouncerName, setBouncerName] = useState<string>('Karim Ben Salah');
  const [gateName, setGateName] = useState<string>('Gate 1 (Main Entrance)');
  const [pinInput, setPinInput] = useState<string>(event.pinCode);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [isOfflineSimulated, setIsOfflineSimulated] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [cachedHashesCount, setCachedHashesCount] = useState<number>(tickets.length);

  const staffIdentifier = `${bouncerName} • ${gateName}`;

  // Scanner UI & Feedback state
  const [scanResult, setScanResult] = useState<{
    status: 'VALID' | 'DUPLICATE' | 'INVALID';
    ticket?: Ticket;
    timestamp: string;
    checkedInBy?: string;
  } | null>(null);

  // Door Cash Modal
  const [showCashModal, setShowCashModal] = useState<boolean>(false);
  const [cashTierId, setCashTierId] = useState<string>(event.tiers[0]?.id || '');
  const [cashBuyerName, setCashBuyerName] = useState<string>('Walk-in Guest');
  const [cashBuyerPhone, setCashBuyerPhone] = useState<string>('+216 20 000 000');

  // Camera preview ref
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Sync cache count with tickets
  useEffect(() => {
    setCachedHashesCount(tickets.length);
  }, [tickets]);

  // If a ticket was passed from the Buyer Checkout for immediate testing
  useEffect(() => {
    if (incomingTestTicket) {
      handleProcessScan(incomingTestTicket.qrHash);
      if (onClearIncomingTicket) onClearIncomingTicket();
    }
  }, [incomingTestTicket]);

  // Trigger sync simulation
  const handleResyncSQLite = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setCachedHashesCount(tickets.length);
      setIsSyncing(false);
    }, 400);
  };

  // Process a QR code scan in sub-300ms
  const handleProcessScan = (scannedString: string) => {
    const trimmed = scannedString.trim();
    
    // Find ticket by QR hash or ID
    const foundTicket = tickets.find(
      t => t.qrHash === trimmed || t.id === trimmed || trimmed.startsWith(t.id)
    );

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (!foundTicket) {
      // Invalid / fake ticket
      playErrorBuzz();
      setScanResult({
        status: 'INVALID',
        timestamp: nowStr,
      });
      return;
    }

    if (foundTicket.status === 'CHECKED_IN') {
      // Duplicate ticket / Already used!
      playErrorBuzz();
      setScanResult({
        status: 'DUPLICATE',
        ticket: foundTicket,
        timestamp: foundTicket.checkedInAt ? new Date(foundTicket.checkedInAt).toLocaleTimeString() : nowStr,
        checkedInBy: foundTicket.checkedInBy || 'Gate Device',
      });
      return;
    }

    // Valid ticket -> Check in!
    const res = onCheckInTicket(foundTicket.id, staffIdentifier);
    playSuccessChime();
    setScanResult({
      status: 'VALID',
      ticket: res.ticket || foundTicket,
      timestamp: nowStr,
      checkedInBy: staffIdentifier,
    });
  };

  // Start real camera if requested
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API not accessible in this environment. Use the 1-Tap Quick Scan simulator below.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      setCameraError('Camera access denied or unavailable. Use the 1-Tap Quick Scan simulator below.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Start bouncer shift & validate credentials
  const handleStartShift = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPairingError(null);

    const targetEvent = events?.find(e => e.id.toLowerCase() === inputEventId.trim().toLowerCase()) || event;
    if (events && targetEvent.id !== event.id && onSelectEvent) {
      onSelectEvent(targetEvent.id);
    }

    if (pinInput.trim() !== targetEvent.pinCode) {
      setPairingError(`PIN code mismatch for ${targetEvent.title}. Organizer PIN is: ${targetEvent.pinCode}`);
      return;
    }
    if (!bouncerName.trim()) {
      setPairingError('Please enter your name as a bouncer.');
      return;
    }
    if (!gateName.trim()) {
      setPairingError('Please enter your assigned gate / turnstile.');
      return;
    }

    setIsPaired(true);
    handleResyncSQLite();
  };

  // Sell a Door Cash ticket
  const handleCashTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tier = event.tiers.find(t => t.id === cashTierId) || event.tiers[0];
    if (!tier) return;

    const ticketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}-CASH`;
    const qrHash = generateTicketHash(ticketId, event.id, event.secretKey);

    const newTicket: Ticket = {
      id: ticketId,
      eventId: event.id,
      tierId: tier.id,
      tierName: tier.name,
      buyerName: cashBuyerName || 'Walk-in Guest',
      buyerEmail: 'cash@door.tn',
      buyerPhone: cashBuyerPhone || '+216 20 000 000',
      price: tier.price,
      currency: 'TND',
      paymentMethod: 'cash_door',
      qrHash,
      status: 'CHECKED_IN', // Automatically admitted at door
      createdAt: new Date().toISOString(),
      checkedInAt: new Date().toISOString(),
      checkedInBy: staffIdentifier,
      isDoorCash: true,
    };

    const cashRecord: DoorCashRecord = {
      id: `cash-${Date.now()}`,
      eventId: event.id,
      tierId: tier.id,
      tierName: tier.name,
      amount: tier.price,
      staffName: staffIdentifier,
      buyerName: cashBuyerName || 'Walk-in Guest',
      buyerPhone: cashBuyerPhone || '+216 20 000 000',
      timestamp: new Date().toISOString(),
      ticketId,
    };

    onRecordDoorCash(cashRecord, newTicket);
    playCashChime();
    setShowCashModal(false);

    // Show immediate valid checked-in result
    setScanResult({
      status: 'VALID',
      ticket: newTicket,
      timestamp: new Date().toLocaleTimeString(),
      checkedInBy: staffIdentifier,
    });
  };

  // Calculate bouncer specific cash collected
  const staffCashCollected = doorCashRecords
    .filter(r => r.staffName.includes(bouncerName) || r.staffName === staffIdentifier)
    .reduce((sum, r) => sum + r.amount, 0);

  const staffCashTicketsCount = doorCashRecords
    .filter(r => r.staffName.includes(bouncerName) || r.staffName === staffIdentifier).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Gate Pairing / Bouncer Shift Setup Card */}
      {!isPaired ? (
        /* ============ BOUNCER LOGIN & GATE SETUP SCREEN ============ */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-mono font-bold">
              Bouncer Terminal & Box Office Login
            </div>
            <h2 className="text-2xl font-black text-white">Act as Bouncer / Gate Staff</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Configure your bouncer identity, assigned entrance gate, and event ID to start admitting attendees and collecting door cash.
            </p>
          </div>

          {pairingError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{pairingError}</span>
            </div>
          )}

          <form onSubmit={handleStartShift} className="space-y-4">
            {/* Field 1: Event ID */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  1. Event ID *
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  Current: {event.id}
                </span>
              </div>
              <input
                type="text"
                required
                value={inputEventId}
                onChange={(e) => {
                  setInputEventId(e.target.value);
                  const matched = events?.find(ev => ev.id.toLowerCase() === e.target.value.trim().toLowerCase());
                  if (matched) {
                    setPinInput(matched.pinCode);
                    if (onSelectEvent) onSelectEvent(matched.id);
                  }
                }}
                placeholder="e.g. evt-gammarth-2026"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono text-sm focus:border-emerald-500 outline-none"
              />

              {events && events.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] text-slate-500 mr-1">Quick Select Event:</span>
                  {events.map(ev => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => {
                        setInputEventId(ev.id);
                        setPinInput(ev.pinCode);
                        if (onSelectEvent) onSelectEvent(ev.id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                        inputEventId === ev.id
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                          : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700'
                      }`}
                    >
                      {ev.id}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Field 2: Bouncer Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                2. My Name (Bouncer Staff) *
              </label>
              <input
                type="text"
                required
                value={bouncerName}
                onChange={(e) => setBouncerName(e.target.value)}
                placeholder="e.g. Karim Ben Salah or Youssef Trabelsi"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:border-emerald-500 outline-none"
              />
              <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] text-slate-500 mr-1">Presets:</span>
                {['Karim Ben Salah', 'Youssef Trabelsi', 'Mehdi Ghorbel', 'Sami Bouncer'].map(name => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setBouncerName(name)}
                    className="text-[11px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-md transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Field 3: Assigned Gate */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                3. My Gate / Entrance *
              </label>
              <input
                type="text"
                required
                value={gateName}
                onChange={(e) => setGateName(e.target.value)}
                placeholder="e.g. Gate 1 (Main Entrance) or VIP Turnstile"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:border-emerald-500 outline-none"
              />
              <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] text-slate-500 mr-1">Gate Presets:</span>
                {['Gate 1 (Main Entrance)', 'Gate 2 (VIP Turnstile)', 'Gate 3 (Backstage)', 'North Door Turnstile'].map(gate => (
                  <button
                    key={gate}
                    type="button"
                    onClick={() => setGateName(gate)}
                    className="text-[11px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-md transition-colors"
                  >
                    {gate}
                  </button>
                ))}
              </div>
            </div>

            {/* Field 4: 6-Digit Gate PIN */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  4. 6-Digit Event Gate PIN *
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  Organizer PIN: <span className="text-emerald-400 font-bold">{event.pinCode}</span>
                </span>
              </div>
              <input
                type="text"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 839204"
                className="w-full text-center text-3xl font-black tracking-widest font-mono py-3 bg-slate-950 border border-slate-800 rounded-2xl text-emerald-400 focus:border-emerald-500 outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-2"
            >
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
              <span>Confirm Shift & Open Gate Scanner</span>
            </button>
          </form>
        </div>
      ) : (
        /* ============ ACTIVE GATE TERMINAL ============ */
        <div className="space-y-6">
          {/* Staff Mode Switcher: Scan vs Sell Cash Ticket */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 sm:p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400 font-medium pl-1 hidden sm:inline">Staff Mode:</span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
                <button
                  type="button"
                  className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-slate-950 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <QrCode className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Scan Tickets</span>
                </button>
                {onNavigateToSell && (
                  <button
                    type="button"
                    onClick={onNavigateToSell}
                    className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sell Cash Tickets</span>
                  </button>
                )}
              </div>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              Station PIN: {event.pinCode}
            </span>
          </div>

          {/* Active Bouncer Shift Profile Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-sm">{bouncerName}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {gateName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Event: <span className="text-slate-200">{event.id}</span> ({event.title})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsPaired(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 self-start sm:self-center transition-colors"
                title="Change Bouncer Name, Gate, or Event ID"
              >
                <LogOut className="w-3.5 h-3.5 text-amber-400" />
                <span>Switch Bouncer / Gate</span>
              </button>
            </div>
          </div>

          {/* Secondary Controls: Offline Sync Pill & Door Cash */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                SQLite Cached: {cachedHashesCount} Hashes
              </span>
              <span>•</span>
              <button
                onClick={handleResyncSQLite}
                disabled={isSyncing}
                className="hover:text-white text-slate-400 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Simulate Offline Venue Mode */}
              <button
                onClick={() => setIsOfflineSimulated(!isOfflineSimulated)}
                className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
                  isOfflineSimulated
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title="Toggle simulated venue network loss"
              >
                {isOfflineSimulated ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{isOfflineSimulated ? 'Offline Mode (Local SQLite)' : 'Venue Wi-Fi Connected'}</span>
              </button>

              {/* Cash Box */}
              <button
                onClick={() => setShowCashModal(true)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 transition-all shadow"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Door Cash</span>
              </button>
            </div>
          </div>

          {/* Scanner Viewport / Feedback Screen */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
            {/* Visual Scan Result Banner (Sub-300ms feedback) */}
            {scanResult && (
              <div
                className={`p-6 text-center transition-all animate-in fade-in zoom-in-95 duration-150 ${
                  scanResult.status === 'VALID'
                    ? 'bg-emerald-600 text-white'
                    : scanResult.status === 'DUPLICATE'
                    ? 'bg-rose-600 text-white'
                    : 'bg-amber-600 text-white'
                }`}
              >
                {scanResult.status === 'VALID' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-2 font-black text-2xl tracking-tight">
                      <CheckCircle2 className="w-8 h-8 stroke-[3]" />
                      <span>VALID ENTRY • ADMIT ONE</span>
                    </div>
                    <p className="text-sm font-bold opacity-90">
                      {scanResult.ticket?.buyerName} • {scanResult.ticket?.tierName}
                    </p>
                    <p className="text-xs font-mono opacity-75">
                      Ticket {scanResult.ticket?.id} • Scanned at {scanResult.timestamp}
                    </p>
                  </div>
                )}

                {scanResult.status === 'DUPLICATE' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-2 font-black text-2xl tracking-tight">
                      <XCircle className="w-8 h-8 stroke-[3]" />
                      <span>ALREADY USED • DO NOT ADMIT</span>
                    </div>
                    <p className="text-sm font-bold opacity-95">
                      Previously checked in by {scanResult.checkedInBy} at {scanResult.timestamp}
                    </p>
                    <p className="text-xs font-mono opacity-80">
                      Attendee: {scanResult.ticket?.buyerName} ({scanResult.ticket?.id})
                    </p>
                  </div>
                )}

                {scanResult.status === 'INVALID' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-2 font-black text-2xl tracking-tight">
                      <AlertTriangle className="w-8 h-8 stroke-[3]" />
                      <span>INVALID TICKET HASH</span>
                    </div>
                    <p className="text-xs opacity-90">
                      QR hash signature does not match this event's database. Potential counterfeit.
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setScanResult(null)}
                  className="mt-3 px-4 py-1 rounded-full bg-black/20 hover:bg-black/30 text-xs font-mono tracking-wider font-semibold transition-colors"
                >
                  Dismiss / Next Scan
                </button>
              </div>
            )}

            {/* Scanner Viewfinder Box */}
            <div className="p-8 flex flex-col items-center justify-center bg-slate-950/80 min-h-[280px]">
              {cameraActive ? (
                <div className="relative w-full max-w-xs aspect-square rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-2xl">
                  <video ref={videoRef} className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-bounce top-1/2" />
                  <button
                    onClick={stopCamera}
                    className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/70 text-white text-xs rounded-lg font-mono"
                  >
                    Stop Camera
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-4 max-w-sm">
                  <div className="w-20 h-20 rounded-3xl bg-slate-900 border-2 border-dashed border-slate-700 flex items-center justify-center mx-auto text-emerald-400 relative">
                    <QrCode className="w-10 h-10" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Sub-300ms QR Scanner Ready</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Processes offline SQLite hashes instantly with green/red sound and visual alerts.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <button
                      onClick={startCamera}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2"
                    >
                      <Camera className="w-4 h-4 text-emerald-400" />
                      <span>Use Phone Camera</span>
                    </button>
                  </div>
                  {cameraError && (
                    <p className="text-xs text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                      {cameraError}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Manual QR Hash Input bar */}
            <div className="p-4 bg-slate-900 border-t border-slate-800">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = (e.currentTarget.elements.namedItem('qrInput') as HTMLInputElement).value;
                  if (input) {
                    handleProcessScan(input);
                    (e.currentTarget.elements.namedItem('qrInput') as HTMLInputElement).value = '';
                  }
                }}
                className="flex items-center gap-2"
              >
                <input
                  name="qrInput"
                  type="text"
                  placeholder="Paste QR hash or ticket ID (e.g. TKT-8910-A)..."
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl"
                >
                  Verify
                </button>
              </form>
            </div>
          </div>

          {/* Interactive 1-Tap Quick Scan Test Tray */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Interactive 1-Tap Gate Simulator
                </h4>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Click any ticket to test scanner reaction
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tickets.slice(0, 4).map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => handleProcessScan(ticket.qrHash)}
                  className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 hover:border-emerald-500 text-left transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-white group-hover:text-emerald-400">
                        {ticket.buyerName}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        ticket.status === 'CHECKED_IN' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {ticket.status === 'CHECKED_IN' ? 'Already In' : 'Valid'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono block">
                      {ticket.id} • {ticket.tierName}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                </button>
              ))}

              {/* Fake / Invalid Ticket Button */}
              <button
                onClick={() => handleProcessScan('TKT-FAKE-COUNTERFEIT-9999')}
                className="p-3 bg-slate-950 rounded-xl border border-rose-900/40 hover:border-rose-500 text-left transition-all flex items-center justify-between group col-span-1 sm:col-span-2"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-rose-300">
                      ⚠️ Test Counterfeit / Fake QR
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 font-mono">
                      Fraud Test
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono block">
                    Tests immediate red alert buzzer on invalid hash
                  </span>
                </div>
                <ShieldAlert className="w-4 h-4 text-rose-500" />
              </button>
            </div>
          </div>

          {/* Bouncer Cash Shift Audit Drawer */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 uppercase font-mono text-[10px] block">
                Shift Cash Drawer • {bouncerName} ({gateName})
              </span>
              <div className="text-lg font-black text-amber-400 font-mono">
                {staffCashCollected} TND <span className="text-xs text-slate-400 font-normal font-sans">({staffCashTicketsCount} cash sales)</span>
              </div>
            </div>
            <button
              onClick={() => setShowCashModal(true)}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all shadow"
            >
              + Sell Cash Ticket
            </button>
          </div>
        </div>
      )}

      {/* Modal: Door Cash Box Office Ticket Sale */}
      {showCashModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-400" />
                  <span>Door Cash Box Office Ticket Sale</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Logs cash collected under <span className="text-amber-400 font-bold">{bouncerName}</span> at <span className="text-emerald-400 font-bold">{gateName}</span>
                </p>
              </div>
              <button
                onClick={() => setShowCashModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Bouncer on Duty:</span>
              <span className="text-emerald-400 font-bold">{bouncerName} • {gateName}</span>
            </div>

            <form onSubmit={handleCashTicketSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Select Tier *</label>
                <div className="space-y-2">
                  {event.tiers.map((t) => (
                    <label
                      key={t.id}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer ${
                        cashTierId === t.id
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="tierRadio"
                          checked={cashTierId === t.id}
                          onChange={() => setCashTierId(t.id)}
                          className="accent-amber-500"
                        />
                        <span className="font-bold text-white text-xs">{t.name}</span>
                      </div>
                      <span className="font-mono font-bold text-amber-400">{t.price} TND</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Guest Name (for Door Audit)</label>
                <input
                  type="text"
                  required
                  value={cashBuyerName}
                  onChange={(e) => setCashBuyerName(e.target.value)}
                  placeholder="e.g. Walk-in Guest / Yassine"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Guest Phone (optional)</label>
                <input
                  type="tel"
                  value={cashBuyerPhone}
                  onChange={(e) => setCashBuyerPhone(e.target.value)}
                  placeholder="+216 20 000 000"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Cash to Collect Now:</span>
                <span className="text-xl font-black font-mono text-amber-400">
                  {event.tiers.find(t => t.id === cashTierId)?.price || 0} TND
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCashModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20"
                >
                  Collect Cash & Issue Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
