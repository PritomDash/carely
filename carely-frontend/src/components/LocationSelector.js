import React, { useState, useEffect } from 'react';
import { getDivisions, getDistricts, getThanas } from '../utils/locations';

export default function LocationSelector({ value = {}, onChange, required = false }) {
  const [divisions] = useState(getDivisions());
  const [districts, setDistricts] = useState([]);
  const [thanas, setThanas] = useState([]);

  useEffect(() => {
    if (value.division) setDistricts(getDistricts(value.division));
    if (value.division && value.district) setThanas(getThanas(value.division, value.district));
  }, [value.division, value.district]);

  const handleChange = (field, val) => {
    const newVal = { ...value, [field]: val };
    if (field === 'division') { newVal.district = ''; newVal.thana = ''; }
    if (field === 'district') { newVal.thana = ''; }
    onChange(newVal);
  };

  const sel = { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, width: '100%', fontSize: 14 };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
      <div>
        <label style={{ fontSize: 13, color: '#374151', display: 'block', marginBottom: 4 }}>Division {required && <span style={{color:'red'}}>*</span>}</label>
        <select style={sel} value={value.division || ''} onChange={e => handleChange('division', e.target.value)} required={required}>
          <option value="">Select Division</option>
          {divisions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div>
        <label style={{ fontSize: 13, color: '#374151', display: 'block', marginBottom: 4 }}>District {required && <span style={{color:'red'}}>*</span>}</label>
        <select style={sel} value={value.district || ''} onChange={e => handleChange('district', e.target.value)} required={required} disabled={!value.division}>
          <option value="">Select District</option>
          {districts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div>
        <label style={{ fontSize: 13, color: '#374151', display: 'block', marginBottom: 4 }}>Thana / Area {required && <span style={{color:'red'}}>*</span>}</label>
        <select style={sel} value={value.thana || ''} onChange={e => handleChange('thana', e.target.value)} required={required} disabled={!value.district}>
          <option value="">Select Thana</option>
          {thanas.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
    </div>
  );
}
