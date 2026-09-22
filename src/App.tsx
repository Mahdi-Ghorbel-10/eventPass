import React, { useState } from 'react';
import { EventData, Ticket, DoorCashRecord, SellerProfile } from './types';
import { INITIAL_EVENTS, INITIAL_TICKETS, INITIAL_SELLERS } from './data/mockData';
import { HeaderNav, AppMode } from './components/HeaderNav';
import { OrganizerStudio } from './components/OrganizerStudio';
import { BuyerCheckout } from './components/BuyerCheckout';
import { CashTicketSeller } from './components/CashTicketSeller';
import { GateScanner } from './components/GateScanner';
import { CloudRunFunctionsTester } from './components/CloudRunFunctionsTester';
import { ArchitectureDocs } from './components/ArchitectureDocs';

export default function App() {
  const [events, setEvents] = useState<EventData[]>(INITIAL_EVENTS);
  const [activeEventId, setActiveEventId] = useState<string>(INITIAL_EVENTS[0].id);
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [sellers, setSellers] = useState<SellerProfile[]>(INITIAL_SELLERS);
  const [doorCashRecords, setDoorCashRecords] = useState<DoorCashRecord[]>([]);
  const [currentMode, setCurrentMode] = useState<AppMode>('functions');
  const [incomingTestTicket, setIncomingTestTicket] = useState<Ticket | null>(null);

  const handleAddSeller = (newSeller: SellerProfile) => {
    setSellers(prev => [newSeller, ...prev]);
  };

  const handleAddSellers = (newSellers: SellerProfile[]) => {
    setSellers(prev => [...newSellers, ...prev]);
  };

  // Active event resolution
  const activeEvent = events.find(e => e.id === activeEventId) || events[0];
  const activeTickets = tickets.filter(t => t.eventId === activeEvent.id);

  // Compute live event stats
  const totalTicketsSold = activeTickets.length;
  const totalCheckedIn = activeTickets.filter(t => t.status === 'CHECKED_IN').length;
  const totalRevenueTnd = activeTickets.reduce((sum, t) => sum + t.price, 0);

  // Handlers for state updates
  const handleUpdateEvent = (updated: EventData) => {
    setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
  };

  const handleCreateNewEvent = (newEvent: EventData) => {
    setEvents(prev => [newEvent, ...prev]);
    setActiveEventId(newEvent.id);
  };

  const handleTicketPurchased = (newTicket: Ticket) => {
    setTickets(prev => [newTicket, ...prev]);
    // Also increment tier soldCount in the active event
    setEvents(prev => prev.map(ev => {
      if (ev.id === newTicket.eventId) {
        return {
          ...ev,
          tiers: ev.tiers.map(tr => {
            if (tr.id === newTicket.tierId) {
              return { ...tr, soldCount: tr.soldCount + 1 };
            }
            return tr;
          })
        };
      }
      return ev;
    }));
  };

  const handleRecordDoorCash = (record: DoorCashRecord, newTicket: Ticket) => {
    setDoorCashRecords(prev => [record, ...prev]);
    handleTicketPurchased(newTicket);
  };

  const handleRecordCashSale = (newTicket: Ticket, cashRecord: DoorCashRecord) => {
    setDoorCashRecords(prev => [cashRecord, ...prev]);
    handleTicketPurchased(newTicket);
  };

  const handleCheckInTicket = (ticketId: string, bouncerName: string) => {
    const existing = tickets.find(t => t.id === ticketId);
    if (!existing) {
      return { success: false };
    }
    if (existing.status === 'CHECKED_IN') {
      return {
        success: false,
        ticket: existing,
        alreadyCheckedInAt: existing.checkedInAt,
        checkedInBy: existing.checkedInBy
      };
    }

    const updatedTicket: Ticket = {
      ...existing,
      status: 'CHECKED_IN',
      checkedInAt: new Date().toISOString(),
      checkedInBy: bouncerName
    };

    setTickets(prev => prev.map(t => t.id === ticketId ? updatedTicket : t));
    return { success: true, ticket: updatedTicket };
  };

  const handleResetData = () => {
    setEvents(INITIAL_EVENTS);
    setActiveEventId(INITIAL_EVENTS[0].id);
    setTickets(INITIAL_TICKETS);
    setDoorCashRecords([]);
    setIncomingTestTicket(null);
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Universal Responsive Header */}
      <HeaderNav
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        activeEvent={activeEvent}
        totalTicketsSold={totalTicketsSold}
        totalCheckedIn={totalCheckedIn}
        totalRevenueTnd={totalRevenueTnd}
        onResetData={handleResetData}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentMode === 'organizer' && (
          <OrganizerStudio
            event={activeEvent}
            tickets={activeTickets}
            sellers={sellers}
            onAddSeller={handleAddSeller}
            onAddSellers={handleAddSellers}
            doorCashRecords={doorCashRecords}
            onUpdateEvent={handleUpdateEvent}
            onCreateNewEvent={handleCreateNewEvent}
            onNavigateToBuyer={() => setCurrentMode('buyer')}
            onNavigateToGate={() => setCurrentMode('gate')}
            onNavigateToSeller={() => setCurrentMode('seller')}
            onNavigateToFunctions={() => setCurrentMode('functions')}
          />
        )}

        {currentMode === 'buyer' && (
          <BuyerCheckout
            event={activeEvent}
            onTicketPurchased={handleTicketPurchased}
            onNavigateToGateWithTicket={(ticket) => {
              setIncomingTestTicket(ticket);
              setCurrentMode('gate');
            }}
            onBackToStudio={() => setCurrentMode('organizer')}
          />
        )}

        {currentMode === 'seller' && (
          <CashTicketSeller
            event={activeEvent}
            events={events}
            onSelectEvent={setActiveEventId}
            sellers={sellers}
            tickets={activeTickets}
            doorCashRecords={doorCashRecords}
            onRecordCashSale={handleRecordCashSale}
            onNavigateToScan={() => setCurrentMode('gate')}
            onBackToStudio={() => setCurrentMode('organizer')}
          />
        )}

        {currentMode === 'gate' && (
          <GateScanner
            event={activeEvent}
            events={events}
            onSelectEvent={setActiveEventId}
            tickets={activeTickets}
            doorCashRecords={doorCashRecords}
            onCheckInTicket={handleCheckInTicket}
            onRecordDoorCash={handleRecordDoorCash}
            incomingTestTicket={incomingTestTicket}
            onClearIncomingTicket={() => setIncomingTestTicket(null)}
            onNavigateToSell={() => setCurrentMode('seller')}
          />
        )}

        {currentMode === 'functions' && (
          <CloudRunFunctionsTester
            event={activeEvent}
            tickets={activeTickets}
            onCheckInTicket={handleCheckInTicket}
          />
        )}

        {currentMode === 'architecture' && (
          <ArchitectureDocs />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400 font-mono">EventPass.tn</span>
            <span>•</span>
            <span>Tunisia Ticketing & Gate Validation Engine</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>ClicToPay SMT Verified</span>
            <span>•</span>
            <span>Cloud Run Python 3.12</span>
            <span>•</span>
            <span>Sub-300ms SLA</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
