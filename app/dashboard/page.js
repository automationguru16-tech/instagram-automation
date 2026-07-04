'use client';

import { useState, useEffect, useCallback } from 'react';

const EMPTY_FORM = {
  keyword: '',
  public_reply_variants: '',
  private_opener_text: '',
  button_label: '',
  link_url: '',
  closing_text: '',
  active: true,
};

export default function Dashboard() {
  const [keywords, setKeywords] = useState([]);
  const [stats, setStats]       = useState({});
  const [form, setForm]         = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');

  const load = useCallback(async () => {
    const [kRes, sRes] = await Promise.all([
      fetch('/api/keywords'),
      fetch('/api/stats'),
    ]);
    const [kData, sData] = await Promise.all([kRes.json(), sRes.json()]);
    setKeywords(Array.isArray(kData) ? kData : []);
    setStats(sData ?? {});
  }, []);

  useEffect(() => { load(); }, [load]);

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      ...form,
      keyword: form.keyword.trim() || null,
      public_reply_variants: form.public_reply_variants
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean),
    };

    const url    = editingId ? `/api/keywords/${editingId}` : '/api/keywords';
    const method = editingId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setForm(EMPTY_FORM);
      setEditingId(null);
      flash(editingId ? 'Updated.' : 'Saved.');
      load();
    } else {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      flash(`Error: ${err.error}`, true);
    }
    setSaving(false);
  }

  function flash(text, isError = false) {
    setMsg({ text, isError });
    setTimeout(() => setMsg(''), 3000);
  }

  function startEdit(kw) {
    setEditingId(kw.id);
    setForm({
      keyword:               kw.keyword ?? '',
      public_reply_variants: (kw.public_reply_variants ?? []).join('\n'),
      private_opener_text:   kw.private_opener_text ?? '',
      button_label:          kw.button_label ?? '',
      link_url:              kw.link_url ?? '',
      closing_text:          kw.closing_text ?? '',
      active:                kw.active ?? true,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function toggleActive(kw) {
    await fetch(`/api/keywords/${kw.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ active: !kw.active }),
    });
    load();
  }

  async function deleteKeyword(id) {
    if (!confirm('Delete this keyword? This cannot be undone.')) return;
    await fetch(`/api/keywords/${id}`, { method: 'DELETE' });
    if (editingId === id) cancelEdit();
    load();
  }

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Comment Automation</h1>

      {/* ── Form ── */}
      <section style={s.card}>
        <h2 style={s.h2}>{editingId ? 'Edit Keyword' : 'Add Keyword'}</h2>
        <form onSubmit={handleSubmit} style={s.form}>

          <label style={s.label}>
            Trigger keyword
            <span style={s.hint}> — leave blank to match every comment</span>
            <input
              style={s.input}
              value={form.keyword}
              onChange={e => setField('keyword', e.target.value)}
              placeholder='e.g. link, guide, free'
            />
          </label>

          <label style={s.label}>
            Public reply variants
            <span style={s.hint}> — one per line, bot picks randomly</span>
            <textarea
              style={{ ...s.input, height: 80 }}
              value={form.public_reply_variants}
              onChange={e => setField('public_reply_variants', e.target.value)}
              placeholder={'Check your DMs!\nJust sent you a message!\nSent! 📩'}
              required
            />
          </label>

          <label style={s.label}>
            Private opener text
            <span style={s.hint}> — first DM sent after the comment</span>
            <textarea
              style={{ ...s.input, height: 64 }}
              value={form.private_opener_text}
              onChange={e => setField('private_opener_text', e.target.value)}
              placeholder='Hey! Here you go — tap below to get the link.'
              required
            />
          </label>

          <div style={s.row}>
            <label style={{ ...s.label, flex: 1 }}>
              Button label
              <input
                style={s.input}
                value={form.button_label}
                onChange={e => setField('button_label', e.target.value)}
                placeholder='Get the guide'
                required
              />
            </label>
            <label style={{ ...s.label, flex: 2 }}>
              Link URL
              <input
                style={s.input}
                type='url'
                value={form.link_url}
                onChange={e => setField('link_url', e.target.value)}
                placeholder='https://...'
                required
              />
            </label>
          </div>

          <label style={s.label}>
            Closing text
            <span style={s.hint}> — shown above the link button in the final DM</span>
            <textarea
              style={{ ...s.input, height: 64 }}
              value={form.closing_text}
              onChange={e => setField('closing_text', e.target.value)}
              placeholder='Here is the link you asked for!'
              required
            />
          </label>

          <div style={s.formFooter}>
            {editingId && (
              <button type='button' style={s.cancelBtn} onClick={cancelEdit}>
                Cancel
              </button>
            )}
            <button type='submit' style={s.saveBtn} disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update' : 'Add Keyword'}
            </button>
            {msg && (
              <span style={{ ...s.flashMsg, color: msg.isError ? '#dc2626' : '#059669' }}>
                {msg.text}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* ── Table ── */}
      <section style={s.card}>
        <h2 style={s.h2}>Keywords</h2>
        {keywords.length === 0 ? (
          <p style={s.empty}>No keywords yet — add one above.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Keyword', 'Openers sent', 'Links sent', 'CTR', 'Active', ''].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keywords.map(kw => {
                  const st  = stats[kw.id] ?? { opener_sent: 0, link_sent: 0 };
                  const ctr = st.opener_sent > 0
                    ? `${Math.round((st.link_sent / st.opener_sent) * 100)}%`
                    : '—';

                  return (
                    <tr key={kw.id}>
                      <td style={s.td}>
                        {kw.keyword
                          ? <code style={s.code}>{kw.keyword}</code>
                          : <em style={s.matchAny}>match any</em>
                        }
                      </td>
                      <td style={{ ...s.td, textAlign: 'center' }}>{st.opener_sent}</td>
                      <td style={{ ...s.td, textAlign: 'center' }}>{st.link_sent}</td>
                      <td style={{ ...s.td, textAlign: 'center', fontWeight: 600 }}>{ctr}</td>
                      <td style={{ ...s.td, textAlign: 'center' }}>
                        <button
                          onClick={() => toggleActive(kw)}
                          style={kw.active ? s.activePill : s.inactivePill}
                        >
                          {kw.active ? 'On' : 'Off'}
                        </button>
                      </td>
                      <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                        <button style={s.editBtn} onClick={() => startEdit(kw)}>Edit</button>
                        <button style={s.deleteBtn} onClick={() => deleteKeyword(kw.id)}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const s = {
  page:       { maxWidth: 860, margin: '0 auto', padding: '32px 16px', fontFamily: 'system-ui, sans-serif', color: '#111' },
  h1:         { fontSize: 22, fontWeight: 700, marginBottom: 24 },
  h2:         { fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 16 },
  card:       { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, marginBottom: 20 },
  form:       { display: 'flex', flexDirection: 'column', gap: 14 },
  label:      { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 500 },
  hint:       { fontWeight: 400, color: '#9ca3af', fontSize: 12 },
  input:      { padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none' },
  row:        { display: 'flex', gap: 12 },
  formFooter: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  saveBtn:    { padding: '8px 20px', background: '#111', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  cancelBtn:  { padding: '8px 16px', background: 'transparent', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  flashMsg:   { fontSize: 13 },
  empty:      { color: '#9ca3af', fontSize: 13, margin: 0 },
  table:      { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:         { textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #e5e7eb', fontWeight: 600, whiteSpace: 'nowrap', color: '#374151' },
  td:         { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' },
  code:       { background: '#f3f4f6', padding: '2px 7px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12 },
  matchAny:   { color: '#9ca3af' },
  activePill: { background: '#dcfce7', color: '#166534', border: 'none', borderRadius: 20, padding: '3px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  inactivePill:{ background: '#f3f4f6', color: '#6b7280', border: 'none', borderRadius: 20, padding: '3px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  editBtn:    { background: 'transparent', border: '1px solid #d1d5db', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: 12, marginRight: 6 },
  deleteBtn:  { background: 'transparent', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: 12 },
};
