import { useState, useEffect } from 'react';
import { API } from '../../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    Approved:         { bg: '#dcfce7', color: '#15803d' },
    'Pending Review': { bg: '#fef9c3', color: '#a16207' },
    Rejected:         { bg: '#fee2e2', color: '#991b1b' },
    Reunited:         { bg: '#166534', color: 'white'   },
    Closed:           { bg: '#f3f4f6', color: '#6b7280' },
  };
  const s = map[status] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{
      display: 'inline-block', padding: '4px 12px', borderRadius: 20,
      fontSize: 12, fontWeight: 600, background: s.bg, color: s.color,
    }}>
      {status === 'Reunited' ? '🐾 ' : ''}{status}
    </span>
  );
}

// ─── Type badge ───────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 4,
      fontSize: 11, fontWeight: 700,
      background: type === 'Lost' ? '#fee2e2' : '#dcfce7',
      color: type === 'Lost' ? '#991b1b' : '#15803d',
    }}>
      {type.toUpperCase()}
    </span>
  );
}

// ─── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({ report, onClose, onApprove, onDelete }) {
  const isResolved = report.status === 'Reunited' || report.status === 'Closed';

  return (
    <div style={overlay}>
      <div style={modalBox}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 20 }}>
            {report.type} Pet Report
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        {report.status === 'Reunited' && (
          <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 14, fontWeight: 600 }}>
            🐾 This pet has been reunited with its owner!
          </div>
        )}
        {report.status === 'Closed' && (
          <div style={{ background: '#f3f4f6', border: '1px solid #d1d5db', color: '#6b7280', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 14 }}>
            This report has been closed by the reporter.
          </div>
        )}

        {report.photo && (
          <img
            src={report.photo.startsWith('/') ? `${API_BASE}${report.photo}` : report.photo}
            alt="pet"
            style={{ width: '60%', display: 'block', margin: '0 auto 20px', borderRadius: 10, maxHeight: 280, objectFit: 'cover' }}
          />
        )}

        <div style={{ background: '#f9fafb', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Full Name"     value={report.reporter_name} />
          <Field label="Email"         value={report.reporter_email} />
          <Field label="Phone Number"  value={report.reporter_phone || '—'} />
          {report.pet_name && <Field label="Pet Name" value={report.pet_name} />}
          {report.last_seen_location && <Field label="Location" value={report.last_seen_location} />}
          <Field label="Description"   value={report.pet_description} />
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 6 }}>Status</label>
            <StatusBadge status={report.status} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 28 }}>
          {!isResolved && report.status !== 'Approved' && (
            <button onClick={onApprove} style={btnGreen}>Approve</button>
          )}
          <button onClick={onDelete} style={btnRed}>Delete</button>
          <button onClick={onClose} style={btnOutline}>Close</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 4 }}>{label}</label>
      <input readOnly value={value} style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontFamily: 'inherit', fontSize: 14, background: 'white', color: 'var(--text-dark)' }} />
    </div>
  );
}

