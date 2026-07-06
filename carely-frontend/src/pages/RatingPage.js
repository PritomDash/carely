import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import AppNavbar from '../components/AppNavbar';

export default function RatingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');
  const [error, setError] = useState('');
  const [submitState, setSubmitState] = useState('idle'); // idle | submitting | success | error

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    api.get(`/api/bookings/${id}`)
      .then((res) => setBooking(res.data.booking))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Please select a star rating.');
      return;
    }

    setSubmitState('submitting');
    try {
      await api.post('/api/ratings', { bookingId: id, rating, review });
      setSubmitState('success');
      setTimeout(() => {
        navigate('/my-bookings', { state: { success: 'Thanks for your rating!' } });
      }, 1200);
    } catch (err) {
      setSubmitState('error');
      setError(err.response?.data?.message || 'Failed to submit rating.');
      setTimeout(() => setSubmitState('idle'), 3000);
    }
  };

  if (loading) {
    return (
      <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
        <AppNavbar />
        <div className="app-page-content" style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px' }}>
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />
      <div className="app-page-content" style={{ maxWidth: 480, margin: '0 auto', padding: '28px 20px' }}>
      <div className="card">
        <h2 style={{ marginBottom: 8 }}>Rate Your Experience</h2>
        {booking?.professional?.name && (
          <p className="text-muted" style={{ marginBottom: 16 }}>
            How was your booking with {booking.professional.name}?
          </p>
        )}

        {error && (
          <div className="badge badge-red" style={{ display: 'block', marginBottom: 16, padding: '8px 12px' }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{ background: 'none', border: 'none', padding: 4 }}
                >
                  <Star
                    size={36}
                    className="star"
                    fill={n <= (hoverRating || rating) ? '#f59e0b' : 'none'}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Review (optional)</label>
            <textarea
              rows={4}
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share details of your experience"
              maxLength={500}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitState === 'submitting' || submitState === 'success'}
            style={{ width: '100%', background: submitState === 'success' ? '#22C55E' : undefined }}
          >
            {submitState === 'idle' && 'Submit Rating'}
            {submitState === 'submitting' && '⏳ Submitting...'}
            {submitState === 'success' && '✓ Rating Submitted!'}
            {submitState === 'error' && 'Try Again'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link to="/my-bookings" className="text-muted">Back to My Bookings</Link>
        </div>
      </div>
      </div>
    </div>
  );
}
