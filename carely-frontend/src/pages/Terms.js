import React from 'react';
import AppNavbar from '../components/AppNavbar';
import AppFooter from '../components/AppFooter';

const SECTIONS = [
  {
    title: '1. What is Carely',
    icon: '🏢',
    content: 'Carely is a technology platform and marketplace that connects customers with independent care professionals in Bangladesh. Carely is NOT an employer, staffing agency, or service provider. We simply provide the platform for connection.'
  },
  {
    title: '2. Carely is Not Responsible For',
    icon: '⚠️',
    content: 'The quality, safety, or outcome of any service arranged through this platform. The authenticity or accuracy of any documents or credentials uploaded by professionals. Any injury, loss, damage, or dispute arising from a booking. The conduct or behavior of any user on or off the platform. Any agreement made between customer and professional outside this platform.'
  },
  {
    title: '3. Document Disclaimer',
    icon: '📄',
    content: 'Professionals may upload identity and credential documents to their profile. Carely does NOT verify, authenticate, or guarantee the accuracy of any uploaded document. Carely does not conduct background checks. All documents are self-reported by the professional. Customers must verify professional credentials themselves before hiring.'
  },
  {
    title: '4. Your Responsibility as a Customer',
    icon: '👤',
    content: "Before hiring any professional through Carely you must: review their uploaded documents yourself, conduct your own background verification if needed, meet in a safe place before allowing access to your home, and trust your own judgment. Your family's safety is your responsibility."
  },
  {
    title: '5. Your Responsibility as a Professional',
    icon: '💼',
    content: 'You are an independent worker and NOT an employee of Carely. You are responsible for your own taxes, TIN registration, and obligations under Bangladesh law. You must comply with all applicable Bangladesh laws and regulations.'
  },
  {
    title: '6. Bookings',
    icon: '📅',
    content: 'Customers submit booking requests which professionals can accept or decline. No cancellation fees or late fees are charged by Carely. Payment is arranged directly between customer and professional outside the app. Carely does not handle, hold, or process payments between customers and professionals.'
  },
  {
    title: '7. Credit System',
    icon: '💳',
    content: 'Professionals may purchase credits to use platform features such as accepting bookings. Credits are non-refundable once used. The credit system may be enabled or disabled by Carely at any time.'
  },
  {
    title: '8. Suspension',
    icon: '🚫',
    content: 'Carely may suspend or remove any account for violations of these terms, fraudulent activity, or any behavior that harms other users or the platform.'
  },
  {
    title: '9. Limitation of Liability',
    icon: '⚖️',
    content: "To the maximum extent permitted by Bangladesh law, Carely's total liability for any claim is limited to the amount of platform fees paid by that user in the 30 days before the claim. Carely disclaims all other warranties and liabilities."
  },
  {
    title: '10. Governing Law',
    icon: '🇧🇩',
    content: 'These terms are governed by the laws of Bangladesh. Any disputes shall be resolved under Bangladesh jurisdiction.'
  },
  {
    title: '11. Contact',
    icon: '📞',
    content: 'Questions about these terms? Contact us through the in-app support chat or visit our Privacy Policy page.'
  },
];

export default function Terms() {
  return (
    <div style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <AppNavbar />
      <div style={{ maxWidth: 860, margin: '40px auto', padding: '0 20px 60px' }}>

        <div style={{ background: 'linear-gradient(135deg,#2B7FFF,#60A5FA)', borderRadius: 20, padding: '40px 48px', color: 'white', marginBottom: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Terms & Conditions</h1>
          <p style={{ opacity: 0.9, fontSize: 15 }}>Effective date: January 2025 | Governed by Bangladesh Law</p>
        </div>

        {SECTIONS.map((section, i) => (
          <div key={i} style={{ background: 'white', border: '1px solid #E8EDF3', borderRadius: 14, padding: '20px 24px', marginBottom: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1A1A2E', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>{section.icon}</span> {section.title}
            </h2>
            <p style={{ fontSize: 14, color: '#4A5568', lineHeight: 1.8, margin: 0 }}>{section.content}</p>
          </div>
        ))}

        <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 14, padding: '20px 24px', marginTop: 8 }}>
          <h3 style={{ color: '#991B1B', fontWeight: 700, marginBottom: 8 }}>⚠️ Important Safety Reminder</h3>
          <p style={{ color: '#7F1D1D', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            Carely is a marketplace platform only. We connect customers with independent professionals.
            Always verify a professional's identity and documents yourself before allowing them into your home
            or trusting them with your family members. Carely is not responsible for any service outcome.
          </p>
        </div>

      </div>
      <AppFooter />
    </div>
  );
}
