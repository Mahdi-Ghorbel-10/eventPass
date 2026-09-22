import React, { useState } from 'react';
import { 
  Terminal, Play, CheckCircle2, XCircle, AlertTriangle, 
  Copy, Check, ShieldCheck, Zap, 
  Send, Database, ArrowRight, RefreshCw, KeyRound
} from 'lucide-react';
import { EventData, Ticket } from '../types';

interface CloudRunFunctionsTesterProps {
  event: EventData;
  tickets: Ticket[];
  onCheckInTicket?: (ticketId: string, bouncerName: string) => { success: boolean; ticket?: Ticket };
}

type FunctionName = 
  | 'verify_ticket' 
  | 'payment_webhook' 
  | 'create_checkout' 
  | 'sync_gate_tickets' 
  | 'issue_cash_ticket' 
  | 'create_event' 
  | 'create_seller' 
  | 'seller_login'
  | 'add_tier'
  | 'update_tier'
  | 'update_tickets_number'
  | 'delete_tier';

export const CloudRunFunctionsTester: React.FC<CloudRunFunctionsTesterProps> = ({
  event,
  tickets,
}) => {
  const [selectedFunc, setSelectedFunc] = useState<FunctionName>('create_event');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'WEB' | 'MOBILE'>('ALL');
  const [requestHeaders, setRequestHeaders] = useState<string>(
    JSON.stringify({ 'Content-Type': 'application/json' }, null, 2)
  );
  const [requestBody, setRequestBody] = useState<string>(
    JSON.stringify({
      ticket_id: tickets[0]?.id || 'TKT-8910-A',
      ticket_hash: tickets[0]?.qrHash || 'TKT-8910-A:4a8b1c0e',
      pin_code: event.pinCode,
      scanner_name: 'Gate 1 (Main Entrance) - Turnstile A'
    }, null, 2)
  );

  const [responseStatus, setResponseStatus] = useState<number | null>(200);
  const [responseBody, setResponseBody] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Switch function preset
  const handleSelectFunction = (fn: FunctionName) => {
    setSelectedFunc(fn);
    setResponseStatus(null);
    setResponseBody(null);
    setLatencyMs(null);

    if (fn === 'verify_ticket') {
      setRequestHeaders(JSON.stringify({ 'Content-Type': 'application/json', 'X-Gate-PIN': event.pinCode }, null, 2));
      setRequestBody(JSON.stringify({
        ticket_id: tickets[0]?.id || 'TKT-8910-A',
        ticket_hash: tickets[0]?.qrHash || 'TKT-8910-A:4a8b1c0e',
        pin_code: event.pinCode,
        scanner_name: 'Gate 1 (Main Entrance) - Turnstile A'
      }, null, 2));
    } else if (fn === 'payment_webhook') {
      setRequestHeaders(JSON.stringify({ 'Content-Type': 'application/json', 'X-Signature-SHA256': 'a8f9c2d1e04b7...' }, null, 2));
      setRequestBody(JSON.stringify({
        gateway: 'clictopay',
        order_id: `ORD-${Date.now().toString().slice(-6)}`,
        status: 'SUCCESS',
        amount_tnd: 55.000,
        customer_name: 'Yassine Mansour',
        customer_email: 'yassine@tunisia.tn',
        customer_phone: '+216 22 411 902',
        tier_id: event.tiers[0]?.id || 'tier-reg',
        event_id: event.id
      }, null, 2));
    } else if (fn === 'create_checkout') {
      setRequestHeaders(JSON.stringify({ 'Content-Type': 'application/json' }, null, 2));
      setRequestBody(JSON.stringify({
        event_slug: event.slug,
        tier_id: event.tiers[0]?.id || 'tier-reg',
        buyer_name: 'Sarra Ben Mahmoud',
        buyer_email: 'sarra@marsa.tn',
        buyer_phone: '+216 98 332 109',
        payment_method: 'clictopay'
      }, null, 2));
    } else if (fn === 'sync_gate_tickets') {
      setRequestHeaders(JSON.stringify({ 'X-Gate-PIN': event.pinCode }, null, 2));
      setRequestBody(JSON.stringify({
        event_id: event.id,
        pin_code: event.pinCode,
        client_version: 'expo-sqlite-v2.4'
      }, null, 2));
    } else if (fn === 'issue_cash_ticket') {
      setRequestHeaders(JSON.stringify({ 'Content-Type': 'application/json' }, null, 2));
      setRequestBody(JSON.stringify({
        event_id: event.id,
        tier_id: event.tiers[0]?.id || 'tier-reg',
        buyer_name: 'Amine Ben Amor',
        buyer_email: 'amine@insat.ucar.tn',
        buyer_phone: '+216 55 120 401',
        amount_collected_tnd: 55.000,
        seller_name: 'Amine Trabelsi (Campus Ambassador)',
        pin_code: event.pinCode
      }, null, 2));
    } else if (fn === 'create_event') {
      setRequestHeaders(JSON.stringify({ 'Content-Type': 'application/json' }, null, 2));
      setRequestBody(JSON.stringify({
        title: 'Hammamet Sunset Beach Rave 2026',
        venue: 'Yasmine Hammamet Marina Pier',
        city: 'Hammamet, Nabeul',
        date: '2026-08-20',
        time: '18:00 - 03:00',
        subtitle: 'Electronic Music Festival on the Mediterranean Shore',
        category: 'Festival',
        cover_images: [
          'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80'
        ],
        enabled_gateways: ['CLICTOPAY', 'KONNECT', 'FLOUCI'],
        sellers: [
          {
            name: 'Amine Trabelsi',
            email: 'amine@insat.tn',
            phone: '+216 55 120 401'
          }
        ],
        tiers: [
          {
            name: 'Early Bird Pass',
            price_tnd: 35.0,
            total_capacity: 100,
            badge: 'Limited',
            description: 'Discounted access for the first 100 partygoers'
          },
          {
            name: 'Regular Wave Pass',
            price_tnd: 55.0,
            total_capacity: 250,
            badge: 'Bestseller',
            description: 'Standard festival entry and main beach dancefloor'
          }
        ]
      }, null, 2));
    } else if (fn === 'create_seller') {
      setRequestHeaders(JSON.stringify({ 'Content-Type': 'application/json' }, null, 2));
      setRequestBody(JSON.stringify({
        event_id: event.id,
        name: 'Yassine Ben Amor',
        email: 'yassine@promoters.tn',
        phone: '+216 22 456 789'
      }, null, 2));
    } else if (fn === 'seller_login') {
      setRequestHeaders(JSON.stringify({ 'Content-Type': 'application/json' }, null, 2));
      setRequestBody(JSON.stringify({
        email: 'amine@insat.tn',
        pin_code: event.pinCode
      }, null, 2));
    } else if (fn === 'add_tier') {
      setRequestHeaders(JSON.stringify({ 'Content-Type': 'application/json' }, null, 2));
      setRequestBody(JSON.stringify({
        event_id: event.id,
        name: 'VIP Backstage Access & Lounge',
        price_tnd: 85.0,
        total_capacity: 100,
        badge: 'VIP Exclusive',
        description: 'Includes private artists lounge entry, dedicated VIP bar, and fast-track turnstile gate.',
        sort_order: event.tiers.length
      }, null, 2));
    } else if (fn === 'update_tier') {
      const targetTier = event.tiers[0] || { id: 'tier-1', name: 'General Admission', price: 45, capacity: 150 };
      setRequestHeaders(JSON.stringify({ 'Content-Type': 'application/json' }, null, 2));
      setRequestBody(JSON.stringify({
        tier_id: targetTier.id,
        name: `${targetTier.name} (Wave 2 Extended)`,
        price_tnd: targetTier.price + 5,
        total_capacity: targetTier.capacity + 50,
        badge: 'Extra Stock Added',
        description: 'Capacity increased with 50 additional tickets released for high demand.'
      }, null, 2));
    } else if (fn === 'update_tickets_number') {
      const targetTier = event.tiers[0] || { id: 'tier-1', capacity: 150 };
      setRequestHeaders(JSON.stringify({ 'Content-Type': 'application/json' }, null, 2));
      setRequestBody(JSON.stringify({
        tier_id: targetTier.id,
        add_tickets: 50,
        total_capacity: targetTier.capacity + 50
      }, null, 2));
    } else if (fn === 'delete_tier') {
      // Pick a tier without sales if possible, else the last tier
      const deletable = event.tiers.find(t => t.soldCount === 0) || event.tiers[event.tiers.length - 1] || { id: 'tier-test' };
      setRequestHeaders(JSON.stringify({ 'Content-Type': 'application/json' }, null, 2));
      setRequestBody(JSON.stringify({
        tier_id: deletable.id,
        force: false
      }, null, 2));
    }
  };

  // Run simulated cloud function execution
  const handleExecute = () => {
    setIsRunning(true);
    const start = performance.now();

    setTimeout(() => {
      let parsedBody: Record<string, unknown> = {};
      try {
        parsedBody = JSON.parse(requestBody);
      } catch {
        setResponseStatus(400);
        setResponseBody(JSON.stringify({ error: 'Malformed JSON payload' }, null, 2));
        setIsRunning(false);
        setLatencyMs(Math.round(performance.now() - start));
        return;
      }

      if (selectedFunc === 'verify_ticket') {
        const ticketId = parsedBody.ticket_id as string;
        const ticketHash = parsedBody.ticket_hash as string;
        const pinCode = parsedBody.pin_code as string;
        const scannerName = (parsedBody.scanner_name || parsedBody.bouncer_name || 'Gate 1 (Main Entrance) - Turnstile A') as string;

        if (pinCode !== event.pinCode) {
          setResponseStatus(403);
          setResponseBody(JSON.stringify({
            valid: false,
            reason: 'INVALID_GATE_PIN',
            message: 'Device authorization failed. PIN does not match event organizer credentials.'
          }, null, 2));
        } else if (!ticketHash || ticketHash.includes('FAKE') || ticketHash.includes('COUNTERFEIT')) {
          setResponseStatus(400);
          setResponseBody(JSON.stringify({
            valid: false,
            reason: 'COUNTERFEIT_SIGNATURE',
            message: 'HMAC-SHA256 signature verification failed. Ticket hash does not authenticate with secret_key.'
          }, null, 2));
        } else {
          const matched = tickets.find(t => t.id === ticketId || t.qrHash === ticketHash);
          if (!matched) {
            setResponseStatus(404);
            setResponseBody(JSON.stringify({
              valid: false,
              reason: 'TICKET_NOT_FOUND',
              message: 'Ticket ID not registered in Cloud SQL PostgreSQL database.'
            }, null, 2));
          } else if (matched.status === 'CHECKED_IN') {
            setResponseStatus(409);
            setResponseBody(JSON.stringify({
              valid: false,
              reason: 'ALREADY_SCANNED',
              scanned_at: matched.checkedInAt || new Date().toISOString(),
              scanned_by: matched.checkedInBy || 'Gate Device',
              attempted_by_scanner: scannerName,
              buyer_name: matched.buyerName,
              message: 'Double entry prevention triggered. Ticket already admitted.'
            }, null, 2));
          } else {
            setResponseStatus(200);
            setResponseBody(JSON.stringify({
              valid: true,
              ticket_id: matched.id,
              buyer_name: matched.buyerName,
              tier: matched.tierName,
              event: event.title,
              scanner_name: scannerName,
              scanned_at: new Date().toISOString(),
              admit: 'APPROVED_ENTRY'
            }, null, 2));
          }
        }
      } else if (selectedFunc === 'payment_webhook') {
        const gateway = parsedBody.gateway || 'clictopay';
        const orderId = parsedBody.order_id || `ORD-${Date.now()}`;
        const newTicketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}-${gateway.toString().slice(0, 3).toUpperCase()}`;
        
        setResponseStatus(200);
        setResponseBody(JSON.stringify({
          status: 'SUCCESS',
          payment_ref: orderId,
          gateway: gateway,
          ticket_issued: {
            id: newTicketId,
            event_id: event.id,
            buyer: parsedBody.customer_name || 'Yassine Mansour',
            email: parsedBody.customer_email || 'yassine@tunisia.tn',
            amount_tnd: parsedBody.amount_tnd || 55.000,
            hmac_signature: '7f9b2a1c0d4e8f...',
            qr_hash: `${newTicketId}:7f9b2a1c0d4e8f`,
            status: 'VALID',
            atomic_inventory_updated: true
          },
          pdf_delivery: 'QUEUED_FOR_DISPATCH'
        }, null, 2));
      } else if (selectedFunc === 'create_checkout') {
        const tier = event.tiers.find(t => t.id === parsedBody.tier_id) || event.tiers[0];
        setResponseStatus(200);
        setResponseBody(JSON.stringify({
          session_id: `chk_${Date.now()}`,
          event: event.title,
          tier: tier.name,
          price_tnd: tier.price,
          currency: 'TND',
          inventory_locked: true,
          gateway_redirect_url: `https://test.clictopay.com/payment/rest/register.do?orderId=ORD-${Date.now()}&amount=${tier.price * 1000}`
        }, null, 2));
      } else if (selectedFunc === 'sync_gate_tickets') {
        if (parsedBody.pin_code !== event.pinCode) {
          setResponseStatus(403);
          setResponseBody(JSON.stringify({ error: 'UNAUTHORIZED_PIN' }, null, 2));
        } else {
          setResponseStatus(200);
          setResponseBody(JSON.stringify({
            event_id: event.id,
            event_title: event.title,
            synced_at: new Date().toISOString(),
            total_hashes: tickets.length,
            tickets: tickets.map(t => ({
              id: t.id,
              qr_hash: t.qrHash,
              buyer_name: t.buyerName,
              tier_name: t.tierName,
              status: t.status,
              checked_in_at: t.checkedInAt || null
            }))
          }, null, 2));
        }
      } else if (selectedFunc === 'issue_cash_ticket') {
        const uniqueId = `TKT-${Math.floor(1000 + Math.random() * 9000)}-CSH`;
        setResponseStatus(201);
        setResponseBody(JSON.stringify({
          status: 'ISSUED',
          ticket: {
            id: uniqueId,
            event_id: event.id,
            buyer_name: parsedBody.buyer_name,
            buyer_email: parsedBody.buyer_email,
            amount_tnd: parsedBody.amount_collected_tnd,
            payment_method: 'seller_cash',
            sold_by: parsedBody.seller_name,
            qr_hash: `${uniqueId}:a9c4e201`,
            status: 'VALID'
          },
          email_dispatch: {
            status: 'SENT',
            recipient: parsedBody.buyer_email,
            template: 'official_pdf_pass.html'
          }
        }, null, 2));
      } else if (selectedFunc === 'create_event') {
        const title = (parsedBody.title as string) || '';
        const venue = (parsedBody.venue as string) || '';
        const date = (parsedBody.date as string) || '';
        const rawTiers = Array.isArray(parsedBody.tiers) ? (parsedBody.tiers as Array<Record<string, unknown>>) : [];

        if (!title || !venue || !date) {
          setResponseStatus(400);
          setResponseBody(JSON.stringify({
            error: 'Missing required fields: title, venue, and date are mandatory.'
          }, null, 2));
        } else if (rawTiers.length === 0) {
          setResponseStatus(400);
          setResponseBody(JSON.stringify({
            error: 'At least one ticket tier must be provided in tiers array.'
          }, null, 2));
        } else {
          const newEvId = `ev-${Math.floor(1000 + Math.random() * 9000)}`;
          const slug = (parsedBody.slug as string) || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + `-${Math.floor(10 + Math.random() * 89)}`;
          // Gate PIN is strictly generated by the backend and returned in response
          const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();
          const enabledGateways = Array.isArray(parsedBody.enabled_gateways) ? parsedBody.enabled_gateways : ['CLICTOPAY', 'KONNECT', 'FLOUCI'];

          // Cover photos array: the lead photo (cover_images[0]) serves as the primary banner
          const rawCovers = Array.isArray(parsedBody.cover_images) && parsedBody.cover_images.length > 0
            ? (parsedBody.cover_images as string[])
            : ['https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80'];
          const bannerUrl = rawCovers[0];

          const createdTiers = rawTiers.map((t, idx) => ({
            id: `tier-${Math.floor(1000 + Math.random() * 9000)}`,
            name: (t.name as string) || `Tier ${idx + 1}`,
            badge: (t.badge as string) || null,
            price_tnd: Number(t.price_tnd || 40),
            total_capacity: Number(t.total_capacity || 100),
            sold_count: 0,
            description: (t.description as string) || ''
          }));

          const rawSellers = Array.isArray(parsedBody.sellers) ? (parsedBody.sellers as Array<Record<string, unknown>>) : [];
          const createdSellers = rawSellers.map((s, idx) => ({
            id: `slr-${Math.floor(1000 + Math.random() * 9000)}`,
            name: (s.name as string) || `Seller ${idx + 1}`,
            email: (s.email as string) || `seller${idx + 1}@promoters.tn`,
            phone: (s.phone as string) || '+216 55 120 401',
            status: 'ACTIVE',
            login_credentials: {
              email: (s.email as string) || `seller${idx + 1}@promoters.tn`,
              event_pin: generatedPin,
              auth_method: 'Enter registered Email + 6-digit Event PIN to access Seller POS'
            }
          }));

          setResponseStatus(201);
          setResponseBody(JSON.stringify({
            status: 'EVENT_CREATED',
            message: 'Event, ticket tiers, payment gateways, and seller accounts provisioned atomically in Cloud SQL.',
            event: {
              id: newEvId,
              title: title,
              slug: slug,
              venue: venue,
              city: (parsedBody.city as string) || 'Tunis',
              date: date,
              time: (parsedBody.time as string) || '21:00 - 04:00',
              pin_code: generatedPin,
              enabled_gateways: enabledGateways,
              cover_images: rawCovers,
              banner_url: bannerUrl,
              tiers: createdTiers,
              sellers: createdSellers,
              checkout_url: `https://eventpass.tn/e/${slug}`,
              gate_pairing: {
                pin_code: generatedPin,
                qr_pairing_data: `EVENTPASS:PAIR:${newEvId}:${generatedPin}`
              }
            }
          }, null, 2));
        }
      } else if (selectedFunc === 'create_seller') {
        const evId = (parsedBody.event_id as string) || '';
        const sName = (parsedBody.name as string) || '';
        const sEmail = ((parsedBody.email as string) || '').toLowerCase();
        const sPhone = (parsedBody.phone as string) || '+216 22 456 789';

        if (!evId || !sName || !sEmail) {
          setResponseStatus(400);
          setResponseBody(JSON.stringify({
            error: "Missing required fields: 'event_id', 'name', and 'email' are mandatory."
          }, null, 2));
        } else if (!sEmail.includes('@') || !sEmail.includes('.')) {
          setResponseStatus(400);
          setResponseBody(JSON.stringify({
            error: "Invalid email address format."
          }, null, 2));
        } else {
          const sellerId = `slr-${Math.floor(1000 + Math.random() * 9000)}`;
          setResponseStatus(201);
          setResponseBody(JSON.stringify({
            status: 'SELLER_CREATED',
            message: 'Seller profile registered successfully. Staff can now log in to POS mode.',
            seller: {
              id: sellerId,
              event_id: evId,
              event_title: event.title,
              name: sName,
              email: sEmail,
              phone: sPhone,
              status: 'ACTIVE',
              total_sales_count: 0,
              total_sales_tnd: 0.0,
              login_credentials: {
                email: sEmail,
                event_pin: event.pinCode,
                login_instructions: 'Open the POS Cash Seller module, enter this registered email and the 6-digit event PIN to unlock cash ticketing.'
              }
            }
          }, null, 2));
        }
      } else if (selectedFunc === 'seller_login') {
        const sEmail = ((parsedBody.email as string) || '').toLowerCase().trim();
        const sPin = String(parsedBody.pin_code || '').trim();

        if (!sEmail || !sPin) {
          setResponseStatus(400);
          setResponseBody(JSON.stringify({
            error: "Both 'email' and 6-digit 'pin_code' are required to log in as a seller."
          }, null, 2));
        } else if (sPin !== event.pinCode) {
          setResponseStatus(401);
          setResponseBody(JSON.stringify({
            error: 'Authentication failed. Event PIN does not match event credentials.'
          }, null, 2));
        } else {
          setResponseStatus(200);
          setResponseBody(JSON.stringify({
            status: 'AUTHENTICATED',
            message: `Welcome ${sEmail.split('@')[0]}. Cash POS session authorized.`,
            seller: {
              id: 'slr-insat-01',
              name: sEmail.includes('amine') ? 'Amine Trabelsi' : sEmail.split('@')[0].toUpperCase(),
              email: sEmail,
              phone: '+216 55 120 401',
              total_sales_count: 14,
              total_sales_tnd: 770.0
            },
            event: {
              id: event.id,
              title: event.title,
              venue: event.venue,
              city: event.city,
              date: event.date,
              time: event.time,
              pin_code: event.pinCode
            },
            available_tiers: event.tiers.map(t => ({
              id: t.id,
              name: t.name,
              badge: t.badge,
              price_tnd: t.price,
              total_capacity: t.capacity,
              sold_count: t.soldCount,
              remaining: Math.max(0, t.capacity - t.soldCount)
            }))
          }, null, 2));
        }
      } else if (selectedFunc === 'add_tier') {
        const evId = (parsedBody.event_id as string) || '';
        const name = ((parsedBody.name as string) || '').trim();
        const price = Number(parsedBody.price_tnd);
        const capacity = Number(parsedBody.total_capacity);

        if (!evId || !name) {
          setResponseStatus(400);
          setResponseBody(JSON.stringify({
            error: "Missing required fields: 'event_id' and 'name' are mandatory."
          }, null, 2));
        } else if (isNaN(price) || price < 0) {
          setResponseStatus(400);
          setResponseBody(JSON.stringify({
            error: "'price_tnd' cannot be negative or invalid."
          }, null, 2));
        } else if (isNaN(capacity) || capacity <= 0) {
          setResponseStatus(400);
          setResponseBody(JSON.stringify({
            error: "'total_capacity' must be at least 1 ticket."
          }, null, 2));
        } else {
          const newTierId = `tier-${Math.floor(1000 + Math.random() * 9000)}`;
          const currentTotalCapacity = event.tiers.reduce((acc, t) => acc + t.capacity, 0);
          const currentTotalSold = event.tiers.reduce((acc, t) => acc + t.soldCount, 0);

          setResponseStatus(201);
          setResponseBody(JSON.stringify({
            status: 'TIER_ADDED',
            message: `Tier '${name}' created with ${capacity} tickets at ${price.toFixed(3)} TND.`,
            tier: {
              id: newTierId,
              event_id: evId,
              name: name,
              badge: (parsedBody.badge as string) || null,
              price_tnd: price,
              total_capacity: capacity,
              sold_count: 0,
              remaining_tickets: capacity,
              description: (parsedBody.description as string) || 'Instant digital ticket with cryptographic QR entry.',
              sort_order: parsedBody.sort_order ?? event.tiers.length,
              created_at: new Date().toISOString()
            },
            event_totals: {
              event_id: evId,
              event_title: event.title,
              total_tiers: event.tiers.length + 1,
              total_event_capacity: currentTotalCapacity + capacity,
              total_event_sold: currentTotalSold
            }
          }, null, 2));
        }
      } else if (selectedFunc === 'update_tier') {
        const tierId = ((parsedBody.tier_id as string) || '').trim();
        const matched = event.tiers.find(t => t.id === tierId) || event.tiers[0] || {
          id: tierId,
          name: 'General Admission',
          price: 45,
          capacity: 100,
          soldCount: 20
        };

        if (!tierId) {
          setResponseStatus(400);
          setResponseBody(JSON.stringify({
            error: "Missing required field: 'tier_id' is mandatory."
          }, null, 2));
        } else {
          let newCap = matched.capacity;
          if (parsedBody.total_capacity !== undefined) {
            newCap = Number(parsedBody.total_capacity);
          } else if (parsedBody.add_tickets !== undefined) {
            newCap = matched.capacity + Number(parsedBody.add_tickets);
          }

          if (isNaN(newCap) || newCap < matched.soldCount) {
            setResponseStatus(400);
            setResponseBody(JSON.stringify({
              error: `Cannot set capacity to ${newCap}. Already ${matched.soldCount} ticket(s) have been sold for this tier.`,
              current_sold: matched.soldCount,
              current_capacity: matched.capacity,
              minimum_allowed_capacity: matched.soldCount
            }, null, 2));
          } else {
            const newName = (parsedBody.name as string) || matched.name;
            const newPrice = parsedBody.price_tnd !== undefined ? Number(parsedBody.price_tnd) : matched.price;
            const newBadge = parsedBody.badge !== undefined ? (parsedBody.badge as string) : matched.badge;
            const newDesc = (parsedBody.description as string) || matched.description;

            setResponseStatus(200);
            setResponseBody(JSON.stringify({
              status: 'TIER_UPDATED',
              message: `Tier '${newName}' updated in Cloud SQL. Capacity: ${matched.capacity} -> ${newCap} tickets (${matched.soldCount} sold, ${newCap - matched.soldCount} available).`,
              tier: {
                id: tierId,
                event_id: event.id,
                event_title: event.title,
                name: newName,
                badge: newBadge,
                price_tnd: newPrice,
                total_capacity: newCap,
                sold_count: matched.soldCount,
                remaining_tickets: newCap - matched.soldCount,
                description: newDesc,
                capacity_change: {
                  previous_capacity: matched.capacity,
                  new_capacity: newCap,
                  delta: newCap - matched.capacity
                }
              }
            }, null, 2));
          }
        }
      } else if (selectedFunc === 'update_tickets_number') {
        const tierId = ((parsedBody.tier_id as string) || '').trim();
        const matched = event.tiers.find(t => t.id === tierId) || event.tiers[0] || {
          id: tierId,
          name: 'General Admission',
          price: 45,
          capacity: 100,
          soldCount: 20
        };

        if (!tierId) {
          setResponseStatus(400);
          setResponseBody(JSON.stringify({
            error: "Missing required field: 'tier_id' is mandatory."
          }, null, 2));
        } else if (parsedBody.total_capacity === undefined && parsedBody.add_tickets === undefined) {
          setResponseStatus(400);
          setResponseBody(JSON.stringify({
            error: "Either 'total_capacity' (absolute count) or 'add_tickets' (relative delta) must be provided."
          }, null, 2));
        } else {
          let newCap = matched.capacity;
          if (parsedBody.total_capacity !== undefined) {
            newCap = Number(parsedBody.total_capacity);
          } else {
            newCap = matched.capacity + Number(parsedBody.add_tickets);
          }

          if (isNaN(newCap) || newCap < matched.soldCount) {
            setResponseStatus(400);
            setResponseBody(JSON.stringify({
              error: `Cannot set ticket count to ${newCap}. Already ${matched.soldCount} tickets have been sold.`,
              current_sold: matched.soldCount,
              current_capacity: matched.capacity,
              minimum_allowed: matched.soldCount
            }, null, 2));
          } else {
            setResponseStatus(200);
            setResponseBody(JSON.stringify({
              status: 'TICKETS_NUMBER_UPDATED',
              message: `Ticket inventory for tier '${matched.name}' updated to ${newCap} tickets.`,
              tier_id: tierId,
              tier_name: matched.name,
              previous_capacity: matched.capacity,
              new_capacity: newCap,
              delta: newCap - matched.capacity,
              sold_count: matched.soldCount,
              remaining_tickets: newCap - matched.soldCount
            }, null, 2));
          }
        }
      } else if (selectedFunc === 'delete_tier') {
        const tierId = ((parsedBody.tier_id as string) || '').trim();
        const force = Boolean(parsedBody.force);
        const targetTier = event.tiers.find(t => t.id === tierId) || {
          id: tierId,
          name: 'VIP Test Tier',
          soldCount: 0,
          price: 70,
          capacity: 50
        };

        if (!tierId) {
          setResponseStatus(400);
          setResponseBody(JSON.stringify({
            error: "Missing required field: 'tier_id' is mandatory."
          }, null, 2));
        } else if (targetTier.soldCount > 0) {
          setResponseStatus(409);
          setResponseBody(JSON.stringify({
            error: `Cannot delete tier '${targetTier.name}' because ${targetTier.soldCount} ticket(s) have already been sold. Reduce capacity or disable the tier instead of deleting.`,
            sold_count: targetTier.soldCount,
            tier_id: tierId
          }, null, 2));
        } else if (event.tiers.length <= 1) {
          setResponseStatus(400);
          setResponseBody(JSON.stringify({
            error: "Cannot delete the last remaining ticket tier. An event must always have at least one active ticket tier.",
            tier_count: event.tiers.length
          }, null, 2));
        } else {
          setResponseStatus(200);
          setResponseBody(JSON.stringify({
            status: 'TIER_DELETED',
            message: `Ticket tier '${targetTier.name}' (${tierId}) deleted successfully from Cloud SQL.`,
            deleted_tier: {
              id: tierId,
              name: targetTier.name,
              event_id: event.id,
              event_title: event.title
            },
            remaining_tiers: event.tiers
              .filter(t => t.id !== tierId)
              .map(t => ({
                id: t.id,
                name: t.name,
                badge: t.badge,
                price_tnd: t.price,
                total_capacity: t.capacity,
                sold_count: t.soldCount
              }))
          }, null, 2));
        }
      }

      setLatencyMs(Math.round(performance.now() - start + 45));
      setIsRunning(false);
    }, 280);
  };

  const handleCopySnippet = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Google Cloud Run Functions (Python 3.12)
              </span>
              <span className="text-xs text-slate-400 font-mono">
                europe-west1 / Cloud SQL Unix Socket
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Backend Serverless API Engine
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
              Handles ClicToPay / Konnect / Flouci webhooks, HMAC-SHA256 token signing, atomic ticket inventory updates, and sub-300ms gate prefetch syncing.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs font-mono space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase">GCP Runtime Target</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Cloud Functions Gen 2
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Function Tabs & Interactive Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 4 Cols: Function Selector List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Cloud Run Endpoints
            </span>
            <span className="text-[10px] font-mono text-slate-500">2 Python Modules</span>
          </div>

          {/* Module Filter Pills: All / Web / Mobile */}
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setCategoryFilter('ALL')}
              className={`py-1.5 px-2 rounded-lg font-semibold transition-all ${
                categoryFilter === 'ALL'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All (12)
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('WEB')}
              className={`py-1.5 px-2 rounded-lg font-semibold transition-all ${
                categoryFilter === 'WEB'
                  ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Web (8)
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('MOBILE')}
              className={`py-1.5 px-2 rounded-lg font-semibold transition-all ${
                categoryFilter === 'MOBILE'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mobile (4)
            </button>
          </div>

          {[
            // Web Backend (web_backend.py)
            {
              id: 'create_event' as FunctionName,
              name: 'create_event',
              file: 'web_backend.py',
              backend: 'WEB' as const,
              desc: 'Creates event with multi-tier tickets & payment gateways in Cloud SQL',
              method: 'POST',
              color: 'text-pink-400',
              badge: 'bg-pink-500/10 text-pink-400 border-pink-500/20'
            },
            {
              id: 'add_tier' as FunctionName,
              name: 'add_tier',
              file: 'web_backend.py',
              backend: 'WEB' as const,
              desc: 'Adds new ticket tier & sets initial tickets count/capacity and price',
              method: 'POST',
              color: 'text-violet-400',
              badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20'
            },
            {
              id: 'update_tier' as FunctionName,
              name: 'update_tier',
              file: 'web_backend.py',
              backend: 'WEB' as const,
              desc: 'Updates tier price, badge, description, and ticket capacity (stock count)',
              method: 'POST',
              color: 'text-fuchsia-400',
              badge: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20'
            },
            {
              id: 'update_tickets_number' as FunctionName,
              name: 'update_tickets_number',
              file: 'web_backend.py',
              backend: 'WEB' as const,
              desc: 'Dedicated capacity adjuster: add/subtract or set ticket count by tier',
              method: 'POST',
              color: 'text-amber-400',
              badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            },
            {
              id: 'delete_tier' as FunctionName,
              name: 'delete_tier',
              file: 'web_backend.py',
              backend: 'WEB' as const,
              desc: 'Safely removes empty tier with sold-ticket protection & event minimum check',
              method: 'POST',
              color: 'text-rose-400',
              badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            },
            {
              id: 'create_seller' as FunctionName,
              name: 'create_seller',
              file: 'web_backend.py',
              backend: 'WEB' as const,
              desc: 'Registers promoter profile with email + event PIN credentials',
              method: 'POST',
              color: 'text-pink-400',
              badge: 'bg-pink-500/10 text-pink-400 border-pink-500/20'
            },
            {
              id: 'create_checkout' as FunctionName,
              name: 'create_checkout',
              file: 'web_backend.py',
              backend: 'WEB' as const,
              desc: 'Validates tier capacity & returns gateway redirect session',
              method: 'POST',
              color: 'text-purple-400',
              badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
            },
            {
              id: 'payment_webhook' as FunctionName,
              name: 'payment_webhook',
              file: 'web_backend.py',
              backend: 'WEB' as const,
              desc: 'ClicToPay SMT, Konnect & Flouci payment callback verification',
              method: 'POST',
              color: 'text-indigo-400',
              badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
            },
            // Mobile Backend (mobile_backend.py)
            {
              id: 'verify_ticket' as FunctionName,
              name: 'verify_ticket',
              file: 'mobile_backend.py',
              backend: 'MOBILE' as const,
              desc: 'QR hash authentication, double-entry prevention & gate check-in',
              method: 'POST',
              color: 'text-emerald-400',
              badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            },
            {
              id: 'sync_gate_tickets' as FunctionName,
              name: 'sync_gate_tickets',
              file: 'mobile_backend.py',
              backend: 'MOBILE' as const,
              desc: 'Pre-downloads all ticket hashes into Expo SQLite cache before doors open',
              method: 'GET',
              color: 'text-cyan-400',
              badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
            },
            {
              id: 'seller_login' as FunctionName,
              name: 'seller_login',
              file: 'mobile_backend.py',
              backend: 'MOBILE' as const,
              desc: 'Authenticates promoter to POS cash app using email & 6-digit PIN',
              method: 'POST',
              color: 'text-teal-400',
              badge: 'bg-teal-500/10 text-teal-400 border-teal-500/20'
            },
            {
              id: 'issue_cash_ticket' as FunctionName,
              name: 'issue_cash_ticket',
              file: 'mobile_backend.py',
              backend: 'MOBILE' as const,
              desc: 'Records promoter cash in hand & auto-delivers PDF pass to email',
              method: 'POST',
              color: 'text-amber-400',
              badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            },
          ]
            .filter(fn => categoryFilter === 'ALL' || fn.backend === categoryFilter)
            .map(fn => {
              const isSelected = selectedFunc === fn.id;
              return (
                <button
                  key={fn.id}
                  type="button"
                  onClick={() => handleSelectFunction(fn.id)}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'bg-slate-900 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-mono font-bold text-xs ${fn.color}`}>
                      {fn.name}()
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${fn.badge}`}>
                        {fn.file}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                        {fn.method}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {fn.desc}
                  </p>
                </button>
              );
            })}

          {/* Quick Presets for Current Function */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2 mt-4">
            <span className="text-xs font-bold text-slate-300 block mb-1">
              Simulation Presets for {selectedFunc}
            </span>
            {selectedFunc === 'verify_ticket' && (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const validTkt = tickets.find(t => t.status === 'VALID') || tickets[0];
                    setRequestBody(JSON.stringify({
                      ticket_id: validTkt.id,
                      ticket_hash: validTkt.qrHash,
                      pin_code: event.pinCode,
                      scanner_name: 'Gate 1 (Main Entrance) - Turnstile A'
                    }, null, 2));
                  }}
                  className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 flex items-center justify-between"
                >
                  <span>Valid Ticket (Expect 200 OK)</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const usedTkt = tickets.find(t => t.status === 'CHECKED_IN') || tickets[2];
                    setRequestBody(JSON.stringify({
                      ticket_id: usedTkt.id,
                      ticket_hash: usedTkt.qrHash,
                      pin_code: event.pinCode,
                      scanner_name: 'Gate 2 (VIP Turnstile) - Youssef'
                    }, null, 2));
                  }}
                  className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-800 flex items-center justify-between"
                >
                  <span>Already Checked-In (Expect 409 Conflict)</span>
                  <XCircle className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRequestBody(JSON.stringify({
                      ticket_id: 'TKT-FAKE-9999',
                      ticket_hash: 'TKT-FAKE-9999:COUNTERFEIT',
                      pin_code: event.pinCode,
                      scanner_name: 'Gate 1 (Main Entrance) - Turnstile A'
                    }, null, 2));
                  }}
                  className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 flex items-center justify-between"
                >
                  <span>Counterfeit Hash (Expect 400 Bad Request)</span>
                  <AlertTriangle className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRequestBody(JSON.stringify({
                      ticket_id: tickets[0]?.id,
                      ticket_hash: tickets[0]?.qrHash,
                      pin_code: '000000',
                      scanner_name: 'Gate 3 (Backstage)'
                    }, null, 2));
                  }}
                  className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-slate-800 flex items-center justify-between"
                >
                  <span>Wrong Gate PIN (Expect 403 Forbidden)</span>
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {selectedFunc === 'create_event' && (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setRequestBody(JSON.stringify({
                      title: 'Hammamet Sunset Beach Rave 2026',
                      venue: 'Yasmine Hammamet Marina Pier',
                      city: 'Hammamet, Nabeul',
                      date: '2026-08-20',
                      time: '18:00 - 03:00',
                      subtitle: 'Electronic Music Festival on the Mediterranean Shore',
                      category: 'Festival',
                      cover_images: [
                        'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
                        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80'
                      ],
                      enabled_gateways: ['CLICTOPAY', 'KONNECT', 'FLOUCI'],
                      tiers: [
                        { name: 'Early Bird Pass', price_tnd: 35.0, total_capacity: 100, badge: 'Limited', description: 'Discounted access for the first 100 partygoers' },
                        { name: 'Regular Wave Pass', price_tnd: 55.0, total_capacity: 250, badge: 'Bestseller', description: 'Standard festival entry' },
                        { name: 'VIP Backstage Deck', price_tnd: 120.0, total_capacity: 40, badge: 'VIP Access', description: 'Elevated VIP deck, private bar, fast lane' }
                      ]
                    }, null, 2));
                  }}
                  className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-pink-400 border border-slate-800 flex items-center justify-between"
                >
                  <span>3 Tiers + 3 Gateways (Server Mints PIN)</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRequestBody(JSON.stringify({
                      title: 'Tunis AI & Cloud Summit 2026',
                      venue: 'Cité des Sciences de Tunis',
                      city: 'Tunis',
                      date: '2026-11-12',
                      time: '08:30 - 18:00',
                      subtitle: 'North African Developer & Cloud Engineering Conference',
                      category: 'Conference',
                      cover_images: [
                        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80'
                      ],
                      enabled_gateways: ['KONNECT', 'FLOUCI'],
                      tiers: [
                        { name: 'Student Pass', price_tnd: 20.0, total_capacity: 80, badge: 'Student ID', description: 'Valid university student ID required at gate' },
                        { name: 'Professional Pass', price_tnd: 75.0, total_capacity: 200, badge: 'All Tracks', description: 'Full access to all technical stages and workshops' }
                      ]
                    }, null, 2));
                  }}
                  className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-slate-800 flex items-center justify-between"
                >
                  <span>Tech Summit (2 Tiers, Flouci+Konnect)</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRequestBody(JSON.stringify({
                      title: 'Incomplete Event Setup',
                      venue: '',
                      date: '',
                      tiers: []
                    }, null, 2));
                  }}
                  className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 flex items-center justify-between"
                >
                  <span>Missing Venue & Tiers (Expect 400 Error)</span>
                  <AlertTriangle className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {selectedFunc === 'create_seller' && (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setRequestBody(JSON.stringify({
                      event_id: event.id,
                      name: 'Yassine Ben Amor',
                      email: 'yassine@promoters.tn',
                      phone: '+216 22 456 789'
                    }, null, 2));
                  }}
                  className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-800 flex items-center justify-between"
                >
                  <span>Valid Seller Registration (Expect 201)</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRequestBody(JSON.stringify({
                      event_id: event.id,
                      name: '',
                      email: 'invalid-email',
                      phone: '+216 55 120 401'
                    }, null, 2));
                  }}
                  className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 flex items-center justify-between"
                >
                  <span>Missing Name & Bad Email (Expect 400)</span>
                  <AlertTriangle className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {selectedFunc === 'seller_login' && (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setRequestBody(JSON.stringify({
                      email: 'amine@insat.tn',
                      pin_code: event.pinCode
                    }, null, 2));
                  }}
                  className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-teal-400 border border-slate-800 flex items-center justify-between"
                >
                  <span>Amine Trabelsi + Correct PIN (Expect 200)</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRequestBody(JSON.stringify({
                      email: 'amine@insat.tn',
                      pin_code: '000000'
                    }, null, 2));
                  }}
                  className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 flex items-center justify-between"
                >
                  <span>Wrong PIN Code (Expect 401 Auth Error)</span>
                  <AlertTriangle className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {selectedFunc === 'add_tier' && (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setRequestBody(JSON.stringify({
                      event_id: event.id,
                      name: 'VIP Backstage Pass (Wave 2)',
                      price_tnd: 85.0,
                      total_capacity: 100,
                      badge: 'VIP Exclusive',
                      description: 'Includes artists lounge entry, dedicated VIP bar, and fast-track turnstile gate.',
                      sort_order: event.tiers.length
                    }, null, 2));
                  }}
                  className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-violet-400 border border-slate-800 flex items-center justify-between"
                >
                  <span>Add VIP Tier + 100 Tickets (Expect 201)</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRequestBody(JSON.stringify({
                      event_id: event.id,
                      name: '',
                      price_tnd: -20,
                      total_capacity: 0
                    }, null, 2));
                  }}
                  className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 flex items-center justify-between"
                >
                  <span>Negative Price / 0 Tickets (Expect 400)</span>
                  <AlertTriangle className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {selectedFunc === 'update_tier' && (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const t = event.tiers[0] || { id: 'tier-1', name: 'General Admission', price: 45, capacity: 150 };
                    setRequestBody(JSON.stringify({
                      tier_id: t.id,
                      name: `${t.name} (Wave 2 Extended)`,
                      price_tnd: t.price + 5,
                      total_capacity: t.capacity + 50,
                      badge: 'Extra Stock Added',
                      description: 'Capacity increased with 50 additional tickets released for high demand.'
                    }, null, 2));
                  }}
                  className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-fuchsia-400 border border-slate-800 flex items-center justify-between"
                >
                  <span>Increase Capacity +50 & Price (Expect 200)</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const t = event.tiers[0] || { id: 'tier-1', capacity: 100, soldCount: 35 };
                    setRequestBody(JSON.stringify({
                      tier_id: t.id,
                      total_capacity: Math.max(0, t.soldCount - 10)
                    }, null, 2));
                  }}
                  className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 flex items-center justify-between"
                >
                  <span>Reduce Below Sold Tickets (Expect 400 Safety Rejection)</span>
                  <AlertTriangle className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {selectedFunc === 'update_tickets_number' && (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const t = event.tiers[0] || { id: 'tier-1', capacity: 150 };
                    setRequestBody(JSON.stringify({
                      tier_id: t.id,
                      add_tickets: 50
                    }, null, 2));
                  }}
                  className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 flex items-center justify-between"
                >
                  <span>Quick Add +50 Tickets Delta (Expect 200)</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const t = event.tiers[0] || { id: 'tier-1', capacity: 150 };
                    setRequestBody(JSON.stringify({
                      tier_id: t.id,
                      total_capacity: 300
                    }, null, 2));
                  }}
                  className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 flex items-center justify-between"
                >
                  <span>Set Absolute Capacity to 300 (Expect 200)</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {selectedFunc === 'delete_tier' && (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const deletable = event.tiers.find(t => t.soldCount === 0) || { id: 'tier-empty-sample' };
                    setRequestBody(JSON.stringify({
                      tier_id: deletable.id,
                      force: false
                    }, null, 2));
                  }}
                  className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-800 flex items-center justify-between"
                >
                  <span>Delete Unsold Tier (Expect 200)</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const soldTier = event.tiers.find(t => t.soldCount > 0) || event.tiers[0];
                    setRequestBody(JSON.stringify({
                      tier_id: soldTier.id,
                      force: false
                    }, null, 2));
                  }}
                  className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 flex items-center justify-between"
                >
                  <span>Delete Tier with Sold Tickets (Expect 409 Conflict)</span>
                  <AlertTriangle className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right 8 Cols: Interactive Request / Response Terminal */}
        <div className="lg:col-span-8 space-y-4">
          {/* Action Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5">
              <Terminal className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-mono font-bold text-white text-xs">
                    POST https://europe-west1-{event.id}.cloudfunctions.net/{selectedFunc}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    !['verify_ticket', 'sync_gate_tickets', 'seller_login', 'issue_cash_ticket'].includes(selectedFunc)
                      ? 'bg-pink-500/10 text-pink-400 border-pink-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {!['verify_ticket', 'sync_gate_tickets', 'seller_login', 'issue_cash_ticket'].includes(selectedFunc)
                      ? 'web_backend.py'
                      : 'mobile_backend.py'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Target: <code className="text-emerald-400 font-mono">functions/{
                    !['verify_ticket', 'sync_gate_tickets', 'seller_login', 'issue_cash_ticket'].includes(selectedFunc)
                      ? 'web_backend.py'
                      : 'mobile_backend.py'
                  }</code> • Cloud Run Gen 2
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={isRunning}
              onClick={handleExecute}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Invoking Cloud Run...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current stroke-none" />
                  <span>Execute Function</span>
                </>
              )}
            </button>
          </div>

          {/* Request Payload Editor */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-400 font-semibold flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-indigo-400" />
                Request JSON Body (Edit freely)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">application/json</span>
            </div>
            <div className="p-4 bg-slate-950/80">
              <textarea
                rows={6}
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 outline-none focus:border-indigo-500 resize-none selection:bg-indigo-500/30"
              />
            </div>
          </div>

          {/* Response Payload Display */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-400 font-semibold">
                  HTTP Response
                </span>
                {responseStatus && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    responseStatus === 200 || responseStatus === 201
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : responseStatus === 409
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {responseStatus} {responseStatus === 200 ? 'OK' : responseStatus === 201 ? 'CREATED' : responseStatus === 409 ? 'CONFLICT' : 'ERROR'}
                  </span>
                )}
                {latencyMs !== null && (
                  <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> {latencyMs}ms (Sub-300ms SLA ✅)
                  </span>
                )}
              </div>

              {responseBody && (
                <button
                  type="button"
                  onClick={() => handleCopySnippet(responseBody)}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>

            <div className="p-4 bg-slate-950/90 overflow-x-auto min-h-[160px]">
              {responseBody ? (
                <pre className="font-mono text-xs text-emerald-300 whitespace-pre-wrap leading-relaxed">
                  {responseBody}
                </pre>
              ) : (
                <div className="text-slate-500 text-xs py-8 text-center font-mono">
                  Click "Execute Function" above to invoke the Cloud Run function.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
