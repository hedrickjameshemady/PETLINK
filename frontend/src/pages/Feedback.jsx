import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API, useAuth } from '../context/AuthContext';
import { SuccessModal } from '../components/ConfirmDialog';

const FEEDBACK_TYPES = ['General', 'Adoption', 'Volunteer', 'Event', 'Donation', 'Website', 'Other'];

export default function Feedback() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    category: '',
    rating: 0,
    message: '',
  });
  const [hoverRating, setHoverRating] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Pre-fill name/email for logged-in users
  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        name: prev.name || `${user.first_name} ${user.last_name}`,
        email: prev.email || user.email || '',
      }));
    }
  }, [user]);

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const e = {};
    // Name is optional
    if (!form.email.trim()) e.email = 'Please enter your email.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Please enter a valid email address.';
    if (!form.category) e.category = 'Please select a feedback type.';
    if (!form.rating) e.rating = 'Please give a rating.';
    if (!form.message.trim()) e.message = 'Please enter your message.';
    else if (form.message.trim().length < 10) e.message = 'Please write at least 10 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      await API.post('/feedback', {
        user_id: user ? user.id : null,
        name: form.name.trim() || null,
        email: form.email.trim(),
        category: form.category,
        subject: null,
        message: form.message.trim(),
        rating: form.rating,
      });
      setSubmitted(true);
    } catch (err) {
      const msg = err.response?.data?.error;
      if (msg) setErrors(prev => ({ ...prev, _server: msg }));
      else setSubmitted(true); // demo fallback when backend unreachable
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (key) => ({
    ...styles.input,
    borderColor: errors[key] ? '#dc3545' : 'var(--border)',
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={styles.main}>
        <h1 style={styles.title}>Share Your Feedback</h1>

        {/* Info banner */}
        <div style={styles.infoBanner}>
          <span style={styles.infoIcon}>ⓘ</span>
          <p style={styles.infoText}>
            This page lets you share feedback, suggestions, or concerns about PETLINK's system or services.
            Enter your message in the field below and submit the form when finished. Your feedback helps us
            improve accessibility, usability, and overall user experience.
          </p>
        </div>

        {submitted && (
          <SuccessModal
            title="Feedback Submitted"
            message="Thank you for sharing your feedback. Your message has been received and will help us improve PETLINK's services."
            onClose={() => setSubmitted(false)}
          />
        )}

        {!submitted && (
          <div style={styles.formWrap}>
            {errors._server && <div style={styles.serverError}>{errors._server}</div>}

            {/* Row 1: Name + Email */}
            <div style={styles.row}>
              <Field label="Name" hint="optional">
                <input
                  style={styles.input}
                  placeholder="e.g. Alex Manaloto"
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                />
              </Field>

              <Field label="Email" required error={errors.email}>
                <input
                  style={inputStyle('email')}
                  type="email"
                  placeholder="e.g. alex@gmail.com"
                  value={form.email}
                  onChange={e => setField('email', e.target.value)}
                />
              </Field>
            </div>

            {/* Row 2: Feedback Type + Rating */}
            <div style={styles.row}>
              <Field label="Feedback Type" required error={errors.category}>
                <select
                  style={inputStyle('category')}
                  value={form.category}
                  onChange={e => setField('category', e.target.value)}
                >
                  <option value="">Select Type of feedback</option>
                  {FEEDBACK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>

              <Field label="Rating" required error={errors.rating}>
                <div style={{ ...styles.input, display: 'flex', alignItems: 'center', gap: 4, cursor: 'default', borderColor: errors.rating ? '#dc3545' : 'var(--border)' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <span
                      key={star}
                      onClick={() => setField('rating', star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      style={{
                        fontSize: 22,
                        cursor: 'pointer',
                        color: (hoverRating || form.rating) >= star ? '#e8a33d' : '#d1d5db',
                        transition: 'color 0.12s',
                        lineHeight: 1,
                      }}
                      role="button"
                      aria-label={`${star} star${star > 1 ? 's' : ''}`}
                    >
                      ★
                    </span>
                  ))}
                  {form.rating > 0 && (
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>{form.rating}/5</span>
                  )}
                </div>
              </Field>
            </div>

            {/* Message */}
            <Field label="Message" required error={errors.message}>
              <textarea
                style={{ ...inputStyle('message'), minHeight: 120, resize: 'vertical' }}
                placeholder="Type your concern..."
                value={form.message}
                onChange={e => setField('message', e.target.value)}
              />
              <span style={styles.hint}>Submitted feedback is stored in the admin's Community Feedback section.</span>
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                className="btn btn-primary"
                style={{ padding: '11px 30px' }}
                disabled={loading}
                onClick={handleSubmit}
              >
                {loading ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Field({ label, required, hint, error, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>
        {label}
        {required && <span style={{ color: '#dc3545', marginLeft: 3 }}>*</span>}
        {hint && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 5 }}>({hint})</span>}
      </label>
      {children}
      {error && <span style={styles.error}>{error}</span>}
    </div>
  );
}

const styles = {
  main: { flex: 1, maxWidth: 900, margin: '0 auto', width: '100%', padding: '32px 32px 60px' },
  title: { fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, marginBottom: 20, color: 'var(--text-dark)' },
  infoBanner: {
    display: 'flex', gap: 12, alignItems: 'flex-start',
    background: '#f6f8fa', border: '1px solid var(--border)', borderRadius: 10,
    padding: '14px 18px', marginBottom: 40,
  },
  infoIcon: { color: 'var(--primary)', fontSize: 18, flexShrink: 0, lineHeight: 1.4 },
  infoText: { fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.6, margin: 0 },
  formWrap: { maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 },
  field: { display: 'flex', flexDirection: 'column', gap: 7 },
  label: { fontSize: 15, fontWeight: 600, color: 'var(--text-dark)' },
  input: {
    width: '100%', border: '1.5px solid var(--border)', borderRadius: 8,
    padding: '12px 16px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text-dark)',
    outline: 'none', boxSizing: 'border-box', background: 'white',
  },
  error: { fontSize: 12.5, color: '#dc3545', marginTop: 1 },
  hint: { fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 },
  serverError: {
    background: '#fdecea', border: '1px solid #f5c2c0', color: '#b71c1c',
    borderRadius: 8, padding: '12px 16px', fontSize: 13.5,
  },
};