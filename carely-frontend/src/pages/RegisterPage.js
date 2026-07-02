import React, { useState, useEffect } from 'react';
import api, { API_BASE } from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import LocationSelector from '../components/LocationSelector';
import { User, Briefcase } from 'lucide-react';

const PROFESSIONAL_TYPES = ['Child Care', 'Aged Care', 'Nurse', 'Physiotherapist'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
  </svg>
);

const emptyAvailability = () =>
  DAYS.reduce((acc, day) => ({ ...acc, [day]: { enabled: false, start: '', end: '' } }), {});

export default function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState('customer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

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

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== API_BASE) return;
      if (event.data?.token) {
        localStorage.setItem('carelyToken', event.data.token);
        localStorage.setItem('carelyUser', JSON.stringify(event.data.user));
        navigate('/home');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate]);

  const handleGoogleSignup = () => {
    window.open(`${API_BASE}/api/auth/google`, 'google-login', 'width=500,height=600');
  };

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

      navigate('/login', { state: { success: 'Account created successfully! Please log in.' } });
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
          <Link to="/" className="navbar-brand" style={{ justifyContent: 'center', fontSize: 22 }}>
            <span className="heart">💙</span> Carely
          </Link>
        </div>
        <h2 style={{ marginBottom: 20, textAlign: 'center' }}>Create Account</h2>

        {error && <div className="msg-error">{error}</div>}

        <button
          type="button"
          onClick={handleGoogleSignup}
          className="btn-gray"
          style={{ width: '100%', background: '#fff', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}
        >
          <GoogleIcon /> Sign up with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: '#E8EDF3' }} />
          <span className="text-muted">or</span>
          <div style={{ flex: 1, height: 1, background: '#E8EDF3' }} />
        </div>

        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div
            onClick={() => setRole('customer')}
            className="card"
            style={{
              cursor: 'pointer', textAlign: 'center', padding: 20,
              border: role === 'customer' ? '2px solid #2B7FFF' : '1px solid #E8EDF0',
              background: role === 'customer' ? '#EBF3FF' : '#fff',
              boxShadow: role === 'customer' ? '0 4px 16px rgba(43,127,255,0.12)' : 'none',
            }}
          >
            <User size={30} color="#2B7FFF" style={{ marginBottom: 10 }} />
            <div style={{ fontWeight: 700, fontSize: 16 }}>I need care</div>
            <div className="text-muted" style={{ marginTop: 4 }}>Find and book care professionals</div>
          </div>

          <div
            onClick={() => setRole('professional')}
            className="card"
            style={{
              cursor: 'pointer', textAlign: 'center', padding: 20,
              border: role === 'professional' ? '2px solid #2B7FFF' : '1px solid #E8EDF0',
              background: role === 'professional' ? '#EBF3FF' : '#fff',
              boxShadow: role === 'professional' ? '0 4px 16px rgba(43,127,255,0.12)' : 'none',
            }}
          >
            <Briefcase size={30} color="#2B7FFF" style={{ marginBottom: 10 }} />
            <div style={{ fontWeight: 700, fontSize: 16 }}>I am a professional</div>
            <div className="text-muted" style={{ marginTop: 4 }}>Offer your care services</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Full Name</label>
            <input className="form-input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Choose a password" required />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Phone Number</label>
            <input className="form-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" required />
          </div>

          {role === 'professional' && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Professional Type</label>
                <select className="form-input" value={professionalType} onChange={(e) => setProfessionalType(e.target.value)} required>
                  <option value="">Select a type</option>
                  {PROFESSIONAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Experience (years)</label>
                <input className="form-input" type="text" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g. 3 years" />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label">About / Bio</label>
                <textarea className="form-input" rows={4} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Tell customers about yourself" />
              </div>

              <div className="grid-2">
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">Hourly Rate (৳ BDT)</label>
                  <input className="form-input" type="number" min="0" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="e.g. 500" />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">Weekday Rate (৳ BDT)</label>
                  <input className="form-input" type="number" min="0" value={weekdayRate} onChange={(e) => setWeekdayRate(e.target.value)} placeholder="e.g. 500" />
                </div>
              </div>
              <div className="grid-2">
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">Saturday Rate (৳ BDT)</label>
                  <input className="form-input" type="number" min="0" value={saturdayRate} onChange={(e) => setSaturdayRate(e.target.value)} placeholder="e.g. 600" />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">Sunday Rate (৳ BDT)</label>
                  <input className="form-input" type="number" min="0" value={sundayRate} onChange={(e) => setSundayRate(e.target.value)} placeholder="e.g. 600" />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Location</label>
                <LocationSelector value={location} onChange={setLocation} required />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Area (optional)</label>
                <input className="form-input" type="text" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Road 5, House 12" />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Availability</label>
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
                            className="form-input"
                            type="time"
                            value={availability[day].start}
                            onChange={(e) => setDayTime(day, 'start', e.target.value)}
                            style={{ flex: '1 1 110px', minWidth: 0 }}
                          />
                          <input
                            className="form-input"
                            type="time"
                            value={availability[day].end}
                            onChange={(e) => setDayTime(day, 'end', e.target.value)}
                            style={{ flex: '1 1 110px', minWidth: 0 }}
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Profile Photo</label>
                <input type="file" accept="image/*" onChange={(e) => setProfilePhoto(e.target.files[0])} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label">
                  ID Document <span style={{ color: '#EF4444' }}>*</span>{' '}
                  <span className="text-muted">(Required)</span>
                </label>
                <input type="file" accept="image/*,application/pdf" onChange={(e) => setIdDocument(e.target.files[0])} required />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Police Clearance <span className="text-muted">(Optional)</span></label>
                <input type="file" accept="image/*,application/pdf" onChange={(e) => setPoliceClearance(e.target.files[0])} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Course Certificate <span className="text-muted">(Optional)</span></label>
                <input type="file" accept="image/*,application/pdf" onChange={(e) => setCourseCertificate(e.target.files[0])} />
              </div>

              {isNurseOrPhysio && (
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">BMDC Registration Number</label>
                  <input className="form-input" type="text" value={bmdc} onChange={(e) => setBmdc(e.target.value)} placeholder="BMDC registration number" />
                </div>
              )}

              {isNurse && (
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">BNMC Registration Number</label>
                  <input className="form-input" type="text" value={bnmc} onChange={(e) => setBnmc(e.target.value)} placeholder="BNMC registration number" />
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label className="form-label">NID Number</label>
                <input className="form-input" type="text" value={nidNumber} onChange={(e) => setNidNumber(e.target.value)} placeholder="National ID number" />
              </div>

              <div className="grid-2">
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">bKash Number</label>
                  <input className="form-input" type="text" value={bkashNumber} onChange={(e) => setBkashNumber(e.target.value)} placeholder="01XXXXXXXXX" />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">Nagad Number</label>
                  <input className="form-input" type="text" value={nagadNumber} onChange={(e) => setNagadNumber(e.target.value)} placeholder="01XXXXXXXXX" />
                </div>
              </div>
            </>
          )}

          <div style={{ display:'flex', alignItems:'flex-start', gap:10, margin:'16px 0' }}>
            <input
              type="checkbox"
              id="terms"
              checked={agreedToTerms}
              onChange={e => setAgreedToTerms(e.target.checked)}
              style={{ marginTop:3, width:16, height:16, cursor:'pointer', accentColor:'#2B7FFF' }}
            />
            <label htmlFor="terms" style={{ fontSize:13, color:'#374151', lineHeight:1.6, cursor:'pointer' }}>
              I have read and agree to Carely's{' '}
              <a href="/terms" target="_blank" rel="noreferrer" style={{ color:'#2B7FFF', fontWeight:600 }}>Terms & Conditions</a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" rel="noreferrer" style={{ color:'#2B7FFF', fontWeight:600 }}>Privacy Policy</a>.
              I understand that Carely is a marketplace platform and not responsible for service outcomes.
            </label>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={!agreedToTerms || loading}
            style={{ width: '100%', marginTop: 8, opacity: agreedToTerms ? 1 : 0.5, cursor: agreedToTerms ? 'pointer' : 'not-allowed' }}
          >
            {loading ? 'Creating Account...' : role === 'professional' ? 'Create Professional Account' : 'Register'}
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
