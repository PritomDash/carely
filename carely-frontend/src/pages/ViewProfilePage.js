import React, { useState, useEffect } from 'react';
import api, { API_BASE } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { formatBDT } from '../utils/currency';
import SafetyDisclaimer from '../components/SafetyDisclaimer';
import { Star, MessageCircle } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
    return <div className="page"><p className="text-muted">Loading profile...</p></div>;
  }

  if (!pro) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="text-muted">Professional not found.</p>
          <Link to="/home" className="btn btn-secondary" style={{ marginTop: 16 }}>Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="card">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{
            width: 96, height: 96, borderRadius: '50%', overflow: 'hidden',
            background: '#f3f4f6', flexShrink: 0
          }}>
            {pro.profilePhoto && (
              <img src={fileUrl(pro.profilePhoto)} alt={pro.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <h2>{pro.name}</h2>
            <Stars rating={pro.rating} />
            <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="badge badge-blue">{pro.professionalType}</span>
              {pro.isVerified && <span className="badge badge-green">Verified</span>}
            </div>
            <p className="text-muted" style={{ marginTop: 6 }}>{formatLocation(pro.location)}</p>
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {user && user.role === 'customer' && (
            <button className="btn btn-primary" onClick={() => navigate(`/book/${id}`)}>
              Book Now
            </button>
          )}
          {canChat && (
            <button className="btn btn-secondary" onClick={() => navigate(`/chat/${id}`)}>
              <MessageCircle size={14} style={{ marginRight: 6 }} /> Chat
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 10 }}>About</h3>
        <p className="text-muted" style={{ marginBottom: 10 }}>{pro.about || 'No description provided.'}</p>
        {pro.experience && <p><strong>Experience:</strong> {pro.experience}</p>}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 10 }}>Rates</h3>
        <div className="grid-3">
          <div>
            <div className="text-muted">Weekday</div>
            <div style={{ fontWeight: 600 }}>{formatBDT(pro.weekdayRate)}/hr</div>
          </div>
          <div>
            <div className="text-muted">Saturday</div>
            <div style={{ fontWeight: 600 }}>{formatBDT(pro.saturdayRate)}/hr</div>
          </div>
          <div>
            <div className="text-muted">Sunday</div>
            <div style={{ fontWeight: 600 }}>{formatBDT(pro.sundayRate)}/hr</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 10 }}>Availability</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {DAYS.map((day) => {
            const slot = pro.availability?.[day];
            return (
              <div key={day} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: 6 }}>
                <span>{day}</span>
                <span className="text-muted">{slot?.start && slot?.end ? `${slot.start} - ${slot.end}` : 'Unavailable'}</span>
              </div>
            );
          })}
        </div>
      </div>

      <SafetyDisclaimer />

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Ratings & Reviews ({ratings.length})</h3>
        {ratings.length === 0 ? (
          <p className="text-muted">No reviews yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {ratings.map((r) => (
              <div key={r._id} style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                  <strong>{r.customer?.name || 'Anonymous'}</strong>
                  <Stars rating={r.rating} size={13} />
                </div>
                {r.review && <p className="text-muted" style={{ marginTop: 6 }}>{r.review}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
