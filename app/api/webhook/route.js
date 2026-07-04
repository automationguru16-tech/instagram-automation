import { verifySignature } from '@/lib/signature';
import supabase from '@/lib/supabase';
import { postPublicReply, sendPrivateOpener, sendLinkMessage } from '@/lib/instagram';

// ─── GET: Meta webhook verification handshake ───────────────────────────────

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.IG_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

// ─── POST: Incoming events ───────────────────────────────────────────────────

export async function POST(req) {
  const rawBody  = await req.text();
  const signature = req.headers.get('x-hub-signature-256');

  if (!verifySignature(rawBody, signature)) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody);

    // Comment event
    const change = body.entry?.[0]?.changes?.[0];
    if (change?.field === 'comments') {
      await handleComment(change.value);
      return new Response('OK', { status: 200 });
    }

    // Messaging event
    const messaging = body.entry?.[0]?.messaging?.[0];
    if (messaging) {
      await handleMessaging(messaging);
    }
  } catch (err) {
    console.error('[webhook] unhandled error:', err);
  }

  return new Response('OK', { status: 200 });
}

// ─── Comment handler ─────────────────────────────────────────────────────────

async function handleComment(value) {
  const { id: commentId, text, from, self_ig_scoped_id } = value;

  // Skip the account's own comments (e.g. the public reply we just posted)
  if (from.id === self_ig_scoped_id) return;

  // Deduplicate — Meta retries unacknowledged deliveries
  const { data: existing } = await supabase
    .from('processed_events')
    .select('comment_id')
    .eq('comment_id', commentId)
    .maybeSingle();

  if (existing) return;

  // Load active keywords
  const { data: keywords } = await supabase
    .from('keywords')
    .select('*')
    .eq('active', true);

  if (!keywords?.length) return;

  const commentLower = (text ?? '').toLowerCase();

  // Specific keyword match first, then catch-all (keyword IS NULL)
  let matched = keywords.find(
    k => k.keyword && commentLower.includes(k.keyword.toLowerCase())
  );
  if (!matched) matched = keywords.find(k => k.keyword === null);
  if (!matched) return;

  const variants = matched.public_reply_variants;
  const replyText = variants[Math.floor(Math.random() * variants.length)];

  // Fire public reply + private opener concurrently
  await Promise.all([
    postPublicReply(commentId, replyText),
    sendPrivateOpener(commentId, matched.private_opener_text, matched.id),
  ]);

  await supabase.from('processed_events').insert({
    comment_id: commentId,
    keyword_id: matched.id,
    sender_id:  from.id,
    status:     'opener_sent',
  });
}

// ─── Messaging handler ───────────────────────────────────────────────────────

async function handleMessaging(messaging) {
  // Ignore echoes of our own outbound messages
  if (messaging.message?.is_echo) return;

  const payload  = messaging.message?.quick_reply?.payload;
  if (!payload?.startsWith('GET_LINK:')) return;

  const keywordId = payload.slice(9); // length of 'GET_LINK:'
  const senderId  = messaging.sender.id;

  const { data: keyword } = await supabase
    .from('keywords')
    .select('link_url, button_label, closing_text')
    .eq('id', keywordId)
    .maybeSingle();

  if (!keyword) return;

  await sendLinkMessage(
    senderId,
    keyword.closing_text,
    keyword.link_url,
    keyword.button_label
  );

  // Mark the matching opener row as converted
  await supabase
    .from('processed_events')
    .update({ status: 'link_sent' })
    .eq('sender_id', senderId)
    .eq('keyword_id', keywordId)
    .eq('status', 'opener_sent');
}
