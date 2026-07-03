import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API, useAuth } from '../context/AuthContext';
import { SuccessModal } from '../components/ConfirmDialog';

const API_BASE = 'http://localhost:5000';

export default function Community() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [joined, setJoined] = useState({});
  const [showJoinedModal, setShowJoinedModal] = useState(false);
  const [viewEvent, setViewEvent] = useState(null);
  const [news, setNews] = useState([]);

  useEffect(() => {
    API.get('/campaigns')
      .then(({ data }) => setCampaigns(data))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));

    API.get('/announcements')
      .then(({ data }) => setNews(data))
      .catch(() => setNews([]));
  }, []);

  const handleJoin = async (campaignId) => {
    if (!user) { navigate('/login'); return; }
    if (joined[campaignId]) return;
    try { await API.post(`/campaigns/${campaignId}/join`); } catch { /* already joined or offline */ }
    setJoined(prev => ({ ...prev, [campaignId]: true }));
    setViewEvent(null);
    setShowJoinedModal(true);
  };

  const fmtRange = (s, e) => {
    if (!s) return null;
    const a = new Date(s).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
    const b = e ? new Date(e).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : null;
    return b && b !== a ? `${a} — ${b}` : a;
  };

  const typeEmoji = (t) => (t === 'Event' ? '🎉' : t === 'Drive' ? '🚗' : t === 'Fundraiser' ? '💚' : t === 'Campaign' ? '📢' : '📅');

  const statusBadge = (s) => {
    const map = { Upcoming: '#3b82f6', Active: '#22c55e', Completed: '#6b7280', Cancelled: '#ef4444' };
    return (
      <span style={{ background: map[s] || '#6b7280', color: 'white', borderRadius: 99, padding: '3px 12px', fontSize: 11, fontWeight: 600 }}>
        {s}
      </span>
    );
  };

  const isFund = (c) => (c.type === 'Fundraiser' || c.type === 'Drive') && c.target_amount;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: 1100, margin: '0 auto', width: '100%', padding: '32px' }}>
        <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 30, fontWeight: 700, marginBottom: 18 }}>
          Upcoming Events
        </h1>

        {/* Info banner */}
        <div style={st.infoBanner}>
          <span style={st.infoIcon}>ⓘ</span>
          <p style={st.infoText}>
            This page displays a list of upcoming PETLINK events, including adoption fairs, volunteer
            activities, and community programs. Each event includes the date, time, location, and
            description. Scroll through the list to explore upcoming activities.
          </p>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : campaigns.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📢</div>
            <h3>No events yet</h3>
            <p>Check back soon for upcoming events and campaigns!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
            {campaigns.map(c => (
              <div key={c.id} style={st.card}>
                {/* Left: text */}
                <div style={st.cardBody}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                    <h3 style={st.cardTitle}>{c.title} • {c.start_date ? new Date(c.start_date).toLocaleDateString('en-CA') : 'TBD'}</h3>
                    {statusBadge(c.status)}
                  </div>
                  {c.location && <div style={st.metaMuted}>{c.location}</div>}
                  <p style={st.cardDesc}>{c.description}</p>
                  <button style={st.detailsBtn} onClick={() => setViewEvent(c)}>View Details</button>
                </div>
                {/* Right: photo */}
                <div style={st.cardPhoto}>
                  {c.banner_image ? (
                    <img src={`${API_BASE}${c.banner_image}`} alt={c.title} style={st.cardPhotoImg} />
                  ) : (
                    <div style={st.cardPhotoPlaceholder}>{typeEmoji(c.type)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── NEWS & ANNOUNCEMENTS ─── */}
        {news.length > 0 && (
          <section style={{ marginTop: 56 }}>
            <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 26, fontWeight: 700, marginBottom: 6, textAlign: 'center' }}>
              News & Announcements
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28, textAlign: 'center' }}>
              The latest updates, rescues, and success stories from PETLINK.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
              {news.map(n => (
                <article key={n.id} style={st.newsCard}>
                  {n.photo && (
                    <div style={st.newsPhotoWrap}>
                      <img src={`${API_BASE}${n.photo}`} alt={n.headline} style={st.newsPhoto} />
                    </div>
                  )}
                  <div style={st.newsBody}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      {n.is_pinned ? <span style={st.pinnedPill}>📌 Pinned</span> : null}
                      {n.created_at && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {new Date(n.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <h3 style={st.newsHeadline}>{n.headline}</h3>
                    {n.message && <p style={st.newsMessage}>{n.message}</p>}
                    {n.video && (
                      <video src={`${API_BASE}${n.video}`} controls style={st.newsVideo} />
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ─── VIEW DETAILS MODAL ─── */}
      {viewEvent && (
        <div style={st.overlay} onClick={e => e.target === e.currentTarget && setViewEvent(null)}>
          <div style={st.modal}>
            {/* Hero image */}
            <div style={st.modalHero}>
              {viewEvent.banner_image ? (
                <img src={`${API_BASE}${viewEvent.banner_image}`} alt={viewEvent.title} style={st.modalHeroImg} />
              ) : (
                <div style={st.modalHeroPlaceholder}>{typeEmoji(viewEvent.type)}</div>
              )}
              <button style={st.modalClose} onClick={() => setViewEvent(null)}>✕</button>
            </div>

            <div style={{ padding: '22px 26px 26px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={st.typePill}>{viewEvent.type}</span>
                {statusBadge(viewEvent.status)}
              </div>

              <h2 style={st.modalTitle}>{viewEvent.title}</h2>

              <div style={st.detailGrid}>
                {viewEvent.location && (
                  <div style={st.detailItem}>
                    <span style={st.detailLabel}>📍 Location</span>
                    <span style={st.detailValue}>{viewEvent.location}</span>
                  </div>
                )}
                {viewEvent.start_date && (
                  <div style={st.detailItem}>
                    <span style={st.detailLabel}>📅 Date</span>
                    <span style={st.detailValue}>{fmtRange(viewEvent.start_date, viewEvent.end_date)}</span>
                  </div>
                )}
              </div>

              {viewEvent.description && (
                <>
                  <div style={st.detailLabel}>About this event</div>
                  <p style={st.modalDesc}>{viewEvent.description}</p>
                </>
              )}

              {/* Fundraiser progress */}
              {isFund(viewEvent) && (
                <div style={st.progressWrap}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Raised: ₱{Number(viewEvent.raised_amount || 0).toLocaleString()}</span>
                    <span style={{ fontWeight: 700 }}>Goal: ₱{Number(viewEvent.target_amount).toLocaleString()}</span>
                  </div>
                  <div style={st.progressTrack}>
                    <div style={{ ...st.progressFill, width: `${Math.min(100, ((viewEvent.raised_amount || 0) / viewEvent.target_amount) * 100)}%` }} />
                  </div>
                </div>
              )}

              {/* Action */}
              {viewEvent.status !== 'Cancelled' && viewEvent.status !== 'Completed' ? (
                <div style={{ marginTop: 22 }}>
                  {isFund(viewEvent) ? (
                    <a href={`/donate?campaign=${viewEvent.id}`} style={{ ...st.primaryBtn, textDecoration: 'none', display: 'inline-block' }}>
                      💚 Donate to this Campaign
                    </a>
                  ) : (
                    <button
                      style={{ ...st.primaryBtn, opacity: joined[viewEvent.id] ? 0.6 : 1 }}
                      onClick={() => handleJoin(viewEvent.id)}
                      disabled={!!joined[viewEvent.id]}
                    >
                      {joined[viewEvent.id] ? '✅ Joined!' : '🙋 Join this Event'}
                    </button>
                  )}
                </div>
              ) : viewEvent.status === 'Completed' ? (
                <p style={{ marginTop: 20, fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  ✅ This event has ended. Thank you to all who participated!
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {showJoinedModal && (
        <SuccessModal
          title="Event Joined Successfully"
          message="You're all set! Your spot for this event has been confirmed. We look forward to seeing you there."
          onClose={() => setShowJoinedModal(false)}
        />
      )}
      <Footer />
    </div>
  );
}

const st = {
  infoBanner: {
    display: 'flex', gap: 12, alignItems: 'flex-start',
    background: '#f6f8fa', border: '1px solid var(--border)', borderRadius: 10,
    padding: '14px 18px', marginBottom: 32,
  },
  infoIcon: { color: '#22c55e', fontSize: 18, flexShrink: 0, lineHeight: 1.4 },
  infoText: { fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.6, margin: 0 },

  card: {
    display: 'flex', width: '100%', maxWidth: 760, background: 'white',
    border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  cardBody: { flex: 1, padding: '26px 28px', display: 'flex', flexDirection: 'column' },
  cardTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text-dark)', margin: 0 },
  metaMuted: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 },
  cardDesc: { fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.5, margin: '0 0 20px', flex: 1 },
  detailsBtn: {
    alignSelf: 'flex-start', background: 'white', border: '1.5px solid var(--text-dark)',
    borderRadius: 99, padding: '9px 22px', fontSize: 13.5, fontWeight: 600,
    color: 'var(--text-dark)', cursor: 'pointer', fontFamily: 'inherit',
  },
  cardPhoto: { width: 250, flexShrink: 0, background: 'var(--green-100)' },
  cardPhotoImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  cardPhotoPlaceholder: { width: '100%', height: '100%', minHeight: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 54 },

  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modal: {
    background: 'white', borderRadius: 18, width: '100%', maxWidth: 560,
    maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  modalHero: { position: 'relative', height: 220, background: 'var(--green-100)' },
  modalHeroImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  modalHeroPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72 },
  modalClose: {
    position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderRadius: '50%',
    border: 'none', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: 16,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  typePill: { background: 'var(--green-100)', color: 'var(--primary)', borderRadius: 99, padding: '3px 12px', fontSize: 11, fontWeight: 700 },
  modalTitle: { fontFamily: "'Fraunces',serif", fontSize: 24, fontWeight: 700, margin: '4px 0 18px', color: 'var(--text-dark)' },
  detailGrid: { display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 },
  detailItem: { display: 'flex', flexDirection: 'column', gap: 3 },
  detailLabel: { fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 },
  detailValue: { fontSize: 14.5, color: 'var(--text-dark)', fontWeight: 500 },
  modalDesc: { fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.65, margin: '0 0 4px' },
  progressWrap: { marginTop: 20 },
  progressTrack: { height: 8, background: 'var(--green-100)', borderRadius: 99 },
  progressFill: { height: '100%', background: 'var(--primary)', borderRadius: 99, transition: 'width 0.5s ease' },
  primaryBtn: {
    background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 99,
    padding: '11px 26px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },

  newsCard: {
    width: '100%', maxWidth: 760, background: 'white', border: '1.5px solid var(--border)',
    borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  newsPhotoWrap: { width: '100%', maxHeight: 300, overflow: 'hidden' },
  newsPhoto: { width: '100%', maxHeight: 300, objectFit: 'cover', display: 'block' },
  newsBody: { padding: '20px 26px 24px' },
  pinnedPill: { background: 'var(--green-100)', color: 'var(--primary)', borderRadius: 99, padding: '3px 12px', fontSize: 11, fontWeight: 700 },
  newsHeadline: { fontSize: 19, fontWeight: 700, color: 'var(--text-dark)', margin: '0 0 8px', fontFamily: "'Fraunces',serif" },
  newsMessage: { fontSize: 14.5, color: 'var(--text-mid)', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' },
  newsVideo: { width: '100%', maxHeight: 320, borderRadius: 10, marginTop: 14, display: 'block' },
};