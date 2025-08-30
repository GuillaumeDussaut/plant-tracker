// src/pages/connexion.js
import React, { useMemo, useState } from 'react';
import { signInWithEmail, signInWithMagicLink } from '../callAPI/callAPI';

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function scorePassword(pw = '') {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

function PasswordMeter(props) {
  const score = props.score || 0;
  const steps = 4;
  const bars = Array.from({ length: steps }).map((_, i) => {
    const active = i < score;
    const bg = active
      ? (i >= 3
          ? 'var(--color-progress-early, #1F6F70)'
          : i === 2
          ? 'var(--color-progress-late, #F28C38)'
          : 'var(--color-progress-mid, #F5B82E)')
      : '#E5E5E5';
    return React.createElement('div', {
      key: i,
      className: 'h-1.5 flex-1 rounded-full',
      style: { background: bg }
    });
  });

  return React.createElement('div', { className: 'mt-2 flex gap-1', 'aria-hidden': 'true' }, bars);
}

export default function Connexion() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);

  const pwScore = useMemo(() => scorePassword(pw), [pw]);
  const canSubmit = validateEmail(email) && pw.length >= 8 && !loading;

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!validateEmail(email)) return setError('Adresse e-mail invalide.');
    if (pw.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères.');

    try {
      setLoading(true);
      await signInWithEmail(email, pw);
      // Redirige sur home
      window.location.replace('/');
    } catch (err) {
      setError(err?.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  async function onMagicLink(e) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!validateEmail(email)) return setError('Adresse e-mail invalide.');
    try {
      setLoading(true);
      await signInWithMagicLink(email);
      setNotice('Un lien magique a été envoyé à ton e-mail.');
    } catch (err) {
      setError(err?.message || 'Erreur lors de l’envoi du lien magique');
    } finally {
      setLoading(false);
    }
  }

  return React.createElement(
    'div',
    { className: 'w-full max-w-md bg-white rounded-2xl shadow p-6' },

    React.createElement('h1', {
      className: 'text-2xl font-semibold mb-1',
      style: { color: 'var(--color-text, #222222)' }
    }, 'Se connecter'),

    React.createElement('p', {
      className: 'text-sm mb-4',
      style: { color: 'var(--color-text-muted, #777777)' }
    }, 'Connecte-toi pour accéder à ton tableau de bord.'),

    notice && React.createElement('div', {
      className: 'mb-3 text-sm rounded-lg px-3 py-2',
      style: { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }
    }, notice),

    error && React.createElement('div', {
      className: 'mb-3 text-sm rounded-lg px-3 py-2',
      style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5' }
    }, error),

    React.createElement(
      'form',
      { onSubmit, className: 'space-y-4', noValidate: true },

      React.createElement(
        'label',
        { className: 'block text-sm' },
        'E-mail',
        React.createElement('input', {
          type: 'email',
          autoComplete: 'email',
          className: 'mt-1 w-full rounded-xl border px-3 py-2 outline-none',
          placeholder: 'ton.email@example.com',
          value: email,
          onChange: (e) => setEmail(e.target.value),
          required: true
        })
      ),

      React.createElement(
        'label',
        { className: 'block text-sm' },
        'Mot de passe',
        React.createElement('input', {
          type: 'password',
          autoComplete: 'current-password',
          className: 'mt-1 w-full rounded-xl border px-3 py-2 outline-none',
          value: pw,
          onChange: (e) => setPw(e.target.value),
          minLength: 8,
          required: true
        }),
        React.createElement(PasswordMeter, { score: pwScore })
      ),

      React.createElement('button', {
        type: 'submit',
        disabled: !canSubmit,
        className: 'w-full rounded-xl py-2 font-medium transition active:scale-[.99]',
        style: {
          background: 'var(--color-primary, #1F6F70)',
          color: 'var(--color-bg, #FFFFFF)',
          opacity: canSubmit ? 1 : 0.6,
          cursor: canSubmit ? 'pointer' : 'not-allowed'
        }
      }, loading ? 'Connexion…' : 'Se connecter'),

      React.createElement('button', {
        type: 'button',
        onClick: onMagicLink,
        className: 'w-full rounded-xl py-2 font-medium mt-2 border',
        style: { color: 'var(--color-primary, #1F6F70)', background: 'var(--color-bg, #FFFFFF)' }
      }, loading ? 'Envoi…' : 'Recevoir un lien magique')
    ),

    React.createElement('p', {
      className: 'text-sm mt-4',
      style: { color: 'var(--color-text-muted, #777777)' }
    },
      'Pas encore de compte ? ',
      React.createElement('a', {
        href: '#/inscription',
        className: 'underline',
        style: { color: 'var(--color-primary, #1F6F70)' }
      }, 'Créer un compte')
    )
  );
}

