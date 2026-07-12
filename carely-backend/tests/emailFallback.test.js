// Unit test for the email provider fallback loop, using Node's built-in
// test runner (no new dependency needed). Mocks @getbrevo/brevo to throw a
// 429-style rate-limit error and 'resend' to succeed, then asserts
// sendEmail() actually falls through to Resend and reports success via it -
// this is what a real Brevo daily-quota exhaustion looks like, and it's
// exactly the case that silently failed in production before the fallback
// loop's rate-limit handling was made explicit.
//
// Run with: node tests/emailFallback.test.js  (from carely-backend/)
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Substitute mocks into the module cache BEFORE emailService.js is required,
// so its own `require('@getbrevo/brevo')` / `require('resend')` calls
// resolve to these instead of making real network calls.
const brevoPath = require.resolve('@getbrevo/brevo');
const resendPath = require.resolve('resend');
const sendgridPath = require.resolve('@sendgrid/mail');

class MockBrevoRateLimitError extends Error {
  constructor() {
    super('Status code: 429\nBody: {"code":"limit_reached","message":"You have reached your daily sending quota. Please upgrade your account or wait until tomorrow to send more emails."}');
    this.statusCode = 429;
  }
}

require.cache[brevoPath] = {
  id: brevoPath,
  filename: brevoPath,
  loaded: true,
  exports: {
    BrevoClient: class MockBrevoClient {
      constructor() {
        this.transactionalEmails = {
          sendTransacEmail: async () => {
            throw new MockBrevoRateLimitError();
          },
        };
      }
    },
  },
};

require.cache[resendPath] = {
  id: resendPath,
  filename: resendPath,
  loaded: true,
  exports: {
    Resend: class MockResend {
      constructor() {
        this.emails = {
          send: async () => ({ data: { id: 'mock-resend-message-id' }, error: null }),
        };
      }
    },
  },
};

// SendGrid mock is never expected to be reached in this test (Resend
// should succeed first), but is stubbed anyway so requiring emailService.js
// doesn't attempt any real SDK initialization.
require.cache[sendgridPath] = {
  id: sendgridPath,
  filename: sendgridPath,
  loaded: true,
  exports: {
    setApiKey: () => {},
    send: async () => { throw new Error('SendGrid should not have been called'); },
  },
};

process.env.BREVO_API_KEY = 'mock-brevo-key';
process.env.RESEND_API_KEY = 'mock-resend-key';
delete process.env.SENDGRID_API_KEY;

const { sendEmail } = require(path.join(__dirname, '..', 'utils', 'emailService'));

test('Brevo rate-limit (429) falls through to Resend, which succeeds', async () => {
  const result = await sendEmail({
    to: 'test@example.com',
    subject: 'Fallback test',
    title: 'Fallback test',
    content: '<p>Testing fallback</p>',
  });

  assert.equal(result.success, true, 'sendEmail should report success once Resend succeeds');
  assert.equal(result.provider, 'resend', 'the successful provider should be Resend, not Brevo');
  assert.equal(result.id, 'mock-resend-message-id');
});

test('sendEmail never throws, even when a provider fails - the caller is never blocked', async () => {
  await assert.doesNotReject(() => sendEmail({
    to: 'test2@example.com',
    subject: 'Never throws',
    title: 'Never throws',
    content: '<p>Should not throw</p>',
  }));
});
