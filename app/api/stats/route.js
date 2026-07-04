import supabase from '@/lib/supabase';

export async function GET() {
  const { data: events, error } = await supabase
    .from('processed_events')
    .select('keyword_id, status');

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const stats = {};
  for (const e of events ?? []) {
    if (!stats[e.keyword_id]) stats[e.keyword_id] = { opener_sent: 0, link_sent: 0 };
    stats[e.keyword_id][e.status] = (stats[e.keyword_id][e.status] || 0) + 1;
  }

  return Response.json(stats);
}
