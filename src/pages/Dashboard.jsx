import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target, Activity, Flame, MessageSquare, TrendingUp, CheckCircle, Circle,
  Dumbbell, Salad, Zap, Award, ArrowRight
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area
} from 'recharts';
import axiosInstance from '../api/axiosInstance';
import useAuthStore from '../store/authStore';

// ─── Motivational tips ───────────────────────────────────────
const TIPS = [
  "Consistency beats perfection every time. Show up even on the tough days 💪",
  "Your body achieves what your mind believes. Keep pushing! 🧠",
  "Every rep counts. Every meal matters. You're making progress! ⚡",
  "Rest is part of the plan — recovery is where growth happens. 😴",
  "Hydration = performance. Drink that water, champ! 💧",
  "The only bad workout is the one that didn't happen. Go get it! 🔥",
];

// ─── Donut ring mini component ───────────────────────────────
const DonutRing = ({ value, max, color, size = 64, stroke = 7 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, value / (max || 1));
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
};

// ─── Custom tooltip for chart ────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', borderRadius: '10px', padding: '10px 14px' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontWeight: 700, color: 'var(--clr-accent-blue)' }}>{payload[0].value} kg</div>
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const { user, userProfile, reminders, toggleReminder, workoutPlan } = useAuthStore();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [weightData, setWeightData] = useState([]);
  const [recentWorkouts, setRecentWorkouts] = useState([]);

  const tip = useMemo(() => TIPS[Math.floor(Date.now() / 86400000) % TIPS.length], []);

  useEffect(() => {
    if (user?.id) {
      axiosInstance.get(`/api/chat/logs/${user.id}`)
        .then(res => {
          const data = res.data;
          setLogs(data);
          const weights = data
            .filter(l => l.logType === 'WEIGHT')
            .reverse()
            .map(l => ({
              date: new Date(l.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              weight: parseFloat(l.logValue)
            }));
          setWeightData(weights);
          setRecentWorkouts(data.filter(l => l.logType === 'WORKOUT').slice(0, 3));
        })
        .catch(() => {});
    }
  }, [user]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const workoutCount = logs.filter(l => l.logType === 'WORKOUT').length;
  const latestWeight = weightData.length > 0 ? weightData[weightData.length - 1].weight : userProfile?.weight;
  const hasProfile = userProfile?.weight && userProfile?.bmi;

  // Streak: consecutive days with any log
  const streak = useMemo(() => {
    if (!logs.length) return 0;
    const logDays = new Set(logs.map(l => new Date(l.timestamp).toDateString()));
    let s = 0;
    const d = new Date();
    while (logDays.has(d.toDateString())) { s++; d.setDate(d.getDate() - 1); }
    return s;
  }, [logs]);

  // Parse today's workout
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayWorkout = useMemo(() => {
    if (!workoutPlan) return null;
    try {
      const obj = JSON.parse(workoutPlan);
      return obj?.days?.find(d => d.day?.toLowerCase() === today.toLowerCase()) || null;
    } catch { return null; }
  }, [workoutPlan, today]);

  const doneReminders = reminders ? reminders.filter(r => r.done).length : 0;
  const totalReminders = reminders ? reminders.length : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 className="page-title">{greeting()}, {user?.name?.split(' ')[0] || 'Athlete'} 👋</h1>
        <p className="page-subtitle">Here's your fitness snapshot for today.</p>
      </div>

      {/* ── Row 1: Key Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {/* BMI / Weight */}
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue"><Activity size={20} /></div>
          <div>
            <div className="stat-label">Weight / BMI</div>
            <div className="stat-value" style={{ fontSize: '1.3rem' }}>
              {latestWeight ? `${latestWeight}kg` : '—'}
              <span style={{ fontSize: '0.9rem', color: 'var(--clr-text-muted)', fontWeight: 500 }}> / {userProfile?.bmi ? userProfile.bmi.toFixed(1) : '—'}</span>
            </div>
          </div>
        </div>
        {/* Workouts */}
        <div className="stat-card">
          <div className="stat-icon stat-icon-red"><Flame size={20} /></div>
          <div>
            <div className="stat-label">Workouts Logged</div>
            <div className="stat-value">{workoutCount}</div>
          </div>
        </div>
        {/* Streak */}
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}><Award size={20} /></div>
          <div>
            <div className="stat-label">Current Streak</div>
            <div className="stat-value">{streak} <span style={{ fontSize: '1rem' }}>🔥</span></div>
          </div>
        </div>
        {/* TDEE */}
        <div className="stat-card">
          <div className="stat-icon stat-icon-purple"><Zap size={20} /></div>
          <div>
            <div className="stat-label">Daily Calories (TDEE)</div>
            <div className="stat-value" style={{ fontSize: '1.3rem' }}>{userProfile?.tdee ? Math.round(userProfile.tdee) : '—'}<span style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', fontWeight: 400 }}> kcal</span></div>
          </div>
        </div>
      </div>

      {/* ── Row 2: Chart + Habits ── */}
      <div className="grid-2" style={{ gap: '20px', marginBottom: '24px' }}>
        {/* Weight Chart */}
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="var(--clr-accent-blue)" /> Weight Progression
          </h2>
          {weightData.length > 0 ? (
            <div style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weightData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--clr-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--clr-text-muted)" fontSize={11} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="weight" stroke="#38bdf8" strokeWidth={2.5} fill="url(#weightGrad)" dot={{ r: 4, fill: '#38bdf8' }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--clr-text-muted)' }}>
              <TrendingUp size={36} style={{ opacity: 0.3 }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 600, marginBottom: '4px' }}>No weight data yet</p>
                <p style={{ fontSize: '0.82rem' }}>Tell JimBro "I weigh 72kg" in the chat to start tracking!</p>
              </div>
              <button className="btn btn-ghost" style={{ fontSize: '0.82rem', padding: '8px 16px' }} onClick={() => navigate('/chat')}>
                Open Chat →
              </button>
            </div>
          )}
        </div>

        {/* Daily Habits */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={18} color="#a78bfa" /> Daily Habits
            </h2>
            {totalReminders > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DonutRing value={doneReminders} max={totalReminders} color="var(--clr-accent-green)" size={42} stroke={5} />
                <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)', fontWeight: 600 }}>{doneReminders}/{totalReminders}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {reminders && reminders.length > 0 ? reminders.map(reminder => (
              <div
                key={reminder.id}
                onClick={() => toggleReminder(reminder.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  background: reminder.done ? 'rgba(74,222,128,0.07)' : 'var(--clr-surface-2)',
                  border: `1px solid ${reminder.done ? 'rgba(74,222,128,0.3)' : 'var(--clr-border)'}`,
                  transition: 'all 0.2s'
                }}
              >
                {reminder.done
                  ? <CheckCircle size={18} color="var(--clr-accent-green)" />
                  : <Circle size={18} color="var(--clr-text-muted)" />}
                <span style={{ fontSize: '0.9rem', color: reminder.done ? 'var(--clr-accent-green)' : 'var(--clr-text)', textDecoration: reminder.done ? 'line-through' : 'none', transition: 'all 0.2s' }}>
                  {reminder.text}
                </span>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--clr-text-muted)' }}>
                <Target size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p style={{ fontSize: '0.88rem' }}>Ask JimBro to set daily reminders for you!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 3: Today's Workout + Quick Actions + Tip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
        {/* Today's Workout */}
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Dumbbell size={18} color="var(--clr-primary)" /> Today — {today.slice(0, 3)}
          </h2>
          {todayWorkout ? (
            <>
              <div style={{ fontSize: '0.82rem', color: 'var(--clr-text-muted)', marginBottom: '12px', fontWeight: 600 }}>{todayWorkout.focus}</div>
              {todayWorkout.exercises?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {todayWorkout.exercises.slice(0, 4).map((ex, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--clr-text-muted)' }}>
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--clr-primary)', flexShrink: 0 }} />
                      {ex.name} <span style={{ color: 'var(--clr-text-faint)', marginLeft: 'auto' }}>{ex.sets}×{ex.reps}</span>
                    </div>
                  ))}
                  {todayWorkout.exercises.length > 4 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-faint)' }}>+{todayWorkout.exercises.length - 4} more...</div>
                  )}
                </div>
              ) : (
                <p style={{ color: 'var(--clr-accent-green)', fontSize: '0.88rem' }}>😴 Rest & Recovery Day</p>
              )}
              <button className="btn btn-ghost" style={{ marginTop: '16px', width: '100%', fontSize: '0.82rem', padding: '9px' }} onClick={() => navigate('/workout')}>
                View Full Plan
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--clr-text-muted)', padding: '20px 0' }}>
              <Dumbbell size={28} style={{ opacity: 0.2, marginBottom: '8px' }} />
              <p style={{ fontSize: '0.85rem' }}>Complete your assessment to see today's workout!</p>
              <button className="btn btn-primary" style={{ marginTop: '12px', fontSize: '0.82rem', padding: '8px 16px' }} onClick={() => navigate('/assessment')}>
                Start Assessment
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="var(--clr-accent-yellow)" /> Quick Actions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'Chat with JimBro', icon: <MessageSquare size={16} />, path: '/chat', color: 'var(--clr-primary)', bg: 'rgba(108,99,255,0.1)' },
              { label: 'View Workout Plan', icon: <Dumbbell size={16} />, path: '/workout', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
              { label: 'View Diet Plan', icon: <Salad size={16} />, path: '/diet', color: 'var(--clr-accent-green)', bg: 'rgba(74,222,128,0.1)' },
              { label: 'Update Assessment', icon: <Activity size={16} />, path: '/assessment', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
            ].map((action, i) => (
              <button key={i} onClick={() => navigate(action.path)} style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px',
                background: action.bg, border: 'none', borderRadius: 'var(--radius-md)',
                cursor: 'pointer', color: action.color, fontWeight: 600, fontSize: '0.88rem',
                width: '100%', textAlign: 'left', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.15)'; e.currentTarget.style.transform = 'translateX(2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; }}
              >
                {action.icon} {action.label}
                <ArrowRight size={14} style={{ marginLeft: 'auto', opacity: 0.6 }} />
              </button>
            ))}
          </div>
        </div>

        {/* Motivational Tip */}
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.12), rgba(139,92,246,0.06))', border: '1px solid rgba(108,99,255,0.2)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>💡</div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', color: 'var(--clr-primary)' }}>JimBro's Daily Tip</h2>
          <p style={{ color: 'var(--clr-text)', lineHeight: 1.7, fontSize: '0.92rem' }}>{tip}</p>
          {recentWorkouts.length > 0 && (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--clr-border)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Recent Logs</div>
              {recentWorkouts.slice(0, 2).map((w, i) => (
                <div key={i} style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)', marginBottom: '4px' }}>
                  ✓ {w.metadata || 'Workout logged'} <span style={{ color: 'var(--clr-text-faint)' }}>· {new Date(w.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
