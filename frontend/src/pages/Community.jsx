import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API, useAuth } from '../context/AuthContext';

export default function Community() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [joined, setJoined] = useState({});

  useEffect(() => {
    API.get('/campaigns')
      .then(({ data }) => setCampaigns(data))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  const handleJoin = async (campaignId) => {
    if (!user) {
      alert('Please log in to join this event.');
      return;
    }
    if (joined[campaignId]) return;
    try {
      await API.post(`/campaigns/${campaignId}/join`);
    } catch { /* already joined or offline */ }
    setJoined(prev => ({ ...prev, [campaignId]: true }));
    alert('You have successfully joined this event!');
  };

  const statusBadge = (s) => {
    const map = { Upcoming: '#3b82f6', Active: '#22c55e', Completed: '#6b7280', Cancelled: '#ef4444' };
    return (
      <span style={{ background: map[s] || '#6b7280', color: 'white', borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
        {s}
      </span>
    );
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: 1200, margin: '0 auto', width: '100%', padding: '32px' }}>
        <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          Community Events & Campaigns
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>
          Join our events, support our campaigns, and be part of the PETLINK community.
        </p>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : campaigns.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📢</div>
            <h3>No campaigns yet</h3>
            <p>Check back soon for upcoming events and campaigns!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {campaigns.map(c => (
              <div key={c.id} style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'white' }}>
                {/* Banner */}
                <div style={{ height: 100, background: 'var(--green-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
                  {c.type === 'Event' ? '🎉' : c.type === 'Drive' ? '🚗' : c.type === 'Fundraiser' ? '💚' : '📢'}
                </div>
                {/* Body */}
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <h3 style={{ fontWeight: 700, fontSize: 15, flex: 1, marginRight: 8 }}>{c.title}</h3>
                    {statusBadge(c.status)}
                  </div>
                  <span style={{ background: 'var(--green-100)', color: 'var(--primary)', borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 600, display: 'inline-block', marginBottom: 10 }}>
                    {c.type}
                  </span>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10 }}>{c.description}</p>
                  {c.location && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>📍 {c.location}</div>
                  )}
                  {c.start_date && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                      📅 {new Date(c.start_date).toLocaleDateString()} — {c.end_date ? new Date(c.end_date).toLocaleDateString() : 'TBD'}
                    </div>
                  )}
                  {c.target_amount && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Raised: ₱{Number(c.raised_amount || 0).toLocaleString()}</span>
                        <span style={{ fontWeight: 600 }}>Goal: ₱{Number(c.target_amount).toLocaleString()}</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--green-100)', borderRadius: 99 }}>
                        <div style={{
                          height: '100%',
                          background: 'var(--primary)',
                          borderRadius: 99,
                          width: `${Math.min(100, ((c.raised_amount || 0) / c.target_amount) * 100)}%`,
                          transition: 'width 0.5s ease'
                        }} />
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {c.status !== 'Cancelled' && c.status !== 'Completed' && (
                    <div style={{ marginTop: 14 }}>
                      {(c.type === 'Fundraiser' || c.type === 'Drive') && c.target_amount ? (
                        <a href="/donate" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', display: 'inline-block' }}>
                          💚 Donate to this Campaign
                        </a>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleJoin(c.id)}
                          disabled={!!joined[c.id]}
                        >
                          {joined[c.id] ? '✅ Joined!' : '🙋 Join this Event'}
                        </button>
                      )}
                    </div>
                  )}
                  {c.status === 'Completed' && (
                    <div style={{ marginTop: 14, fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      ✅ This campaign has ended. Thank you to all who participated!
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}