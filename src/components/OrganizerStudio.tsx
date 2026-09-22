import React, { useState, useEffect } from 'react';
import { 
  Plus, KeyRound, ExternalLink, Users, DollarSign, 
  ShieldCheck, ArrowUpRight, Copy, Check,
  Coins, Smartphone, Search, ChevronRight,
  Trash2, Sparkles, Image as ImageIcon, Star,
  Mail, Phone, Lock, BadgeCheck, Edit3, Tag, Layers
} from 'lucide-react';
import { EventData, Ticket, DoorCashRecord, TicketTier, SellerProfile } from '../types';
import { generateQrDataUrl } from '../utils/qrUtils';
import { EventCoverSlider } from './EventCoverSlider';

interface OrganizerStudioProps {
  event: EventData;
  tickets: Ticket[];
  sellers?: SellerProfile[];
  onAddSeller?: (seller: SellerProfile) => void;
  onAddSellers?: (sellers: SellerProfile[]) => void;
  doorCashRecords: DoorCashRecord[];
  onUpdateEvent: (updated: EventData) => void;
  onCreateNewEvent: (newEvent: EventData) => void;
  onNavigateToBuyer: () => void;
  onNavigateToGate: () => void;
  onNavigateToSeller?: () => void;
  onNavigateToFunctions?: () => void;
}

