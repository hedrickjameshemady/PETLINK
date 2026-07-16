import { useState, useEffect } from 'react';
import { API } from '../context/AuthContext';
import { fileUrl } from '../config';

// A row of 5 clickable stars.
function StarPicker({ value, onRate, size = 20, readOnly = false }) {
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

// The 7 scoring criteria — keys MUST match RATING_CRITERIA in backend/src/routes/adoptions.js
const CRITERIA = [
  { key: 'housing_environment',      label: 'Housing & Environment',    fields: ['housing_type', 'has_yard', 'rent_or_own', 'landlord_allows_pets'] },
  { key: 'financial_readiness',      label: 'Financial Readiness',      fields: ['can_afford_care', 'employment_status', 'monthly_pet_budget', 'emergency_vet_plan'] },
  { key: 'pet_experience',           label: 'Pet Experience',           fields: ['other_pets', 'current_pets_neutered', 'previous_pets', 'vet_info', 'experience_with_pets'] },
  { key: 'household_support',        label: 'Household Support',        fields: ['household_size', 'family_agrees', 'children_at_home', 'allergies'] },
  { key: 'care_planning',            label: 'Care Planning',            fields: ['hours_alone', 'who_cares_when_away', 'if_you_move'] },
  { key: 'long_term_commitment',     label: 'Long-term Commitment',     fields: ['lifetime_commitment', 'reason_for_adoption'] },
  { key: 'verification_willingness', label: 'Verification Willingness', fields: ['willing_valid_id', 'willing_home_photos', 'willing_interview', 'reference_contact'] },
];

const FIELD_LABELS = {
  housing_type: 'Housing Type',
  has_yard: 'Has Yard',
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
  employment_status: 'Employment / Income Source',
  monthly_pet_budget: 'Monthly Pet Budget',
  emergency_vet_plan: 'Emergency Vet Plan',
  if_you_move: 'If They Move',
  lifetime_commitment: 'Lifetime Commitment',
  reason_for_adoption: 'Reason for Adoption',
  willing_valid_id: 'Willing: Valid ID',
  willing_home_photos: 'Willing: Home Photos',
  willing_interview: 'Willing: Interview',
  reference_contact: 'Reference Contact',
  preferred_contact: 'Preferred Contact',
  phone_number: 'Phone Number',
};

function fmtVal(key, val) {
  if (key === 'has_yard') return val ? 'Yes' : 'No';
  return String(val);
}

export default function ApplicantGrading({ petId, petName }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingApp, setRatingApp] = useState(null); // the applicant object shown in the modal
  const [toast, setToast] = useState('');
  const [draft, setDraft] = useState({});           // this reviewer's scores for the open applicant
  const [saving, setSaving] = useState(false);

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

  // Open the rating modal for one applicant, seeding this reviewer's saved scores.
  const openModal = async (app) => {
    setRatingApp(app);
    setDraft({});
    try {
      const { data: mine } = await API.get(`/adoptions/${app.id}/ratings/mine`);
      const seed = {};
      (mine || []).forEach(r => { seed[r.criteria] = r.stars; });
      setDraft(seed);
    } catch {
      setDraft({});
    }
  };

  const closeModal = () => { setRatingApp(null); setDraft({}); };

  const setStar = (criteriaKey, stars) => setDraft(d => ({ ...d, [criteriaKey]: stars }));

  const saveRatings = async () => {
    if (Object.keys(draft).length === 0) { showToast('Rate at least one criterion first.', true); return; }
    try {
      setSaving(true);
      await API.post(`/adoptions/${ratingApp.id}/rate`, { ratings: draft });
      showToast('Your ratings were saved.');
      closeModal();
      load();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to save ratings.', true);
    } finally { setSaving(false); }
  };

  const decide = async (appId, status) => {
    const verb = status === 'Approved' ? 'approve' : 'reject';
    if (!window.confirm(`Are you sure you want to ${verb} this applicant?`)) return;
    try {
      await API.patch(`/adoptions/${appId}/status`, { status });
      showToast(`Applicant ${status.toLowerCase()}.`);
      closeModal();
      load();
    } catch (err) {
      showToast(err?.response?.data?.error || `Failed to ${verb}.`, true);
    }
  };

  const draftAvg = () => {
    const vals = Object.values(draft).filter(Boolean);
    if (!vals.length) return null;
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  if (apps.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', background: '#f9fafb', borderRadius: 12, border: '1px dashed var(--border)' }}>
        No applicants for {petName || 'this pet'} yet.
      </div>
    );
  }

  const decidedApp = apps.find(a => a.status === 'Approved');
  const modalLocked = ratingApp && ratingApp.status !== 'Pending Review';

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
        {apps.length} applicant{apps.length !== 1 ? 's' : ''} — sorted by highest average rating. Each applicant is scored on 7 criteria; the score shown is the average.
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
                {a.preferred_contact === 'Phone' && a.phone_number && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📞 {a.phone_number} <span style={{ color: '#059669' }}>(prefers phone)</span></div>
                )}
                {a.preferred_contact === 'Email' && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>✉️ prefers email</div>
                )}
              </div>
            </div>

            {/* Overall average across all reviewers & criteria */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <StarPicker value={Math.round(a.avg_stars || 0)} readOnly size={18} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                {a.avg_stars != null ? Number(a.avg_stars).toFixed(1) : '—'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                ({a.rating_count || 0} reviewer{a.rating_count === 1 ? '' : 's'})
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={`badge badge-${a.status === 'Approved' ? 'green' : a.status === 'Rejected' ? 'red' : 'yellow'}`}>{a.status}</span>
              <button
                onClick={() => openModal(a)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
              >
                View answers &amp; rate
              </button>
            </div>

            {a.status === 'Pending Review' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-danger btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => decide(a.id, 'Rejected')}>Reject</button>
                <button className="btn btn-success btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => decide(a.id, 'Approved')}>Approve</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── CENTERED RATING MODAL: answers on the left, star rating on the right ── */}
      {ratingApp && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal" style={{ maxWidth: 620, width: '100%' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ fontSize: 18 }}>Review &amp; Rate — {ratingApp.applicant_name}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 12px' }}>
              {ratingApp.applicant_email}
              {ratingApp.preferred_contact === 'Phone' && ratingApp.phone_number && <> · 📞 {ratingApp.phone_number}</>}
            </div>

            {modalLocked && (
              <div style={{ background: '#f3f4f6', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12 }}>
                This application is {ratingApp.status.toLowerCase()} — ratings are read-only.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {CRITERIA.map(c => {
                const answered = c.fields.filter(f => ratingApp[f] !== null && ratingApp[f] !== undefined && ratingApp[f] !== '');
                return (
                  <div key={c.key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between', background: '#fafafa', border: '1px solid #eee', borderRadius: 10, padding: '12px 14px' }}>
                    {/* Left: answers for this criterion */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--text-dark)', marginBottom: 6 }}>{c.label}</div>
                      {answered.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No answer given</div>
                      ) : answered.map(f => (
                        <div key={f} style={{ fontSize: 12.5, marginBottom: 3 }}>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{FIELD_LABELS[f]}: </span>
                          <span>{fmtVal(f, ratingApp[f])}</span>
                        </div>
                      ))}
                    </div>
                    {/* Right: this reviewer's star rating */}
                    <div style={{ flexShrink: 0, paddingTop: 2 }}>
                      <StarPicker value={draft[c.key] || 0} onRate={(n) => setStar(c.key, n)} readOnly={modalLocked} size={18} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Your average: <strong style={{ color: 'var(--text-dark)' }}>{draftAvg() ?? '—'}</strong>
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline" onClick={closeModal}>Close</button>
                {!modalLocked && (
                  <button className="btn btn-primary" onClick={saveRatings} disabled={saving}>
                    {saving ? 'Saving...' : 'Save ratings'}
                  </button>
                )}
              </div>
            </div>

            {/* Approve / Reject right inside the modal while pending */}
            {ratingApp.status === 'Pending Review' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
                <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={() => decide(ratingApp.id, 'Rejected')}>Reject</button>
                <button className="btn btn-success" style={{ flex: 1, justifyContent: 'center' }} onClick={() => decide(ratingApp.id, 'Approved')}>Approve</button>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: toast.err ? '#dc3545' : '#52a872', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500, zIndex: 999 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}