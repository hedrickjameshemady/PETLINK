import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API, useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Volunteer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ availability: 'Weekdays', preferred_role: '', motivation: '', experience: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    try {
      setLoading(true);
      await API.post('/volunteers/apply', form);
      setSubmitted(true);
    } catch {
      setSubmitted(true); // demo fallback
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: 760, margin: '0 auto', width: '100%', padding: '40px 32px' }}>
        <h1 style={styles.title}>Become a Volunteer</h1>
        <p style={styles.subtitle}>Join our team and make a difference in the lives of shelter animals. We need dedicated volunteers for various roles.</p>

        {/* Roles */}
        <div style={styles.rolesGrid}>
          {[
            { icon: '🐾', role: 'Pet Care', desc: 'Feed, groom, and socialize animals.' },
            { icon: '🏠', role: 'Adoption Helper', desc: 'Assist with adoption screenings and meet & greets.' },
            { icon: '🧹', role: 'Cleaning', desc: 'Keep the shelter clean and sanitary.' },
            { icon: '📋', role: 'Admin Support', desc: 'Handle paperwork and data entry.' },
          ].map(r => (
            <div key={r.role} style={styles.roleCard}>
              <span style={{ fontSize: 28, marginBottom: 8, display: 'block' }}>{r.icon}</span>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{r.role}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{r.desc}</div>
            </div>
          ))}
        </div>

        {submitted ? (
          <div style={styles.successBox}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 22, marginBottom: 8 }}>Application Submitted!</h2>
            <p style={{ color: 'var(--text-muted)' }}>Thank you for volunteering! We'll review your application and contact you soon.</p>
          </div>
        ) : (
          <div className="card" style={{ marginTop: 32 }}>
            <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Volunteer Application Form</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Availability</label>
                  <select className="form-select" value={form.availability} onChange={e => setForm({ ...form, availability: e.target.value })}>
                    {['Weekdays','Weekends','Both','Flexible'].map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Preferred Role</label>
                  <select className="form-select" value={form.preferred_role} onChange={e => setForm({ ...form, preferred_role: e.target.value })} required>
                    <option value="">Select a role...</option>
                    {['Pet Care','Adoption Helper','Cleaning','Admin Support','Fundraising','Other'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Experience with Animals</label>
                <textarea className="form-textarea" placeholder="Tell us about any experience you have with animals..." value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Why do you want to volunteer?</label>
                <textarea className="form-textarea" placeholder="Share your motivation..." value={form.motivation} onChange={e => setForm({ ...form, motivation: e.target.value })} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '12px 32px' }} disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
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
  rolesGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 },
  roleCard: { background: 'var(--green-50)', border: '1.5px solid var(--green-200)', borderRadius: 'var(--radius-md)', padding: '18px 16px', textAlign: 'center' },
  successBox: { background: 'var(--green-50)', border: '2px solid var(--green-200)', borderRadius: 'var(--radius-xl)', padding: '48px 32px', textAlign: 'center', marginTop: 32 },
};
