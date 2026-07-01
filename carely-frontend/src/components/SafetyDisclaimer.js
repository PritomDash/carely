import React from 'react';

export default function SafetyDisclaimer({ compact = false }) {
  if (compact) {
    return (
      <div style={{
        background: '#fef3c7', border: '1px solid #f59e0b',
        borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e'
      }}>
        <strong>⚠ Important:</strong> Carely is a marketplace only. Always verify professional
        documents yourself before hiring. Carely is not responsible for any service outcome.
      </div>
    );
  }

  return (
    <div style={{
      background: '#fef3c7', border: '1px solid #f59e0b',
      borderRadius: 10, padding: '16px 20px', margin: '16px 0'
    }}>
      <h4 style={{ margin: '0 0 8px', color: '#92400e', fontSize: 15 }}>
        ⚠ Important Safety Notice
      </h4>
      <ul style={{ margin: 0, paddingLeft: 18, color: '#78350f', fontSize: 13, lineHeight: 1.7 }}>
        <li>Carely is a marketplace platform only — we connect customers with independent professionals.</li>
        <li>We do not employ, train, or supervise any professional listed on this platform.</li>
        <li>Always verify a professional's documents yourself before allowing them into your home.</li>
        <li>Carely is not responsible for the conduct, quality, or safety of any service.</li>
        <li>Trust your own judgment — your family's safety is your responsibility.</li>
      </ul>
    </div>
  );
}
