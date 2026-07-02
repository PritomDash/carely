import React from 'react';
import AppFooter from '../components/AppFooter';

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
      <span style={{ fontSize:24 }}>💙</span>
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
    title: '1. About Carely',
    icon: '🏢',
    content: 'Carely is a technology marketplace platform that connects customers with independent care professionals in Bangladesh. Carely is strictly a platform provider only. Carely is NOT and shall never be considered an employer, recruitment agency, staffing agency, labor contractor, or service provider. Carely has no employment relationship with any professional listed on the platform.'
  },
  {
    title: '2. Complete Disclaimer of Responsibility',
    icon: '⚠️',
    content: 'Carely expressly disclaims all responsibility and shall not be liable under any circumstances for: (a) the quality, standard, safety, or outcome of any care service arranged through the platform; (b) any physical injury, illness, disability, or death of any person; (c) any theft, loss, damage to, or destruction of property; (d) any financial loss, fraud, or monetary dispute between users; (e) any failure of a professional to arrive, complete work, behave appropriately, or fulfill any commitment; (f) any false, inaccurate, misleading, or fraudulent information provided by any user; (g) the authenticity, validity, or currency of any document, certificate, or credential uploaded to the platform; (h) any interaction, transaction, or dispute that occurs between users whether on or off the platform; (i) any payment dispute or non-payment between customers and professionals; (j) any emotional, psychological, or reputational harm; (k) any actions or omissions of any professional when providing services; (l) any harm arising from a professional entering a customer home or premises.'
  },
  {
    title: '3. No Document Verification',
    icon: '📄',
    content: 'Carely does not verify, authenticate, validate, or guarantee the accuracy of any document, certificate, registration, or credential uploaded by any professional. All documents are entirely self-reported by professionals. The presence of a document on a professional profile does not mean Carely has checked or approved it. Customers are solely responsible for conducting their own verification of all professional credentials, identity, and background before engaging any professional.'
  },
  {
    title: '4. Customer Sole Responsibility',
    icon: '👤',
    content: 'By using Carely to find and engage a professional you accept that: you are making an independent hiring decision entirely at your own risk; you are responsible for verifying the professional identity, credentials, and suitability; you are responsible for the safety of your home, family, and possessions; Carely has no involvement in or responsibility for the services performed; any payment made to a professional is entirely between you and the professional.'
  },
  {
    title: '5. Professional Independent Status',
    icon: '💼',
    content: 'All professionals on Carely are independent workers. They are not employees, contractors, agents, or representatives of Carely. Carely does not direct, control, supervise, train, or manage any professional. Each professional is solely responsible for: their own conduct and behavior; the quality and safety of services they provide; compliance with all applicable Bangladesh laws and regulations; their own tax obligations including TIN registration; maintaining valid professional licenses and registrations where required by law.'
  },
  {
    title: '6. Indemnification',
    icon: '🛡️',
    content: 'You agree to fully indemnify, defend, and hold harmless Carely, its owners, directors, officers, employees, and agents from and against any and all claims, demands, losses, liabilities, damages, costs, and expenses (including reasonable legal fees) arising from or relating to: your use of the platform; any service arranged through the platform; your interaction with any other user; any breach of these terms; any violation of any law or the rights of any third party.'
  },
  {
    title: '7. Bookings and Payments',
    icon: '📅',
    content: 'Carely does not process, hold, transfer, or guarantee any payment between customers and professionals. All payment arrangements are made directly between customers and professionals outside the platform. Carely has no responsibility for payment disputes, non-payment, overcharging, or any other financial matter between users. There are no cancellation fees or penalties charged by Carely.'
  },
  {
    title: '8. Credit System',
    icon: '💳',
    content: 'Professionals may purchase credits to use certain platform features. Credits are non-transferable and non-refundable once used to accept a booking. Carely reserves the right to change credit pricing and availability at any time.'
  },
  {
    title: '9. Limitation of Liability',
    icon: '⚖️',
    content: "To the maximum extent permitted by the laws of Bangladesh, Carely's total liability to any user for any claim arising from use of the platform is strictly limited to BDT 1,000 (one thousand taka) regardless of the nature or basis of the claim. This limitation applies even if Carely has been advised of the possibility of such damages."
  },
  {
    title: '10. Suspension and Termination',
    icon: '🚫',
    content: 'Carely reserves the right to suspend, restrict, or permanently terminate any user account at any time for any reason without notice or liability including but not limited to violations of these terms, suspicious activity, fraud, or behavior harmful to other users or the platform.'
  },
  {
    title: '11. Force Majeure',
    icon: '🌪️',
    content: 'Carely is not liable for any failure or delay in providing services due to circumstances beyond our reasonable control including internet outages, server failures, cyber attacks, natural disasters, pandemics, government actions, power failures, or any other force majeure event.'
  },
  {
    title: '12. Changes to Terms',
    icon: '📝',
    content: 'Carely may update these terms at any time. Continued use of the platform after changes are posted constitutes acceptance of the updated terms. It is your responsibility to review these terms periodically.'
  },
  {
    title: '13. Governing Law and Jurisdiction',
    icon: '🇧🇩',
    content: 'These terms are governed exclusively by the laws of Bangladesh. Any dispute arising from these terms or use of the platform shall be subject to the exclusive jurisdiction of the courts of Bangladesh.'
  },
  {
    title: '14. Entire Agreement',
    icon: '📜',
    content: 'These terms together with the Privacy Policy constitute the entire agreement between you and Carely regarding use of the platform and supersede all prior agreements, representations, or understandings.'
  },
  {
    title: '15. Contact',
    icon: '📞',
    content: 'For questions about these terms contact us through the in-app support chat. By creating an account and using Carely you confirm that you have read, understood, and agree to be bound by these terms and conditions.'
  },
];

export default function Terms() {
  return (
    <div style={{ minHeight: '100vh', background: '#F7FAFF' }}>
      <PublicNavbar />
      <div style={{ maxWidth: 860, margin: '40px auto', padding: '0 20px 60px' }}>

        <div className="legal-header" style={{ background: 'linear-gradient(135deg,#2B7FFF,#60A5FA)', borderRadius: 20, padding: '40px 48px', color: 'white', marginBottom: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Terms & Conditions</h1>
          <p style={{ opacity: 0.9, fontSize: 15 }}>Effective date: January 2025 | Governed by Bangladesh Law</p>
        </div>

        <div style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: 14, padding: '20px 24px', marginBottom: 28 }}>
          <p style={{ color: '#1E40AF', fontSize: 14, lineHeight: 1.8, margin: 0, fontWeight: 500 }}>
            📋 By creating an account or using Carely you automatically agree to these Terms and Conditions.
            Please read them carefully. These terms protect both users and the platform.
          </p>
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
