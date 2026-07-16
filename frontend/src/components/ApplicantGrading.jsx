import { useState, useEffect } from 'react';
import { API } from '../context/AuthContext';
import { fileUrl } from '../config';

// A row of 5 clickable stars. `value` is the current rating, `onRate` fires on click.
function StarPicker({ value, onRate, size = 22, readOnly = false }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          onClick={() => !readOnly && onRate(n)}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          style={{
            cursor: readOnly ? 'default' : 'pointer',
            fontSize: size,
            color: (hover || value) >= n ? '#f59e0b' : '#d1d5db',
            transition: 'color 0.1s',
            lineHeight: 1,
          }}
        >★</span>
      ))}
    </div>
  );
}

// The labelled question/answer rows shown when you expand an applicant.
const FIELD_LABELS = {
  living_situation: 'Living Situation',
  housing_type: 'Housing Type',
  rent_or_own: 'Rent or Own',
  landlord_allows_pets: 'Landlord Allows Pets',
  household_size: 'Household Size',
  family_agrees: 'Family Agrees',
  children_at_home: 'Children at Home',
  allergies: 'Allergies in Home',
  other_pets: 'Other Pets',
  previous_pets: 'Previous Pets',
  current_pets_neutered: 'Current Pets Neutered',
  vet_info: 'Veterinarian',
  experience_with_pets: 'Experience with Pets',
  hours_alone: 'Hours Pet Left Alone',
  who_cares_when_away: 'Care When Away',
  can_afford_care: 'Can Afford Care',
  if_you_move: 'If They Move',
  lifetime_commitment: 'Lifetime Commitment',
  reason_for_adoption: 'Reason for Adoption',
  home_visit_ok: 'Home Visit OK',
  preferred_contact: 'Preferred Contact',
};

export default function ApplicantGrading({ petId, petName }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [toast, setToast] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/adoptions/pet/${petId}/applicants`);
      setApps(data);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Could not load applicants.', true);
    } finally { setLoading(false); }
  };
  useEffect(() => { if (petId) load(); }, [petId]);

  const showToast = (msg, err = false) => { setToast({ msg, err }); setTimeout(() => setToast(''), 2500); };

  const rate = async (appId, stars) => {
    try {
      await API.post(`/adoptions/${appId}/rate`, { stars });
      showToast('Your rating was saved.');
      load(); // reload so the average + ordering refreshes
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to save rating.', true);
    }
  };

  const decide = async (appId, status) => {
    const verb = status === 'Approved' ? 'approve' : 'reject';
    if (!window.confirm(`Are you sure you want to ${verb} this applicant?`)) return;
    try {
      await API.patch(`/adoptions/${appId}/status`, { status });
      showToast(`Applicant ${status.toLowerCase()}.`);
      load(); // refresh badges — approving one auto-rejects the rest
    } catch (err) {
      showToast(err?.response?.data?.error || `Failed to ${verb}.`, true);
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  if (apps.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', background: '#f9fafb', borderRadius: 12, border: '1px dashed var(--border)' }}>
        No applicants for {petName || 'this pet'} yet.
      </div>
    );
  }

  // If any applicant is Approved, this pet has been adopted — the case is closed.
  const decidedApp = apps.find(a => a.status === 'Approved');

  return (
    <div>
      {decidedApp && (
        <div style={{
          background: 'var(--green-50)', border: '1px solid var(--green-200)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 14,
          fontSize: 14, color: 'var(--primary-dark)', fontWeight: 600,
        }}>
          ✓ {decidedApp.applicant_name} was approved to adopt {petName || 'this pet'}. This case is now closed.
        </div>
      )}

      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
        {apps.length} applicant{apps.length !== 1 ? 's' : ''} — sorted by highest average rating. The top card is your best-rated match.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {apps.map((a, idx) => (
          <div key={a.id} style={{
            border: idx === 0 ? '2px solid #f59e0b' : '1px solid var(--border)',
            borderRadius: 14, padding: 18, background: '#fff', position: 'relative',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            {idx === 0 && a.avg_stars != null && (
              <span style={{ position: 'absolute', top: -11, left: 16, background: '#f59e0b', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 10 }}>
                ★ TOP MATCH
              </span>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <img
                src={a.applicant_photo ? fileUrl(a.applicant_photo)
                  : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(a.applicant_name || 'User') + '&background=e5e7eb&color=374151'}
                alt={a.applicant_name}
                style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{a.applicant_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.applicant_email}</div>
              </div>
            </div>

            {/* Average across all reviewers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <StarPicker value={Math.round(a.avg_stars || 0)} readOnly size={18} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                {a.avg_stars != null ? Number(a.avg_stars).toFixed(1) : '—'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                ({a.rating_count || 0} review{a.rating_count === 1 ? '' : 's'})
              </span>
            </div>

            {/* THIS reviewer's own rating */}
            <div style={{ background: 'var(--green-50)', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Your rating
              </div>
              <StarPicker value={a.my_stars || 0} onRate={(n) => rate(a.id, n)} />
            </div>

           <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={`badge badge-${a.status === 'Approved' ? 'green' : a.status === 'Rejected' ? 'red' : 'yellow'}`}>{a.status}</span>
              <button
                onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
              >
                {expanded === a.id ? 'Hide answers' : 'View answers'}
              </button>
            </div>

            {/* Approve / Reject — only while still pending */}
            {a.status === 'Pending Review' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  className="btn btn-danger btn-sm"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => decide(a.id, 'Rejected')}
                >Reject</button>
                <button
                  className="btn btn-success btn-sm"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => decide(a.id, 'Approved')}
                >Approve</button>
              </div>
            )}

            {expanded === a.id && (
              <div style={{ marginTop: 12, borderTop: '1px solid #f0f0f0', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.keys(FIELD_LABELS).map(key => {
                  let val = a[key];
                  if (val === null || val === undefined || val === '') return null;
                  if (key === 'has_yard') return null;
                  return (
                    <div key={key} style={{ fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{FIELD_LABELS[key]}: </span>
                      <span>{String(val)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: toast.err ? '#dc3545' : '#52a872', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500, zIndex: 999 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}