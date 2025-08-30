import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../assets/logo.png";
import {
  getSupabase,
  signOut,
  listPlants,
  createPlant,
  updatePlant,
  deletePlant,
  subscribePlants,
} from "../callAPI/callAPI";

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
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";

import Connexion from "./connexion";

/* ------------------ Utils (sans style) ------------------ */
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
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
  let status = "early";
  if (percent >= 50 && percent < 80) status = "mid";
  else if (percent >= 80 && percent < 100) status = "late";
  else if (percent >= 100) status = "overdue";
  return {
    percent: clamp(percent, 0, 100),
    done,
    remaining,
    status,
    endDate: addDays(start, total),
    total,
    doneAbs: done,
  };
}
function statusClass(s) {
  if (s === "mid") return "mid";
  if (s === "late") return "late";
  if (s === "overdue") return "overdue";
  return "early";
}

/* ------------------ Composants purs (tout style via classes) ------------------ */
function Badge({ label, dotClass }) {
  return (
    <span className="badge">
      <span className={`badge__dot ${dotClass}`} />
      {label}
    </span>
  );
}

function CalendarCard({ plants, monthCursor, setMonthCursor }) {
  const start = startOfWeek(startOfMonth(monthCursor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(monthCursor), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  const ranges = useMemo(
    () =>
      plants.map((p) => {
        const s = parseISO(p.start_date);
        const ed = addDays(s, Number(p.duration_days || 0));
        const colorIdx = (parseInt(p.id, 36) % 7) + 1;
        return { id: p.id, name: p.name, start: s, end: ed, colorIdx };
      }),
    [plants]
  );

  return (
    <div className="card calendar">
      <div className="calendar__toolbar">
        <button
          className="btn"
          onClick={() =>
            setMonthCursor(
              (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)
            )
          }
        >
          ◀
        </button>
        <div className="calendar__month">
          {format(monthCursor, "LLLL yyyy", { locale: fr })}
        </div>
        <button
          className="btn"
          onClick={() =>
            setMonthCursor(
              (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)
            )
          }
        >
          ▶
        </button>
      </div>

      <div className="calendar__weekdays">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((lbl) => (
          <div key={lbl}>{lbl}</div>
        ))}
      </div>

      <div className="calendar__grid">
        {days.map((day, idx) => {
          const other = !isSameMonth(day, monthCursor);
          const dots = ranges.filter((r) => day >= r.start && day <= r.end);
          return (
            <div
              key={idx}
              className={`calendar__cell${
                other ? " calendar__cell--other" : ""
              }`}
            >
              <div
                className={`calendar__date${
                  other ? " calendar__date--muted" : ""
                }`}
              >
                {format(day, "d", { locale: fr })}
              </div>
              <div className="calendar__dots">
                {dots.slice(0, 4).map((d) => (
                  <span
                    key={d.id}
                    className={`calendar__dot dot-${d.colorIdx}`}
                    title={`${d.name} · ${toISODate(day)}`}
                  />
                ))}
                {dots.length > 4 && (
                  <span className="calendar__counter">+{dots.length - 4}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="legend">
        {["early", "mid", "late", "overdue"].map((s) => (
          <span key={s}>
            <i className={`legend-dot ${statusClass(s)}`} />
            {s === "early"
              ? "Début → mi-parcours"
              : s === "mid"
              ? "Mi-parcours → 80%"
              : s === "late"
              ? "80% → 100%"
              : "Au-delà de l’estimation"}
          </span>
        ))}
      </div>
    </div>
  );
}

function QuickAddCard({
  qName,
  setQName,
  qStart,
  setQStart,
  qDuration,
  setQDuration,
  qBusy,
  onSubmit,
}) {
  return (
    <div className="card quick-add">
      <h2 className="section-title">Ajouter une plante</h2>
      <form className="form" onSubmit={onSubmit}>
        <label>
          Nom
          <input
            value={qName}
            onChange={(e) => setQName(e.target.value)}
            placeholder="Ex: Balcony #1"
            required
          />
        </label>
        <label>
          Date de plantation
          <input
            type="date"
            value={qStart}
            onChange={(e) => setQStart(e.target.value)}
            required
          />
        </label>
        <label>
          Durée estimée (jours)
          <input
            type="number"
            min="1"
            value={qDuration}
            onChange={(e) => setQDuration(e.target.value)}
            required
          />
        </label>
        <div className="actions">
          <button type="submit" className="btn btn--primary" disabled={qBusy}>
            {qBusy ? "Ajout…" : "Ajouter"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PlantListCard({ plants, loading, onUpdate, onDelete }) {
  return (
    <div className="card plant-list">
      <h2 className="section-title">Mes plantes</h2>
      {loading ? (
        <div className="text-muted">Chargement…</div>
      ) : plants.length ? (
        <div>
          {plants.map((p) => {
            const prog = computeProgress(p, new Date());
            const endIso = toISODate(prog.endDate);
            const colorIdx = (parseInt(p.id, 36) % 7) + 1;
            return (
              <div key={p.id} className="card plant-card">
                <div className="plant-head">
                  <div>
                    <div className="plant-title">
                      <span className={`dot dot-${colorIdx}`} />
                      {p.name}
                    </div>
                    <div className="plant-sub">
                      Début: {p.start_date} · Fin prévue: {endIso}
                    </div>
                  </div>
                  <button className="delete-btn" onClick={() => onDelete(p.id)}>
                    Supprimer
                  </button>
                </div>

                <div className="mt-2">
                  <div
                    className="text-muted"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    <span>{prog.done} j</span>
                    <span>
                      {prog.remaining >= 0
                        ? `${prog.remaining} j restants`
                        : `${Math.abs(prog.remaining)} j de retard`}
                    </span>
                  </div>
                  {/* progress natif → stylé via SCSS, pas d’inline width */}
                  <progress
                    className={`progressbar ${statusClass(prog.status)}`}
                    value={prog.doneAbs}
                    max={prog.total}
                  />
                </div>

                <div className="plant-controls">
                  <label>
                    Durée (j)
                    <input
                      type="number"
                      min="1"
                      value={p.duration_days}
                      onChange={(e) =>
                        onUpdate(p.id, { durationDays: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label>
                    Début
                    <input
                      type="date"
                      value={p.start_date}
                      onChange={(e) =>
                        onUpdate(p.id, { startDate: e.target.value })
                      }
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty">Aucune plante. Ajoute-en une.</div>
      )}
    </div>
  );
}

/* ------------------ Page ------------------ */
export default function Home() {
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [user, setUser] = useState(null);

  const [plants, setPlants] = useState([]);
  const [loadingPlants, setLoadingPlants] = useState(false);
  const [err, setErr] = useState(null);

  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const [qName, setQName] = useState("");
  const [qStart, setQStart] = useState(toISODate(new Date()));
  const [qDuration, setQDuration] = useState(90);
  const [qBusy, setQBusy] = useState(false);

  // auth
  useEffect(() => {
    let unsub = null;
    const supabase = getSupabase();
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user ?? null);
      setLoadingAuth(false);
      const { data: sub } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setUser(session?.user ?? null);
        }
      );
      unsub = () => sub.subscription.unsubscribe();
    })();
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // data
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
        off = await subscribePlants(async () => {
          try {
            const latest = await listPlants();
            setPlants(latest || []);
          } catch {
            /* noop */
          }
        });
      } catch (e) {
        setErr(e?.message || "Erreur au chargement");
      } finally {
        setLoadingPlants(false);
      }
    })();
    return () => {
      if (off) off();
    };
  }, [user]);

  // badges
  const stats = useMemo(() => {
    const t = new Date();
    let early = 0,
      mid = 0,
      late = 0,
      overdue = 0;
    plants.forEach((p) => {
      const { status } = computeProgress(p, t);
      if (status === "early") early++;
      else if (status === "mid") mid++;
      else if (status === "late") late++;
      else overdue++;
    });
    return { early, mid, late, overdue, active: early + mid + late };
  }, [plants]);

  // actions
  async function onQuickAdd(e) {
    e.preventDefault();
    if (!qName || !qStart || !qDuration) return;
    try {
      setQBusy(true);
      await createPlant({
        name: qName,
        startDate: qStart,
        durationDays: Number(qDuration),
        notes: "",
      });
      const rows = await listPlants();
      setPlants(rows || []);
      setQName("");
      setQStart(toISODate(new Date()));
      setQDuration(90);
    } finally {
      setQBusy(false);
    }
  }
  async function onUpdate(id, patch) {
    await updatePlant(id, patch);
    const rows = await listPlants();
    setPlants(rows || []);
  }
  async function onDelete(id) {
    if (!window.confirm("Supprimer cette plante ?")) return;
    await deletePlant(id);
    const rows = await listPlants();
    setPlants(rows || []);
  }

  return (
    <div className="main_home_container">
      {/* états d’auth */}
      {loadingAuth ? (
        <div className="loading_gate">Chargement…</div>
      ) : !user ? (
        <div className="anon_gate">
          <Connexion />
        </div>
      ) : (
        <>
          <div className="container">
            {/* topbar */}
            <div className="app-topbar">
              <img className="logo" src={Logo} alt="Logo" />
              <Link to="/user">
        <button className="logout-btn">Mon compte</button>
      </Link>
              <button
                className="logout-btn"
                onClick={async () => {
                  await signOut();
                  window.location.reload();
                }}
              >
                Se déconnecter
              </button>

              
            </div>

            {/* header + badges */}
            <header className="page-header">
              <h1 className="app-title">Suivi de croissance</h1>
              <p className="app-subtitle">
                Calendrier, progression et listes synchronisés.
              </p>
              <div className="badges">
                <Badge label={`En cours: ${stats.active}`} dotClass="dot-1" />
                <Badge label={`Mi-parcours: ${stats.mid}`} dotClass="dot-2" />
                <Badge label={`Bientôt prêt: ${stats.late}`} dotClass="dot-3" />
                <Badge label={`En retard: ${stats.overdue}`} dotClass="dot-4" />
              </div>
            </header>

            {/* grille responsive */}
            <div className="grid grid-2">
              <div>
                <CalendarCard
                  plants={plants}
                  monthCursor={monthCursor}
                  setMonthCursor={setMonthCursor}
                />
              </div>
              <div>
                <QuickAddCard
                  qName={qName}
                  setQName={setQName}
                  qStart={qStart}
                  setQStart={setQStart}
                  qDuration={qDuration}
                  setQDuration={setQDuration}
                  qBusy={qBusy}
                  onSubmit={onQuickAdd}
                />
                <div className="mt-3" />
                <PlantListCard
                  plants={plants}
                  loading={loadingPlants}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              </div>
            </div>

            {err && <div className="error_text">{err}</div>}
          </div>
        </>
      )}
    </div>
  );
}






