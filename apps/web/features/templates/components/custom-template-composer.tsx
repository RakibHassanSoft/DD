'use client';

import { useState } from 'react';
import { createCustomTemplate } from '../templates.api';

export function CustomTemplateComposer() {
  const [values, setValues] = useState({ approach: 'Custom professional outreach', subject: '', body: '' }); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  async function save() { setBusy(true); setMessage(''); try { await createCustomTemplate(values); setValues({ approach: 'Custom professional outreach', subject: '', body: '' }); setMessage('Your template is saved and ready to choose for a campaign.'); window.dispatchEvent(new Event('mailflow:templates-changed')); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save your template.'); } finally { setBusy(false); } }
  return <section className="custom-template"><div className="section-heading"><div><span className="eyebrow">YOUR TEMPLATE LIBRARY</span><h2>Use your own email template</h2><p>Save a previous or hand-written professional template. It will appear alongside AI templates and can be selected for any campaign.</p></div></div><div className="custom-template-form"><label>Template name / approach<input value={values.approach} onChange={(event) => setValues({ ...values, approach: event.target.value })} /></label><label>Subject<input value={values.subject} onChange={(event) => setValues({ ...values, subject: event.target.value })} placeholder="A quick question about {{company}}" /></label><label>Email body<textarea value={values.body} onChange={(event) => setValues({ ...values, body: event.target.value })} placeholder={'Hi {{first_name}},\n\nI wanted to share…'} /></label><button className="button" disabled={busy || !values.approach || !values.subject || !values.body} onClick={save}>{busy ? 'Saving…' : 'Save my template'}</button></div>{message && <div className="message">{message}</div>}</section>;
}
