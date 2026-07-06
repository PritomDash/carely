import React from 'react';
import AppFooter from '../components/AppFooter';
import CarelyLogo from '../components/CarelyLogo';

const PublicNavbar = () => (
  <nav style={{
    background: '#FFFFFF',
    borderBottom: '1px solid #E8EDF3',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    padding: '0 28px',
    height: 60,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  }}>
    <a href="/" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none' }}>
      <CarelyLogo size={28} />
      <span style={{ fontSize:20, fontWeight:800, color:'#1A1A2E' }}>Carely</span>
    </a>
    <div style={{ display:'flex', gap:12 }}>
      <a href="/" style={{ padding:'8px 16px', color:'#64748B', fontSize:14, fontWeight:500, textDecoration:'none' }}>Home</a>
      <a href="/login" style={{ padding:'8px 20px', background:'#2B7FFF', color:'white', borderRadius:8, fontSize:14, fontWeight:700, textDecoration:'none' }}>Sign In</a>
    </div>
  </nav>
);

const SECTIONS = [
  {
    title: '1. What We Collect',
    icon: '📊',
    content: 'We collect: name, email address, phone number, profile information, location (division, district, thana), uploaded documents (stored securely), booking history, chat messages and notifications, and device/usage data.'
  },
  {
    title: '2. How We Use Your Data',
    icon: '⚙️',
    content: 'To operate the marketplace and match customers with professionals. To send booking confirmations and notifications. For platform safety and fraud prevention. To improve our services and user experience. We do NOT sell your personal data to third parties.'
  },
  {
    title: '3. Document Storage',
    icon: '📂',
    content: 'Documents uploaded by professionals (ID, certificates etc.) are stored securely on our servers. Documents are only visible to the professional themselves and Carely administrators for safety purposes. Documents older than 15 days may be automatically deleted to manage storage. Profile photos are retained longer than other documents. Carely does not share documents with customers or third parties.'
  },
  {
    title: '4. Chat Messages',
    icon: '💬',
    content: 'Messages sent through the Carely chat are stored to maintain conversation history and for dispute resolution if needed. Carely administrators can view messages for safety and compliance purposes. Phone numbers and emails shared in chat are the responsibility of the user who shares them.'
  },
  {
    title: '5. Data Sharing',
    icon: '🤝',
    content: 'When a booking is confirmed we share contact details (name and phone number) between the customer and professional to facilitate the service. We share data with service providers (hosting, email) under contractual safeguards. We may share data when required by Bangladesh law or to protect platform safety.'
  },
  {
    title: '6. Your Rights',
    icon: '✅',
    content: 'You may request access to your personal data. You may request deletion of your account and associated data subject to legal requirements. You can update your profile information at any time. To exercise these rights contact us through in-app support.'
  },
  {
    title: '7. Account Inactivity',
    icon: '⏰',
    content: 'Professional accounts that have been inactive (no login) for more than 3 months may have their uploaded documents automatically deleted to free storage space. The account itself remains active. Profile photos are retained.'
  },
  {
    title: '8. Cookies',
    icon: '🍪',
    content: 'We use cookies for authentication (keeping you logged in) and referral tracking (knowing who referred you to the platform). We do not use cookies for advertising tracking.'
  },
  {
    title: '9. Bangladesh Law',
    icon: '🇧🇩',
    content: 'This privacy policy is governed by the laws of Bangladesh including the Digital Security Act 2018 and applicable data protection regulations of the Bangladesh Telecommunication Regulatory Commission (BTRC).'
  },
  {
    title: '10. Contact',
    icon: '📞',
    content: 'Questions about privacy? Contact us through the in-app support chat. For terms of service see our Terms & Conditions page.'
  },
];

export default function Privacy() {
  return (
    <div style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <PublicNavbar />
      <div style={{ maxWidth: 860, margin: '40px auto', padding: '0 20px 60px' }}>

        <div className="legal-header" style={{ background: 'linear-gradient(135deg,#7C3AED,#A78BFA)', borderRadius: 20, padding: '40px 48px', color: 'white', marginBottom: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Privacy Policy</h1>
          <p style={{ opacity: 0.9, fontSize: 15 }}>Effective date: January 2025 | BTRC Compliant</p>
        </div>

        {SECTIONS.map((section, i) => (
          <div key={i} className="legal-section-card" style={{ background: 'white', border: '1px solid #E8EDF3', borderRadius: 14, padding: '20px 24px', marginBottom: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1A1A2E', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>{section.icon}</span> {section.title}
            </h2>
            <p style={{ fontSize: 14, color: '#4A5568', lineHeight: 1.8, margin: 0 }}>{section.content}</p>
          </div>
        ))}

      </div>
      <AppFooter />
    </div>
  );
}
