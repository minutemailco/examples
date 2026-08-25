// Delivers verification emails through the MinuteMail API.
//
// The app acts as a normal API-key client: it resolves the recipient's
// mailbox ID from the address, then injects the mail. If the address is
// not a MinuteMail mailbox (a real address), we fall back to logging the
// verification link so the demo never dead-ends.

const { MINUTEMAIL_API_BASE, MINUTEMAIL_API_KEY, BASE_URL } = require('./config');

async function resolveMailboxId(address) {
  const res = await fetch(
    `${MINUTEMAIL_API_BASE}/v1/mailboxes?address=${encodeURIComponent(address)}`,
    { headers: { Authorization: `Bearer ${MINUTEMAIL_API_KEY}` } }
  );
  if (!res.ok) return null;
  const list = await res.json();
  const mailbox = Array.isArray(list) ? list[0] : list.mailboxes && list.mailboxes[0];
  return mailbox ? mailbox.id : null;
}

async function sendVerificationEmail(address, token) {
  const verifyUrl = `${BASE_URL}/verify/${token}`;
  const mailboxId = await resolveMailboxId(address);

  if (!mailboxId) {
    console.log(`[mail:fallback] ${address} is not a MinuteMail mailbox.`);
    console.log(`[mail:fallback] Verification link: ${verifyUrl}`);
    return { delivered: false };
  }

  const form = new FormData();
  form.append('sender', 'no-reply@signupflow.demo');
  form.append('subject', 'Verify your email address');
  form.append(
    'body',
    [
      'Welcome to SignupFlow!',
      '',
      'Please confirm your email address by following the link below:',
      '',
      verifyUrl,
      '',
      'If you did not create an account, you can ignore this message.',
    ].join('\n')
  );

  const res = await fetch(`${MINUTEMAIL_API_BASE}/v1/mailboxes/${mailboxId}/mails`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${MINUTEMAIL_API_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error(`[mail] inject failed (${res.status}): ${detail}`);
    console.log(`[mail:fallback] Verification link: ${verifyUrl}`);
    return { delivered: false };
  }

  console.log(`[mail] verification email delivered to ${address} (mailbox ${mailboxId})`);
  return { delivered: true };
}

module.exports = { sendVerificationEmail };
