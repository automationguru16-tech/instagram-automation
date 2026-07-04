import supabase from '@/lib/supabase';

export async function PATCH(req, { params }) {
  const { id } = await params;
  const body = await req.json();

  const { data, error } = await supabase
    .from('keywords')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(_, { params }) {
  const { id } = await params;

  const { error } = await supabase
    .from('keywords')
    .delete()
    .eq('id', id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
