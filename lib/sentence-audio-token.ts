const encoder = new TextEncoder();
const lifetimeSeconds = 24 * 60 * 60;

export type SentenceAudioTicket = { expires: number; signature: string };
export type SentenceAudioTickets = { correction?: SentenceAudioTicket; natural?: SentenceAudioTicket };

export async function sentenceAudioTickets(
  secret: string | undefined,
  { correction, natural }: { correction: string; natural: string },
  now = Date.now(),
): Promise<SentenceAudioTickets | undefined> {
  if (!secret || !/^[a-f0-9]{64}$/.test(secret) || !(correction || natural)) return undefined;
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const expires = Math.floor(now / 1000) + lifetimeSeconds;
  const sign = async (text: string) => {
    const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(expires + '\n' + text));
    const signature = Array.from(new Uint8Array(mac), byte => byte.toString(16).padStart(2, '0')).join('');
    return { expires, signature };
  };
  const [correctionTicket, naturalTicket] = await Promise.all([
    correction && sign(correction),
    natural && sign(natural),
  ]);
  return {
    ...(correctionTicket && { correction: correctionTicket }),
    ...(naturalTicket && { natural: naturalTicket }),
  };
}