export const OrganizerStudio: React.FC<OrganizerStudioProps> = ({
  event,
  tickets,
  sellers = [],
  onAddSeller,
  onAddSellers,
  doorCashRecords,
  onUpdateEvent,
  onCreateNewEvent,
  onNavigateToBuyer,
  onNavigateToGate,
  onNavigateToSeller,
  onNavigateToFunctions,
}) => {
  const [gateQrUrl, setGateQrUrl] = useState<string>('');
  const [publicQrUrl, setPublicQrUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VALID' | 'CHECKED_IN' | 'CASH'>('ALL');

  // Form state for creating a new event
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventVenue, setNewEventVenue] = useState('');
  const [newEventDate, setNewEventDate] = useState('2026-10-15');
  const [newEventTime, setNewEventTime] = useState('21:00 - 04:00');
  const [newEventCity, setNewEventCity] = useState('Tunis');
  const [newTierName, setNewTierName] = useState('General Admission');
  const [newTierPrice, setNewTierPrice] = useState(40);
  const [newTierCap, setNewTierCap] = useState(150);
  const [enableClicToPay, setEnableClicToPay] = useState(true);
  const [enableKonnect, setEnableKonnect] = useState(true);
  const [enableFlouci, setEnableFlouci] = useState(true);

  // Form state for initial sellers during event creation
  const [initialSellers, setInitialSellers] = useState<Array<{ name: string; email: string; phone: string }>>([
    { name: '', email: '', phone: '' }
  ]);

  // Form state for adding a promoter/seller to an active event (post-creation)
  const [showAddSellerModal, setShowAddSellerModal] = useState(false);
  const [newSellerName, setNewSellerName] = useState('');
  const [newSellerEmail, setNewSellerEmail] = useState('');
  const [newSellerPhone, setNewSellerPhone] = useState('+216 ');
  const [newSellerRole, setNewSellerRole] = useState('Campus Ambassador');
  const [copiedSellerId, setCopiedSellerId] = useState<string | null>(null);

  // Form state for adding a tier to active event
  const [showAddTierModal, setShowAddTierModal] = useState(false);
  const [addTierName, setAddTierName] = useState('');
  const [addTierPrice, setAddTierPrice] = useState<number>(65);
  const [addTierCapacity, setAddTierCapacity] = useState<number>(100);
  const [addTierDesc, setAddTierDesc] = useState('');
  const [addTierBadge, setAddTierBadge] = useState('');

  // Form state for editing an existing tier and adjusting tickets number
  const [editingTier, setEditingTier] = useState<TicketTier | null>(null);
  const [editTierName, setEditTierName] = useState('');
  const [editTierPrice, setEditTierPrice] = useState<number>(50);
  const [editTierCapacity, setEditTierCapacity] = useState<number>(100);
  const [editTierDesc, setEditTierDesc] = useState('');
  const [editTierBadge, setEditTierBadge] = useState('');
  const [tierToast, setTierToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setTierToast({ message, type });
    setTimeout(() => setTierToast(null), 3500);
  };

  // Cover picture / slider gallery state
  const [newImageUrl, setNewImageUrl] = useState('');

  const PRESET_GALLERY_IMAGES = [
    { label: 'Festival Main Stage', url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Laser Crowd Show', url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Sunset Beach Club', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80' },
    { label: 'DJ Melodic Booth', url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Concert Lights & Vibe', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80' },
  ];

  const handleAddCoverImage = (urlToAdd?: string) => {
    const url = (urlToAdd || newImageUrl).trim();
    if (!url) return;
    const existing = event.coverImages && event.coverImages.length > 0 ? event.coverImages : [event.bannerUrl];
    if (existing.includes(url)) return;
    const updated = [...existing, url];
    onUpdateEvent({
      ...event,
      coverImages: updated,
      bannerUrl: event.bannerUrl || url,
    });
    setNewImageUrl('');
  };

  const handleRemoveCoverImage = (indexToRemove: number) => {
    const existing = event.coverImages && event.coverImages.length > 0 ? event.coverImages : [event.bannerUrl];
    if (existing.length <= 1) {
      alert('At least one cover picture is required for the event.');
      return;
    }
    const updated = existing.filter((_, idx) => idx !== indexToRemove);
    onUpdateEvent({
      ...event,
      coverImages: updated,
      bannerUrl: updated[0],
    });
  };

  const handleSetMainCover = (url: string) => {
    const existing = event.coverImages && event.coverImages.length > 0 ? event.coverImages : [event.bannerUrl];
    const reordered = [url, ...existing.filter(u => u !== url)];
    onUpdateEvent({
      ...event,
      bannerUrl: url,
      coverImages: reordered,
    });
  };

  const publicCheckoutUrl = `https://eventpass.tn/e/${event.slug}`;
  const gatePairingPayload = JSON.stringify({
    type: 'EVENTPASS_GATE_PAIR',
    eventId: event.id,
    pin: event.pinCode,
    title: event.title,
  });

  // Calculate live stats
  const totalRevenue = tickets.reduce((acc, t) => acc + t.price, 0);
  const onlineRevenue = tickets.filter(t => !t.isDoorCash).reduce((acc, t) => acc + t.price, 0);
  const doorCashTotal = doorCashRecords.reduce((acc, c) => acc + c.amount, 0);
  const checkedInCount = tickets.filter(t => t.status === 'CHECKED_IN').length;
  const totalCapacity = event.tiers.reduce((acc, tier) => acc + tier.capacity, 0);

  useEffect(() => {
    generateQrDataUrl(gatePairingPayload, 260).then(setGateQrUrl);
    generateQrDataUrl(publicCheckoutUrl, 260).then(setPublicQrUrl);
  }, [event.id, event.pinCode, event.slug]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicCheckoutUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyPin = () => {
    navigator.clipboard.writeText(event.pinCode);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    const slug = newEventTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const createdEventId = `evt-${Date.now()}`;
    const created: EventData = {
      id: createdEventId,
      title: newEventTitle,
      slug,
      subtitle: 'Live ticket sales powered by ClicToPay, Konnect & Flouci',
      date: newEventDate,
      time: newEventTime,
      venue: newEventVenue || 'Sidi Bou Said Club',
      city: newEventCity,
      bannerUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
      coverImages: [
        'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
      ],
      pinCode: randomPin,
      secretKey: `sec_${randomPin}_${Date.now()}`,
      organizerName: 'Independent Promoter',
      organizerEmail: 'promoter@tunisia.tn',
      organizerPhone: '+216 20 000 111',
      status: 'active',
      enabledGateways: {
        clictopay: enableClicToPay,
        konnect: enableKonnect,
        flouci: enableFlouci,
      },
      tiers: [
        {
          id: `tier-main-${Date.now()}`,
          name: newTierName,
          price: Number(newTierPrice) || 40,
          capacity: Number(newTierCap) || 150,
          soldCount: 0,
          description: 'Standard event access with instant QR ticket.',
        },
      ],
    };

    onCreateNewEvent(created);

    // Provision initial sellers if any were specified during creation
    const validInitialSellers: SellerProfile[] = initialSellers
      .filter(s => s.name.trim() && s.email.trim())
      .map((s, idx) => ({
        id: `sel-${Date.now()}-${idx}`,
        eventId: createdEventId,
        name: s.name.trim(),
        email: s.email.trim().toLowerCase(),
        phone: s.phone.trim() || '+216 55 120 401',
        role: 'Campus Ambassador',
        pin: randomPin,
        status: 'ACTIVE',
        totalSalesCount: 0,
        totalSalesTnd: 0,
      }));

    if (validInitialSellers.length > 0 && onAddSellers) {
      onAddSellers(validInitialSellers);
    }

    setInitialSellers([{ name: '', email: '', phone: '' }]);
    setShowCreateModal(false);
  };

  const handleAddSellerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSellerName.trim() || !newSellerEmail.trim()) return;

    const newSeller: SellerProfile = {
      id: `sel-${Date.now()}`,
      eventId: event.id,
      name: newSellerName.trim(),
      email: newSellerEmail.trim().toLowerCase(),
      phone: newSellerPhone.trim(),
      role: newSellerRole.trim() || 'Official Promoter',
      pin: event.pinCode,
      status: 'ACTIVE',
      totalSalesCount: 0,
      totalSalesTnd: 0,
    };

    onAddSeller?.(newSeller);
    setNewSellerName('');
    setNewSellerEmail('');
    setNewSellerPhone('+216 ');
    setShowAddSellerModal(false);
  };

  const handleAddTierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTierName.trim()) return;

    const capacity = Number(addTierCapacity) || 1;
    const price = Number(addTierPrice) || 0;

    const newTier: TicketTier = {
      id: `tier-${Date.now()}`,
      name: addTierName.trim(),
      price: price,
      capacity: capacity,
      soldCount: 0,
      description: addTierDesc.trim() || 'Instant digital ticket with cryptographic QR entry.',
      badge: addTierBadge.trim() || undefined,
    };

    onUpdateEvent({
      ...event,
      tiers: [...event.tiers, newTier],
    });

    setAddTierName('');
    setAddTierPrice(65);
    setAddTierCapacity(100);
    setAddTierDesc('');
    setAddTierBadge('');
    setShowAddTierModal(false);
    showToast(`Ticket tier '${newTier.name}' created with ${newTier.capacity} tickets at ${newTier.price} TND.`, 'success');
  };

  const handleOpenEditTier = (tier: TicketTier) => {
    setEditingTier(tier);
    setEditTierName(tier.name);
    setEditTierPrice(tier.price);
    setEditTierCapacity(tier.capacity);
    setEditTierBadge(tier.badge || '');
    setEditTierDesc(tier.description || '');
  };

  const handleUpdateTierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTier) return;

    const newCap = Number(editTierCapacity);
    if (isNaN(newCap) || newCap < editingTier.soldCount) {
      showToast(`Cannot reduce capacity to ${newCap}. Already ${editingTier.soldCount} tickets have been sold.`, 'error');
      return;
    }

    const updatedTiers = event.tiers.map(t => {
      if (t.id === editingTier.id) {
        return {
          ...t,
          name: editTierName.trim() || t.name,
          price: Number(editTierPrice) || 0,
          capacity: newCap,
          badge: editTierBadge.trim() || undefined,
          description: editTierDesc.trim() || t.description,
        };
      }
      return t;
    });

    onUpdateEvent({
      ...event,
      tiers: updatedTiers,
    });

    const diff = newCap - editingTier.capacity;
    const diffMsg = diff > 0 ? ` (+${diff} tickets added)` : diff < 0 ? ` (${diff} tickets removed)` : '';
    showToast(`Tier '${editTierName}' updated. Capacity: ${newCap} tickets${diffMsg}.`, 'success');
    setEditingTier(null);
  };

  const handleQuickAddTickets = (tierId: string, delta: number) => {
    const target = event.tiers.find(t => t.id === tierId);
    if (!target) return;

    const newCapacity = target.capacity + delta;
    const updatedTiers = event.tiers.map(t => {
      if (t.id === tierId) {
        return {
          ...t,
          capacity: newCapacity,
        };
      }
      return t;
    });

    onUpdateEvent({
      ...event,
      tiers: updatedTiers,
    });

    showToast(`Added +${delta} tickets to '${target.name}'. Total capacity is now ${newCapacity} tickets.`, 'success');
  };

  const handleDeleteTier = (tierId: string) => {
    if (event.tiers.length <= 1) {
      showToast('An event must maintain at least one active ticket tier.', 'error');
      return;
    }
    const targetTier = event.tiers.find(t => t.id === tierId);
    if (targetTier && targetTier.soldCount > 0) {
      showToast(`Cannot delete '${targetTier.name}' because ${targetTier.soldCount} ticket(s) are already sold.`, 'error');
      return;
    }
    onUpdateEvent({
      ...event,
      tiers: event.tiers.filter(t => t.id !== tierId),
    });
    showToast(`Ticket tier '${targetTier?.name}' deleted successfully.`, 'success');
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      t.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.buyerPhone.includes(searchQuery) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    if (statusFilter === 'VALID') return t.status === 'VALID';
    if (statusFilter === 'CHECKED_IN') return t.status === 'CHECKED_IN';
    if (statusFilter === 'CASH') return t.isDoorCash;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Organizer Studio
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Event ID: {event.id}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {event.title}
            </h1>
            <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
              <span>📍 {event.venue}, {event.city}</span>
              <span>•</span>
              <span>📅 {event.date}</span>
              <span>•</span>
              <span>⏰ {event.time}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowPairingModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-emerald-500/30 text-emerald-300 font-medium text-sm rounded-xl shadow-sm transition-all"
            >
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>Gate Pairing PIN</span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-mono font-bold text-xs">
                {event.pinCode.slice(0,3)}-{event.pinCode.slice(3)}
              </span>
            </button>

            <button
              onClick={onNavigateToBuyer}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
            >
              <ExternalLink className="w-4 h-4 stroke-[2.5]" />
              <span>Open Buyer Checkout</span>
            </button>

            {onNavigateToFunctions && (
              <button
                onClick={onNavigateToFunctions}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 text-sm font-semibold rounded-xl transition-all"
              >
                <span>Cloud Functions API</span>
              </button>
            )}

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl border border-slate-700 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Event</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core Metric Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-3">
            <span className="font-semibold uppercase tracking-wider">Total Gross Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono tracking-tight">
            {totalRevenue.toLocaleString()} <span className="text-lg text-emerald-400 font-sans font-bold">TND</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80">
            <span>Online: {onlineRevenue} TND</span>
            <span className="text-amber-400 font-medium">Door Cash: {doorCashTotal} TND</span>
          </div>
        </div>

        {/* Tickets Sold vs Capacity */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-3">
            <span className="font-semibold uppercase tracking-wider">Tickets Sold</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono tracking-tight">
            {tickets.length} <span className="text-lg text-slate-500 font-sans">/ {totalCapacity}</span>
          </div>
          <div className="mt-3 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-cyan-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, Math.round((tickets.length / (totalCapacity || 1)) * 100))}%` }}
            />
          </div>
        </div>

        {/* Door Check-In Speed */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-3">
            <span className="font-semibold uppercase tracking-wider">Gate Check-In Rate</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono tracking-tight">
            {checkedInCount} <span className="text-lg text-indigo-400 font-sans">Checked In</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80">
            <span>Progress: {tickets.length > 0 ? Math.round((checkedInCount / tickets.length) * 100) : 0}%</span>
            <button 
              onClick={onNavigateToGate}
              className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1"
            >
              Open Gate App <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Door Cash Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-3">
            <span className="font-semibold uppercase tracking-wider">Door Cash Box Audit</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-400 font-mono tracking-tight">
            {doorCashTotal} <span className="text-lg font-sans font-bold">TND</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80">
            <span>{doorCashRecords.length} cash walk-ins</span>
            <span className="text-emerald-400 font-semibold">100% Reconciled</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Quick Actions & Ticket Tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Ticket Tiers & Payment Gateways */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cover Picture & Slider Gallery Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">Event Cover Pictures & Interactive Slider</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Full-bleed carousel displayed on Vercel white-label checkout with auto-play & smooth transitions
                </p>
              </div>
              <span className="px-2.5 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg font-mono self-start sm:self-auto">
                {(event.coverImages && event.coverImages.length > 0 ? event.coverImages.length : 1)} Photos Active
              </span>
            </div>

            {/* Live Slider Preview */}
            <div>
              <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center justify-between">
                <span>Live Buyer Checkout Slider Preview</span>
                <span className="text-emerald-400 font-sans text-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Auto-rotates every 4.5s
                </span>
              </div>
              <EventCoverSlider 
                event={event} 
                showEventOverlay={true}
                aspectRatio="aspect-[16/9] sm:aspect-[21/9]"
              />
            </div>

            {/* Active Slides Manager */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                <span>Active Slides (Set Hero or Remove)</span>
                <span className="text-[11px] text-slate-500 font-normal">First image is the default social OG card</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(event.coverImages || [event.bannerUrl]).map((imgUrl, idx) => {
                  const isMain = idx === 0 || imgUrl === event.bannerUrl;
                  return (
                    <div
                      key={idx}
                      className={`relative group rounded-xl overflow-hidden border bg-slate-950/80 transition-all ${
                        isMain ? 'border-emerald-500/80 ring-1 ring-emerald-500/30' : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="aspect-[16/10] w-full overflow-hidden relative">
                        <img
                          src={imgUrl}
                          alt={`Cover ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                        {isMain && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-slate-950 shadow">
                            Hero Cover
                          </span>
                        )}
                        <span className="absolute bottom-2 left-2 text-[10px] font-mono text-slate-300">
                          Slide #{idx + 1}
                        </span>
                      </div>
                      
                      <div className="p-2 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-1">
                        {!isMain ? (
                          <button
                            type="button"
                            onClick={() => handleSetMainCover(imgUrl)}
                            className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                          >
                            <Star className="w-3 h-3" /> Set as Hero
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400" /> Default
                          </span>
                        )}

                        {(event.coverImages && event.coverImages.length > 1) && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCoverImage(idx)}
                            className="text-[11px] text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                            title="Remove picture"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add Custom URL or Pick from Presets */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
              <span className="text-xs font-bold text-white block">
                Add New Cover Picture to Slider
              </span>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Paste image URL (https://...)"
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => handleAddCoverImage()}
                  disabled={!newImageUrl.trim()}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-bold rounded-xl transition-all shadow-sm"
                >
                  Add Photo
                </button>
              </div>

              {/* Quick Presets */}
              <div className="pt-1">
                <span className="text-[11px] text-slate-400 block mb-2">
                  Or 1-click add from curated event styles:
                </span>
                <div className="flex flex-wrap gap-2">
                  {PRESET_GALLERY_IMAGES.map((preset, pIdx) => {
                    const alreadyAdded = (event.coverImages || []).includes(preset.url);
                    return (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => handleAddCoverImage(preset.url)}
                        disabled={alreadyAdded}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all ${
                          alreadyAdded
                            ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-default'
                            : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/50'
                        }`}
                      >
                        <Plus className="w-3 h-3 text-emerald-400" />
                        <span>{preset.label}</span>
                        {alreadyAdded && <span className="text-[10px] text-emerald-400 font-mono">(Added)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Ticket Tiers Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Ticket Tiers & Inventory</h3>
                <p className="text-xs text-slate-400">Atomic inventory locking prevents overselling in PostgreSQL</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowAddTierModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add Tier</span>
                </button>
                <span className="px-2.5 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg font-mono">
                  {event.tiers.length} Tiers Active
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {event.tiers.map((tier) => {
                const sold = tier.soldCount;
                const percent = Math.min(100, Math.round((sold / tier.capacity) * 100));
                const isSoldOut = sold >= tier.capacity;
                return (
                  <div
                    key={tier.id}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{tier.name}</span>
                        {tier.badge && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isSoldOut 
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {tier.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{tier.description}</p>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 sm:text-right shrink-0">
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="text-lg font-bold font-mono text-emerald-400">
                          {tier.price} <span className="text-xs text-slate-400 font-sans">TND</span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          {sold}/{tier.capacity} sold ({percent}%)
                        </div>
                        {/* Quick stock additions */}
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() => handleQuickAddTickets(tier.id, 25)}
                            title="Quick add +25 tickets to inventory (invokes update_tickets_number)"
                            className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 transition-colors"
                          >
                            +25
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAddTickets(tier.id, 50)}
                            title="Quick add +50 tickets to inventory (invokes update_tickets_number)"
                            className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 transition-colors"
                          >
                            +50
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditTier(tier)}
                          title={`Edit tier '${tier.name}' and tickets capacity`}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors border border-transparent hover:border-indigo-500/20"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {tier.soldCount === 0 && event.tiers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTier(tier.id)}
                            title={`Delete unsold tier '${tier.name}' (invokes delete_tier)`}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Connected Tunisian Payment Gateways */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-1">Direct Merchant Gateways</h3>
            <p className="text-xs text-slate-400 mb-4">
              Funds settle directly into your merchant accounts. Verified via Cloud Run Python webhooks.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* ClicToPay */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="font-bold text-sm text-white">ClicToPay (SMT)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">National CB, e-Dinar, Visa</p>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                  Active
                </span>
              </div>

              {/* Konnect */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="font-bold text-sm text-white">Konnect</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Digital cards & Diaspora</p>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                  Active
                </span>
              </div>

              {/* Flouci */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="font-bold text-sm text-white">Flouci</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">App wallet & D17 QR</p>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Event Sellers & Campus Promoters (POS Cash Accounts) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Event Sellers & Campus Promoters</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    POS Cash Ticketing
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Promoters log in using their <strong className="text-slate-200">registered Email</strong> and this event's 6-digit PIN (<span className="text-amber-400 font-mono font-bold">{event.pinCode}</span>).
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddSellerModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>+ Add Seller Profile</span>
                </button>
              </div>
            </div>

            {/* List of Sellers */}
            <div className="space-y-3">
              {sellers.filter(s => !s.eventId || s.eventId === event.id).length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <p className="text-xs text-slate-400">No sellers registered for this event yet.</p>
                  <button
                    type="button"
                    onClick={() => setShowAddSellerModal(true)}
                    className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-lg"
                  >
                    + Register First Promoter
                  </button>
                </div>
              ) : (
                sellers
                  .filter(s => !s.eventId || s.eventId === event.id)
                  .map((s) => {
                    const isCopied = copiedSellerId === s.id;
                    const loginCredentialsText = `EventPass Seller Login:\nEvent: ${event.title}\nEmail: ${s.email}\nEvent PIN: ${event.pinCode}\nPortal: https://eventpass.tn/seller`;

                    return (
                      <div
                        key={s.id}
                        className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-white text-sm">{s.name}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              {s.role}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {s.status || 'ACTIVE'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                            <span className="flex items-center gap-1 font-mono">
                              <Mail className="w-3.5 h-3.5 text-slate-500" />
                              <span className="text-slate-300">{s.email}</span>
                            </span>
                            {s.phone && (
                              <span className="flex items-center gap-1 font-mono">
                                <Phone className="w-3.5 h-3.5 text-slate-500" />
                                <span>{s.phone}</span>
                              </span>
                            )}
                          </div>

                          {/* Login Credentials Box */}
                          <div className="mt-2 inline-flex flex-wrap items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
                            <span className="text-slate-400">Login auth:</span>
                            <span className="font-mono text-white font-semibold">{s.email}</span>
                            <span className="text-slate-500">+</span>
                            <span className="font-mono font-bold text-amber-400">PIN: {event.pinCode}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(loginCredentialsText);
                              setCopiedSellerId(s.id);
                              setTimeout(() => setCopiedSellerId(null), 2000);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Credentials Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                                <span>Copy Login Details</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => onNavigateToSeller?.()}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-bold text-emerald-400 flex items-center gap-1 transition-colors"
                          >
                            <span>Open POS App</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Links, Gate PIN & QR Pairing */}
        <div className="space-y-6">
          {/* Public Checkout Link Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-emerald-400" />
                Public Checkout Link
              </h3>
              <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                Share Link
              </span>
            </div>
            
            <p className="text-xs text-slate-400">
              Put this in your Instagram bio, TikTok, or WhatsApp status. Zero buyer registration friction.
            </p>

            <div className="flex items-center gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <input
                type="text"
                readOnly
                value={publicCheckoutUrl}
                className="bg-transparent text-slate-300 w-full outline-none font-mono text-xs"
              />
              <button
                onClick={handleCopyLink}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Copy Link"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {publicQrUrl && (
              <div className="pt-2 flex flex-col items-center">
                <div className="p-3 bg-white rounded-xl shadow-md">
                  <img src={publicQrUrl} alt="Public Checkout QR" className="w-36 h-36" />
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-mono">
                  Scan to buy tickets directly
                </p>
              </div>
            )}

            <button
              onClick={onNavigateToBuyer}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <span>Test Buyer Experience</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Gate Crew Pairing Card */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Door Staff Access
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                Gate Only
              </span>
            </div>

            <p className="text-xs text-slate-300">
              No bouncer accounts or passwords needed. Staff enter this 6-digit PIN into the scanner app:
            </p>

            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">6-Digit Gate PIN</span>
                <span className="text-2xl font-black font-mono tracking-widest text-emerald-400">
                  {event.pinCode.slice(0, 3)}-{event.pinCode.slice(3)}
                </span>
              </div>
              <button
                onClick={handleCopyPin}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg flex items-center gap-1.5"
              >
                {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPin ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <button
              onClick={onNavigateToGate}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              <span>Launch Gate Scanner App</span>
            </button>
          </div>

          {/* Ticket Sellers & Ambassador Network Card */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Ticket Sellers & Cash Network
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                Paperless POS
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Replace physical ticket printing: campus ambassadors & promoters collect cash, enter buyer info, and auto-dispatch PDF tickets.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Seller Cash Tickets</span>
                <span className="text-lg font-black text-white font-mono mt-0.5 block">
                  {tickets.filter(t => t.paymentMethod === 'seller_cash').length}
                </span>
              </div>
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Cash in Hand</span>
                <span className="text-lg font-black text-emerald-400 font-mono mt-0.5 block">
                  {tickets.filter(t => t.paymentMethod === 'seller_cash').reduce((sum, t) => sum + t.price, 0)} TND
                </span>
              </div>
            </div>

            {onNavigateToSeller && (
              <button
                onClick={onNavigateToSeller}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2"
              >
                <Coins className="w-4 h-4 text-emerald-400" />
                <span>Open Cash Seller POS</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Attendee Roster & Cash Audit Log Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">Live Attendee Roster & Door Audit</h3>
            <p className="text-xs text-slate-400">
              Real-time synchronization between online checkouts, door cash, and bouncer scans
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search attendee or ticket..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 outline-none w-48"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {(['ALL', 'VALID', 'CHECKED_IN', 'CASH'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    statusFilter === filter
                      ? 'bg-slate-800 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Ticket ID / Hash</th>
                <th className="py-3 px-4">Attendee</th>
                <th className="py-3 px-4">Tier</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Gate Status</th>
                <th className="py-3 px-4">Check-in Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No tickets found matching your query
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-300">
                      {t.id}
                      <span className="block text-[10px] text-slate-500 font-mono font-normal">
                        {t.qrHash}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{t.buyerName}</div>
                      <div className="text-[11px] text-slate-400">{t.buyerPhone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-300 font-medium">{t.tierName}</span>
                      <span className="block text-emerald-400 font-mono">{t.price} TND</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        t.paymentMethod === 'clictopay' ? 'bg-indigo-500/20 text-indigo-400' :
                        t.paymentMethod === 'konnect' ? 'bg-purple-500/20 text-purple-400' :
                        t.paymentMethod === 'flouci' ? 'bg-cyan-500/20 text-cyan-400' :
                        t.paymentMethod === 'seller_cash' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {t.paymentMethod === 'cash_door' ? 'Door Cash' : t.paymentMethod === 'seller_cash' ? 'Seller Cash' : t.paymentMethod}
                      </span>
                      {t.soldBySeller && (
                        <span className="block text-[10px] text-emerald-400/90 font-mono mt-0.5 truncate max-w-[150px]" title={t.soldBySeller}>
                          by {t.soldBySeller}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {t.status === 'CHECKED_IN' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <Check className="w-3 h-3" /> Checked In
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                          Valid (Unscanned)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {t.checkedInAt ? (
                        <div>
                          <span className="text-slate-200">
                            {new Date(t.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="block text-[10px] text-slate-500">
                            by {t.checkedInBy || 'Gate Device'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Gate Pairing QR & PIN */}
      {showPairingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Door Staff Gate Pairing</h3>
                <p className="text-xs text-slate-400">Scan QR or enter 6-digit PIN in the gate app</p>
              </div>
              <button
                onClick={() => setShowPairingModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl flex flex-col items-center justify-center">
              {gateQrUrl && <img src={gateQrUrl} alt="Gate Pairing QR" className="w-56 h-56" />}
              <span className="text-[11px] text-slate-600 font-mono mt-2">
                Bouncer scans this screen to instant-pair
              </span>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-1">
              <span className="text-xs text-slate-400 uppercase font-mono">Manual Entry PIN</span>
              <div className="text-3xl font-extrabold text-emerald-400 font-mono tracking-widest">
                {event.pinCode.slice(0, 3)}-{event.pinCode.slice(3)}
              </div>
            </div>

            <button
              onClick={() => {
                setShowPairingModal(false);
                onNavigateToGate();
              }}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all"
            >
              Open Gate Scanner Now
            </button>
          </div>
        </div>
      )}

      {/* Modal: Create New Event */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Create New Event</h3>
                <p className="text-xs text-slate-400">Sets up checkout URL, gate PIN, and ticket tiers</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sidi Bou Said Rooftop Sunset Session"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Venue / Club *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ennejma Ezzahra"
                    value={newEventVenue}
                    onChange={(e) => setNewEventVenue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={newEventCity}
                    onChange={(e) => setNewEventCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Hours</label>
                  <input
                    type="text"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Tier Setup */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <span className="font-bold text-slate-300 block">Initial Ticket Tier</span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="text-slate-400 block mb-1">Tier Name</label>
                    <input
                      type="text"
                      value={newTierName}
                      onChange={(e) => setNewTierName(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Price (TND)</label>
                    <input
                      type="number"
                      value={newTierPrice}
                      onChange={(e) => setNewTierPrice(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Capacity</label>
                    <input
                      type="number"
                      value={newTierCap}
                      onChange={(e) => setNewTierCap(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Campus Promoters / Sellers (Optional) */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-300 block text-xs">Campus Promoters & Sellers (Optional)</span>
                    <span className="text-[10px] text-slate-400">Can also be added anytime after event creation</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInitialSellers(prev => [...prev, { name: '', email: '', phone: '' }])}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3 h-3" /> Add Seller
                  </button>
                </div>

                <div className="space-y-2">
                  {initialSellers.map((seller, sIdx) => (
                    <div key={sIdx} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Seller Name (e.g. Amine)"
                        value={seller.name}
                        onChange={(e) => {
                          const updated = [...initialSellers];
                          updated[sIdx].name = e.target.value;
                          setInitialSellers(updated);
                        }}
                        className="px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs"
                      />
                      <input
                        type="email"
                        placeholder="Email (used for login)"
                        value={seller.email}
                        onChange={(e) => {
                          const updated = [...initialSellers];
                          updated[sIdx].email = e.target.value;
                          setInitialSellers(updated);
                        }}
                        className="px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs"
                      />
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="Phone (+216...)"
                          value={seller.phone}
                          onChange={(e) => {
                            const updated = [...initialSellers];
                            updated[sIdx].phone = e.target.value;
                            setInitialSellers(updated);
                          }}
                          className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs"
                        />
                        {initialSellers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setInitialSellers(prev => prev.filter((_, idx) => idx !== sIdx))}
                            className="p-1.5 text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Gateways Toggle */}
              <div>
                <label className="block text-slate-300 font-medium mb-2">Enabled Tunisian Gateways</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableClicToPay}
                      onChange={(e) => setEnableClicToPay(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    <span className="text-slate-300">ClicToPay (SMT) - National Carte Bancaire & e-Dinar</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableKonnect}
                      onChange={(e) => setEnableKonnect(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    <span className="text-slate-300">Konnect - Online Payment Gateway</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableFlouci}
                      onChange={(e) => setEnableFlouci(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    <span className="text-slate-300">Flouci - Mobile Wallet & D17 QR</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  Create & Launch Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add New Ticket Tier to Active Event */}
      {showAddTierModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                    Live Inventory Expansion
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">Add Ticket Tier</h3>
                <p className="text-xs text-slate-400 truncate max-w-[280px]">
                  Adding to {event.title}
                </p>
              </div>
              <button
                onClick={() => setShowAddTierModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTierSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Tier Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Phase 2 - Late Bird or VIP Table"
                  value={addTierName}
                  onChange={(e) => setAddTierName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Price (TND) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={addTierPrice}
                    onChange={(e) => setAddTierPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Ticket Capacity *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    step={1}
                    value={addTierCapacity}
                    onChange={(e) => setAddTierCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Highlight Badge (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fast Selling, VIP Only, Late Bird"
                  value={addTierBadge}
                  onChange={(e) => setAddTierBadge(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Tier Description / Perks
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Access to main stage + express gate line..."
                  value={addTierDesc}
                  onChange={(e) => setAddTierDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>Potential Gross Tier Value:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {(Number(addTierPrice) * Number(addTierCapacity)).toLocaleString()} TND
                  </span>
                </div>
                <p className="text-slate-500">
                  Once added, this tier instantly appears on your public checkout link and door cash register.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddTierModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
                >
                  Add Ticket Tier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Register Promoter / Seller Account to Event (Post-Creation) */}
      {showAddSellerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                    Seller Account Provisioning
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">Add Campus Seller / Promoter</h3>
                <p className="text-xs text-slate-400 truncate max-w-[280px]">
                  For {event.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSellerModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSellerSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Promoter Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Yassine Ben Amor"
                  value={newSellerName}
                  onChange={(e) => setNewSellerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Seller Email Address * (Used for POS login)
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. yassine@promoters.tn"
                  value={newSellerEmail}
                  onChange={(e) => setNewSellerEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+216 22 456 789"
                    value={newSellerPhone}
                    onChange={(e) => setNewSellerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Role / Territory
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Campus Ambassador"
                    value={newSellerRole}
                    onChange={(e) => setNewSellerRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Login Credentials Preview */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                <div className="flex items-center gap-1.5 text-white font-semibold">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Assigned Authentication Credentials</span>
                </div>
                <p className="text-slate-400">
                  The seller will log in to the POS Cash Desk using:
                </p>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] space-y-0.5">
                  <div>Email: <span className="text-emerald-400">{newSellerEmail || 'seller@promoters.tn'}</span></div>
                  <div>Event PIN: <span className="text-amber-400 font-bold">{event.pinCode}</span></div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddSellerModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
                >
                  Register Seller Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Ticket Tier & Tickets Number */}
      {editingTier && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  <span className="text-[11px] font-mono text-indigo-400 uppercase tracking-wider font-semibold">
                    Cloud Run: update_tier / update_tickets_number
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">Update Tier & Tickets</h3>
                <p className="text-xs text-slate-400 truncate max-w-[280px]">
                  Modifying {editingTier.name} ({event.title})
                </p>
              </div>
              <button
                onClick={() => setEditingTier(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateTierSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Tier Name *
                </label>
                <input
                  type="text"
                  required
                  value={editTierName}
                  onChange={(e) => setEditTierName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Price (TND) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={editTierPrice}
                    onChange={(e) => setEditTierPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Total Capacity (Tickets) *
                  </label>
                  <input
                    type="number"
                    required
                    min={editingTier.soldCount}
                    step={1}
                    value={editTierCapacity}
                    onChange={(e) => setEditTierCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Quick Ticket Stock Adjusters */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Quick Add Tickets to Capacity:</span>
                  <div className="flex items-center gap-1.5">
                    {[10, 25, 50, 100].map((delta) => (
                      <button
                        key={delta}
                        type="button"
                        onClick={() => setEditTierCapacity(prev => Number(prev) + delta)}
                        className="px-2 py-1 rounded bg-slate-900 hover:bg-indigo-600/30 text-indigo-300 border border-slate-800 hover:border-indigo-500/50 text-[11px] font-mono font-semibold transition-colors"
                      >
                        +{delta}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-900 text-slate-400">
                  <div>
                    Sold Count: <span className="font-mono font-bold text-white">{editingTier.soldCount} tickets</span>
                  </div>
                  <div className="text-right">
                    Available Stock: <span className="font-mono font-bold text-emerald-400">{Math.max(0, editTierCapacity - editingTier.soldCount)} tickets</span>
                  </div>
                </div>

                {editTierCapacity < editingTier.soldCount && (
                  <p className="text-rose-400 text-[10px] font-medium">
                    ⚠️ Capacity cannot be lower than sold tickets ({editingTier.soldCount}).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Highlight Badge (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fast Selling, VIP Only, Late Bird"
                  value={editTierBadge}
                  onChange={(e) => setEditTierBadge(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Tier Description / Perks
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Access to main stage + express gate line..."
                  value={editTierDesc}
                  onChange={(e) => setEditTierDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTier(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editTierCapacity < editingTier.soldCount}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {tierToast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center gap-2.5 backdrop-blur-md animate-in slide-in-from-bottom-5 ${
          tierToast.type === 'success'
            ? 'bg-slate-900/95 border-emerald-500/50 text-emerald-200'
            : 'bg-slate-900/95 border-rose-500/50 text-rose-200'
        }`}>
          {tierToast.type === 'success' ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping shrink-0" />
          )}
          <span>{tierToast.message}</span>
        </div>
      )}
    </div>
  );
};
