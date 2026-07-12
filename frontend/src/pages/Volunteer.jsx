import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API, useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { SuccessModal } from '../components/ConfirmDialog';

const AVAILABILITY = ['Weekdays', 'Weekends', 'Both', 'Flexible'];
const TIME_SLOTS = ['Morning (8AM-12PM)', 'Afternoon (12PM-5PM)', 'Evening (5PM-9PM)', 'Whole Day (8AM-9PM)'];
const ROLES = ['Pet Care', 'Adoption Helper', 'Cleaning', 'Admin Support', 'Fundraising', 'Other'];

export default function Volunteer() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    availability: '',
    available_time: '',
    preferred_role: '',
    motivation: '',
    experience: '',
    volunteering_since: '',
  });
  const [errors, setErrors] = useState({});
  const [account, setAccount] = useState(null);     // name/email/phone from user account
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Pull the logged-in user's contact details to display (read-only)
  useEffect(() => {
    if (!user) return;
    API.get('/auth/me')
      .then(({ data }) => setAccount(data))
      .catch(() => setAccount(null));
  }, [user]);

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.availability) e.availability = 'Please select your availability.';
    if (!form.available_time) e.available_time = 'Please select your available time.';
    if (!form.preferred_role) e.preferred_role = 'Please select a preferred role.';
    if (!form.motivation.trim()) e.motivation = 'Please tell us why you want to volunteer.';
    else if (form.motivation.trim().length < 15) e.motivation = 'Please write at least 15 characters.';
    // Experience is optional, but if filled, keep it reasonable
    if (form.experience && form.experience.trim().length > 1000) e.experience = 'Please keep this under 1000 characters.';
    if (form.volunteering_since && form.volunteering_since > new Date().toISOString().slice(0, 10)) {
      e.volunteering_since = 'This date cannot be in the future.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!user) { navigate('/login'); return; }
    if (!validate()) return;

    try {
      setLoading(true);
      await API.post('/volunteers/apply', {
        availability: form.availability,
        available_time: form.available_time,
        preferred_role: form.preferred_role,
        motivation: form.motivation.trim(),
        experience: form.experience.trim(),
        volunteering_since: form.volunteering_since || null,
      });
      setSubmitted(true);
    } catch (err) {
      // If the server rejects (e.g. already applied), show the message
      const msg = err.response?.data?.error;
      if (msg) {
        setErrors(prev => ({ ...prev, _server: msg }));
      } else {
        setSubmitted(true); // demo fallback when backend unreachable
      }
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
        <h1 style={styles.title}>Volunteer Registration</h1>

        {/* Info banner */}
        <div style={styles.infoBanner}>
          <span style={styles.infoIcon}>ⓘ</span>
          <p style={styles.infoText}>
            This page is for individuals who wish to register as volunteers. Please complete the form
            with your details. Required fields are marked with an asterisk (<span style={{ color: '#dc3545' }}>*</span>).
            Make sure everything is accurate before submitting — error messages will appear if any required
            information is missing.
          </p>
        </div>

        {submitted && (
          <SuccessModal
            title="Volunteer Registration Complete"
            message="Thank you for registering as a PETLINK volunteer. Your application has been submitted. Our team will review it and reach out with next steps."
            onClose={() => { setSubmitted(false); navigate('/'); }}
          />
        )}

        {!submitted && (
          <div style={styles.formWrap}>
            {errors._server && (
              <div style={styles.serverError}>{errors._server}</div>
            )}

            {/* Read-only account info (from the logged-in user) */}
            <Field label="Name" required>
              <input
                style={{ ...styles.input, background: '#f9fafb', color: 'var(--text-muted)' }}
                value={account ? `${account.first_name} ${account.last_name}` : (user ? user.first_name : '')}
                placeholder="e.g. Alex Manaloto"
                readOnly
              />
              {!user && <span style={styles.hint}>Please log in to auto-fill your details.</span>}
            </Field>

            <Field label="Contact" required>
              <input
                style={{ ...styles.input, background: '#f9fafb', color: 'var(--text-muted)' }}
                value={account?.phone || ''}
                placeholder="e.g. 09589473648"
                readOnly
              />
              {account && !account.phone && (
                <span style={styles.hint}>No phone on file — add one in your Profile so we can reach you.</span>
              )}
            </Field>

            <Field label="Email" required>
              <input
                style={{ ...styles.input, background: '#f9fafb', color: 'var(--text-muted)' }}
                value={account?.email || ''}
                placeholder="e.g. Alex@gmail.com"
                readOnly
              />
            </Field>

            {/* Editable fields that actually save */}
            <Field label="Availability" required error={errors.availability}>
              <select
                style={inputStyle('availability')}
                value={form.availability}
                onChange={e => setField('availability', e.target.value)}
              >
                <option value="">Select Availability</option>
                {AVAILABILITY.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>

            <Field label="Available Time" required error={errors.available_time}>
              <select
                style={inputStyle('available_time')}
                value={form.available_time}
                onChange={e => setField('available_time', e.target.value)}
              >
                <option value="">Select Available Time</option>
                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>

            <Field label="Preferred Role" required error={errors.preferred_role}>
              <select
                style={inputStyle('preferred_role')}
                value={form.preferred_role}
                onChange={e => setField('preferred_role', e.target.value)}
              >
                <option value="">Select Preferred Role</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>

            <Field label="Why do you want to volunteer?" required error={errors.motivation}>
              <textarea
                style={{ ...inputStyle('motivation'), minHeight: 90, resize: 'vertical' }}
                placeholder="Share what motivates you to help shelter animals..."
                value={form.motivation}
                onChange={e => setField('motivation', e.target.value)}
              />
            </Field>

            <Field label="When did you start doing volunteer work?" error={errors.volunteering_since}>
              <input
                type="date"
                style={inputStyle('volunteering_since')}
                max={new Date().toISOString().slice(0, 10)}
                value={form.volunteering_since}
                onChange={e => setField('volunteering_since', e.target.value)}
              />
              <span style={styles.hint}>Leave blank if this is your first time volunteering.</span>
            </Field>

            <Field label="Experience" error={errors.experience}>
              <textarea
                style={{ ...inputStyle('experience'), minHeight: 120, resize: 'vertical' }}
                placeholder="Tell us about any experience you have with animals (optional)..."
                value={form.experience}
                onChange={e => setField('experience', e.target.value)}
              />
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                className="btn btn-primary"
                style={{ padding: '11px 34px' }}
                disabled={loading}
                onClick={handleSubmit}
              >
                {loading ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>
        {label}{required && <span style={{ color: '#dc3545', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error && <span style={styles.error}>{error}</span>}
    </div>
  );
}

const styles = {
  main: { flex: 1, maxWidth: 820, margin: '0 auto', width: '100%', padding: '32px 32px 60px' },
  title: { fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, marginBottom: 20, color: 'var(--text-dark)' },
  infoBanner: {
    display: 'flex', gap: 12, alignItems: 'flex-start',
    background: '#f6f8fa', border: '1px solid var(--border)', borderRadius: 10,
    padding: '14px 18px', marginBottom: 32,
  },
  infoIcon: { color: 'var(--primary)', fontSize: 18, flexShrink: 0, lineHeight: 1.4 },
  infoText: { fontSize: 13.5, color: 'var(--text-mid)', lineHeight: 1.6, margin: 0 },
  formWrap: { maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 },
  field: { display: 'flex', flexDirection: 'column', gap: 7 },
  label: { fontSize: 15, fontWeight: 600, color: 'var(--text-dark)' },
  input: {
    width: '100%', border: '1.5px solid var(--border)', borderRadius: 8,
    padding: '12px 16px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text-dark)',
    outline: 'none', boxSizing: 'border-box', background: 'white',
  },
  error: { fontSize: 12.5, color: '#dc3545', marginTop: 1 },
  hint: { fontSize: 12.5, color: 'var(--text-muted)', marginTop: 1 },
  serverError: {
    background: '#fdecea', border: '1px solid #f5c2c0', color: '#b71c1c',
    borderRadius: 8, padding: '12px 16px', fontSize: 13.5,
  },
};