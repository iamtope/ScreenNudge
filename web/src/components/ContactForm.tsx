'use client';

import { useState } from 'react';
import type { Dictionary } from '@/i18n/messages/en';
import { site } from '@/config/site';

export function ContactForm({ form }: { form: Dictionary['contact']['form'] }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const body = [message, '', `— ${name || ''}`.trim(), email ? `<${email}>` : ''].join('\n');
    const href =
      `mailto:${site.email}` +
      `?subject=${encodeURIComponent(subject || form.subjectDefault)}` +
      `&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="field">
        <label htmlFor="cf-name">{form.name}</label>
        <input id="cf-name" name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="cf-email">{form.email}</label>
        <input id="cf-email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="cf-subject">{form.subject}</label>
        <input id="cf-subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="cf-message">{form.message}</label>
        <textarea id="cf-message" name="message" value={message} onChange={(e) => setMessage(e.target.value)} required />
      </div>
      <button type="submit" className="btn btn-brass">
        {form.send}
      </button>
      <p className="form-hint">{form.hint}</p>
    </form>
  );
}