// ─── Reusable Table ───────────────────────────────────────────────────────────
function ReportsTable({ title, reports, onView, onApprove, onDelete, showTypeCol = false, filterOptions }) {
  const [filterStatus, setFilterStatus] = useState('All');

  const filtered = filterStatus === 'All'
    ? reports
    : reports.filter(r => r.status === filterStatus);

  return (
    <div style={tableCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 17 }}>{title}</h3>
          <span style={{ background: 'var(--green-50)', color: 'var(--primary)', fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 20 }}>
            {reports.length}
          </span>
        </div>
        {filterOptions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>🔽 Filter:</span>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontFamily: 'inherit', fontSize: 13 }}
            >
              {filterOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: 14 }}>
          No reports found.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid var(--border)' }}>
              {showTypeCol && <th style={th}>TYPE</th>}
              <th style={th}>Name</th>
              <th style={th}>Description</th>
              <th style={th}>Date</th>
              <th style={th}>STATUS</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                {showTypeCol && (
                  <td style={td}><TypeBadge type={r.type} /></td>
                )}
                <td style={td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={avatar}>{r.reporter_name?.[0]?.toUpperCase() || '?'}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{r.reporter_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.reporter_email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ ...td, maxWidth: 200 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-mid)' }}>
                    {r.pet_description}
                  </div>
                </td>
                <td style={{ ...td, whiteSpace: 'nowrap', fontSize: 13 }}>
                  {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td style={td}><StatusBadge status={r.status} /></td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <button onClick={() => onView(r)} style={actionBtn('#2563eb')}>View</button>
                    <button onClick={() => onDelete(r.id)} style={actionBtn('#dc2626')}>Delete</button>
                    {r.status === 'Pending Review' && (
                      <button onClick={() => onApprove(r.id)} style={actionBtn('#16a34a')}>Approve</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Main Admin Module ─────────────────────────────────────────────────────────
export default function AdminLostAndFound() {
  const [allReports, setAllReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewReport, setViewReport] = useState(null);

  const fetchReports = () => {
    setLoading(true);
    API.get('/lostfound/admin/all')
      .then(r => setAllReports(r.data))
      .catch(() => setAllReports([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReports(); }, []);

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this report? It will become visible to the public.')) return;
    try {
      await API.patch(`/lostfound/${id}/approve`);
      fetchReports();
    } catch { alert('Failed to approve.'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this report? This cannot be undone.')) return;
    try {
      await API.delete(`/lostfound/${id}`);
      if (viewReport?.id === id) setViewReport(null);
      fetchReports();
    } catch { alert('Failed to delete.'); }
  };

  // ── Separate reports into 3 buckets ────────────────────────────────────────
  // Lost = type Lost AND not yet reunited/closed
  const lostReports     = allReports.filter(r => r.type === 'Lost'  && r.status !== 'Reunited' && r.status !== 'Closed');
  // Found = type Found AND not yet reunited/closed
  const foundReports    = allReports.filter(r => r.type === 'Found' && r.status !== 'Reunited' && r.status !== 'Closed');
  // Reunited = any type that has been marked Reunited (or Closed)
  const reunitedReports = allReports.filter(r => r.status === 'Reunited' || r.status === 'Closed');

  const pendingCount  = allReports.filter(r => r.status === 'Pending Review').length;

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Summary Stats ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16 }}>
        {[
          { label: 'Total Reports',      value: allReports.length,     icon: '📋' },
          { label: 'Lost Pet Reports',   value: lostReports.length,    icon: '🔍' },
          { label: 'Found Pet Reports',  value: foundReports.length,   icon: '🐾' },
          { label: 'Pending Review',     value: pendingCount,          icon: '⏳' },
          { label: 'Reunited / Closed',  value: reunitedReports.length,icon: '💚' },
        ].map(s => (
          <div key={s.label} className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, background: 'var(--green-50)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Fraunces',serif" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Found Pets Table (excludes Reunited) ──────────────────────────── */}
      <ReportsTable
        title="Found Pets"
        reports={foundReports}
        onView={setViewReport}
        onApprove={handleApprove}
        onDelete={handleDelete}
        filterOptions={['All', 'Pending Review', 'Approved']}
      />

      {/* ── Lost Pets Table (excludes Reunited) ───────────────────────────── */}
      <ReportsTable
        title="Lost Pets"
        reports={lostReports}
        onView={setViewReport}
        onApprove={handleApprove}
        onDelete={handleDelete}
        filterOptions={['All', 'Pending Review', 'Approved']}
      />

      {/* ── Reunited Pets Table ───────────────────────────────────────────── */}
      <div style={{ ...tableCard, border: '1.5px solid #86efac' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 17 }}>
              🐾 Reunited &amp; Closed Pets
            </h3>
            <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 20 }}>
              {reunitedReports.length}
            </span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cases that have been resolved</span>
        </div>

        {reunitedReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: 14 }}>
            No reunited or closed reports yet.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--border)' }}>
                <th style={th}>TYPE</th>
                <th style={th}>Name</th>
                <th style={th}>Description</th>
                <th style={th}>Date Reported</th>
                <th style={th}>Date Resolved</th>
                <th style={th}>STATUS</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {reunitedReports.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={td}><TypeBadge type={r.type} /></td>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={avatar}>{r.reporter_name?.[0]?.toUpperCase() || '?'}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{r.reporter_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.reporter_email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...td, maxWidth: 200 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-mid)' }}>
                      {r.pet_description}
                    </div>
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap', fontSize: 13 }}>
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap', fontSize: 13 }}>
                    {new Date(r.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td style={td}><StatusBadge status={r.status} /></td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 14 }}>
                      <button onClick={() => setViewReport(r)} style={actionBtn('#2563eb')}>View</button>
                      <button onClick={() => handleDelete(r.id)} style={actionBtn('#dc2626')}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {viewReport && (
        <DetailModal
          report={viewReport}
          onClose={() => setViewReport(null)}
          onApprove={() => { handleApprove(viewReport.id); setViewReport(null); }}
          onDelete={() => { handleDelete(viewReport.id); setViewReport(null); }}
        />
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const tableCard = {
  background: 'white', border: '1.5px solid var(--border)',
  borderRadius: 14, padding: '20px 24px', overflowX: 'auto',
};
const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20,
};
const modalBox = {
  background: 'white', borderRadius: 16, padding: '32px 36px',
  width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
};
const th = {
  textAlign: 'left', padding: '10px 12px', fontSize: 12,
  fontWeight: 600, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em',
};
const td = { padding: '13px 12px' };
const avatar = {
  width: 36, height: 36, borderRadius: '50%', background: 'var(--green-50)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 14, fontWeight: 700, color: 'var(--primary)', flexShrink: 0,
  border: '1.5px solid var(--green-200)',
};
const actionBtn = (color) => ({
  background: 'none', border: 'none', color,
  fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '2px 0',
});
const btnGreen   = { background: '#166534', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', padding: '11px 32px', fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const btnRed     = { background: '#b91c1c', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', padding: '11px 32px', fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const btnOutline = { background: 'none', border: '1.5px solid var(--border)', color: 'var(--text-dark)', borderRadius: 'var(--radius-full)', padding: '11px 32px', fontWeight: 600, fontSize: 14, cursor: 'pointer' };