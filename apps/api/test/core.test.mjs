import assert from 'node:assert/strict';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/mailflow-test';
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-jwt-signing';
process.env.ENCRYPTION_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:4000/api/google/callback';

const [{ createAuthorizationUrl }, { analyzeContactImport }, { extractVariables, renderPersonalization }, { generatedTemplatesSchema }, { createOAuthState, signAccessToken, verifyAccessToken, verifyOAuthState, createUnsubscribeToken, verifyUnsubscribeToken }, { decryptSecret, encryptSecret }, { controlledSchedule, isWithinSendingWindow }, { classifyProviderError }] = await Promise.all([
  import('../dist/modules/senders/google-oauth.service.js'),
  import('../dist/modules/contacts/contact-import.service.js'),
  import('../dist/modules/templates/personalization.service.js'),
  import('../dist/modules/templates/template.schemas.js'),
  import('../dist/common/utils/jwt.js'),
  import('../dist/common/utils/crypto.js'),
  import('../dist/modules/campaigns/scheduling.service.js'),
  import('../dist/modules/campaigns/provider-risk.service.js')
]);

test('Phase 1: JWT sessions are signed and verified', () => {
  const token = signAccessToken({ userId: 'user-123', email: 'alex@example.com' });
  const payload = verifyAccessToken(token);
  assert.equal(payload.userId, 'user-123');
  assert.equal(payload.email, 'alex@example.com');
});

test('Phase 2: OAuth state is bound and Gmail authorization asks for offline send access', () => {
  const state = createOAuthState('user-123');
  assert.equal(verifyOAuthState(state).userId, 'user-123');
  const url = new URL(createAuthorizationUrl(state));
  assert.equal(url.searchParams.get('access_type'), 'offline');
  assert.match(url.searchParams.get('scope') ?? '', /gmail\.send/);
  assert.equal(url.searchParams.get('state'), state);
});

test('Phase 2: encrypted secrets round-trip and do not remain plaintext', () => {
  const cipher = encryptSecret('refresh-token-value');
  assert.notEqual(cipher, 'refresh-token-value');
  assert.equal(decryptSecret(cipher), 'refresh-token-value');
});

test('Phase 3: parser detects columns and rejects invalid and duplicate records', () => {
  const file = { originalname: 'prospects.csv', buffer: Buffer.from('First Name,Email,Company,Industry\nAda,ada@example.com,Acme,Analytics\n,grace@example.com,Byte,Cloud\nInvalid,not-an-email,Nope,Other\nAda again,ada@example.com,Acme,Analytics\n') };
  const { mapping, normalized } = analyzeContactImport(file);
  assert.equal(mapping.email, 'Email');
  assert.equal(mapping.firstName, 'First Name');
  assert.deepEqual(normalized.summary, { rowsRead: 4, valid: 2, invalid: 1, duplicate: 1, incomplete: 1, existing: 0, readyToImport: 2 });
  assert.equal(normalized.contacts[0].customFields.Industry, 'Analytics');
});

test('Phase 4: personalization uses approved variables, custom fields, and safe fallbacks', () => {
  const source = 'Hi {{first_name}} at {{company}} — {{industry}} / {{unknown}}';
  assert.deepEqual(extractVariables(source), ['first_name', 'company', 'industry', 'unknown']);
  const result = renderPersonalization(source, { firstName: '', company: '', customFields: { industry: 'SaaS' } });
  assert.equal(result.rendered, 'Hi there at your team — SaaS / ');
  assert.deepEqual(result.missingVariables, ['first_name', 'company', 'unknown']);
});

test('Phase 4: generated template payload must contain exactly five valid templates', () => {
  const template = { approach: 'Concise', subject: 'Hello {{first_name}}', body: 'Hi {{first_name}},\n\nWould a short conversation be useful?', variables: ['first_name'] };
  assert.equal(generatedTemplatesSchema.parse({ templates: Array.from({ length: 5 }, () => template) }).templates.length, 5);
  assert.throws(() => generatedTemplatesSchema.parse({ templates: [template] }));
});

test('Phase 5: controlled scheduler spreads jobs inside the configured allowed window', () => {
  const schedule = { startAt: new Date('2026-08-17T08:00:00Z'), timezone: 'UTC', days: [1], windowStart: '09:00', windowEnd: '16:00', dailyLimit: 10 };
  const planned = controlledSchedule(schedule, 3, new Date('2026-08-17T08:30:00Z'));
  assert.equal(planned.length, 3);
  assert.ok(planned.every((time) => time >= new Date('2026-08-17T09:00:00Z') && time <= new Date('2026-08-17T16:00:00Z')));
  assert.ok(planned[0] < planned[1] && planned[1] < planned[2]);
  assert.equal(isWithinSendingWindow(schedule, new Date('2026-08-17T10:00:00Z')), true);
  assert.equal(isWithinSendingWindow(schedule, new Date('2026-08-17T18:00:00Z')), false);
});

test('Phase 6: unsubscribe tokens are signed, scoped, and recover recipient identity', () => {
  const token = createUnsubscribeToken({ userId: 'user-123', email: 'recipient@example.com', campaignId: 'campaign-123' });
  assert.deepEqual(verifyUnsubscribeToken(token).email, 'recipient@example.com');
  assert.equal(verifyUnsubscribeToken(token).purpose, 'unsubscribe');
});

test('Phase 6: provider risk classification distinguishes auth, temporary, and restriction errors', () => {
  assert.equal(classifyProviderError({ code: 401, message: 'Invalid credentials' }), 'auth');
  assert.equal(classifyProviderError({ code: 429, message: 'Quota exceeded' }), 'temporary');
  assert.equal(classifyProviderError({ code: 403, message: 'Access restricted' }), 'restriction');
  assert.equal(classifyProviderError({ code: 400, message: 'Recipient address rejected: user unknown' }), 'hard_bounce');
});

test('Phase 7: Google authorization includes metadata-only scope for reply correlation', () => {
  const url = new URL(createAuthorizationUrl('reply-sync-state'));
  assert.match(url.searchParams.get('scope') ?? '', /gmail\.metadata/);
  assert.match(url.searchParams.get('scope') ?? '', /gmail\.send/);
});
