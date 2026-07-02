import React, { useState, useEffect } from 'react';
import api, { API_BASE } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { formatBDT } from '../utils/currency';
import AppNavbar from '../components/AppNavbar';
import { Star, MessageCircle, MapPin } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TABS = [
  { key: 'about', label: 'About' },
  { key: 'availability', label: 'Availability' },
  { key: 'reviews', label: 'Reviews' },
];

const fileUrl = (p) => {
  if (!p) return null;
  const name = String(p).split(/[\\/]/).pop();
  return `${API_BASE}/uploads/documents/${name}`;
};

const formatLocation = (loc) => {
  if (!loc) return 'Location not set';
  return [loc.thana, loc.district, loc.division].filter(Boolean).join(', ') || 'Location not set';
};

const Stars = ({ rating = 0, size = 16 }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={size}
        className="star"
        fill={n <= Math.round(rating) ? '#f59e0b' : 'none'}
        strokeWidth={1.5}
      />
    ))}
    <span className="text-muted" style={{ marginLeft: 4 }}>{rating ? rating.toFixed(1) : 'New'}</span>
  </span>
);

export default function ViewProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [pro, setPro] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [canChat, setCanChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/api/users/${id}`),
      api.get(`/api/ratings/${id}`),
    ]).then(([proRes, ratingsRes]) => {
      setPro(proRes.data);
      setRatings(ratingsRes.data || []);
    }).catch(() => {
      setPro(null);
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user || user.role !== 'customer') return;
    api.get('/api/bookings/my-bookings')
      .then((res) => {
        const hasConfirmed = (res.data || []).some(
          (b) => b.professional?._id === id && b.status === 'Confirmed'
        );
        setCanChat(hasConfirmed);
      })
      .catch(() => {});
  }, [user, id]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7FAFF' }}>
        <AppNavbar />
        <div className="app-page-content" style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
          <p className="text-muted">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!pro) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7FAFF' }}>
        <AppNavbar />
        <div className="app-page-content" style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p className="text-muted">Professional not found.</p>
            <Link to="/home" className="btn btn-secondary" style={{ marginTop: 16 }}>Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />
      <div className="app-page-content" style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 20px' }}>
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{
            width: 110, height: 110, borderRadius: '50%', overflow: 'hidden',
            background: 'var(--primary-light)', flexShrink: 0
          }}>
            {pro.profilePhoto && (
              <img src={fileUrl(pro.profilePhoto)} alt={pro.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <h2>{pro.name}</h2>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="badge badge-blue">{pro.professionalType}</span>
              {pro.isVerified && <span className="badge badge-green">Verified</span>}
            </div>
            <div style={{ marginTop: 8 }}><Stars rating={pro.rating} /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, color: 'var(--text-muted)', fontSize: 13 }}>
              <MapPin size={13} /> {formatLocation(pro.location)}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-layout">
        <div>
          <div className="card">
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {TABS.map((t) => (
                <button
                  key={t.key}
                  className={`btn ${activeTab === t.key ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '8px 18px' }}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === 'about' && (
              <div>
                <h3 style={{ marginBottom: 10 }}>About</h3>
                <p className="text-muted" style={{ marginBottom: 14 }}>{pro.about || 'No description provided.'}</p>
                {pro.experience && <p style={{ marginBottom: 14 }}><strong>Experience:</strong> {pro.experience}</p>}

                <h3 style={{ margin: '20px 0 10px' }}>Rates</h3>
                <div className="grid-3">
                  <div>
                    <div className="text-muted">Weekday</div>
                    <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatBDT(pro.weekdayRate)}/hr</div>
                  </div>
                  <div>
                    <div className="text-muted">Saturday</div>
                    <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatBDT(pro.saturdayRate)}/hr</div>
                  </div>
                  <div>
                    <div className="text-muted">Sunday</div>
                    <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatBDT(pro.sundayRate)}/hr</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'availability' && (
              <div>
                <h3 style={{ marginBottom: 10 }}>Availability</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {DAYS.map((day) => {
                    const slot = pro.availability?.[day];
                    return (
                      <div key={day} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 6 }}>
                        <span>{day}</span>
                        <span className="text-muted">{slot?.start && slot?.end ? `${slot.start} - ${slot.end}` : 'Unavailable'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div>
                <h3 style={{ marginBottom: 12 }}>Ratings & Reviews ({ratings.length})</h3>
                {ratings.length === 0 ? (
                  <p className="text-muted">No reviews yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {ratings.map((r) => (
                      <div key={r._id} style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                          <strong>{r.customer?.name || 'Anonymous'}</strong>
                          <Stars rating={r.rating} size={13} />
                        </div>
                        {r.review && <p className="text-muted" style={{ marginTop: 6 }}>{r.review}</p>}
                        {r.createdAt && <p className="text-muted" style={{ marginTop: 4 }}>{new Date(r.createdAt).toLocaleDateString('en-BD')}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ position: 'sticky', top: 80 }}>
          <div className="card">
            <div className="text-muted">Rate</div>
            <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 22, marginBottom: 16 }}>
              {formatBDT(pro.weekdayRate || pro.hourlyRate)}/hr
            </div>

            <div className="sidebar-btn-list">
              {user && user.role === 'customer' && (
                <button className="btn btn-primary btn-block" onClick={() => navigate(`/book/${id}`)}>
                  Book Now
                </button>
              )}
              {canChat && (
                <button className="btn btn-secondary btn-block" onClick={() => navigate(`/chat/${id}`)}>
                  <MessageCircle size={14} /> Chat
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
