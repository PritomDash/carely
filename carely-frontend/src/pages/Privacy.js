import React from 'react';
import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="page legal-page" style={{ maxWidth: 800 }}>
      <h1 style={{ marginBottom: 8 }}>Privacy Policy</h1>
      <p className="text-muted" style={{ marginBottom: 24 }}>Last updated: {new Date().getFullYear()}</p>

      <h2>1. What Data We Collect</h2>
      <p>When you use Carely, we collect the following categories of information:</p>
      <ul>
        <li><strong>Personal details:</strong> name, email address, and phone number.</li>
        <li><strong>Location:</strong> division, district, and thana used to match customers with nearby professionals.</li>
        <li><strong>Booking information:</strong> booking history, schedules, addresses, and payment amounts.</li>
        <li><strong>Messages:</strong> chat messages exchanged between customers, professionals, and admin support.</li>
        <li><strong>Verification documents:</strong> ID documents, passports, and professional certificates uploaded by professionals.</li>
      </ul>

      <h2>2. How We Use Your Data</h2>
      <p>
        We use the information collected solely to operate the Carely marketplace — matching customers with
        professionals, processing bookings, enabling in-app communication, calculating payouts in BDT, and
        providing customer support.
      </p>

      <h2>3. Document Storage</h2>
      <p>
        Documents uploaded by professionals (ID documents, passports, police clearances, certificates) are
        stored securely and are only accessible to Carely administrators for internal listing purposes.
        These documents are never shared publicly or displayed on any professional's public profile.
      </p>

      <h2>4. No Selling of Data</h2>
      <p>
        Carely does not sell, rent, or trade your personal data to third parties for marketing or any other
        purposes. Your data is used strictly to provide and improve the Carely service.
      </p>

      <h2>5. Data Sharing</h2>
      <p>
        Limited booking-related information (such as name and phone number) is shared between a customer
        and professional only once a booking is confirmed, so both parties can coordinate the service.
      </p>

      <h2>6. Your Rights</h2>
      <p>
        You have the right to access, correct, or delete your personal data. You may request deletion of
        your account and associated data at any time by contacting Carely support. Once verified, your
        account and personal data will be removed in accordance with applicable law, except where retention
        is required for legal or regulatory purposes.
      </p>

      <h2>7. Data Security</h2>
      <p>
        We take reasonable technical and organizational measures to protect your data against unauthorized
        access, alteration, disclosure, or destruction. However, no method of electronic storage or
        transmission is completely secure, and we cannot guarantee absolute security.
      </p>

      <h2>8. Governing Law</h2>
      <p>
        This Privacy Policy is governed by the laws of the People's Republic of Bangladesh, including
        applicable regulations issued by the Bangladesh Telecommunication Regulatory Commission (BTRC).
        By using Carely, you consent to the collection and use of your information as described in this
        policy.
      </p>

      <h2>9. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Continued use of Carely after changes are
        posted constitutes acceptance of the revised policy.
      </p>

      <div style={{ marginTop: 32 }}>
        <Link to="/" className="text-muted">Back to Home</Link>
      </div>
    </div>
  );
}
