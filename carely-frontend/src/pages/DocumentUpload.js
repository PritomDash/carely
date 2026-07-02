import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import AppNavbar from '../components/AppNavbar';

export default function DocumentUpload() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [professionalType, setProfessionalType] = useState('');
  const [existing, setExisting] = useState({});

  const [files, setFiles] = useState({
    profilePhoto: null,
    idDocument: null,
    passport: null,
    policeClearance: null,
    courseCertificate: null,
  });
  const [nidNumber, setNidNumber] = useState('');
  const [bmdc, setBmdc] = useState('');
  const [bnmc, setBnmc] = useState('');

  useEffect(() => {
    api.get('/api/users/me').then((res) => {
      const u = res.data;
      setProfessionalType(u.professionalType || '');
      setNidNumber(u.nidNumber || '');
      setBmdc(u.bmdc || '');
      setBnmc(u.bnmc || '');
      setExisting({
        profilePhoto: !!u.profilePhoto,
        idDocument: !!u.idDocument,
        passport: !!u.passport,
        policeClearance: !!u.policeClearance,
        courseCertificate: !!u.courseCertificate,
      });
    }).catch(() => setError('Failed to load documents')).finally(() => setLoading(false));
  }, []);

  const handleFile = (field, file) => setFiles((f) => ({ ...f, [field]: file }));

  const isNurseOrPhysio = professionalType === 'Nurse' || professionalType === 'Physiotherapist';
  const isNurse = professionalType === 'Nurse';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!files.idDocument && !existing.idDocument) {
      setError('ID document is required.');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(files).forEach(([key, file]) => {
        if (file) formData.append(key, file);
      });
      if (nidNumber) formData.append('nidNumber', nidNumber);
      if (isNurseOrPhysio) formData.append('bmdc', bmdc);
      if (isNurse) formData.append('bnmc', bnmc);

      const res = await api.post('/api/users/documents', formData);
      const u = res.data.user;
      setExisting({
        profilePhoto: !!u.profilePhoto,
        idDocument: !!u.idDocument,
        passport: !!u.passport,
        policeClearance: !!u.policeClearance,
        courseCertificate: !!u.courseCertificate,
      });
      setFiles({ profilePhoto: null, idDocument: null, passport: null, policeClearance: null, courseCertificate: null });
      setSuccess('Documents uploaded successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7FAFF' }}>
        <AppNavbar />
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  const DocLabel = ({ label, field, required }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {label} {required && <span style={{ color: 'red' }}>*</span>}
      {existing[field] && (
        <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <CheckCircle2 size={12} /> Uploaded
        </span>
      )}
      {required && <span className="text-muted" style={{ fontSize: 12 }}>Required</span>}
    </label>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px' }}>
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>Upload Documents</h2>

        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
          padding: '10px 14px', fontSize: 13, color: '#1e40af', marginBottom: 20
        }}>
          Your profile will go live after admin verifies your ID document.
        </div>

        {error && (
          <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>{error}</div>
        )}
        {success && (
          <div className="badge badge-green" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>{success}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <DocLabel label="Profile Photo" field="profilePhoto" />
            <input type="file" accept="image/*" onChange={(e) => handleFile('profilePhoto', e.target.files[0])} />
          </div>

          <div className="form-group">
            <DocLabel label="ID Document" field="idDocument" required />
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => handleFile('idDocument', e.target.files[0])}
              required={!existing.idDocument}
            />
          </div>

          <div className="form-group">
            <DocLabel label="Passport" field="passport" />
            <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFile('passport', e.target.files[0])} />
          </div>

          <div className="form-group">
            <DocLabel label="Police Clearance" field="policeClearance" />
            <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFile('policeClearance', e.target.files[0])} />
          </div>

          <div className="form-group">
            <DocLabel label="Course Certificate" field="courseCertificate" />
            <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFile('courseCertificate', e.target.files[0])} />
          </div>

          <div className="form-group">
            <label>NID Number</label>
            <input type="text" value={nidNumber} onChange={(e) => setNidNumber(e.target.value)} placeholder="National ID number" />
          </div>

          {isNurseOrPhysio && (
            <div className="form-group">
              <label>BMDC Number</label>
              <input type="text" value={bmdc} onChange={(e) => setBmdc(e.target.value)} placeholder="BMDC registration number" />
            </div>
          )}

          {isNurse && (
            <div className="form-group">
              <label>BNMC Number</label>
              <input type="text" value={bnmc} onChange={(e) => setBnmc(e.target.value)} placeholder="BNMC registration number" />
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%', marginTop: 8 }}>
            {saving ? 'Uploading...' : 'Upload Documents'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link to="/professional-profile" className="text-muted">Back to profile</Link>
        </div>
      </div>
      </div>
    </div>
  );
}
