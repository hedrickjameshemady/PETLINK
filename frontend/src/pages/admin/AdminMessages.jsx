import { useState, useEffect, useRef } from 'react';
import { API } from '../../context/AuthContext';
import { fileUrl } from "../../config";

export default function AdminMessages() {
  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null);   // the user whose thread is open
  const [msgs, setMsgs] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const loadThreads = () =>
    API.get('/messages/threads')
      .then(({ data }) => setThreads(data))
      .catch(() => {})
      .finally(() => setLoading(false));

  const loadMsgs = (userId) =>
    API.get(`/messages/threads/${userId}`)
      .then(({ data }) => setMsgs(data))
      .catch(() => {});

  // Refresh the inbox list every 5 seconds
  useEffect(() => {
    loadThreads();
    const t = setInterval(loadThreads, 5000);
    return () => clearInterval(t);
  }, []);

  // While a thread is open, refresh THAT thread every 5 seconds too
  useEffect(() => {
    if (!active) return;
    loadMsgs(active.thread_user_id);
    const t = setInterval(() => loadMsgs(active.thread_user_id), 5000);
    return () => clearInterval(t);
  }, [active]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !active || sending) return;
    setSending(true);
    setDraft('');
    try {
      await API.post(`/messages/threads/${active.thread_user_id}`, { body });
      await loadMsgs(active.thread_user_id);
      loadThreads();
    } catch {
      setDraft(body); // give the text back so they don't lose it
    } finally {
      setSending(false);
    }
  };

  const shown = threads.filter(t => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${t.first_name} ${t.last_name}`.toLowerCase().includes(q)
      || (t.email || '').toLowerCase().includes(q);
  });

  const photo = (p, name) => p
    ? fileUrl(p)
    : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=e5e7eb&color=374151&size=80';

  const totalUnread = threads.reduce((n, t) => n + Number(t.unread || 0), 0);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', height: 'calc(100vh - 160px)', minHeight: 520, display: 'flex' }}>

      {/* ── LEFT: the inbox list ── */}
      <div style={{ width: 300, borderRight: '1.5px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: 14, borderBottom: '1.5px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 18, fontWeight: 700, margin: 0 }}>Messages</h2>
            {totalUnread > 0 && <span className="badge badge-red">{totalUnread} new</span>}
          </div>
          <input
            className="form-input"
            placeholder="🔍 Search a person…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ fontSize: 13, padding: '7px 10px' }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {shown.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
              {threads.length === 0 ? 'No conversations yet.' : 'No one matches that search.'}
            </div>
          ) : shown.map(t => {
            const on = active?.thread_user_id === t.thread_user_id;
            const name = `${t.first_name} ${t.last_name}`;
            return (
              <button
                key={t.thread_user_id}
                onClick={() => setActive(t)}
                style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  display: 'flex', gap: 10, alignItems: 'center',
                  padding: '11px 14px',
                  border: 'none', borderBottom: '1px solid #f1f5f9',
                  background: on ? 'var(--green-50)' : Number(t.unread) > 0 ? '#fffbeb' : '#fff',
                  borderLeft: on ? '3px solid var(--primary)' : '3px solid transparent',
                }}
              >
                <img
                  src={photo(t.profile_photo, name)}
                  alt={name}
                  style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', gap: 6,
                    fontWeight: Number(t.unread) > 0 ? 700 : 600, fontSize: 13.5,
                  }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                    {Number(t.unread) > 0 && (
                      <span style={{
                        background: '#dc3545', color: '#fff', fontSize: 10, fontWeight: 700,
                        minWidth: 17, height: 17, borderRadius: 9, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                      }}>{t.unread}</span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 12, color: 'var(--text-muted)', marginTop: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {t.last_message || '—'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: the open conversation ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {!active ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)',
          }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>💬</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-dark)' }}>Pick a conversation</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Choose someone on the left to read and reply.</div>
          </div>
        ) : (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px', borderBottom: '1.5px solid var(--border)', flexShrink: 0,
            }}>
              <img
                src={photo(active.profile_photo, `${active.first_name} ${active.last_name}`)}
                alt=""
                style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{active.first_name} {active.last_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{active.email}</div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#f7f8fa' }}>
              {msgs.map(m => {
                const mine = m.sender_role === 'admin'; // "mine" = the shelter's own reply
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 9 }}>
                    <div style={{
                      maxWidth: '68%', padding: '9px 13px', borderRadius: 14,
                      background: mine ? 'var(--primary)' : '#fff',
                      color: mine ? '#fff' : 'var(--text-dark)',
                      border: mine ? 'none' : '1px solid var(--border)',
                      borderBottomRightRadius: mine ? 4 : 14,
                      borderBottomLeftRadius: mine ? 14 : 4,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}>
                      <div style={{ fontSize: 13.5, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {m.body}
                      </div>
                      <div style={{ fontSize: 10, opacity: 0.65, marginTop: 4, textAlign: 'right' }}>
                        {new Date(m.created_at).toLocaleString('en-PH', {
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div style={{
              display: 'flex', gap: 10, alignItems: 'flex-end',
              padding: 12, borderTop: '1.5px solid var(--border)', flexShrink: 0,
            }}>
              <textarea
                className="form-textarea"
                placeholder="Write a reply…  (Enter to send, Shift+Enter for a new line)"
                value={draft}
                maxLength={2000}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                style={{ flex: 1, minHeight: 44, maxHeight: 110, resize: 'none', fontSize: 13.5 }}
              />
              <button
                className="btn btn-primary"
                disabled={!draft.trim() || sending}
                onClick={send}
                style={{ flexShrink: 0 }}
              >
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}