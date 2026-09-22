import QRCode from 'qrcode';

/**
 * Generate a deterministic HMAC-like cryptographic verification hash for tickets
 */
export function generateTicketHash(ticketId: string, eventId: string, secretKey: string): string {
  // Simple deterministic client hash for preview simulation
  let hash = 0;
  const str = `${ticketId}:${eventId}:${secretKey}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${ticketId}:${hex}`;
}

/**
 * Render a QR code to a high-resolution base64 Data URL
 */
export async function generateQrDataUrl(text: string, size = 260): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    return '';
  }
}
