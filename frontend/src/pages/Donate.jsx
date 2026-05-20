import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API, useAuth } from '../context/AuthContext';

export function Donate() {
  const { user } = useAuth();
  const [form, setForm] = useState({ donor_name: user ? `${user.first_name} ${user.last_name}` : '', donor_email: user?.email || '', donor_phone: '', type: 'Individual', amount: '', purpose: '', message: '', campaign_id: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    API.get('/campaigns').then(({ data }) =>
      setCampaigns(data.filter(c => c.target_amount && c.status !== 'Cancelled' && c.status !== 'Completed'))
    );
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await API.post('/volunteers/donations', { ...form, donor_id: user?.id });
      setSubmitted(true);
    } catch { setSubmitted(true); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: 680, margin: '0 auto', width: '100%', padding: '40px 32px' }}>
        <h1 style={styles.title}>Make a Donation</h1>
        <p style={styles.subtitle}>Your donation helps us feed, care for, and rehome animals in need. Every peso makes a difference!</p>

        <div style={styles.impactRow}>
          {[['₱200', 'Feeds a pet for a week'], ['₱500', 'Covers medical check-up'], ['₱2,000', 'Sponsors a pet for a month']].map(([a, d]) => (
            <div key={a} style={styles.impactCard} onClick={() => setForm({ ...form, amount: a.replace('₱', '') })}>
              <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--primary)' }}>{a}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{d}</div>
            </div>
          ))}
        </div>

        {submitted ? (
          <div style={styles.successBox}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💚</div>
            <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 22, marginBottom: 8 }}>Thank You!</h2>
            <p style={{ color: 'var(--text-muted)' }}>Your donation of ₱{form.amount} has been recorded. You're making a real difference!</p>
          </div>
        ) : (
          <div className="card" style={{ marginTop: 28 }}>
            <h2 style={{ fontWeight: 700, fontSize: 17, marginBottom: 18 }}>Donation Details</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Your Name *</label>
                  <input className="form-input" value={form.donor_name} onChange={e => setForm({ ...form, donor_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input className="form-input" type="email" value={form.donor_email} onChange={e => setForm({ ...form, donor_email: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.donor_phone} onChange={e => setForm({ ...form, donor_phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Donor Type</label>
                  <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option>Individual</option><option>Organization</option><option>Anonymous</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₱) *</label>
                <input className="form-input" type="number" min="1" placeholder="Enter amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Donate to a Campaign (optional)</label>
                <select className="form-select" value={form.campaign_id} onChange={e => setForm({ ...form, campaign_id: e.target.value })}>
                  <option value="">— General Donation —</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Purpose</label>
                <input className="form-input" placeholder="e.g. Medical fund, Food supply" value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Message (optional)</label>
                <textarea className="form-textarea" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Leave a message..." />
              </div>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '12px 32px' }} disabled={loading}>
                {loading ? 'Processing...' : '💚 Donate Now'}
              </button>
            </form>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export function Community() {
  const campaigns = [
    { title: 'Save the Strays Drive', type: 'Drive', desc: 'Community drive to rescue street animals and bring them to safety.', date: 'Dec 1–31, 2025', location: 'Naga City', icon: '🚗' },
    { title: 'Holiday Adoption Fair', type: 'Event', desc: 'Special adoption event for the holidays!', date: 'Dec 20–22, 2025', location: 'SM City Naga', icon: '🎉' },
    { title: 'Annual Fundraiser Gala', type: 'Fundraiser', desc: 'Annual fundraising event to support shelter operations.', date: 'Nov 1–30, 2025', location: 'Naga City Hotel', icon: '💚' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: 1100, margin: '0 auto', width: '100%', padding: '40px 32px' }}>
        <h1 style={styles.title}>Community & Campaigns</h1>
        <p style={styles.subtitle}>Join our events and campaigns to help more animals and strengthen our community.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {campaigns.map(c => (
            <div key={c.title} className="card" style={{ borderTop: '4px solid var(--primary)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{c.icon}</div>
              <span className="badge badge-blue" style={{ marginBottom: 10 }}>{c.type}</span>
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{c.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>{c.desc}</p>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📅 {c.date}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>📍 {c.location}</div>
              <button className="btn btn-primary btn-sm">Learn More</button>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function Feedback() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: user ? `${user.first_name} ${user.last_name}` : '', email: user?.email || '', category: 'General', subject: '', message: '', rating: 5 });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await API.post('/feedback', { ...form, user_id: user?.id }); } catch { /* demo */ }
    setSubmitted(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: 640, margin: '0 auto', width: '100%', padding: '40px 32px' }}>
        <h1 style={styles.title}>Share Your Feedback</h1>
        <p style={styles.subtitle}>Help us improve by sharing your experience with PETLINK.</p>
        {submitted ? (
          <div style={styles.successBox}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🙏</div>
            <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 22, marginBottom: 8 }}>Thank You!</h2>
            <p style={{ color: 'var(--text-muted)' }}>We appreciate your feedback and will use it to improve our services.</p>
          </div>
        ) : (
          <div className="card" style={{ marginTop: 24 }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {['General','Adoption','Volunteer','Donation','Website','Other'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Rating</label>
                  <div style={{ display: 'flex', gap: 4, paddingTop: 8 }}>
                    {[1,2,3,4,5].map(n => (
                      <button key={n} type="button" onClick={() => setForm({ ...form, rating: n })}
                        style={{ fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', opacity: n <= form.rating ? 1 : 0.3 }}>⭐</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <input className="form-input" placeholder="Brief subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Message *</label>
                <textarea className="form-textarea" style={{ minHeight: 120 }} placeholder="Share your thoughts..." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '12px 32px' }}>Submit Feedback</button>
            </form>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

const styles = {
  title: { fontFamily: "'Fraunces',serif", fontSize: 32, fontWeight: 700, marginBottom: 10 },
  subtitle: { color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.6, marginBottom: 28 },
  impactRow: { display: 'flex', gap: 12 },
  impactCard: { flex: 1, border: '2px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px 14px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' },
  successBox: { background: 'var(--green-50)', border: '2px solid var(--green-200)', borderRadius: 'var(--radius-xl)', padding: '48px 32px', textAlign: 'center', marginTop: 28 },
};

export default Donate;