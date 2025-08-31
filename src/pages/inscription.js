// src/pages/inscription.js
import React, { useMemo, useState } from 'react';
import { signUpWithEmail } from '../callAPI/callAPI';
import LOGO from '../assets/logo.png';

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

function PasswordMeter({ score }) {
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

export default function Inscription() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);

  const pwScore = useMemo(() => scorePassword(pw), [pw]);
  const canSubmit = validateEmail(email) && pw.length >= 8 && pw === pw2 && !loading;

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!validateEmail(email)) return setError('Adresse e-mail invalide.');
    if (pw.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères.');
    if (pw !== pw2) return setError('Les mots de passe ne correspondent pas.');

    try {
      setLoading(true);
      await signUpWithEmail(email, pw);
      setNotice("Compte créé. Vérifie ta boîte mail pour confirmer l'adresse.");
      setEmail(''); setPw(''); setPw2('');
    } catch (err) {
      const msg = `${err?.message || 'Erreur inconnue'}`.toLowerCase();
      if (msg.includes('user already registered')) setError('Un compte existe déjà avec cet e-mail.');
      else setError(err?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return React.createElement(
    'div',
    { className: 'min-h-screen flex items-center justify-center bg-[#F9F9F9] p-6' },
    React.createElement(
      'div',
      { className: 'w-full max-w-md bg-white rounded-2xl shadow p-6' },
      // Titre
      React.createElement('div', { className: 'logo_container'},
         React.createElement('img', {
        src: LOGO,
        alt: 'PlantTracker Logo',
        className: 'w-12 h-12 mb-4 mx-auto logo_offline'
      }) 
      ),
      React.createElement('h1', {
        className: 'text-2xl font-semibold mb-1',
        style: { color: 'var(--color-text, #222222)' }
      }, 'Créer un compte'),
      React.createElement('p', {
        className: 'text-sm mb-4',
        style: { color: 'var(--color-text-muted, #777777)' }
      }, "Accède à tes plantes depuis n’importe où via Supabase."),

      // Notices
      notice && React.createElement('div', {
        className: 'mb-3 text-sm rounded-lg px-3 py-2',
        style: { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }
      }, notice),
      error && React.createElement('div', {
        className: 'mb-3 text-sm rounded-lg px-3 py-2',
        style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5' }
      }, error),

      // Form
      React.createElement(
        'form',
        { onSubmit, className: 'space-y-4', noValidate: true },
        // Email
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
            'aria-invalid': email && !validateEmail(email) ? 'true' : 'false',
            required: true
          })
        ),
        // Mot de passe
        React.createElement(
          'label',
          { className: 'block text-sm' },
          'Mot de passe',
          React.createElement('input', {
            type: 'password',
            autoComplete: 'new-password',
            className: 'mt-1 w-full rounded-xl border px-3 py-2 outline-none',
            value: pw,
            onChange: (e) => setPw(e.target.value),
            minLength: 8,
            required: true
          }),
          React.createElement(PasswordMeter, { score: pwScore }),
          React.createElement('p', {
            className: 'text-xs mt-1',
            style: { color: 'var(--color-text-muted, #777777)' }
          }, 'Au moins 8 caractères. Idéalement, mélange majuscules, chiffres et symboles.')
        ),
        // Confirmation
        React.createElement(
          'label',
          { className: 'block text-sm' },
          'Confirmer le mot de passe',
          React.createElement('input', {
            type: 'password',
            autoComplete: 'new-password',
            className: 'mt-1 w-full rounded-xl border px-3 py-2 outline-none',
            value: pw2,
            onChange: (e) => setPw2(e.target.value),
            required: true
          })
        ),
        // Bouton
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
        }, loading ? 'Création…' : 'Créer mon compte')
      ),

      // Lien connexion
      React.createElement('p', {
        className: 'text-sm mt-4',
        style: { color: 'var(--color-text-muted, #777777)' }
      },
        'Déjà inscrit ? ',
        React.createElement('a', {
          href: '/',
          className: 'underline',
          style: { color: 'var(--color-primary, #1F6F70)' }
        }, 'Se connecter')
      )
    )
  );
}

