import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import LocationSelector from '../components/LocationSelector';
import { Heart, User, Briefcase } from 'lucide-react';

const PROFESSIONAL_TYPES = ['Child Care', 'Aged Care', 'Nurse', 'Physiotherapist'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const emptyAvailability = () =>
  DAYS.reduce((acc, day) => ({ ...acc, [day]: { enabled: false, start: '', end: '' } }), {});

export default function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState('customer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  const [professionalType, setProfessionalType] = useState('');
  const [experience, setExperience] = useState('');
  const [about, setAbout] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [weekdayRate, setWeekdayRate] = useState('');
  const [saturdayRate, setSaturdayRate] = useState('');
  const [sundayRate, setSundayRate] = useState('');
  const [location, setLocation] = useState({});
  const [area, setArea] = useState('');
  const [availability, setAvailability] = useState(emptyAvailability());
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [idDocument, setIdDocument] = useState(null);
  const [policeClearance, setPoliceClearance] = useState(null);
  const [courseCertificate, setCourseCertificate] = useState(null);
  const [bmdc, setBmdc] = useState('');
  const [bnmc, setBnmc] = useState('');
  const [nidNumber, setNidNumber] = useState('');
  const [bkashNumber, setBkashNumber] = useState('');
  const [nagadNumber, setNagadNumber] = useState('');

  const isNurseOrPhysio = professionalType === 'Nurse' || professionalType === 'Physiotherapist';
  const isNurse = professionalType === 'Nurse';

  const toggleDay = (day) =>
    setAvailability((a) => ({ ...a, [day]: { ...a[day], enabled: !a[day].enabled } }));

  const setDayTime = (day, part, value) =>
    setAvailability((a) => ({ ...a, [day]: { ...a[day], [part]: value } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('phone', phone);
      formData.append('role', role);

      if (role === 'professional') {
        formData.append('professionalType', professionalType);
        formData.append('experience', experience);
        formData.append('about', about);
        if (hourlyRate) formData.append('hourlyRate', hourlyRate);
        if (weekdayRate) formData.append('weekdayRate', weekdayRate);
        if (saturdayRate) formData.append('saturdayRate', saturdayRate);
        if (sundayRate) formData.append('sundayRate', sundayRate);
        formData.append('location', JSON.stringify({ ...location, area }));

        const availabilityPayload = {};
        Object.entries(availability).forEach(([day, v]) => {
          if (v.enabled && v.start && v.end) availabilityPayload[day] = { start: v.start, end: v.end };
        });
        formData.append('availability', JSON.stringify(availabilityPayload));

        if (nidNumber) formData.append('nidNumber', nidNumber);
        if (isNurseOrPhysio && bmdc) formData.append('bmdc', bmdc);
        if (isNurse && bnmc) formData.append('bnmc', bnmc);
        if (bkashNumber) formData.append('bkashNumber', bkashNumber);
        if (nagadNumber) formData.append('nagadNumber', nagadNumber);

        if (profilePhoto) formData.append('profilePhoto', profilePhoto);
        if (idDocument) formData.append('idDocument', idDocument);
        if (policeClearance) formData.append('policeClearance', policeClearance);
        if (courseCertificate) formData.append('courseCertificate', courseCertificate);
      }

      await api.post('/api/auth/register', formData);

      const successMessage = role === 'professional'
        ? 'Account created! Please log in. Your profile will be visible after admin verification.'
        : 'Registration successful! Please log in.';
      navigate('/login', { state: { success: successMessage } });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <Link to="/" className="nav-logo" style={{ justifyContent: 'center', fontSize: 22 }}>
            <Heart size={24} color="#1E40AF" fill="#1E40AF" /> Carely
          </Link>
        </div>
        <h2 style={{ marginBottom: 20, textAlign: 'center' }}>Create Account</h2>

        {error && (
          <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '10px 14px' }}>
            {error}
          </div>
        )}

        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div
            onClick={() => setRole('customer')}
            className="card"
            style={{
              cursor: 'pointer', textAlign: 'center', padding: 20,
              border: role === 'customer' ? '2px solid #1E40AF' : '1px solid #E2E8F0',
              background: role === 'customer' ? '#EFF6FF' : '#fff',
              boxShadow: role === 'customer' ? 'var(--card-shadow)' : 'none',
            }}
          >
            <User size={30} color="#1E40AF" style={{ marginBottom: 10 }} />
            <div style={{ fontWeight: 700, fontSize: 16 }}>I need care</div>
            <div className="text-muted" style={{ marginTop: 4 }}>Find and book care professionals</div>
          </div>

          <div
            onClick={() => setRole('professional')}
            className="card"
            style={{
              cursor: 'pointer', textAlign: 'center', padding: 20,
              border: role === 'professional' ? '2px solid #1E40AF' : '1px solid #E2E8F0',
              background: role === 'professional' ? '#EFF6FF' : '#fff',
              boxShadow: role === 'professional' ? 'var(--card-shadow)' : 'none',
            }}
          >
            <Briefcase size={30} color="#1E40AF" style={{ marginBottom: 10 }} />
            <div style={{ fontWeight: 700, fontSize: 16 }}>I am a professional</div>
            <div className="text-muted" style={{ marginTop: 4 }}>Offer your care services</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Choose a password" required />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" required />
          </div>

          {role === 'professional' && (
            <>
              <div className="form-group">
                <label>Professional Type</label>
                <select value={professionalType} onChange={(e) => setProfessionalType(e.target.value)} required>
                  <option value="">Select a type</option>
                  {PROFESSIONAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Experience (years)</label>
                <input type="text" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g. 3 years" />
              </div>

              <div className="form-group">
                <label>About / Bio</label>
                <textarea rows={4} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Tell customers about yourself" />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Hourly Rate (৳ BDT)</label>
                  <input type="number" min="0" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="e.g. 500" />
                </div>
                <div className="form-group">
                  <label>Weekday Rate (৳ BDT)</label>
                  <input type="number" min="0" value={weekdayRate} onChange={(e) => setWeekdayRate(e.target.value)} placeholder="e.g. 500" />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Saturday Rate (৳ BDT)</label>
                  <input type="number" min="0" value={saturdayRate} onChange={(e) => setSaturdayRate(e.target.value)} placeholder="e.g. 600" />
                </div>
                <div className="form-group">
                  <label>Sunday Rate (৳ BDT)</label>
                  <input type="number" min="0" value={sundayRate} onChange={(e) => setSundayRate(e.target.value)} placeholder="e.g. 600" />
                </div>
              </div>

              <div className="form-group">
                <label>Location</label>
                <LocationSelector value={location} onChange={setLocation} required />
              </div>

              <div className="form-group">
                <label>Area (optional)</label>
                <input type="text" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Road 5, House 12" />
              </div>

              <div className="form-group">
                <label>Availability</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {DAYS.map((day) => (
                    <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ width: 100, flexShrink: 0, fontWeight: 500, fontSize: 14 }}>{day}</span>
                      <label className="toggle-switch">
                        <input type="checkbox" checked={availability[day].enabled} onChange={() => toggleDay(day)} />
                        <span className="toggle-slider" />
                      </label>
                      {availability[day].enabled && (
                        <>
                          <input
                            type="time"
                            value={availability[day].start}
                            onChange={(e) => setDayTime(day, 'start', e.target.value)}
                            style={{ flex: '1 1 110px', minWidth: 0, padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8 }}
                          />
                          <input
                            type="time"
                            value={availability[day].end}
                            onChange={(e) => setDayTime(day, 'end', e.target.value)}
                            style={{ flex: '1 1 110px', minWidth: 0, padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8 }}
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Profile Photo</label>
                <input type="file" accept="image/*" onChange={(e) => setProfilePhoto(e.target.files[0])} />
              </div>

              <div className="form-group">
                <label>
                  ID Document <span style={{ color: '#DC2626' }}>*</span>{' '}
                  <span className="text-muted">(Required)</span>
                </label>
                <input type="file" accept="image/*,application/pdf" onChange={(e) => setIdDocument(e.target.files[0])} required />
              </div>

              <div className="form-group">
                <label>Police Clearance <span className="text-muted">(Optional)</span></label>
                <input type="file" accept="image/*,application/pdf" onChange={(e) => setPoliceClearance(e.target.files[0])} />
              </div>

              <div className="form-group">
                <label>Course Certificate <span className="text-muted">(Optional)</span></label>
                <input type="file" accept="image/*,application/pdf" onChange={(e) => setCourseCertificate(e.target.files[0])} />
              </div>

              {isNurseOrPhysio && (
                <div className="form-group">
                  <label>BMDC Registration Number</label>
                  <input type="text" value={bmdc} onChange={(e) => setBmdc(e.target.value)} placeholder="BMDC registration number" />
                </div>
              )}

              {isNurse && (
                <div className="form-group">
                  <label>BNMC Registration Number</label>
                  <input type="text" value={bnmc} onChange={(e) => setBnmc(e.target.value)} placeholder="BNMC registration number" />
                </div>
              )}

              <div className="form-group">
                <label>NID Number</label>
                <input type="text" value={nidNumber} onChange={(e) => setNidNumber(e.target.value)} placeholder="National ID number" />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>bKash Number</label>
                  <input type="text" value={bkashNumber} onChange={(e) => setBkashNumber(e.target.value)} placeholder="01XXXXXXXXX" />
                </div>
                <div className="form-group">
                  <label>Nagad Number</label>
                  <input type="text" value={nagadNumber} onChange={(e) => setNagadNumber(e.target.value)} placeholder="01XXXXXXXXX" />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            className={`btn btn-block ${role === 'professional' ? 'btn-primary' : 'btn-success'}`}
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? 'Creating account...' : role === 'professional' ? 'Create Professional Account' : 'Register'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <span className="text-muted">
            Already have an account? <Link to="/login" className="text-primary">Log in</Link>
          </span>
        </div>
      </div>
    </div>
  );
}
