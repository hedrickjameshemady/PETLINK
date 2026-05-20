import { useState, useEffect } from 'react';
import { API } from '../../context/AuthContext';

export default function PetsAndAdoptions() {
  const [pets, setPets] = useState([]);
  const [applications, setApplications] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddPet, setShowAddPet] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [editPet, setEditPet] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [viewApp, setViewApp] = useState(null);
  const [toast, setToast] = useState('');
  const [petForm, setPetForm] = useState({ name: '', type: 'Dog', breed: '', age_years: '', gender: 'Male', health_status: 'Excellent', status: 'Available', description: '', intake_date: '' });
  const [assessForm, setAssessForm] = useState({ pet_id: '', traits: '', description: '', compatibility_notes: '' });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [p, a, as] = await Promise.all([
        API.get('/pets/all').catch(() => ({ data: DEMO_PETS })),
        API.get('/adoptions').catch(() => ({ data: DEMO_APPS })),
        API.get('/pets/assessments').catch(() => ({ data: DEMO_ASSESSMENTS })),
      ]);
      setPets(p.data);
      setApplications(a.data);
      setAssessments(as.data);
    } finally { setLoading(false); }
  };

  const showToast = (msg, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddPet = async (e) => {
    e.preventDefault();
    try {
      await API.post('/pets', petForm);
      showToast('Pet added successfully!');
      setShowAddPet(false);
      fetchAll();
    } catch {
      setPets(prev => [...prev, { id: Date.now(), pet_id: `PET00${prev.length + 1}`, ...petForm, age_years: Number(petForm.age_years) }]);
      showToast('Pet added (demo mode)!');
      setShowAddPet(false);
    }
    setPetForm({ name: '', type: 'Dog', breed: '', age_years: '', gender: 'Male', health_status: 'Excellent', status: 'Available', description: '', intake_date: '' });
  };

  const handleStatus = async (appId, status) => {
    try {
      await API.patch(`/adoptions/${appId}/status`, { status });
    } catch { /* demo */ }
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
    showToast(`Application ${status}`);
  };

  const handleEditPet = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/pets/${editPet.id}`, editForm);
      showToast('Pet updated successfully!');
      fetchAll();
    } catch {
      setPets(prev => prev.map(p => p.id === editPet.id ? { ...p, ...editForm } : p));
      showToast('Pet updated (demo mode)!');
    }
    setEditPet(null);
  };

  const handleDeletePet = async (pet) => {
    if (!window.confirm(`Delete ${pet.name}? This cannot be undone.`)) return;
    try {
      await API.delete(`/pets/${pet.id}`);
      showToast('Pet deleted.');
      fetchAll();
    } catch {
      setPets(prev => prev.filter(p => p.id !== pet.id));
      showToast('Pet deleted (demo mode).');
    }
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
    const map = { 'Available': 'green', 'Adopted': 'blue', 'Pending': 'yellow', 'Not Available': 'gray', 'Approved': 'green', 'Pending Review': 'yellow', 'Rejected': 'red', 'Excellent': 'green', 'Good': 'blue', 'Fair': 'yellow', 'Poor': 'red', 'Active': 'green', 'Inactive': 'gray' };
    return <span className={`badge badge-${map[s] || 'gray'}`}>{s}</span>;
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {toast && <div className={`toast${toast.err ? ' toast-error' : ''}`} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>{toast.msg}</div>}

      {/* ─── PET RECORDS TABLE ─── */}
      <div className="card">
        <div style={styles.tableHeader}>
          <h2 style={styles.sectionTitle}>Pet Records Table</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm">▾ Filter</button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddPet(true)}>+ Add New Pet</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>PET</th><th>TYPE</th><th>BREED</th><th>AGE</th><th>HEALTH</th><th>STATUS</th><th></th></tr>
            </thead>
            <tbody>
              {pets.map(pet => (
                <tr key={pet.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={styles.petAvatar}>🐾</div>
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
                      <button style={styles.linkBtn} onClick={() => { setEditPet(pet); setEditForm({ name: pet.name, type: pet.type, breed: pet.breed, age_years: pet.age_years, gender: pet.gender, health_status: pet.health_status, status: pet.status, description: pet.description || '' }); }}>Edit</button>
                      <button style={{ ...styles.linkBtn, color: '#dc3545' }} onClick={() => handleDeletePet(pet)}>Delete</button>
                    </div>
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
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>APPLICANT</th><th>PET</th><th>APPLIED DATE</th><th>STATUS</th><th></th></tr>
            </thead>
            <tbody>
              {applications.map(app => (
                <tr key={app.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={styles.avatarCircle}>{(app.applicant_name || app.name || 'U')[0]}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{app.applicant_name || app.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--primary)' }}>{app.applicant_email || app.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 500 }}>{app.pet_name} ({app.pet_breed})</td>
                  <td>{new Date(app.applied_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                  <td>{statusBadge(app.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button style={styles.linkBtn} onClick={() => setViewApp(app)}>View</button>
                      <button style={{ ...styles.linkBtn, color: '#dc3545' }} onClick={() => handleStatus(app.id, 'Rejected')}>Reject</button>
                      <button style={{ ...styles.linkBtn, color: '#198754' }} onClick={() => handleStatus(app.id, 'Approved')}>Approve</button>
                    </div>
                  </td>
                </tr>
              ))}
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
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Add New Pet</h2>
              <button className="modal-close" onClick={() => setShowAddPet(false)}>✕</button>
            </div>
            <form onSubmit={handleAddPet} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Pet Name *</label>
                  <input className="form-input" value={petForm.name} onChange={e => setPetForm({ ...petForm, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Type *</label>
                  <select className="form-select" value={petForm.type} onChange={e => setPetForm({ ...petForm, type: e.target.value })}>
                    {['Dog','Cat','Bird','Rabbit','Other'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Breed</label>
                  <input className="form-input" value={petForm.breed} onChange={e => setPetForm({ ...petForm, breed: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Age (years)</label>
                  <input className="form-input" type="number" min="0" value={petForm.age_years} onChange={e => setPetForm({ ...petForm, age_years: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-select" value={petForm.gender} onChange={e => setPetForm({ ...petForm, gender: e.target.value })}>
                    <option>Male</option><option>Female</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Health Status</label>
                  <select className="form-select" value={petForm.health_status} onChange={e => setPetForm({ ...petForm, health_status: e.target.value })}>
                    {['Excellent','Good','Fair','Poor'].map(h => <option key={h}>{h}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={petForm.status} onChange={e => setPetForm({ ...petForm, status: e.target.value })}>
                    {['Available','Not Available'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Intake Date</label>
                  <input className="form-input" type="date" value={petForm.intake_date} onChange={e => setPetForm({ ...petForm, intake_date: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={petForm.description} onChange={e => setPetForm({ ...petForm, description: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddPet(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Pet</button>
              </div>
            </form>
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
              <div style={styles.detailRow}><span style={styles.detailLbl}>Applicant</span><span>{viewApp.applicant_name || viewApp.name}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Email</span><span>{viewApp.applicant_email || viewApp.email}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Pet</span><span>{viewApp.pet_name} ({viewApp.pet_breed})</span></div>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Applied</span><span>{new Date(viewApp.applied_at).toLocaleDateString()}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLbl}>Status</span>{statusBadge(viewApp.status)}</div>
              {viewApp.living_situation && <div style={styles.detailRow}><span style={styles.detailLbl}>Living Situation</span><span>{viewApp.living_situation}</span></div>}
              {viewApp.reason_for_adoption && <div style={styles.detailRow}><span style={styles.detailLbl}>Reason</span><span>{viewApp.reason_for_adoption}</span></div>}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn btn-danger btn-sm" onClick={() => { handleStatus(viewApp.id, 'Rejected'); setViewApp(null); }}>Reject</button>
              <button className="btn btn-success btn-sm" onClick={() => { handleStatus(viewApp.id, 'Approved'); setViewApp(null); }}>Approve</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT PET MODAL ─── */}
      {editPet && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditPet(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Edit Pet — {editPet.name}</h2>
              <button className="modal-close" onClick={() => setEditPet(null)}>✕</button>
            </div>
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
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditPet(null)}>Cancel</button>
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
  { id: 3, pet_id: 'PET003', name: 'Sia', type: 'Cat', breed: 'Siamese', age_years: 1, gender: 'Female', health_status: 'Excellent', status: 'Available' },
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
  petAvatar: { width: 36, height: 36, background: 'var(--green-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
  avatarCircle: { width: 36, height: 36, background: 'var(--green-200)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--primary-dark)', flexShrink: 0 },
  linkBtn: { background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0 },
  assessGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  assessCard: { border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px 18px' },
  assessHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  detailRow: { display: 'flex', gap: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)', alignItems: 'flex-start' },
  detailLbl: { minWidth: 120, color: 'var(--text-muted)', fontWeight: 500 },
};