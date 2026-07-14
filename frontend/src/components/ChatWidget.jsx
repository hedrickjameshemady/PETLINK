import { useState, useEffect, useRef } from 'react';
import { API, useAuth, avatarUrl } from '../context/AuthContext';

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [draft, setDraft] = useState('');
  const [unread, setUnread] = useState(0);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  // Admins don't use this bubble — they have the full inbox page instead.
  const isStaff = user && (user.role === 'admin' || user.role === 'staff');

  // ── POLLING ──
  // Every 5 seconds we ask the server "anything new?".
  // If the chat is OPEN we pull the full thread; if CLOSED we only pull the
  // unread COUNT (much lighter on the server).
  useEffect(() => {
    if (!user || isStaff) return;

    const tick = () => {
      if (open) {
        API.get('/messages/my')
          .then(({ data }) => { setMsgs(data); setUnread(0); })
          .catch(() => {});
      } else {
        API.get('/messages/my/unread')
          .then(({ data }) => setUnread(data.unread))
          .catch(() => {});
      }
    };

    tick();                                  // run once immediately
    const timer = setInterval(tick, 5000);   // then every 5s
    return () => clearInterval(timer);       // stop when the component unmounts
  }, [user, open, isStaff]);

  // Auto-scroll to the newest message
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, open]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);

    // OPTIMISTIC UI: show the bubble instantly so it FEELS fast,
    // then let the next poll replace it with the real saved row.
    const temp = {
      id: `temp-${Date.now()}`,
      body,
      sender_role: 'user',
      created_at: new Date().toISOString(),
      _pending: true,
    };
    setMsgs(prev => [...prev, temp]);
    setDraft('');

    try {
      await API.post('/messages/my', { body });
      const { data } = await API.get('/messages/my');
      setMsgs(data);
    } catch (err) {
      // Mark the bubble as failed instead of silently losing it
      setMsgs(prev => prev.map(m => m.id === temp.id ? { ...m, _failed: true, _pending: false } : m));
    } finally {
      setSending(false);
    }
  };

  if (!user || isStaff) return null;

  return (
    <>
      {/* ── THE FLOATING BUBBLE ── */}
      <button onClick={() => setOpen(o => !o)} style={s.bubble} title="Message the shelter">
        {open ? '✕' : '💬'}
        {!open && unread > 0 && <span style={s.dot}>{unread}</span>}
      </button>

      {/* ── THE CHAT PANEL ── */}
      {open && (
        <div style={s.panel}>
          <div style={s.header}>
            <div style={s.headerAvatar}>🐾</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>PETLINK Shelter</div>
              <div style={{ fontSize: 11.5, opacity: 0.85 }}>We usually reply within a day</div>
            </div>
            <button onClick={() => setOpen(false)} style={s.headerClose}>✕</button>
          </div>

          <div style={s.body}>
            {msgs.length === 0 ? (
              <div style={s.emptyChat}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Say hello!</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Ask us about adopting, volunteering, donating,<br />or a lost pet. We're here to help.
                </div>
              </div>
            ) : msgs.map(m => {
              const mine = m.sender_role === 'user';
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                  <div style={{
                    ...s.bubbleMsg,
                    background: mine ? 'var(--primary)' : '#fff',
                    color: mine ? '#fff' : 'var(--text-dark)',
                    border: mine ? 'none' : '1px solid var(--border)',
                    borderBottomRightRadius: mine ? 4 : 14,
                    borderBottomLeftRadius: mine ? 14 : 4,
                    opacity: m._pending ? 0.6 : 1,
                  }}>
                    {!mine && (
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--primary)', marginBottom: 3 }}>
                        PETLINK Staff
                      </div>
                    )}
                    <div style={{ fontSize: 13.5, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {m.body}
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.65, marginTop: 4, textAlign: 'right' }}>
                      {m._failed ? '⚠ Failed to send'
                        : m._pending ? 'Sending…'
                        : new Date(m.created_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div style={s.footer}>
            <textarea
              placeholder="Type a message…"
              value={draft}
              maxLength={2000}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                // Enter sends. Shift+Enter makes a new line. Just like every chat app.
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              style={s.input}
            />
            <button onClick={send} disabled={!draft.trim() || sending} style={{
              ...s.sendBtn,
              opacity: (!draft.trim() || sending) ? 0.45 : 1,
              cursor: (!draft.trim() || sending) ? 'not-allowed' : 'pointer',
            }}>➤</button>
          </div>
        </div>
      )}
    </>
  );
}

const s = {
  bubble: {
    position: 'fixed', bottom: 24, right: 24, zIndex: 9998,
    width: 58, height: 58, borderRadius: '50%',
    background: 'var(--primary)', color: '#fff', border: 'none',
    fontSize: 24, cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  dot: {
    position: 'absolute', top: 2, right: 2,
    minWidth: 20, height: 20, borderRadius: 10,
    background: '#dc3545', color: '#fff',
    fontSize: 11, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 5px', border: '2px solid #fff',
  },
  panel: {
    position: 'fixed', bottom: 94, right: 24, zIndex: 9998,
    width: 360, maxWidth: 'calc(100vw - 32px)', height: 500, maxHeight: 'calc(100vh - 130px)',
    background: '#fff', borderRadius: 14, overflow: 'hidden',
    boxShadow: '0 12px 40px rgba(0,0,0,0.2)', border: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
    background: 'var(--primary)', color: '#fff', flexShrink: 0,
  },
  headerAvatar: {
    width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0,
  },
  headerClose: { background: 'none', border: 'none', color: '#fff', fontSize: 17, cursor: 'pointer', opacity: 0.9 },
  body: { flex: 1, overflowY: 'auto', padding: 14, background: '#f7f8fa' },
  emptyChat: { textAlign: 'center', padding: '40px 20px', color: 'var(--text-dark)' },
  bubbleMsg: { maxWidth: '78%', padding: '9px 12px', borderRadius: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  footer: {
    display: 'flex', gap: 8, alignItems: 'flex-end',
    padding: 10, borderTop: '1px solid var(--border)', background: '#fff', flexShrink: 0,
  },
  input: {
    flex: 1, border: '1.5px solid var(--border)', borderRadius: 18,
    padding: '9px 13px', fontSize: 13.5, fontFamily: 'inherit',
    resize: 'none', maxHeight: 90, minHeight: 38, outline: 'none', lineHeight: 1.4,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
    background: 'var(--primary)', color: '#fff', border: 'none', fontSize: 15,
  },
};