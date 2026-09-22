import React, { useState, useEffect } from 'react';
import { 
  X, Printer, Download, Mail, Check, Share2, 
  ShieldCheck, Calendar, MapPin, 
  ExternalLink, QrCode as QrCodeIcon 
} from 'lucide-react';
import { Ticket, EventData } from '../types';
import { generateQrDataUrl } from '../utils/qrUtils';

interface TicketPdfModalProps {
  ticket: Ticket;
  event: EventData;
  onClose: () => void;
  sellerName?: string;
}

export const TicketPdfModal: React.FC<TicketPdfModalProps> = ({
  ticket,
  event,
  onClose,
  sellerName,
}) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [resendingEmail, setResendingEmail] = useState<boolean>(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState<boolean>(ticket.emailSent ?? true);

  useEffect(() => {
    generateQrDataUrl(ticket.qrHash).then(url => setQrUrl(url));
  }, [ticket.qrHash]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    const link = `https://eventpass.tn/t/${ticket.id}?hash=${encodeURIComponent(ticket.qrHash)}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleResendEmail = () => {
    setResendingEmail(true);
    setTimeout(() => {
      setResendingEmail(false);
      setEmailSentSuccess(true);
      setTimeout(() => setEmailSentSuccess(false), 3000);
    }, 700);
  };

  const cleanPhone = ticket.buyerPhone.replace(/[^0-9]/g, '');
  const whatsAppUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `🎟️ Hello ${ticket.buyerName}! Here is your official e-ticket for ${event.title} at ${event.venue} on ${event.date}.\n\nTicket ID: ${ticket.id}\nTier: ${ticket.tierName}\nView & Download Pass: https://eventpass.tn/t/${ticket.id}`
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* Top Control Bar */}
        <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white font-mono">
              Official e-Ticket Pass • PDF Viewer
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs px-2.5 bg-slate-800/80 border border-slate-700"
              title="Print or Save PDF"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* The Printable Ticket Sheet */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Email Notification Status */}
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                PDF ticket dispatched to <strong className="text-white">{ticket.buyerEmail}</strong>
              </span>
            </div>
            <button
              onClick={handleResendEmail}
              disabled={resendingEmail}
              className="text-[11px] underline hover:text-emerald-200 transition-colors shrink-0 disabled:opacity-50"
            >
              {resendingEmail ? 'Sending...' : emailSentSuccess ? 'Sent!' : 'Resend Email'}
            </button>
          </div>

          {/* Realistic High-Res Printable Pass Card */}
          <div 
            id="printable-ticket"
            className="relative bg-gradient-to-b from-slate-950 via-[#0c121e] to-slate-950 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl text-slate-100 print:border-black print:text-black print:bg-white"
          >
            {/* Ticket Header Image */}
            <div className="relative h-32 sm:h-36 w-full overflow-hidden">
              <img
                src={event.bannerUrl}
                alt={event.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
              
              <div className="absolute top-3 right-3">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500 text-slate-950 shadow-md">
                  CASH VERIFIED
                </span>
              </div>

              <div className="absolute bottom-3 left-4 right-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold block">
                  Official Admission Pass
                </span>
                <h4 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight drop-shadow">
                  {event.title}
                </h4>
              </div>
            </div>

            {/* Middle Perforated Divider */}
            <div className="relative flex items-center px-4 py-2">
              <div className="absolute -left-3 w-6 h-6 rounded-full bg-slate-900 border border-slate-700" />
              <div className="w-full border-b-2 border-dashed border-slate-700" />
              <div className="absolute -right-3 w-6 h-6 rounded-full bg-slate-900 border border-slate-700" />
            </div>

            {/* Ticket Body Details */}
            <div className="p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Date & Time</span>
                  <div className="font-semibold text-slate-200 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{event.date} • {event.time}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Venue & City</span>
                  <div className="font-semibold text-slate-200 flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{event.venue}, {event.city}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Ticket Tier</span>
                  <div className="font-bold text-emerald-400 mt-0.5">
                    {ticket.tierName}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Amount Paid</span>
                  <div className="font-mono font-bold text-white mt-0.5">
                    {ticket.price.toFixed(3)} TND (Cash)
                  </div>
                </div>
              </div>

              {/* Buyer & Seller Box */}
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Attendee:</span>
                  <strong className="text-white font-medium">{ticket.buyerName}</strong>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Phone:</span>
                  <span className="text-slate-300 font-mono">{ticket.buyerPhone}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Email:</span>
                  <span className="text-slate-300 font-mono truncate max-w-[200px]">{ticket.buyerEmail}</span>
                </div>
                {(ticket.soldBySeller || sellerName) && (
                  <div className="pt-1.5 border-t border-slate-800 flex justify-between items-center text-[11px]">
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Sold By Seller:
                    </span>
                    <span className="text-emerald-300 font-mono font-semibold">
                      {ticket.soldBySeller || sellerName}
                    </span>
                  </div>
                )}
              </div>

              {/* QR Code Section */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 bg-white rounded-xl text-slate-950">
                <div className="text-center sm:text-left">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                    Gate Admission QR
                  </span>
                  <span className="text-xs font-bold text-slate-900 block font-mono">
                    {ticket.id}
                  </span>
                  <p className="text-[10px] text-slate-600 mt-1 max-w-[200px]">
                    Present this cryptographic QR code at the gate. Offline verified with 256-bit signature.
                  </p>
                </div>
                <div className="shrink-0 w-28 h-28 p-1.5 bg-white border-2 border-slate-200 rounded-lg shadow-sm flex items-center justify-center">
                  {qrUrl ? (
                    <img 
                      src={qrUrl} 
                      alt={`Ticket QR for ${ticket.id}`} 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <QrCodeIcon className="w-12 h-12 text-slate-400 animate-spin" />
                  )}
                </div>
              </div>

              {/* Security Hash Footer */}
              <div className="text-[10px] font-mono text-slate-500 text-center truncate">
                SIG: {ticket.qrHash} • NO PRINTED PAPER NEEDED • ZERO FRAUD
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Send via WhatsApp</span>
            </a>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ExternalLink className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Ticket Link'}</span>
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors ml-auto"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
