// src/pages/user.jsx
import React, { useEffect, useState } from 'react';
import {
  getCurrentUser,
  getProfile,
  upsertProfile,
  updateEmail,
  updatePassword,
  getSubscription,
  updateSubscription
} from '../callAPI/callAPI';
import {Link} from "react-router-dom";
export default function User() {
  const [loading, setLoading] = useState(true);
  const [busyProfile, setBusyProfile] = useState(false);
  const [busyEmail, setBusyEmail] = useState(false);
  const [busyPwd, setBusyPwd] = useState(false);
  const [busyPlan, setBusyPlan] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);

  // form states
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState({
    username: '',
    first_name: '',
    last_name: '',
  });
  const [plan, setPlan] = useState('free'); // 'free' | 'monthly' | 'yearly'
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });

  // load initial data
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const user = await getCurrentUser();
        if (!user) {
          setErr('Non connecté.');
          setLoading(false);
          return;
        }
        setEmail(user.email || '');

        const p = await getProfile();
        if (p) setProfile({
          username: p.username || '',
          first_name: p.first_name || '',
          last_name: p.last_name || ''
        });

        const sub = await getSubscription();
        if (sub) setPlan(sub.plan || 'free');
      } catch (e) {
        setErr(e?.message || 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function flash(message, isOk = true) {
    setOk(isOk ? message : null);
    setErr(!isOk ? message : null);
    setTimeout(() => { setOk(null); setErr(null); }, 2500);
  }

  // handlers
  async function onSaveProfile(e) {
    e.preventDefault();
    try {
      setBusyProfile(true);
      await upsertProfile(profile);
      flash('Profil mis à jour ✅', true);
    } catch (e) {
      flash(e?.message || 'Erreur profil', false);
    } finally {
      setBusyProfile(false);
    }
  }

  async function onSaveEmail(e) {
    e.preventDefault();
    try {
      setBusyEmail(true);
      await updateEmail(email);
      flash('Email mis à jour (vérifie ta boîte) ✉️', true);
    } catch (e) {
      flash(e?.message || 'Erreur email', false);
    } finally {
      setBusyEmail(false);
    }
  }

  async function onSavePassword(e) {
    e.preventDefault();
    if (!pwd.next || pwd.next.length < 6) return flash('Mot de passe trop court (min 6)', false);
    if (pwd.next !== pwd.confirm) return flash('Confirmation différente', false);
    try {
      setBusyPwd(true);
      await updatePassword(pwd.next);
      setPwd({ current: '', next: '', confirm: '' });
      flash('Mot de passe mis à jour 🔒', true);
    } catch (e) {
      flash(e?.message || 'Erreur mot de passe', false);
    } finally {
      setBusyPwd(false);
    }
  }

  async function onSavePlan(e) {
    e.preventDefault();
    try {
      setBusyPlan(true);
      await updateSubscription(plan);
      flash('Abonnement mis à jour 🎉', true);
    } catch (e) {
      flash(e?.message || 'Erreur abonnement', false);
    } finally {
      setBusyPlan(false);
    }
  }

  return (
    <div className="user_page_container container">
      <h1>Mon compte</h1>
      <Link to="/" className="backToHome">
        ← Retour à l’accueil
      </Link>

      {loading ? (
        <p className="text-muted mt-2">Chargement…</p>
      ) : (
        <>
          {ok && <div className="card mb-3" role="status">{ok}</div>}
          {err && <div className="card mb-3" style={{ color: 'var(--color-progress-overdue)' }}>{err}</div>}

          {/* Profil */}
          <section className="card mb-3">
            <h2 className="section-title">Profil</h2>
            <form className="form" onSubmit={onSaveProfile}>
              <label>Pseudo
                <input value={profile.username}
                       onChange={e => setProfile(p => ({ ...p, username: e.target.value }))} />
              </label>
              <label>Prénom
                <input value={profile.first_name}
                       onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))} />
              </label>
              <label>Nom
                <input value={profile.last_name}
                       onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))} />
              </label>
              <div className="actions">
                <button className="btn btn--primary" disabled={busyProfile}>
                  {busyProfile ? 'Enregistrement…' : 'Enregistrer le profil'}
                </button>
              </div>
            </form>
          </section>

          {/* Email */}
          <section className="card mb-3">
            <h2 className="section-title">Adresse e-mail</h2>
            <form className="form" onSubmit={onSaveEmail}>
              <label>Nouvel e-mail
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                <span className="hint">Tu recevras un lien de confirmation.</span>
              </label>
              <div className="actions">
                <button className="btn" disabled={busyEmail}>
                  {busyEmail ? 'Mise à jour…' : 'Mettre à jour l’e-mail'}
                </button>
              </div>
            </form>
          </section>

          {/* Mot de passe */}
          <section className="card mb-3">
            <h2 className="section-title">Mot de passe</h2>
            <form className="form" onSubmit={onSavePassword}>
              {/* (current non requis si tu utilises les magic links) */}
              {/* <label>Mot de passe actuel
                <input type="password" value={pwd.current}
                       onChange={e => setPwd(p => ({ ...p, current: e.target.value }))} />
              </label> */}
              <label>Nouveau mot de passe
                <input type="password" value={pwd.next}
                       onChange={e => setPwd(p => ({ ...p, next: e.target.value }))} minLength={6} />
              </label>
              <label>Confirmer
                <input type="password" value={pwd.confirm}
                       onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} minLength={6} />
              </label>
              <div className="actions">
                <button className="btn" disabled={busyPwd}>
                  {busyPwd ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
                </button>
              </div>
            </form>
          </section>

          {/* Abonnement */}
          <section className="card">
            <h2 className="section-title">Abonnement</h2>
            <form className="form" onSubmit={onSavePlan}>
              <label>
                <input type="radio" name="plan" value="free"
                       checked={plan === 'free'} onChange={() => setPlan('free')} />
                Gratuit
              </label>
              <label>
                <input type="radio" name="plan" value="monthly"
                       checked={plan === 'monthly'} onChange={() => setPlan('monthly')} />
                Mensuel
              </label>
              <label>
                <input type="radio" name="plan" value="yearly"
                       checked={plan === 'yearly'} onChange={() => setPlan('yearly')} />
                Annuel
              </label>
              <div className="actions">
                <button className="btn btn--primary" disabled={busyPlan}>
                  {busyPlan ? 'Enregistrement…' : 'Enregistrer l’abonnement'}
                </button>
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
