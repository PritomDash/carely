import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import CarelyLogo from './CarelyLogo';

// Full-page gate shown to regular users when the admin has switched on
// maintenance mode via God Mode controls. Admin routes stay reachable so
// the admin can always log in and turn it back off.
export default function MaintenanceGate({ children }) {
  const location = useLocation();
  const [maintenance, setMaintenance] = useState(null);

  useEffect(() => {
    api.get('/api/admin/settings')
      .then((res) => setMaintenance(res.data?.maintenanceMode ? (res.data.maintenanceMessage || 'Carely is currently undergoing scheduled maintenance. Please check back soon.') : null))
      .catch(() => setMaintenance(null));
  }, []);

  const isAdminRoute = location.pathname.startsWith('/admin');

  if (maintenance && !isAdminRoute) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 24,
        background: '#F5F7FA', textAlign: 'center',
      }}>
        <CarelyLogo size={56} />
        <h1 style={{ marginTop: 20, fontSize: 24, fontWeight: 800, color: '#1A1A2E' }}>Under Maintenance</h1>
        <p style={{ marginTop: 12, maxWidth: 440, color: '#64748B', fontSize: 15, lineHeight: 1.7 }}>{maintenance}</p>
      </div>
    );
  }

  return children;
}
