import { useState, useEffect } from 'react';
import { API } from '../../context/AuthContext';
import { ConfirmModal } from '../../components/ConfirmDialog';

export default function PetsAndAdoptions() {
  const [pets, setPets] = useState([]);
  const [applications, setApplications] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddPet, setShowAddPet] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [editPet, setEditPet] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editPhotoFile, setEditPhotoFile] = useState(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState(null);
  const [viewApp, setViewApp] = useState(null);
  const [viewPet, setViewPet] = useState(null);
  const [viewProfile, setViewProfile] = useState(null);      // full applicant profile
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [adopted, setAdopted] = useState([]);                // adopted pets + adopter info
  const [monitorApp, setMonitorApp] = useState(null);        // adoption being monitored
  const [followups, setFollowups] = useState([]);
  const [followForm, setFollowForm] = useState({ followup_date: '', outcome: 'Doing Well', notes: '' });
  const [toast, setToast] = useState('');
  const [confirmState, setConfirmState] = useState(null);
  const [petForm, setPetForm] = useState({ name: '', type: 'Dog', breed: '', age_years: '', weight: '', gender: 'Male', health_status: 'Excellent', status: 'Available', description: '', intake_date: '', traits: [], vet_name: '', clinic_name: '', last_checkup_date: '', vaccines_given: '', medical_notes: '', vaccination_status: false, neutered: false, neutered_date: '', vaccine_log: [] });
  const [petPhotoFile, setPetPhotoFile] = useState(null);
  const [petPhotoPreview, setPetPhotoPreview] = useState(null);
  const [assessForm, setAssessForm] = useState({ pet_id: '', traits: '', description: '', compatibility_notes: '' });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [p, a, as, ad] = await Promise.all([
        API.get('/pets/all').catch(() => ({ data: DEMO_PETS })),
        API.get('/adoptions').catch(() => ({ data: DEMO_APPS })),
        API.get('/pets/assessments').catch(() => ({ data: DEMO_ASSESSMENTS })),
        API.get('/adoptions/adopted').catch(() => ({ data: [] })),
      ]);
      setPets(p.data);
      setApplications(a.data);
      setAssessments(as.data);
      setAdopted(ad.data);
    } finally { setLoading(false); }
  };

  const showToast = (msg, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddPet = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.entries(petForm).forEach(([k, v]) => {
        if (k === 'traits') formData.append(k, JSON.stringify(v || []));
        else if (k === 'vaccine_log') formData.append(k, JSON.stringify(v || []));
        else if (v !== undefined && v !== null) formData.append(k, v);
      });
      if (petPhotoFile) formData.append('photo', petPhotoFile);
      await API.post('/pets', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast('Pet added successfully!');
      setShowAddPet(false);
      fetchAll();
    } catch {
      setPets(prev => [...prev, { id: Date.now(), pet_id: `PET00${prev.length + 1}`, ...petForm, age_years: Number(petForm.age_years) }]);
      showToast('Pet added (demo mode)!');
      setShowAddPet(false);
    }
    setPetForm({ name: '', type: 'Dog', breed: '', age_years: '', weight: '', gender: 'Male', health_status: 'Excellent', status: 'Available', description: '', intake_date: '', traits: [], vet_name: '', clinic_name: '', last_checkup_date: '', vaccines_given: '', medical_notes: '', vaccination_status: false, neutered: false, neutered_date: '', vaccine_log: [] });
    setPetPhotoFile(null);
    setPetPhotoPreview(null);
  };

  const openProfile = async (userId) => {
    if (!userId) { showToast('No linked profile for this applicant'); return; }
    try {
      setLoadingProfile(true);
      const { data } = await API.get(`/auth/users/${userId}`);
      setViewProfile(data);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  const openMonitor = async (row) => {
    setMonitorApp(row);
    setFollowForm({ followup_date: new Date().toISOString().slice(0, 10), outcome: 'Doing Well', notes: '' });
    try {
      const { data } = await API.get(`/adoptions/${row.application_id}/followups`);
      setFollowups(data);
    } catch { setFollowups([]); }
  };

  const submitFollowup = async () => {
    if (!followForm.followup_date) { showToast('Please pick a date', true); return; }
    try {
      await API.post(`/adoptions/${monitorApp.application_id}/followups`, followForm);
      const { data } = await API.get(`/adoptions/${monitorApp.application_id}/followups`);
      setFollowups(data);
      setFollowForm({ followup_date: new Date().toISOString().slice(0, 10), outcome: 'Doing Well', notes: '' });
      setAdopted(prev => prev.map(a => a.application_id === monitorApp.application_id
        ? { ...a, followup_count: (a.followup_count || 0) + 1, last_followup: followForm.followup_date }
        : a));
      showToast('Follow-up recorded');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save follow-up', true);
    }
  };

  const handleStatus = async (appId, status) => {
    const apply = async () => {
      try {
        await API.patch(`/adoptions/${appId}/status`, { status });
      } catch { /* demo */ }
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
      showToast(`Application ${status}`);
      if (status === 'Approved') fetchAll();
    };

    if (status === 'Rejected') {
      setConfirmState({
        title: 'Are you sure about rejecting?',
        message: 'The applicant will be notified that their adoption application was not approved.',
        onConfirm: apply,
      });
      return;
    }
    apply();
  };

  const handleDeleteApp = (appId) => {
    setConfirmState({
      title: 'Are you sure about deleting?',
      message: 'This application will be permanently deleted. This cannot be undone.',
      onConfirm: async () => {
        try {
          await API.delete(`/adoptions/${appId}`);
          showToast('Application deleted.');
          fetchAll();
        } catch {
          setApplications(prev => prev.filter(a => a.id !== appId));
          showToast('Application deleted (demo mode).');
        }
      },
    });
  };

  const handleEditPet = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.entries(editForm).forEach(([k, v]) => {
        if (k === 'vaccine_log') formData.append(k, JSON.stringify(v || []));
        else if (v !== undefined && v !== null) formData.append(k, v === false ? 'false' : v);
      });
      if (editPhotoFile) formData.append('photo', editPhotoFile);
      await API.put(`/pets/${editPet.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast('Pet updated successfully!');
      fetchAll();
    } catch {
      setPets(prev => prev.map(p => p.id === editPet.id ? { ...p, ...editForm } : p));
      showToast('Pet updated (demo mode)!');
    }
    setEditPet(null);
    setEditPhotoFile(null);
    setEditPhotoPreview(null);
  };

  const handleDeletePet = (pet) => {
    setConfirmState({
      title: 'Are you sure about deleting?',
      message: `${pet.name} will be permanently removed from the system. This cannot be undone.`,
      onConfirm: async () => {
        try {
          await API.delete(`/pets/${pet.id}`);
          showToast('Pet deleted.');
          fetchAll();
        } catch {
          setPets(prev => prev.filter(p => p.id !== pet.id));
          showToast('Pet deleted (demo mode).');
        }
      },
    });
  };

  const handleSaveAssessment = async (e) => {
    e.preventDefault();
    const traitsArray = assessForm.traits.split(',').map(t => t.trim()).filter(Boolean);
    try {
      await API.post(`/pets/${assessForm.pet_id}/assessment`, {
        traits: traitsArray,
        description: assessForm.description,
        compatibility_notes: assessForm.compatibility_notes,
      });
      showToast('Assessment saved!');
      fetchAll();
    } catch {
      const pet = pets.find(p => p.id == assessForm.pet_id);
      const petName = pet ? `${pet.name} - ${pet.breed}` : 'Pet';
      setAssessments(prev => [...prev, {
        pet_name: petName,
        traits: JSON.stringify(traitsArray),
        description: assessForm.description,
        compatibility_notes: assessForm.compatibility_notes,
        created_at: new Date().toISOString(),
      }]);
      showToast('Assessment created (demo mode)!');
    }
    setShowAssessment(false);
    setAssessForm({ pet_id: '', traits: '', description: '', compatibility_notes: '' });
  };

  const statusBadge = (s) => {
    const map = { 'Available': 'green', 'Adopted': 'blue', 'Pending': 'yellow', 'Not Available': 'gray', 'Approved': 'green', 'Pending Review': 'yellow', 'Rejected': 'red', 'Cancelled': 'gray', 'Excellent': 'green', 'Good': 'blue', 'Fair': 'yellow', 'Poor': 'red' };
    return <span className={`badge badge-${map[s] || 'gray'}`}>{s}</span>;
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const activePets = pets.filter(p => p.status !== 'Adopted').sort((a, b) => a.pet_id.localeCompare(b.pet_id));
  const pendingApps = applications.filter(a => a.status === 'Pending Review');
  const finishedApps = applications.filter(a => a.status !== 'Pending Review');

  const petRow = (pet) => (
    <tr key={pet.id}>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {pet.photo ? (
            <img
              src={`http://localhost:5000${pet.photo}`}
              alt={pet.name}
              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1.5px solid var(--border)' }}
            />
          ) : (
            <div style={styles.petAvatar}>🐾</div>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{pet.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {pet.pet_id}</div>
          </div>
        </div>
      </td>
      <td>{pet.type}</td>
      <td>{pet.breed}</td>
      <td>{pet.age_years} year{pet.age_years !== 1 ? 's' : ''} old</td>
      <td>{statusBadge(pet.health_status)}</td>
      <td>{statusBadge(pet.status)}</td>
      <td>
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={styles.linkBtn} onClick={() => setViewPet(pet)}>View</button>
          <button style={{ ...styles.linkBtn, color: '#dc3545' }} onClick={() => handleDeletePet(pet)}>Delete</button>
        </div>
      </td>
    </tr>
  );

  const appRow = (app) => (
    <tr key={app.id}>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {app.applicant_photo ? (
            <img
              src={`http://localhost:5000${app.applicant_photo}`}
              alt={app.applicant_name || 'Applicant'}
              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1.5px solid var(--border)' }}
            />
          ) : (
            <div style={styles.avatarCircle}>{(app.full_name || app.applicant_name || app.name || 'U')[0]}</div>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{app.full_name || app.applicant_name || app.name}</div>
            <div style={{ fontSize: 12, color: 'var(--primary)' }}>{app.email || app.applicant_email}</div>
          </div>
        </div>
      </td>
      <td style={{ fontWeight: 500 }}>{app.pet_name} ({app.pet_breed})</td>
      <td>{new Date(app.applied_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
      <td>{statusBadge(app.status)}</td>
      <td>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={styles.linkBtn} onClick={() => setViewApp(app)}>View</button>
          {app.status === 'Pending Review' && (
            <>
              <button style={{ ...styles.linkBtn, color: '#dc3545' }} onClick={() => handleStatus(app.id, 'Rejected')}>Reject</button>
              <button style={{ ...styles.linkBtn, color: '#198754' }} onClick={() => handleStatus(app.id, 'Approved')}>Approve</button>
            </>
          )}
          <button style={{ ...styles.linkBtn, color: '#dc3545' }} onClick={() => handleDeleteApp(app.id)}>Delete</button>
        </div>
      </td>
    </tr>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {toast && <div className={`toast${toast.err ? ' toast-error' : ''}`} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>{toast.msg}</div>}

      {confirmState && (
        <ConfirmModal
          title={confirmState.title}
          message={confirmState.message}
          onConfirm={() => { confirmState.onConfirm(); setConfirmState(null); }}
          onCancel={() => setConfirmState(null)}
        />
      )}

      {/* ─── PET RECORDS TABLE ─── */}
      <div className="card">
        <div style={styles.tableHeader}>
          <h2 style={styles.sectionTitle}>Pet Records Table</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm">▾ Filter</button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddPet(true)}>+ Add New Pet</button>
          </div>
        </div>
        <div style={styles.subLabel}>Active Pets</div>
        <div style={styles.scrollTable}>
          <table>
            <thead><tr><th>PET</th><th>TYPE</th><th>BREED</th><th>AGE</th><th>HEALTH</th><th>STATUS</th><th></th></tr></thead>
            <tbody>
              {activePets.length === 0
                ? <tr><td colSpan={7} style={styles.emptyCell}>No active pets.</td></tr>
                : activePets.map(petRow)}
            </tbody>
          </table>
        </div>
        <div style={{ ...styles.subLabel, marginTop: 24 }}>Adopted Pets — Post-Adoption Monitoring</div>
        <div style={styles.scrollTable}>
          <table>
            <thead><tr><th>PET</th><th>ADOPTER</th><th>ADOPTED ON</th><th>FOLLOW-UPS</th><th></th></tr></thead>
            <tbody>
              {adopted.length === 0
                ? <tr><td colSpan={5} style={styles.emptyCell}>No adopted pets yet.</td></tr>
                : adopted.map(row => (
                  <tr key={row.application_id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{row.pet_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.pet_breed} • {row.pet_code}</div>
                    </td>
                    <td>
                      <button style={{ ...styles.linkBtn, fontWeight: 600 }} onClick={() => openProfile(row.applicant_id)}>
                        {row.adopter_name}
                      </button>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.adopter_email}</div>
                    </td>
                    <td>{row.adopted_at ? new Date(row.adopted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</td>
                    <td>
                      {row.followup_count > 0
                        ? <span className="badge badge-green">{row.followup_count} logged</span>
                        : <span className="badge badge-yellow">None yet</span>}
                      {row.last_followup && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Last: {new Date(row.last_followup).toLocaleDateString()}</div>}
                    </td>
                    <td>
                      <button style={styles.linkBtn} onClick={() => openMonitor(row)}>Monitor</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── ADOPTION APPLICATIONS ─── */}
      <div className="card">
        <div style={styles.tableHeader}>
          <h2 style={styles.sectionTitle}>Adoption Applications</h2>
          <button className="btn btn-outline btn-sm">▾ Filter</button>
        </div>
        <div style={styles.subLabel}>Pending Applications</div>
        <div style={styles.scrollTable}>
          <table>
            <thead><tr><th>APPLICANT</th><th>PET</th><th>APPLIED DATE</th><th>STATUS</th><th></th></tr></thead>
            <tbody>
              {pendingApps.length === 0
                ? <tr><td colSpan={5} style={styles.emptyCell}>No pending applications.</td></tr>
                : pendingApps.map(appRow)}
            </tbody>
          </table>
        </div>
        <div style={{ ...styles.subLabel, marginTop: 24 }}>Finished Applications</div>
        <div style={styles.scrollTable}>
          <table>
            <thead><tr><th>APPLICANT</th><th>PET</th><th>APPLIED DATE</th><th>STATUS</th><th></th></tr></thead>
            <tbody>
              {finishedApps.length === 0
                ? <tr><td colSpan={5} style={styles.emptyCell}>No finished applications yet.</td></tr>
                : finishedApps.map(appRow)}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── BEHAVIORAL ASSESSMENT ─── */}
      <div className="card">
        <div style={styles.tableHeader}>
          <h2 style={styles.sectionTitle}>Behavioral Assessment</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm">▾ Filter</button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAssessment(true)}>+ Create Analysis</button>
          </div>
        </div>
        {assessments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🐾</div>
            <h3>No assessments yet</h3>
            <p>Create a behavioral assessment for a pet to get started.</p>
          </div>
        ) : (
          <div style={styles.assessGrid}>
            {assessments.map((a, i) => {
              const traits = typeof a.traits === 'string' ? JSON.parse(a.traits) : (a.traits || []);
              return (
                <div key={i} style={styles.assessCard}>
                  <div style={styles.assessHeader}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{a.pet_name}{a.pet_breed ? ` — ${a.pet_breed}` : ''}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {a.created_at ? new Date(a.created_at).toLocaleDateString() : a.last_updated}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {traits.map(t => {
                      const colors = { Friendly: 'green', Hyperattached: 'yellow', 'Good with kids': 'blue', Nonchalant: 'gray', Scared: 'red', 'Need training': 'yellow' };
                      return <span key={t} className={`badge badge-${colors[t] || 'gray'}`}>{t}</span>;
                    })}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 8, lineHeight: 1.5 }}>{a.description}</p>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Compatibility Analysis:</div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{a.compatibility_notes}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── ADD PET MODAL ─── */}
      {showAddPet && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddPet(false)}>
          <div className="modal" style={{ maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>

            {/* Close button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
              <button onClick={() => setShowAddPet(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>✕</button>
            </div>

            {/* Photo upload zone */}
            <div
              onClick={() => document.getElementById('petPhotoInput').click()}
              style={{
                border: '2px dashed #c7d2db', borderRadius: 12, padding: '28px 16px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', marginBottom: 24, minHeight: 160,
                background: petPhotoPreview ? 'transparent' : '#fafafa',
                overflow: 'hidden', position: 'relative',
              }}
            >
              {petPhotoPreview ? (
                <img src={petPhotoPreview} alt="preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 }} />
              ) : (
                <>
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10 }}>
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                    <circle cx="19.5" cy="8.5" r="1.2" fill="#555" stroke="none"/>
                    <line x1="12" y1="6" x2="15" y2="6" stroke="#555" strokeWidth="1.5"/>
                    <text x="13.5" y="6.6" fontSize="3" fill="#555" stroke="none">+</text>
                  </svg>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: '#222' }}>Add Pet Photo</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Click to upload</div>
                </>
              )}
            </div>
            <input
              id="petPhotoInput"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files[0];
                if (file) {
                  setPetPhotoFile(file);
                  setPetPhotoPreview(URL.createObjectURL(file));
                }
              }}
            />

            <form onSubmit={handleAddPet} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Pet Name + Species */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Pet Name</label>
                  <input className="form-input" value={petForm.name} onChange={e => setPetForm({ ...petForm, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Species</label>
                  <select className="form-select" value={petForm.type} onChange={e => setPetForm({ ...petForm, type: e.target.value })}>
                    {['Dog','Cat','Bird','Rabbit','Other'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Breed */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Breed</label>
                <input className="form-input" value={petForm.breed} onChange={e => setPetForm({ ...petForm, breed: e.target.value })} />
              </div>

              {/* Age + Weight + Gender */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Age</label>
                  <input className="form-input" type="number" min="0" placeholder="yrs" value={petForm.age_years} onChange={e => setPetForm({ ...petForm, age_years: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Weight</label>
                  <input className="form-input" type="number" min="0" placeholder="kg" value={petForm.weight} onChange={e => setPetForm({ ...petForm, weight: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Gender</label>
                  <select className="form-select" value={petForm.gender} onChange={e => setPetForm({ ...petForm, gender: e.target.value })}>
                    <option>Male</option><option>Female</option>
                  </select>
                </div>
              </div>

              {/* Personality Traits */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Personality Traits</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  {['Playful','Friendly','Calm','Energetic','Sweet','Aloof','Hyperattached','Unloving'].map(trait => {
                    const selected = (petForm.traits || []).includes(trait);
                    return (
                      <button
                        key={trait}
                        type="button"
                        onClick={() => {
                          const current = petForm.traits || [];
                          setPetForm({ ...petForm, traits: selected ? current.filter(t => t !== trait) : [...current, trait] });
                        }}
                        style={{
                          padding: '7px 18px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                          border: selected ? '1.5px solid var(--primary)' : '1.5px solid #d1d5db',
                          background: selected ? '#f0fdf4' : '#fff5f5',
                          color: selected ? 'var(--primary)' : '#555',
                          fontWeight: selected ? 600 : 400,
                          transition: 'all 0.15s',
                        }}
                      >
                        {trait}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Health Status + Status + Intake Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Health Status</label>
                  <select className="form-select" value={petForm.health_status} onChange={e => setPetForm({ ...petForm, health_status: e.target.value })}>
                    {['Excellent','Good','Fair','Poor'].map(h => <option key={h}>{h}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Status</label>
                  <select className="form-select" value={petForm.status} onChange={e => setPetForm({ ...petForm, status: e.target.value })}>
                    {['Available','Not Available'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Intake Date</label>
                  <input className="form-input" type="date" value={petForm.intake_date} onChange={e => setPetForm({ ...petForm, intake_date: e.target.value })} />
                </div>
              </div>

              {/* Additional Information */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Additional Information</label>
                <textarea
                  className="form-textarea"
                  placeholder="Tells us more about its information"
                  value={petForm.description}
                  onChange={e => setPetForm({ ...petForm, description: e.target.value })}
                  style={{ background: '#f0fdf4', minHeight: 90 }}
                />
              </div>

              {/* Medical Records */}
              <div style={{ borderTop: '1.5px solid #e5e7eb', paddingTop: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: 'var(--text-dark)' }}>
                  🏥 Medical Records <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-muted)' }}>(optional — leave blank if not yet checked up)</span>
                </div>

                {/* Neutered toggle + date */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', marginBottom: 8 }}>
                    <input type="checkbox" checked={!!petForm.neutered} onChange={e => setPetForm({ ...petForm, neutered: e.target.checked, neutered_date: e.target.checked ? petForm.neutered_date : '' })} />
                    <span style={{ fontWeight: 700 }}>✂️ Neutered / Spayed</span>
                  </label>
                  {petForm.neutered && (
                    <div className="form-group" style={{ marginLeft: 24 }}>
                      <label className="form-label">Date of Neutering / Spaying</label>
                      <input className="form-input" type="date" value={petForm.neutered_date} onChange={e => setPetForm({ ...petForm, neutered_date: e.target.value })} style={{ maxWidth: 220 }} />
                    </div>
                  )}
                </div>

                {/* Vaccination toggle + log */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', marginBottom: 8 }}>
                    <input type="checkbox" checked={!!petForm.vaccination_status} onChange={e => setPetForm({ ...petForm, vaccination_status: e.target.checked, vaccine_log: e.target.checked ? petForm.vaccine_log : [] })} />
                    <span style={{ fontWeight: 700 }}>💉 Vaccinated</span>
                  </label>
                  {petForm.vaccination_status && (
                    <div style={{ marginLeft: 24 }}>
                      {(petForm.vaccine_log || []).map((v, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                          <input className="form-input" placeholder="Vaccine name (e.g. Rabies)" value={v.name} onChange={e => { const log = [...petForm.vaccine_log]; log[i] = { ...log[i], name: e.target.value }; setPetForm({ ...petForm, vaccine_log: log }); }} style={{ flex: 1 }} />
                          <input className="form-input" type="date" value={v.date} onChange={e => { const log = [...petForm.vaccine_log]; log[i] = { ...log[i], date: e.target.value }; setPetForm({ ...petForm, vaccine_log: log }); }} style={{ width: 160 }} />
                          <button type="button" onClick={() => setPetForm({ ...petForm, vaccine_log: petForm.vaccine_log.filter((_, idx) => idx !== i) })} style={{ background: 'none', border: 'none', color: '#dc3545', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
                        </div>
                      ))}
                      <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 2 }} onClick={() => setPetForm({ ...petForm, vaccine_log: [...(petForm.vaccine_log || []), { name: '', date: '' }] })}>+ Add Vaccine</button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Veterinary Name</label>
                    <input className="form-input" placeholder="e.g. Dr. Juan dela Cruz" value={petForm.vet_name} onChange={e => setPetForm({ ...petForm, vet_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Clinic Name</label>
                    <input className="form-input" placeholder="e.g. PetCare Animal Clinic" value={petForm.clinic_name} onChange={e => setPetForm({ ...petForm, clinic_name: e.target.value })} />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: 4 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Last Checkup Date</label>
                  <input className="form-input" type="date" value={petForm.last_checkup_date} onChange={e => setPetForm({ ...petForm, last_checkup_date: e.target.value })} />
                </div>
                <div className="form-group" style={{ marginTop: 4 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Medical Notes / Conditions</label>
                  <textarea className="form-textarea" placeholder="e.g. No known conditions, previously treated for mange" value={petForm.medical_notes} onChange={e => setPetForm({ ...petForm, medical_notes: e.target.value })} style={{ minHeight: 70 }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4, marginBottom: 4 }}>
                <button type="submit" className="btn btn-primary" style={{ minWidth: 120, margin: 0 }}>Add</button>
              </div>

            </form>
          </div>
        </div>
      )}
      {/* ─── VIEW PET MODAL ─── */}
      {viewPet && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewPet(null)}>
          <div className="modal" style={{ maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title">Pet Details</h2>
              <button className="modal-close" onClick={() => setViewPet(null)}>✕</button>
            </div>

            {/* Photo */}
            <div style={{ width: '100%', height: 200, borderRadius: 12, overflow: 'hidden', marginBottom: 20, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {viewPet.photo
                ? <img src={`http://localhost:5000${viewPet.photo}`} alt={viewPet.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 48 }}>🐾</span>
              }
            </div>

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Pet ID</span><span>{viewPet.pet_id}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Name</span><span style={{ fontWeight: 600 }}>{viewPet.name}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Type</span><span>{viewPet.type}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Breed</span><span>{viewPet.breed}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Age</span><span>{viewPet.age_years} year{viewPet.age_years !== 1 ? 's' : ''} old</span></div>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Gender</span><span>{viewPet.gender}</span></div>
              {viewPet.weight && <div style={styles.detailRow}><span style={styles.detailLbl}>Weight</span><span>{viewPet.weight} kg</span></div>}
              {viewPet.color && <div style={styles.detailRow}><span style={styles.detailLbl}>Color</span><span>{viewPet.color}</span></div>}
              <div style={styles.detailRow}><span style={styles.detailLbl}>Health Status</span>{statusBadge(viewPet.health_status)}</div>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Status</span>{statusBadge(viewPet.status)}</div>
              {viewPet.intake_date && <div style={styles.detailRow}><span style={styles.detailLbl}>Intake Date</span><span>{new Date(viewPet.intake_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>}
              {viewPet.description && <div style={styles.detailRow}><span style={styles.detailLbl}>Description</span><span style={{ lineHeight: 1.6 }}>{viewPet.description}</span></div>}

              {/* Medical Records */}
              <div style={{ borderTop: '1.5px solid #e5e7eb', paddingTop: 14, marginTop: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-dark)', marginBottom: 10 }}>🏥 Medical Records</div>

                {!viewPet.neutered && !viewPet.vaccination_status && !viewPet.vet_name && !viewPet.clinic_name && !viewPet.last_checkup_date && !viewPet.medical_notes && (() => {
                  let log = []; try { log = viewPet.vaccine_log ? (typeof viewPet.vaccine_log === 'string' ? JSON.parse(viewPet.vaccine_log) : viewPet.vaccine_log) : []; } catch {}
                  return log.length === 0;
                })() ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No medical records yet.</div>
                ) : (
                  <>
                    {/* Neutered status */}
                    <div style={styles.detailRow}>
                      <span style={styles.detailLbl}>Neutered / Spayed</span>
                      {viewPet.neutered ? (
                        <span>
                          <span className="badge badge-blue">✂️ Yes</span>
                          {viewPet.neutered_date && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{new Date(viewPet.neutered_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>}
                        </span>
                      ) : (
                        <span className="badge badge-gray">Not Neutered</span>
                      )}
                    </div>

                    {/* Vaccination status + log */}
                    <div style={styles.detailRow}>
                      <span style={styles.detailLbl}>Vaccinated</span>
                      {viewPet.vaccination_status ? (
                        <span className="badge badge-green">💉 Yes</span>
                      ) : (
                        <span className="badge badge-gray">Not Vaccinated</span>
                      )}
                    </div>
                    {viewPet.vaccination_status && (() => {
                      let log = []; try { log = viewPet.vaccine_log ? (typeof viewPet.vaccine_log === 'string' ? JSON.parse(viewPet.vaccine_log) : viewPet.vaccine_log) : []; } catch {}
                      return log.length > 0 ? (
                        <div style={{ marginBottom: 10, marginLeft: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Vaccination Log</div>
                          {log.map((v, i) => (
                            <div key={i} style={{ display: 'flex', gap: 12, fontSize: 13, paddingBottom: 4, borderBottom: '1px solid #f3f4f6', marginBottom: 4 }}>
                              <span style={{ fontWeight: 500, flex: 1 }}>{v.name}</span>
                              <span style={{ color: 'var(--text-muted)' }}>{v.date ? new Date(v.date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</span>
                            </div>
                          ))}
                        </div>
                      ) : null;
                    })()}

                    {viewPet.vet_name && <div style={styles.detailRow}><span style={styles.detailLbl}>Veterinarian</span><span>{viewPet.vet_name}</span></div>}
                    {viewPet.clinic_name && <div style={styles.detailRow}><span style={styles.detailLbl}>Clinic</span><span>{viewPet.clinic_name}</span></div>}
                    {viewPet.last_checkup_date && <div style={styles.detailRow}><span style={styles.detailLbl}>Last Checkup</span><span>{new Date(viewPet.last_checkup_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>}
                    {viewPet.medical_notes && <div style={styles.detailRow}><span style={styles.detailLbl}>Medical Notes</span><span style={{ lineHeight: 1.6 }}>{viewPet.medical_notes}</span></div>}
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline btn-sm" onClick={() => { setViewPet(null); setEditPet(viewPet); setEditForm({ name: viewPet.name, type: viewPet.type, breed: viewPet.breed, age_years: viewPet.age_years, gender: viewPet.gender, health_status: viewPet.health_status, status: viewPet.status, description: viewPet.description || '', vet_name: viewPet.vet_name || '', clinic_name: viewPet.clinic_name || '', last_checkup_date: viewPet.last_checkup_date || '', vaccines_given: viewPet.vaccines_given || '', medical_notes: viewPet.medical_notes || '', vaccination_status: !!viewPet.vaccination_status, neutered: !!viewPet.neutered, neutered_date: viewPet.neutered_date || '', vaccine_log: (() => { try { return viewPet.vaccine_log ? (typeof viewPet.vaccine_log === 'string' ? JSON.parse(viewPet.vaccine_log) : viewPet.vaccine_log) : []; } catch { return []; } })() }); setEditPhotoFile(null); setEditPhotoPreview(null); }}>Edit</button>
              <button className="btn btn-outline btn-sm" onClick={() => setViewPet(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {/* ─── VIEW APPLICATION MODAL ─── */}
      {viewApp && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewApp(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Application Details</h2>
              <button className="modal-close" onClick={() => setViewApp(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              {/* Applicant header with photo + link to full profile */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
                <img
                  src={viewApp.applicant_photo
                    ? `http://localhost:5000${viewApp.applicant_photo}`
                    : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(viewApp.applicant_name || viewApp.full_name || 'User') + '&background=e5e7eb&color=374151'}
                  alt="Applicant"
                  style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{viewApp.full_name || viewApp.applicant_name || viewApp.name}</div>
                  <button
                    onClick={() => openProfile(viewApp.applicant_id)}
                    disabled={loadingProfile}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                  >
                    {loadingProfile ? 'Loading…' : 'View Full Profile'}
                  </button>
                </div>
              </div>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Email</span><span>{viewApp.email || viewApp.applicant_email}</span></div>
              {viewApp.phone && <div style={styles.detailRow}><span style={styles.detailLbl}>Phone</span><span>{viewApp.phone}</span></div>}
              {viewApp.address && <div style={styles.detailRow}><span style={styles.detailLbl}>Address</span><span>{viewApp.address}</span></div>}
              {viewApp.preferred_contact && <div style={styles.detailRow}><span style={styles.detailLbl}>Preferred Contact</span><span>{viewApp.preferred_contact}</span></div>}
              <div style={styles.detailRow}><span style={styles.detailLbl}>Pet</span><span>{viewApp.pet_name} ({viewApp.pet_breed})</span></div>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Applied</span><span>{new Date(viewApp.applied_at).toLocaleDateString()}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Status</span>{statusBadge(viewApp.status)}</div>
              {viewApp.living_situation && <div style={styles.detailRow}><span style={styles.detailLbl}>Living Situation</span><span>{viewApp.living_situation}</span></div>}
              {viewApp.reason_for_adoption && <div style={styles.detailRow}><span style={styles.detailLbl}>Reason</span><span>{viewApp.reason_for_adoption}</span></div>}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              {viewApp.status === 'Pending Review' && (
                <>
                  <button className="btn btn-danger btn-sm" onClick={() => { handleStatus(viewApp.id, 'Rejected'); setViewApp(null); }}>Reject</button>
                  <button className="btn btn-success btn-sm" onClick={() => { handleStatus(viewApp.id, 'Approved'); setViewApp(null); }}>Approve</button>
                </>
              )}
              <button className="btn btn-outline btn-sm" onClick={() => setViewApp(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── APPLICANT PROFILE MODAL (read-only, admin vetting) ─── */}
      {viewProfile && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewProfile(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Applicant Profile</h2>
              <button className="modal-close" onClick={() => setViewProfile(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 14, borderBottom: '1px solid #f0f0f0' }}>
                <img
                  src={viewProfile.profile_photo
                    ? `http://localhost:5000${viewProfile.profile_photo}`
                    : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(`${viewProfile.first_name} ${viewProfile.last_name}`) + '&background=e5e7eb&color=374151&size=200'}
                  alt="Applicant"
                  style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{viewProfile.first_name} {viewProfile.last_name}</div>
                  <span className="badge badge-blue" style={{ textTransform: 'capitalize', marginTop: 4, display: 'inline-block' }}>{viewProfile.role}</span>
                </div>
              </div>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Email</span><span>{viewProfile.email}</span></div>
              {viewProfile.phone && <div style={styles.detailRow}><span style={styles.detailLbl}>Phone</span><span>{viewProfile.phone}</span></div>}
              {viewProfile.address && <div style={styles.detailRow}><span style={styles.detailLbl}>Address</span><span>{viewProfile.address}</span></div>}
              {viewProfile.city && <div style={styles.detailRow}><span style={styles.detailLbl}>City</span><span>{viewProfile.city}</span></div>}
              {viewProfile.province && <div style={styles.detailRow}><span style={styles.detailLbl}>Province</span><span>{viewProfile.province}</span></div>}
              {viewProfile.created_at && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLbl}>Member Since</span>
                  <span>{new Date(viewProfile.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setViewProfile(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── POST-ADOPTION MONITORING MODAL ─── */}
      {monitorApp && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setMonitorApp(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Monitor — {monitorApp.pet_name}</h2>
              <button className="modal-close" onClick={() => setMonitorApp(null)}>✕</button>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Adopted by <strong style={{ color: 'var(--text-dark)' }}>{monitorApp.adopter_name}</strong>
              {monitorApp.adopted_at && <> on {new Date(monitorApp.adopted_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</>}
              {' · '}
              <button onClick={() => openProfile(monitorApp.applicant_id)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: 13 }}>View profile</button>
            </div>

            {/* Add follow-up form */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Record a check-in</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <input type="date" className="form-input" style={{ flex: 1, minWidth: 140 }}
                  value={followForm.followup_date}
                  onChange={e => setFollowForm({ ...followForm, followup_date: e.target.value })} />
                <select className="form-select" style={{ flex: 1, minWidth: 140 }}
                  value={followForm.outcome}
                  onChange={e => setFollowForm({ ...followForm, outcome: e.target.value })}>
                  <option>Doing Well</option>
                  <option>Needs Attention</option>
                  <option>Unable to Reach</option>
                  <option>Other</option>
                </select>
              </div>
              <textarea className="form-textarea" placeholder="Notes (how is the pet settling in, any concerns...)"
                value={followForm.notes}
                onChange={e => setFollowForm({ ...followForm, notes: e.target.value })} />
              <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={submitFollowup}>Add Follow-up</button>
            </div>

            {/* Follow-up history */}
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>History</div>
            {followups.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No follow-ups recorded yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 240, overflowY: 'auto' }}>
                {followups.map(f => (
                  <div key={f.id} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{new Date(f.followup_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      <span className={`badge badge-${f.outcome === 'Doing Well' ? 'green' : f.outcome === 'Needs Attention' ? 'yellow' : 'gray'}`}>{f.outcome}</span>
                    </div>
                    {f.notes && <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: '4px 0 0', lineHeight: 1.5 }}>{f.notes}</p>}
                    {f.admin_name && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Logged by {f.admin_name}</div>}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setMonitorApp(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT PET MODAL ─── */}
      {editPet && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditPet(null)}>
          <div className="modal" style={{ maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Pet — {editPet.name}</h2>
              <button className="modal-close" onClick={() => { setEditPet(null); setEditPhotoFile(null); setEditPhotoPreview(null); }}>✕</button>
            </div>

            {/* Photo section */}
            <div
              onClick={() => document.getElementById('editPhotoInput').click()}
              style={{
                border: '2px dashed #c7d2db', borderRadius: 12, overflow: 'hidden',
                marginBottom: 20, cursor: 'pointer', position: 'relative',
                minHeight: 160, background: '#fafafa',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {editPhotoPreview || editPet.photo ? (
                <>
                  <img
                    src={editPhotoPreview || editPet.photo}
                    alt={editPet.name}
                    style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'rgba(0,0,0,0.45)', color: 'white',
                    textAlign: 'center', fontSize: 12, fontWeight: 600, padding: '6px 0',
                  }}>
                    Click to change photo
                  </div>
                </>
              ) : (
                <>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}>
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#444', marginBottom: 4 }}>Add Pet Photo</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click to upload</div>
                </>
              )}
            </div>
            <input
              id="editPhotoInput"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files[0];
                if (file) { setEditPhotoFile(file); setEditPhotoPreview(URL.createObjectURL(file)); }
              }}
            />

            <form onSubmit={handleEditPet} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Pet Name *</label>
                  <input className="form-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Type *</label>
                  <select className="form-select" value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}>
                    {['Dog','Cat','Bird','Rabbit','Other'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Breed</label>
                  <input className="form-input" value={editForm.breed} onChange={e => setEditForm({ ...editForm, breed: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Age (years)</label>
                  <input className="form-input" type="number" min="0" value={editForm.age_years} onChange={e => setEditForm({ ...editForm, age_years: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-select" value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })}>
                    <option>Male</option><option>Female</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Health Status</label>
                  <select className="form-select" value={editForm.health_status} onChange={e => setEditForm({ ...editForm, health_status: e.target.value })}>
                    {['Excellent','Good','Fair','Poor'].map(h => <option key={h}>{h}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Status</label>
                  <select className="form-select" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                    {['Available','Pending','Adopted','Not Available'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
              </div>

              {/* Medical Records */}
              <div style={{ borderTop: '1.5px solid #e5e7eb', paddingTop: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: 'var(--text-dark)' }}>
                  🏥 Medical Records <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-muted)' }}>(optional)</span>
                </div>

                {/* Neutered toggle + date */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', marginBottom: 8 }}>
                    <input type="checkbox" checked={!!editForm.neutered} onChange={e => setEditForm({ ...editForm, neutered: e.target.checked, neutered_date: e.target.checked ? editForm.neutered_date : '' })} />
                    <span style={{ fontWeight: 700 }}>✂️ Neutered / Spayed</span>
                  </label>
                  {editForm.neutered && (
                    <div className="form-group" style={{ marginLeft: 24 }}>
                      <label className="form-label">Date of Neutering / Spaying</label>
                      <input className="form-input" type="date" value={editForm.neutered_date || ''} onChange={e => setEditForm({ ...editForm, neutered_date: e.target.value })} style={{ maxWidth: 220 }} />
                    </div>
                  )}
                </div>

                {/* Vaccination toggle + log */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', marginBottom: 8 }}>
                    <input type="checkbox" checked={!!editForm.vaccination_status} onChange={e => setEditForm({ ...editForm, vaccination_status: e.target.checked, vaccine_log: e.target.checked ? editForm.vaccine_log : [] })} />
                    <span style={{ fontWeight: 700 }}>💉 Vaccinated</span>
                  </label>
                  {editForm.vaccination_status && (
                    <div style={{ marginLeft: 24 }}>
                      {(editForm.vaccine_log || []).map((v, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                          <input className="form-input" placeholder="Vaccine name (e.g. Rabies)" value={v.name} onChange={e => { const log = [...editForm.vaccine_log]; log[i] = { ...log[i], name: e.target.value }; setEditForm({ ...editForm, vaccine_log: log }); }} style={{ flex: 1 }} />
                          <input className="form-input" type="date" value={v.date} onChange={e => { const log = [...editForm.vaccine_log]; log[i] = { ...log[i], date: e.target.value }; setEditForm({ ...editForm, vaccine_log: log }); }} style={{ width: 160 }} />
                          <button type="button" onClick={() => setEditForm({ ...editForm, vaccine_log: editForm.vaccine_log.filter((_, idx) => idx !== i) })} style={{ background: 'none', border: 'none', color: '#dc3545', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
                        </div>
                      ))}
                      <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 2 }} onClick={() => setEditForm({ ...editForm, vaccine_log: [...(editForm.vaccine_log || []), { name: '', date: '' }] })}>+ Add Vaccine</button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Veterinary Name</label>
                    <input className="form-input" placeholder="e.g. Dr. Juan dela Cruz" value={editForm.vet_name || ''} onChange={e => setEditForm({ ...editForm, vet_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Clinic Name</label>
                    <input className="form-input" placeholder="e.g. PetCare Animal Clinic" value={editForm.clinic_name || ''} onChange={e => setEditForm({ ...editForm, clinic_name: e.target.value })} />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: 4 }}>
                  <label className="form-label">Last Checkup Date</label>
                  <input className="form-input" type="date" value={editForm.last_checkup_date || ''} onChange={e => setEditForm({ ...editForm, last_checkup_date: e.target.value || '' })} />
                </div>
                <div className="form-group" style={{ marginTop: 4 }}>
                  <label className="form-label">Medical Notes / Conditions</label>
                  <textarea className="form-textarea" placeholder="e.g. No known conditions" value={editForm.medical_notes || ''} onChange={e => setEditForm({ ...editForm, medical_notes: e.target.value })} style={{ minHeight: 70 }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => { setEditPet(null); setEditPhotoFile(null); setEditPhotoPreview(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── CREATE ASSESSMENT MODAL ─── */}
      {showAssessment && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAssessment(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Create Behavioral Assessment</h2>
              <button className="modal-close" onClick={() => setShowAssessment(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveAssessment} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Select Pet *</label>
                <select className="form-select" required value={assessForm.pet_id} onChange={e => setAssessForm({ ...assessForm, pet_id: e.target.value })}>
                  <option value="">Select a pet...</option>
                  {pets.map(p => <option key={p.id} value={p.id}>{p.name} — {p.breed}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Behavioral Traits (comma-separated) *</label>
                <input className="form-input" placeholder="e.g. Friendly, Hyperattached, Good with kids" value={assessForm.traits} onChange={e => setAssessForm({ ...assessForm, traits: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" placeholder="Describe the pet's behavior..." value={assessForm.description} onChange={e => setAssessForm({ ...assessForm, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Compatibility Notes</label>
                <textarea className="form-textarea" placeholder="Who is this pet best suited for?" value={assessForm.compatibility_notes} onChange={e => setAssessForm({ ...assessForm, compatibility_notes: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAssessment(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Assessment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const DEMO_PETS = [
  { id: 1, pet_id: 'PET001', name: 'Hedrick', type: 'Dog', breed: 'Poodle', age_years: 1, gender: 'Male', health_status: 'Excellent', status: 'Available' },
  { id: 2, pet_id: 'PET002', name: 'Golden', type: 'Dog', breed: 'Dalmatian', age_years: 1, gender: 'Male', health_status: 'Excellent', status: 'Available' },
  { id: 3, pet_id: 'PET003', name: 'Sia', type: 'Cat', breed: 'Siamese', age_years: 1, gender: 'Female', health_status: 'Excellent', status: 'Adopted' },
];

const DEMO_APPS = [
  { id: 1, applicant_name: 'Jane Co', applicant_email: 'jaceco@gmail.com', pet_name: 'Buddy', pet_breed: 'Golden Retriever', applied_at: '2025-11-14T10:00:00', status: 'Approved', living_situation: 'House with yard', reason_for_adoption: 'Looking for a companion for my family.' },
  { id: 2, applicant_name: 'Lauren Garcia', applicant_email: 'laurengarcia@gmail.com', pet_name: 'Sia', pet_breed: 'Siamese', applied_at: '2025-11-22T14:30:00', status: 'Pending Review', living_situation: 'Apartment', reason_for_adoption: 'Always wanted a cat.' },
  { id: 3, applicant_name: 'Lauren Garcia', applicant_email: 'laurengarcia@gmail.com', pet_name: 'Sia', pet_breed: 'Siamese', applied_at: '2025-11-22T16:00:00', status: 'Pending Review', living_situation: 'House', reason_for_adoption: 'Experienced cat owner.' },
];

const DEMO_ASSESSMENTS = [
  { pet_name: 'Buddy', pet_breed: 'Golden Retriever', traits: '["Hyperattached","Friendly","Good with kids"]', description: 'Very social and energetic. Loves playing fetch and interacting with people.', compatibility_notes: 'Ideal for active families with children, good for first-time pet owners.', created_at: null, last_updated: '1 day ago' },
  { pet_name: 'Max', pet_breed: 'Persian', traits: '["Nonchalant","Scared","Need training"]', description: 'Requires patient owner due to past trauma. Very intelligent and trainable.', compatibility_notes: 'Best suited for experienced cat owners, single adults or couples without small children.', created_at: null, last_updated: '1 day ago' },
];

const styles = {
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontWeight: 700, fontSize: 16 },
  subLabel: { fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 },
  scrollTable: { overflowY: 'auto', maxHeight: 260, borderRadius: 8, border: '1px solid var(--border)' },
  emptyCell: { textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '16px 0' },
  petAvatar: { width: 36, height: 36, background: 'var(--green-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
  avatarCircle: { width: 36, height: 36, background: 'var(--green-200)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--primary-dark)', flexShrink: 0 },
  linkBtn: { background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0 },
  assessGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  assessCard: { border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px 18px' },
  assessHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  detailRow: { display: 'flex', gap: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)', alignItems: 'flex-start' },
  detailLbl: { minWidth: 120, color: 'var(--text-muted)', fontWeight: 500 },
};