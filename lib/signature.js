import { createHmac, timingSafeEqual } from 'crypto';

export function verifySignature(rawBody, signature) {
  if (!signature || !signature.startsWith('sha256=')) return false;

  const expected = createHmac('sha256', process.env.IG_APP_SECRET)
    .update(rawBody)
    .digest('hex');

  const received = signature.slice(7); // strip 'sha256='

  try {
    return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(received, 'utf8'));
  } catch {
    return false;
  }
}
