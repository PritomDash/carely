import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import LocationSelector from '../components/LocationSelector';
import { User, Briefcase } from 'lucide-react';
import { handleGoogleLogin } from '../utils/googleAuth';

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

const inputStyle = {
  width: '100%', padding: '14px 16px',
  border: '1.5px solid #E2E8F0', borderRadius: 10,
  fontSize: 15, outline: 'none',
  transition: 'border 0.2s',
  marginBottom: 16,
};

const emptyAvailability = () =>
  DAYS.reduce((acc, day) => ({ ...acc, [day]: { enabled: false, start: '', end: '' } }), {});

export default function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState('customer');
  const [error, setError] = useState('');
  const [submitState, setSubmitState] = useState('idle'); // idle | submitting | success | error
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

  const handleGoogleSignup = () => handleGoogleLogin(navigate, setError);

  const toggleDay = (day) =>
    setAvailability((a) => ({ ...a, [day]: { ...a[day], enabled: !a[day].enabled } }));

  const setDayTime = (day, part, value) =>
    setAvailability((a) => ({ ...a, [day]: { ...a[day], [part]: value } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitState('submitting');

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('phone', phone);
      formData.append('role', role);

      const referralCode = localStorage.getItem('carelyReferralCode');
      if (referralCode) formData.append('referralCode', referralCode);

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
      localStorage.removeItem('carelyReferralCode');

      setSubmitState('success');
      setTimeout(() => {
        navigate('/login', { state: { success: 'Account created successfully! Please log in.' } });
      }, 1200);
    } catch (err) {
      setSubmitState('error');
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      setTimeout(() => setSubmitState('idle'), 3000);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>

      {/* LEFT SIDE - Photo and branding */}
      <div className="auth-left-panel" style={{
        flex: 1, position: 'relative', display: 'flex',
        flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', padding: '60px 48px',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #2563EB 100%)',
        overflow: 'hidden',
      }}>
        <img
          src="https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=800&q=80"
          alt="Happy family"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.2 }}
        />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 380 }}>
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 48 }}>
            <span style={{ fontSize: 36 }}>💙</span>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#FFFFFF' }}>Carely</span>
          </a>
          <h2 style={{ fontSize: 36, fontWeight: 900, color: '#FFFFFF', marginBottom: 16, lineHeight: 1.2 }}>
            Join Bangladesh's Care Community
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, marginBottom: 40 }}>
            Whether you need care or provide care, Carely connects you with the right people.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              '✓ Free for customers',
              '✓ Earn money as a professional',
              '✓ Verified and trusted platform',
              '✓ Available across all of Bangladesh',
            ].map(f => (
              <div key={f} style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, textAlign: 'left' }}>{f}</div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Register form */}
      <div className="auth-right-panel" style={{
        width: 480, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 48px',
        background: '#FFFFFF', overflowY: 'auto',
      }}>
        <div className="auth-mobile-logo-wrap" style={{ display: 'none', textAlign: 'center', marginBottom: 28 }}>
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <span style={{ fontSize: 28 }}>💙</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#1A1A2E' }}>Carely</span>
          </a>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: '#1A1A2E', marginBottom: 8 }}>Create Account</h1>
          <p style={{ fontSize: 15, color: '#64748B' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#2563EB', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>

        {error && <div className="msg-error">{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div
            onClick={() => setRole('customer')}
            style={{
              cursor: 'pointer', textAlign: 'center', padding: 18, borderRadius: 12,
              border: role === 'customer' ? '2px solid #2563EB' : '1.5px solid #E2E8F0',
              background: role === 'customer' ? '#EBF3FF' : '#fff',
              boxShadow: role === 'customer' ? '0 4px 16px rgba(37,99,235,0.12)' : 'none',
            }}
          >
            <User size={26} color="#2563EB" style={{ marginBottom: 8 }} />
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1A1A2E' }}>I Need Care</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Find and book professionals</div>
          </div>

          <div
            onClick={() => setRole('professional')}
            style={{
              cursor: 'pointer', textAlign: 'center', padding: 18, borderRadius: 12,
              border: role === 'professional' ? '2px solid #2563EB' : '1.5px solid #E2E8F0',
              background: role === 'professional' ? '#EBF3FF' : '#fff',
              boxShadow: role === 'professional' ? '0 4px 16px rgba(37,99,235,0.12)' : 'none',
            }}
          >
            <Briefcase size={26} color="#2563EB" style={{ marginBottom: 8 }} />
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1A1A2E' }}>I'm a Professional</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Offer your services</div>
          </div>
        </div>

        {role === 'customer' && (
          <div>
            <button
              type="button"
              onClick={handleGoogleSignup}
              style={{
                width: '100%', padding: 14,
                background: 'white', border: '1.5px solid #E2E8F0',
                borderRadius: 12, fontSize: 15, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 10, color: '#374151',
                marginTop: 12, marginBottom: 20,
              }}
            >
              <GoogleIcon /> Sign up with Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: '#E8EDF3' }} />
              <span className="text-muted">or</span>
              <div style={{ flex: 1, height: 1, background: '#E8EDF3' }} />
            </div>
          </div>
        )}

        {role === 'professional' && (
          <div style={{ background: '#F0F7FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '12px 14px', marginBottom: 20, fontSize: 13, color: '#1E40AF' }}>
            💼 Professionals must register with email to set up their profile with location, rates, availability and documents.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div>
            <label className="form-label">Full Name</label>
            <input className="auth-input" style={inputStyle} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required />
          </div>

          <div>
            <label className="form-label">Email</label>
            <input className="auth-input" style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>

          <div>
            <label className="form-label">Password</label>
            <input className="auth-input" style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Choose a password" required />
          </div>

          <div>
            <label className="form-label">Phone Number</label>
            <input className="auth-input" style={inputStyle} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" required />
          </div>

          {role === 'professional' && (
            <>
              <div>
                <label className="form-label">Professional Type</label>
                <select className="auth-input" style={inputStyle} value={professionalType} onChange={(e) => setProfessionalType(e.target.value)} required>
                  <option value="">Select a type</option>
                  {PROFESSIONAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="form-label">Experience (years)</label>
                <input className="auth-input" style={inputStyle} type="text" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g. 3 years" />
              </div>

              <div>
                <label className="form-label">About / Bio</label>
                <textarea className="auth-input" style={{ ...inputStyle, resize: 'vertical' }} rows={4} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Tell customers about yourself" />
              </div>

              <div className="grid-2">
                <div>
                  <label className="form-label">Hourly Rate (৳ BDT)</label>
                  <input className="auth-input" style={inputStyle} type="number" min="0" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="e.g. 500" />
                </div>
                <div>
                  <label className="form-label">Weekday Rate (৳ BDT)</label>
                  <input className="auth-input" style={inputStyle} type="number" min="0" value={weekdayRate} onChange={(e) => setWeekdayRate(e.target.value)} placeholder="e.g. 500" />
                </div>
              </div>
              <div className="grid-2">
                <div>
                  <label className="form-label">Saturday Rate (৳ BDT)</label>
                  <input className="auth-input" style={inputStyle} type="number" min="0" value={saturdayRate} onChange={(e) => setSaturdayRate(e.target.value)} placeholder="e.g. 600" />
                </div>
                <div>
                  <label className="form-label">Sunday Rate (৳ BDT)</label>
                  <input className="auth-input" style={inputStyle} type="number" min="0" value={sundayRate} onChange={(e) => setSundayRate(e.target.value)} placeholder="e.g. 600" />
                </div>
              </div>

              <div>
                <label className="form-label">Location</label>
                <LocationSelector value={location} onChange={setLocation} required />
              </div>

              <div>
                <label className="form-label">Area (optional)</label>
                <input className="auth-input" style={inputStyle} type="text" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Road 5, House 12" />
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
                <div>
                  <label className="form-label">BMDC Registration Number</label>
                  <input className="auth-input" style={inputStyle} type="text" value={bmdc} onChange={(e) => setBmdc(e.target.value)} placeholder="BMDC registration number" />
                </div>
              )}

              {isNurse && (
                <div>
                  <label className="form-label">BNMC Registration Number</label>
                  <input className="auth-input" style={inputStyle} type="text" value={bnmc} onChange={(e) => setBnmc(e.target.value)} placeholder="BNMC registration number" />
                </div>
              )}

              <div>
                <label className="form-label">NID Number</label>
                <input className="auth-input" style={inputStyle} type="text" value={nidNumber} onChange={(e) => setNidNumber(e.target.value)} placeholder="National ID number" />
              </div>

              <div className="grid-2">
                <div>
                  <label className="form-label">bKash Number</label>
                  <input className="auth-input" style={inputStyle} type="text" value={bkashNumber} onChange={(e) => setBkashNumber(e.target.value)} placeholder="01XXXXXXXXX" />
                </div>
                <div>
                  <label className="form-label">Nagad Number</label>
                  <input className="auth-input" style={inputStyle} type="text" value={nagadNumber} onChange={(e) => setNagadNumber(e.target.value)} placeholder="01XXXXXXXXX" />
                </div>
              </div>
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '16px 0' }}>
            <input
              type="checkbox"
              id="terms"
              checked={agreedToTerms}
              onChange={e => setAgreedToTerms(e.target.checked)}
              style={{ marginTop: 3, width: 16, height: 16, cursor: 'pointer', accentColor: '#2563EB' }}
            />
            <label htmlFor="terms" style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, cursor: 'pointer' }}>
              I have read and agree to Carely's{' '}
              <a href="/terms" target="_blank" rel="noreferrer" style={{ color: '#2563EB', fontWeight: 600 }}>Terms & Conditions</a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: '#2563EB', fontWeight: 600 }}>Privacy Policy</a>.
              I understand that Carely is a marketplace platform and not responsible for service outcomes.
            </label>
          </div>

          <button
            type="submit"
            disabled={!agreedToTerms || submitState === 'submitting' || submitState === 'success'}
            style={{
              width: '100%', padding: 16,
              background: submitState === 'success' ? '#22C55E' : 'linear-gradient(135deg, #2563EB, #3B82F6)',
              color: 'white', border: 'none', borderRadius: 12,
              fontSize: 16, fontWeight: 800,
              cursor: agreedToTerms && submitState === 'idle' ? 'pointer' : 'not-allowed',
              boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
              marginTop: 8, opacity: agreedToTerms ? 1 : 0.5,
            }}
          >
            {submitState === 'submitting' && '⏳ Creating Account...'}
            {submitState === 'success' && '✓ Account Created!'}
            {submitState === 'error' && 'Try Again'}
            {submitState === 'idle' && (role === 'professional' ? 'Create Professional Account' : 'Register')}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <span className="text-muted">
            Already have an account? <Link to="/login" style={{ color: '#2563EB', fontWeight: 700, textDecoration: 'none' }}>Log in</Link>
          </span>
        </div>
      </div>
    </div>
  );
}
