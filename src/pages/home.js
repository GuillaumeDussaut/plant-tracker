// src/pages/home.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  getSupabase,
  signOut,
  listPlants,
  createPlant,
  updatePlant,
  deletePlant,
  subscribePlants
} from '../callAPI/callAPI';
import {
  addDays,
  differenceInCalendarDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  format,
  parseISO
} from 'date-fns';
import { fr } from 'date-fns/locale';

// ------------------ Utils ------------------
function toISODate(d) {
  // format yyyy-MM-dd
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function computeProgress(plant, today = new Date()) {
  const start = parseISO(plant.start_date);
  const total = Math.max(1, Number(plant.duration_days || 0));
  const done = clamp(differenceInCalendarDays(today, start), 0, total);
  const remaining = total - done;
  const percent = Math.round((done / total) * 100);
  let status = 'early';
  if (percent >= 50 && percent < 80) status = 'mid';
  else if (percent >= 80 && percent < 100) status = 'late';
  else if (percent >= 100) status = 'overdue';
  return { percent: clamp(percent, 0, 100), done, remaining, status, endDate: addDays(start, total) };
}
function statusDotColor(status) {
  switch (status) {
    case 'early': return 'var(--color-progress-early)';
    case 'mid': return 'var(--color-progress-mid)';
    case 'late': return 'var(--color-progress-late)';
    default: return 'var(--color-progress-overdue)';
  }
}

// ------------------ UI atoms (no JSX) ------------------
function Badge(label, colorVar) {
  return React.createElement(
    'span',
    {
      className: 'badge',
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 10px',
        borderRadius: '9999px',
        background: 'var(--color-bg)',
        border: `1px solid var(--color-border)`,
        fontSize: '0.9rem'
      }
    },
    React.createElement('span', {
      style: {
        width: 10, height: 10, borderRadius: '50%',
        background: colorVar
      }
    }),
    label
  );
}

function ProgressBar(percent, status) {
  return React.createElement(
    'div',
    { className: 'progress', style: { height: 6, background: 'var(--color-border)', borderRadius: 6, overflow: 'hidden' } },
    React.createElement('div', {
      className: 'progress-bar',
      style: {
        width: `${percent}%`,
        height: '100%',
        background: statusDotColor(status),
        transition: 'width .3s ease'
      }
    })
  );
}

