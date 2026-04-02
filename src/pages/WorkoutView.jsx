import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Dumbbell, Play, X, CheckCircle, Calendar, LayoutGrid,
  Loader, MessageSquare, Target, Zap, Info
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';

// ─── ExerciseDB free API (Vercel mirror — no key, no cert issues) ───
const EXERCISEDB_BASE = 'https://exercisedb-api.vercel.app/api/v1';

const fetchExerciseFromAPI = async (name) => {
  try {
    const query = encodeURIComponent(name.toLowerCase().trim());
    const res = await fetch(`${EXERCISEDB_BASE}/exercises/search?q=${query}&limit=5`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    // API wraps results in { data: [...] }
    const exercises = data?.data || (Array.isArray(data) ? data : []);
    if (exercises.length === 0) return null;
    // Pick the best match — prefer exact name match
    const nameLower = name.toLowerCase();
    const exact = exercises.find(e => e.name?.toLowerCase() === nameLower);
    const partial = exercises.find(e => e.name?.toLowerCase().includes(nameLower.split(' ')[0]));
    return exact || partial || exercises[0];
  } catch (e) {
    return null;
  }
};


// ─── Static fallback DB (when API is unreachable) ───────────
const FALLBACK_DB = {
  'bench press':     { instructions: ['Lie on a flat bench with a barbell racked above your chest.', 'Grip the bar slightly wider than shoulder-width.', 'Lower the bar slowly to your mid-chest.', 'Press the bar back up in a slight arc to the starting position.', 'Keep your feet flat on the floor and back slightly arched.'], target: 'pectorals', equipment: 'barbell' },
  'push-up':         { instructions: ['Start in a high plank position with hands slightly wider than shoulders.', 'Lower your body until your chest nearly touches the floor.', 'Keep your core tight and back flat throughout.', 'Push back up to the starting position.'], target: 'pectorals', equipment: 'body weight' },
  'push ups':        { instructions: ['Start in a high plank position with hands slightly wider than shoulders.', 'Lower your body until your chest nearly touches the floor.', 'Keep your core tight and back flat throughout.', 'Push back up to the starting position.'], target: 'pectorals', equipment: 'body weight' },
  'squat':           { instructions: ['Stand with feet shoulder-width apart.', 'Keep your chest up and spine neutral.', 'Lower your hips as if sitting into a chair until thighs are parallel to the floor.', 'Drive through your heels to return to standing.'], target: 'quadriceps', equipment: 'barbell' },
  'squats':          { instructions: ['Stand with feet shoulder-width apart.', 'Keep your chest up and spine neutral.', 'Lower your hips as if sitting into a chair until thighs are parallel to the floor.', 'Drive through your heels to return to standing.'], target: 'quadriceps', equipment: 'body weight' },
  'deadlift':        { instructions: ['Stand with feet hip-width, bar over mid-foot.', 'Hinge at the hips and grip the bar just outside your legs.', 'Keep your back flat, chest up, and core braced.', 'Pull the bar up by driving your feet into the floor.', 'Lock out hips and knees at the top.'], target: 'glutes', equipment: 'barbell' },
  'plank':           { instructions: ['Place forearms on the ground with elbows under shoulders.', 'Extend legs behind you, resting on toes.', 'Keep your body in a straight line from head to heels.', 'Brace your core and hold the position.'], target: 'core', equipment: 'body weight' },
  'pull-up':         { instructions: ['Hang from a bar with an overhand grip, slightly wider than shoulder-width.', 'Engage your lats and pull your chest toward the bar.', 'Go until your chin clears the bar.', 'Lower yourself back down with control.'], target: 'lats', equipment: 'body weight' },
  'pull ups':        { instructions: ['Hang from a bar with an overhand grip, slightly wider than shoulder-width.', 'Engage your lats and pull your chest toward the bar.', 'Go until your chin clears the bar.', 'Lower yourself back down with control.'], target: 'lats', equipment: 'body weight' },
  'lunge':           { instructions: ['Stand tall with feet together.', 'Step forward with one foot and lower your back knee toward the floor.', 'Keep your front knee over your ankle — not beyond your toes.', 'Drive back to start and repeat with the other leg.'], target: 'quadriceps', equipment: 'body weight' },
  'bicep curl':      { instructions: ['Stand holding dumbbells at your sides with palms facing forward.', 'Curl the weights toward your shoulders, keeping elbows close to your body.', 'Squeeze the bicep at the top.', 'Lower slowly back to start.'], target: 'biceps', equipment: 'dumbbell' },
  'overhead press':  { instructions: ['Stand holding a barbell at shoulder height with overhand grip.', 'Press the bar overhead until your arms are fully extended.', 'Keep your core braced and don\'t lean back excessively.', 'Lower back to shoulders with control.'], target: 'deltoids', equipment: 'barbell' },
  'burpee':          { instructions: ['Start standing. Drop into a squat and place hands on the floor.', 'Jump feet back into a plank position.', 'Perform a push-up.', 'Jump feet forward back to squat position.', 'Explode up into a jump with arms overhead.'], target: 'cardiovascular system', equipment: 'body weight' },
  'crunch':          { instructions: ['Lie on your back with knees bent, feet flat.', 'Place hands behind your head or across your chest.', 'Lift your shoulders off the floor using your abs.', 'Lower back down slowly without fully resting.'], target: 'abs', equipment: 'body weight' },
  'mountain climber':{ instructions: ['Start in a high plank position.', 'Drive one knee toward your chest.', 'Quickly switch legs in a running motion.', 'Keep hips low and maintain a strong plank throughout.'], target: 'abs', equipment: 'body weight' },
  'lat pulldown':    { instructions: ['Sit at a cable machine with the bar above.', 'Grip the bar wider than shoulder-width with an overhand grip.', 'Pull the bar down to your upper chest while leaning slightly back.', 'Slowly raise the bar back to the start.'], target: 'lats', equipment: 'cable' },
  'tricep dip':      { instructions: ['Grip parallel bars with arms straight and body suspended.', 'Lower yourself until elbows reach 90 degrees.', 'Keep your elbows tucked in, not flared wide.', 'Push back up to start.'], target: 'triceps', equipment: 'body weight' },
};

const findFallback = (name) => {
  const lower = (name || '').toLowerCase();
  if (FALLBACK_DB[lower]) return FALLBACK_DB[lower];
  for (const key of Object.keys(FALLBACK_DB)) {
    if (lower.includes(key) || key.split(' ').every(w => lower.includes(w))) return FALLBACK_DB[key];
  }
  return null;
};

// ─── Helpers ──────────────────────────────────────────────────
const FALLBACK_EMOJI = { chest: '💪', back: '🏋️', legs: '🦵', arms: '💪', shoulders: '🏋️', core: '🔥', cardio: '🏃', rest: '😴', full: '⚡', abs: '🔥', glutes: '🍑', hamstrings: '🦵', quadriceps: '🦵', lats: '🏋️', deltoids: '💪', biceps: '💪', triceps: '💪' };
const focusEmoji = (f = '') => { const lower = f.toLowerCase(); for (const k of Object.keys(FALLBACK_EMOJI)) { if (lower.includes(k)) return FALLBACK_EMOJI[k]; } return '🏋️'; };

const MUSCLE_COLOR = {
  pectorals: '#6c63ff', lats: '#38bdf8', quadriceps: '#4ade80', glutes: '#fbbf24',
  hamstrings: '#fb923c', abs: '#f472b6', deltoids: '#a78bfa', biceps: '#34d399',
  triceps: '#60a5fa', cardiovascular: '#ff6b6b', core: '#ff6b6b',
};
const muscleColor = (m = '') => {
  const lower = m.toLowerCase();
  for (const k of Object.keys(MUSCLE_COLOR)) { if (lower.includes(k)) return MUSCLE_COLOR[k]; }
  return 'var(--clr-primary)';
};

const parseWorkout = (raw) => {
  if (!raw) return [];
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(obj?.days) ? obj.days : [];
  } catch { return []; }
};

