import React from 'react';
import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="page legal-page" style={{ maxWidth: 800 }}>
      <h1 style={{ marginBottom: 8 }}>Terms & Conditions</h1>
      <p className="text-muted" style={{ marginBottom: 24 }}>Last updated: {new Date().getFullYear()}</p>

      <h2>1. Carely Is a Marketplace, Not an Employer</h2>
      <p>
        Carely operates solely as an online marketplace connecting customers seeking care services
        (Child Care, Aged Care, Nurse, and Physiotherapist) with independent professionals offering
        those services. Carely does not employ, train, supervise, or manage any professional listed
        on the platform.
      </p>

      <h2>2. Professionals Are Independent Workers</h2>
      <p>
        All professionals on Carely operate as independent contractors. They are not employees, agents,
        or representatives of Carely. Professionals set their own availability and rates, and are solely
        responsible for the quality and manner in which they perform their services.
      </p>

      <h2>3. Document Verification</h2>
      <p>
        Carely may request identity and professional documents from professionals for basic listing
        purposes, but Carely does not independently verify the authenticity of any document. Customers
        are solely responsible for verifying a professional's identity, qualifications, and documents
        themselves before allowing any professional into their home or around their family.
      </p>

      <h2>4. No Cancellation Fees</h2>
      <p>
        Carely does not charge cancellation fees to customers or professionals under any circumstance.
        Bookings may be cancelled by either party in accordance with the in-app cancellation options.
      </p>

      <h2>5. Dispute Window</h2>
      <p>
        Once a professional marks a job as done, the customer has a 24-hour window to confirm completion
        or raise a dispute. If no action is taken within 24 hours, the job is treated as confirmed and
        payment is released to the professional. Disputes raised after the 24-hour window may not be
        eligible for review.
      </p>

      <h2>6. Taxes</h2>
      <p>
        Professionals are independent contractors and are solely responsible for reporting and paying any
        applicable taxes on their earnings under the laws of Bangladesh, including but not limited to
        income tax obligations administered by the National Board of Revenue (NBR). Carely does not
        withhold or remit taxes on behalf of any professional.
      </p>

      <h2>7. Governing Law</h2>
      <p>
        These Terms & Conditions are governed by and construed in accordance with the laws of the
        People's Republic of Bangladesh. Any disputes arising from the use of Carely shall be subject to
        the exclusive jurisdiction of the courts of Bangladesh.
      </p>

      <h2>8. Limitation of Liability</h2>
      <p>
        Carely is not responsible for the conduct, actions, omissions, quality of service, or safety of
        any customer or professional using the platform. To the fullest extent permitted by law, Carely
        disclaims all liability for any direct, indirect, incidental, or consequential damages arising
        from bookings, services rendered, or interactions between customers and professionals facilitated
        through the platform. Use of Carely is at your own risk, and users are encouraged to exercise
        their own judgment when engaging with any professional or customer on the platform.
      </p>

      <h2>9. Changes to These Terms</h2>
      <p>
        Carely may update these Terms & Conditions from time to time. Continued use of the platform after
        changes are posted constitutes acceptance of the revised terms.
      </p>

      <div style={{ marginTop: 32 }}>
        <Link to="/" className="text-muted">Back to Home</Link>
      </div>
    </div>
  );
}
