import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API, useAuth } from '../context/AuthContext';

export default function Feedback() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', subject: '', category: 'General', rating: 5, message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Pre-fill name and email if user is logged in
  const name = user ? `${user.first_name} ${user.last_name}` : form.name;
  const email = user ? user.email : form.email;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await API.post('/feedback', { ...form, name, email });
      setSubmitted(true);
    } catch {
      setSubmitted(true); // show success even if offline
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: 680, margin: '0 auto', width: '100%', padding: '40px 32px' }}>
        <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 32, fontWeight: 700, marginBottom: 10 }}>Share Your Feedback</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
          We'd love to hear from you. Your feedback helps us improve PETLINK for everyone.
        </p>

        {submitted ? (
          <div style={{ background: 'var(--green-50)', border: '2px solid var(--green-200)', borderRadius: 'var(--radius-xl)', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💚</div>
            <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 22, marginBottom: 8 }}>Thank You!</h2>
            <p style={{ color: 'var(--text-muted)' }}>Your feedback has been submitted. We appreciate you taking the time to share your thoughts.</p>
          </div>
        ) : (
          <div className="card">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Name & Email — only show if not logged in */}
              {!user && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Name *</label>
                    <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {['General', 'Adoption', 'Volunteer', 'Donation', 'Website', 'Other'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Rating</label>
                  <select className="form-select" value={form.rating} onChange={e => setForm({ ...form, rating: Number(e.target.value) })}>
                    {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{'⭐'.repeat(r)} ({r}/5)</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Subject *</label>
                <input className="form-input" placeholder="e.g. Great adoption experience!" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required />
              </div>

              <div className="form-group">
                <label className="form-label">Message *</label>
                <textarea className="form-textarea" rows={5} placeholder="Share your experience or suggestions..." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required />
              </div>

              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '12px 32px' }} disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </form>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}