// ------------------ Home ------------------
export default function Home() {
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [user, setUser] = useState(null);

  // data
  const [plants, setPlants] = useState([]);
  const [loadingPlants, setLoadingPlants] = useState(false);
  const [err, setErr] = useState(null);

  // calendar state
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  // quick add form
  const [qName, setQName] = useState('');
  const [qStart, setQStart] = useState(toISODate(new Date()));
  const [qDuration, setQDuration] = useState(90);
  const [qBusy, setQBusy] = useState(false);

  // auth init + listener
  useEffect(() => {
    let unsub = null;
    const supabase = getSupabase();

    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user ?? null);
      setLoadingAuth(false);

      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
      unsub = () => sub.subscription.unsubscribe();
    })();

    return () => { if (unsub) unsub(); };
  }, []);

  // fetch plants when user set
  useEffect(() => {
    let off = null;
    if (!user) {
      setPlants([]);
      return;
    }
    (async () => {
      try {
        setLoadingPlants(true);
        const rows = await listPlants();
        setPlants(rows || []);
        // realtime
        off = await subscribePlants(async () => {
          try {
            const latest = await listPlants();
            setPlants(latest || []);
          } catch (e) {
            // ignore
          }
        });
      } catch (e) {
        setErr(e?.message || 'Erreur au chargement');
      } finally {
        setLoadingPlants(false);
      }
    })();
    return () => { if (off) off(); };
  }, [user]);

  // derived
  const stats = useMemo(() => {
    const t = new Date();
    let early = 0, mid = 0, late = 0, overdue = 0;
    plants.forEach(p => {
      const { status } = computeProgress(p, t);
      if (status === 'early') early++;
      else if (status === 'mid') mid++;
      else if (status === 'late') late++;
      else overdue++;
    });
    return { early, mid, late, overdue, active: early + mid + late };
  }, [plants]);

  // render if not auth: show login section only
  if (loadingAuth) {
    return React.createElement('div', { className: 'min-h-screen', style: {
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}, 'Chargement…');
  }
  if (!user) {
    const Connexion = require('./connexion').default;
    return React.createElement(
      'div',
      { className: 'min-h-screen', style: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-muted)' } },
      React.createElement(Connexion)
    );
  }

  // ----- Connected dashboard -----
  const header = React.createElement(
    'div',
    { className: 'container' },
    React.createElement(
      'div',
      { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 16 } },
      // title + subtitle
      React.createElement(
        'div',
        null,
        React.createElement('h1', { style: { fontSize: 28, fontWeight: 700 } }, 'Suivi de croissance'),
        React.createElement('p', { className: 'text-muted', style: { fontSize: 13 } },
          'Calendrier, progression et listes synchronisés.')
      ),
      // stats badges
      React.createElement(
        'div',
        { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
        Badge(`En cours: ${stats.active}`, 'var(--color-progress-early)'),
        Badge(`À mi-parcours: ${stats.mid}`, 'var(--color-progress-mid)'),
        Badge(`Bientôt prêt: ${stats.late}`, 'var(--color-progress-late)'),
        Badge(`En retard: ${stats.overdue}`, 'var(--color-progress-overdue)')
      )
    )
  );

  // Calendar card
  const calendar = React.createElement(
    'div',
    { className: 'card' },
    // toolbar
    React.createElement(
      'div',
      { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
      React.createElement('button', {
        className: 'btn',
        onClick: () => setMonthCursor(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)),
        style: {
          background: 'var(--color-bg)', color: 'var(--color-text)',
          border: '1px solid var(--color-border)'
        }
      }, '◀ Mois précédent'),
      React.createElement('div', { style: { fontWeight: 600 } },
        format(monthCursor, 'LLLL yyyy', { locale: fr })
      ),
      React.createElement('button', {
        className: 'btn',
        onClick: () => setMonthCursor(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)),
        style: {
          background: 'var(--color-bg)', color: 'var(--color-text)',
          border: '1px solid var(--color-border)'
        }
      }, 'Mois suivant ▶')
    ),
    // weekdays header
    React.createElement(
      'div',
      { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4, fontSize: 12, color: 'var(--color-text-muted)' } },
      ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(lbl =>
        React.createElement('div', { key: lbl, style: { textAlign: 'center', padding: '6px 0' } }, lbl)
      )
    ),
    // grid
    (function renderGrid() {
      const start = startOfWeek(startOfMonth(monthCursor), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(monthCursor), { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start, end });

      // precompute ranges
      const ranges = plants.map(p => {
        const s = parseISO(p.start_date);
        const ed = addDays(s, Number(p.duration_days || 0));
        return { id: p.id, name: p.name, start: s, end: ed };
      });

      return React.createElement(
        'div',
        { style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 1,
          background: 'var(--color-border)',
          borderRadius: 12,
          overflow: 'hidden'
        }},
        days.map((day, idx) => {
          const other = !isSameMonth(day, monthCursor);
          const dots = ranges.filter(r => day >= r.start && day <= r.end);
          return React.createElement(
            'div',
            { key: idx, style: { background: other ? '#F4F6F8' : 'var(--color-bg)', minHeight: 90, padding: 8 } },
            React.createElement('div', {
              style: { fontSize: 12, color: other ? '#C0C6CC' : 'var(--color-text-muted)' }
            }, format(day, 'd', { locale: fr })),
            React.createElement('div', { style: { display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 } },
              dots.slice(0, 4).map(d =>
                React.createElement('span', {
                  key: d.id,
                  title: `${d.name} · ${toISODate(day)}`,
                  className: `calendar__dot dot-${(parseInt(d.id, 36) % 7) + 1}`
                })
              ),
              dots.length > 4 ? React.createElement('span', { style: { fontSize: 10, color: '#98A2A8' } }, `+${dots.length - 4}`) : null
            )
          );
        })
      );
    })(),
    // legend
    React.createElement(
      'div',
      { style: { display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12, fontSize: 12, color: 'var(--color-text-muted)' } },
      ['early','mid','late','overdue'].map(s =>
        React.createElement('span', { key: s, style: { display: 'inline-flex', alignItems: 'center', gap: 8 } },
          React.createElement('i', { style: { width: 10, height: 10, borderRadius: '50%', display: 'inline-block', background: statusDotColor(s) } }),
          s === 'early' ? 'Début → mi-parcours'
          : s === 'mid' ? 'Mi-parcours → 80%'
          : s === 'late' ? '80% → 100%'
          : 'Au-delà de l’estimation'
        )
      )
    )
  );

  // Quick add card
  async function onQuickAdd(e) {
    e.preventDefault();
    if (!qName || !qStart || !qDuration) return;
    try {
      setQBusy(true);
      await createPlant({ name: qName, startDate: qStart, durationDays: Number(qDuration), notes: '' });
      const rows = await listPlants();
      setPlants(rows || []);
      setQName('');
      setQStart(toISODate(new Date()));
      setQDuration(90);
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e?.message || 'Erreur lors de la création');
    } finally {
      setQBusy(false);
    }
  }
  const quickAdd = React.createElement(
    'div',
    { className: 'card' },
    React.createElement('h2', { style: { fontWeight: 600, marginBottom: 8 } }, 'Ajouter une plante'),
    React.createElement(
      'form',
      { onSubmit: onQuickAdd, style: { display: 'grid', gap: 8 } },
      // name
      React.createElement('label', { className: 'text-sm' },
        'Nom',
        React.createElement('input', {
          className: 'mt-1',
          value: qName,
          onChange: (e) => setQName(e.target.value),
          placeholder: 'Ex: Balcony #1',
          required: true
        })
      ),
      // start
      React.createElement('label', { className: 'text-sm' },
        'Date de plantation',
        React.createElement('input', {
          type: 'date',
          className: 'mt-1',
          value: qStart,
          onChange: (e) => setQStart(e.target.value),
          required: true
        })
      ),
      // duration
      React.createElement('label', { className: 'text-sm' },
        'Durée estimée (jours)',
        React.createElement('input', {
          type: 'number',
          min: 1,
          className: 'mt-1',
          value: qDuration,
          onChange: (e) => setQDuration(e.target.value),
          required: true
        })
      ),
      React.createElement('button', {
        type: 'submit',
        disabled: qBusy,
        style: {
          background: 'var(--color-primary)', color: 'var(--color-bg)',
          borderRadius: 12, padding: '10px 14px', fontWeight: 600
        }
      }, qBusy ? 'Ajout…' : 'Ajouter')
    )
  );

  // Plant list card
  function plantCard(p) {
    const prog = computeProgress(p, new Date());
    const endIso = toISODate(prog.endDate);
    return React.createElement(
      'div',
      { key: p.id, className: 'card', style: { padding: 12 } },
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 } },
        React.createElement(
          'div',
          null,
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 } },
            React.createElement('span', { style: { width: 10, height: 10, borderRadius: '50%', background: statusDotColor(prog.status) } }),
            p.name
          ),
          React.createElement('div', { className: 'text-muted', style: { fontSize: 12 } },
            `Début: ${p.start_date} · Fin prévue: ${endIso}`
          )
        ),
        React.createElement('button', {
          onClick: async () => {
            if (!window.confirm('Supprimer cette plante ?')) return;
            try {
              await deletePlant(p.id);
              const rows = await listPlants();
              setPlants(rows || []);
            } catch (e) {
              // eslint-disable-next-line no-alert
              alert(e?.message || 'Erreur suppression');
            }
          },
          style: { color: 'var(--color-progress-overdue)', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 8, padding: '4px 8px' }
        }, 'Supprimer')
      ),
      React.createElement('div', { style: { marginTop: 8 } },
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 } },
          React.createElement('span', null, `${prog.done} j`),
          React.createElement('span', null, prog.remaining >= 0 ? `${prog.remaining} j restants` : `${Math.abs(prog.remaining)} j de retard`)
        ),
        ProgressBar(prog.percent, prog.status)
      ),
      React.createElement('div', { style: { marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--color-text-muted)' } },
        React.createElement('label', null, 'Durée (j) ',
          React.createElement('input', {
            type: 'number',
            min: 1,
            value: p.duration_days,
            onChange: async (e) => {
              try {
                const val = Number(e.target.value);
                await updatePlant(p.id, { durationDays: val });
                const rows = await listPlants();
                setPlants(rows || []);
              } catch (er) {
                // eslint-disable-next-line no-alert
                alert(er?.message || 'Erreur mise à jour');
              }
            },
            style: { width: 80, marginLeft: 6 }
          })
        ),
        React.createElement('label', null, 'Début ',
          React.createElement('input', {
            type: 'date',
            value: p.start_date,
            onChange: async (e) => {
              try {
                await updatePlant(p.id, { startDate: e.target.value });
                const rows = await listPlants();
                setPlants(rows || []);
              } catch (er) {
                // eslint-disable-next-line no-alert
                alert(er?.message || 'Erreur mise à jour');
              }
            },
            style: { marginLeft: 6 }
          })
        )
      )
    );
  }

  const plantList = React.createElement(
    'div',
    { className: 'card' },
    React.createElement('h2', { style: { fontWeight: 600, marginBottom: 8 } }, 'Mes plantes'),
    loadingPlants
      ? React.createElement('div', { className: 'text-muted' }, 'Chargement…')
      : (plants.length
          ? React.createElement('div', { style: { display: 'grid', gap: 10 } }, plants.map(plantCard))
          : React.createElement('div', { className: 'text-muted' }, 'Aucune plante. Ajoute-en une.'))
  );

  // layout
  return React.createElement(
    'div',
    { className: 'min-h-screen', style: { minHeight: '100vh', background: 'var(--color-bg-muted)' } },
    React.createElement(
      'div',
      { className: 'container' },
      // topbar
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 } },
        React.createElement('div', null), // placeholder align
        React.createElement('button', {
          onClick: async () => {
            try { await signOut(); window.location.reload(); }
            catch (e) { alert(e?.message || 'Erreur lors de la déconnexion'); }
          },
          style: { background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '8px 12px' }
        }, 'Se déconnecter')
      ),
      header,
      React.createElement(
        'div',
        { className: 'grid', style: { display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 16 } },
        React.createElement('div', null, calendar),
        React.createElement('div', null,
          quickAdd,
          React.createElement('div', { style: { height: 16 } }),
          plantList
        )
      ),
      err ? React.createElement('div', { style: { marginTop: 12, color: 'var(--color-progress-overdue)' } }, err) : null
    )
  );
}