// ─── Exercise Demo Modal — Live API + Fallback ───────────────
const ExerciseModal = ({ exercise, onClose }) => {
  const navigate = useNavigate();
  const { setPendingChatMessage } = useAuthStore();
  const [apiData, setApiData] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'loaded' | 'fallback'
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setApiData(null);
    setImgLoaded(false);
    setImgError(false);

    fetchExerciseFromAPI(exercise.name).then(result => {
      if (cancelled) return;
      if (result) {
        setApiData(result);
        setStatus('loaded');
      } else {
        const fb = findFallback(exercise.name);
        setApiData(fb ? { ...fb, name: exercise.name, gifUrl: null } : null);
        setStatus('fallback');
      }
    });

    return () => { cancelled = true; };
  }, [exercise.name]);

  const handleAskJimBro = () => {
    const msg = `Tell me more about the ${exercise.name} exercise — proper form, common mistakes, and how to make it harder or easier for my level.`;
    setPendingChatMessage(msg);
    onClose();
    navigate('/chat');
  };

  const gif = apiData?.gifUrl || null;
  const instructions = apiData?.instructions || [];
  // API returns plural arrays: targetMuscles[], bodyParts[], equipments[]
  const target = apiData?.targetMuscles?.[0] || apiData?.target || apiData?.targetMuscle || '';
  const equipment = apiData?.equipments?.[0] || apiData?.equipment || '';
  const bodyPart = apiData?.bodyParts?.[0] || apiData?.bodyPart || '';

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{ padding: '24px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ flex: 1, paddingRight: '32px' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '6px', textTransform: 'capitalize' }}>{exercise.name}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--clr-primary)', fontWeight: 600, background: 'rgba(108,99,255,0.12)', padding: '3px 10px', borderRadius: '100px' }}>
                  {exercise.sets} sets × {exercise.reps} reps
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted)', background: 'var(--clr-surface-2)', padding: '3px 10px', borderRadius: '100px', border: '1px solid var(--clr-border)' }}>
                  Rest {exercise.rest}
                </span>
              </div>
            </div>
            <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--clr-surface-2)', border: '1px solid var(--clr-border)', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--clr-text)', flexShrink: 0 }}>
              <X size={15} />
            </button>
          </div>

          {/* Muscle + Equipment tags */}
          {(target || equipment || bodyPart) && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingBottom: '16px', borderBottom: '1px solid var(--clr-border)' }}>
              {target && (
                <span style={{ fontSize: '0.73rem', fontWeight: 700, padding: '3px 10px', borderRadius: '100px', background: `${muscleColor(target)}20`, color: muscleColor(target), border: `1px solid ${muscleColor(target)}40`, textTransform: 'capitalize' }}>
                  🎯 {target}
                </span>
              )}
              {bodyPart && bodyPart !== target && (
                <span style={{ fontSize: '0.73rem', fontWeight: 600, padding: '3px 10px', borderRadius: '100px', background: 'var(--clr-surface-2)', color: 'var(--clr-text-muted)', border: '1px solid var(--clr-border)', textTransform: 'capitalize' }}>
                  {bodyPart}
                </span>
              )}
              {equipment && (
                <span style={{ fontSize: '0.73rem', fontWeight: 600, padding: '3px 10px', borderRadius: '100px', background: 'var(--clr-surface-2)', color: 'var(--clr-text-muted)', border: '1px solid var(--clr-border)', textTransform: 'capitalize' }}>
                  🏋️ {equipment}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 24px' }}>
          {/* GIF section */}
          <div style={{ margin: '16px 0', background: 'var(--clr-surface-2)', borderRadius: 'var(--radius-md)', overflow: 'hidden', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {status === 'loading' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--clr-text-muted)', padding: '40px' }}>
                <Loader size={28} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.85rem' }}>Fetching exercise data...</span>
              </div>
            )}
            {status !== 'loading' && gif && !imgError && (
              <>
                {!imgLoaded && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--clr-text-muted)' }}>
                    <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                )}
                <img
                  src={gif}
                  alt={exercise.name}
                  style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', display: imgLoaded ? 'block' : 'none' }}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgError(true)}
                />
              </>
            )}
            {(status !== 'loading' && (!gif || imgError)) && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--clr-text-muted)' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '8px' }}>{focusEmoji(target || exercise.name)}</div>
                <p style={{ fontSize: '0.82rem' }}>No animation available — follow the instructions below.</p>
              </div>
            )}
          </div>

          {/* Step-by-step instructions */}
          {instructions.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Info size={14} /> How to do it
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {instructions.map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '10px 14px', background: 'var(--clr-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--clr-border)' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(108,99,255,0.15)', color: 'var(--clr-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0, marginTop: '1px' }}>
                      {i + 1}
                    </div>
                    <p style={{ color: 'var(--clr-text)', fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No data at all */}
          {status !== 'loading' && instructions.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--clr-text-muted)', fontSize: '0.88rem' }}>
              Ask JimBro below for detailed instructions on this exercise!
            </div>
          )}
        </div>

        {/* ── Ask JimBro footer button ── */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--clr-border)', flexShrink: 0, background: 'var(--clr-surface)' }}>
          <button
            onClick={handleAskJimBro}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '14px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--clr-primary), #8b5cf6)',
              color: 'white', fontWeight: 700, fontSize: '0.95rem',
              boxShadow: '0 4px 16px rgba(108,99,255,0.35)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(108,99,255,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(108,99,255,0.35)'; }}
          >
            <MessageSquare size={18} />
            Ask JimBro about this exercise
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Exercise Row with Log button ────────────────────────────
const ExerciseRow = ({ exercise, onDemo }) => {
  const [logged, setLogged] = useState(false);
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: '12px',
      padding: '14px 16px', background: 'var(--clr-surface-2)', borderRadius: 'var(--radius-md)',
      border: `1px solid ${logged ? 'var(--clr-accent-green)' : 'var(--clr-border)'}`,
      transition: 'border-color 0.2s',
      cursor: 'pointer',
    }} onClick={onDemo}
      onMouseEnter={e => { if (!logged) e.currentTarget.style.borderColor = 'rgba(108,99,255,0.4)'; }}
      onMouseLeave={e => { if (!logged) e.currentTarget.style.borderColor = 'var(--clr-border)'; }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--clr-text)' }}>{exercise.name}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--clr-primary)', marginTop: '3px', fontWeight: 500 }}>
          {exercise.sets} sets × {exercise.reps} reps &nbsp;·&nbsp; <span style={{ color: 'var(--clr-text-muted)' }}>Rest {exercise.rest}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--clr-primary)', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.25)', borderRadius: '8px', padding: '6px 12px', whiteSpace: 'nowrap' }}
        onClick={e => { e.stopPropagation(); onDemo(); }}
      >
        <Play size={12} /> Demo
      </div>
      <div
        onClick={e => { e.stopPropagation(); setLogged(l => !l); }}
        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${logged ? 'var(--clr-accent-green)' : 'var(--clr-border)'}`, background: logged ? 'rgba(74,222,128,0.1)' : 'var(--clr-surface-3)', color: logged ? 'var(--clr-accent-green)' : 'var(--clr-text-muted)', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.2s' }}
      >
        <CheckCircle size={12} /> {logged ? 'Done!' : 'Log'}
      </div>
    </div>
  );
};

// ─── Day view ─────────────────────────────────────────────────
const DayView = ({ day }) => {
  const [demoExercise, setDemoExercise] = useState(null);
  const isRest = !day.exercises || day.exercises.length === 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <span style={{ fontSize: '1.6rem' }}>{focusEmoji(day.focus)}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{day.focus || day.day}</div>
          {!isRest && <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>{day.exercises.length} exercises · click any to see demo</div>}
        </div>
      </div>
      {isRest ? (
        <div style={{ textAlign: 'center', padding: '48px', background: 'var(--clr-surface-2)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>😴</div>
          <div style={{ fontWeight: 600 }}>Rest & Recovery Day</div>
          <div style={{ color: 'var(--clr-text-muted)', marginTop: '6px', fontSize: '0.88rem' }}>Focus on sleep, hydration and light stretching.</div>
        </div>
      ) : (
        day.exercises.map((ex, i) => (
          <ExerciseRow key={i} exercise={ex} onDemo={() => setDemoExercise(ex)} />
        ))
      )}
      {demoExercise && <ExerciseModal exercise={demoExercise} onClose={() => setDemoExercise(null)} />}
    </div>
  );
};

// ─── Calendar Grid ────────────────────────────────────────────
const CalendarView = ({ days, today, onSelectDay }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
    {days.map((d, i) => {
      const isRest = !d.exercises || d.exercises.length === 0;
      const isToday = d.day?.toLowerCase() === today.toLowerCase();
      return (
        <button key={i} onClick={() => onSelectDay(i)} style={{
          background: 'var(--clr-surface)', border: `1px solid ${isToday ? 'var(--clr-primary)' : 'var(--clr-border)'}`,
          borderRadius: 'var(--radius-md)', padding: '14px 8px', cursor: 'pointer', textAlign: 'center',
          boxShadow: isToday ? '0 0 16px var(--clr-primary-glow)' : 'none', transition: 'all 0.2s', color: 'var(--clr-text)',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--clr-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = isToday ? 'var(--clr-primary)' : 'var(--clr-border)'; }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isToday ? 'var(--clr-primary)' : 'var(--clr-text-muted)', letterSpacing: '0.05em', marginBottom: '8px' }}>{d.day?.slice(0, 3).toUpperCase()}</div>
          <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>{isRest ? '😴' : focusEmoji(d.focus)}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--clr-text-muted)', lineHeight: 1.3 }}>{isRest ? 'Rest' : d.focus?.split('&')[0]?.trim() || '—'}</div>
          {!isRest && <div style={{ marginTop: '6px', fontSize: '0.68rem', color: 'var(--clr-primary)', fontWeight: 600 }}>{d.exercises?.length} moves</div>}
          {isToday && <div style={{ marginTop: '6px', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--clr-primary)', margin: '6px auto 0' }} />}
        </button>
      );
    })}
  </div>
);

// ─── Main WorkoutView ─────────────────────────────────────────
const WorkoutView = () => {
  const { workoutPlan } = useAuthStore();
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const days = useMemo(() => parseWorkout(workoutPlan), [workoutPlan]);
  const todayIdx = days.findIndex(d => d.day?.toLowerCase() === today.toLowerCase());
  const [activeDay, setActiveDay] = useState(todayIdx >= 0 ? todayIdx : 0);
  const [view, setView] = useState('tabs');

  if (!workoutPlan || days.length === 0) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Dumbbell size={32} color="var(--clr-primary)" />Your Workout Plan
          </h1>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🏋️</div>
          <h2 style={{ marginBottom: '8px' }}>No Plan Found</h2>
          <p style={{ color: 'var(--clr-text-muted)', marginBottom: '24px' }}>Complete your assessment to get a personalized 7-day workout plan.</p>
          <button className="btn btn-primary" onClick={() => navigate('/assessment')}>Go to Assessment</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Dumbbell size={32} color="var(--clr-primary)" />Your Workout Plan
            </h1>
            <p className="page-subtitle">
              Today is <strong style={{ color: 'var(--clr-primary)' }}>{today}</strong>.
              Click any exercise for a <strong>live demo + instructions</strong>.
            </p>
          </div>
          <div className="tabs" style={{ margin: 0 }}>
            <button className={`tab ${view === 'tabs' ? 'active' : ''}`} onClick={() => setView('tabs')}>
              <LayoutGrid size={13} style={{ marginRight: 5 }} />Plan
            </button>
            <button className={`tab ${view === 'cal' ? 'active' : ''}`} onClick={() => setView('cal')}>
              <Calendar size={13} style={{ marginRight: 5 }} />Calendar
            </button>
          </div>
        </div>
      </div>

      {view === 'tabs' ? (
        <div className="card" style={{ padding: '28px' }}>
          {/* Day tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '28px' }}>
            {days.map((d, i) => {
              const isToday = d.day?.toLowerCase() === today.toLowerCase();
              const isRest = !d.exercises || d.exercises.length === 0;
              return (
                <button key={i} onClick={() => setActiveDay(i)} style={{
                  padding: '8px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  border: `1px solid ${activeDay === i ? 'var(--clr-primary)' : 'var(--clr-border)'}`,
                  background: activeDay === i ? 'rgba(108,99,255,0.12)' : 'var(--clr-surface-2)',
                  color: activeDay === i ? 'var(--clr-primary)' : 'var(--clr-text-muted)',
                  fontWeight: activeDay === i ? 700 : 500, fontSize: '0.85rem',
                  transition: 'all 0.15s', position: 'relative',
                }}>
                  {d.day?.slice(0, 3)}
                  {isRest && <span style={{ marginLeft: '4px', fontSize: '0.75rem' }}>😴</span>}
                  {isToday && <span style={{ position: 'absolute', top: '-3px', right: '-3px', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--clr-primary)', border: '2px solid var(--clr-surface)' }} />}
                </button>
              );
            })}
          </div>
          {days[activeDay] && <DayView day={days[activeDay]} />}
        </div>
      ) : (
        <div className="card" style={{ padding: '28px' }}>
          <CalendarView days={days} today={today} onSelectDay={(i) => { setActiveDay(i); setView('tabs'); }} />
        </div>
      )}
    </div>
  );
};

export default WorkoutView;
