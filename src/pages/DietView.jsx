import React, { useMemo, useState } from 'react';
import { Salad, Flame, Zap, Droplets, Clock, CheckSquare, Square, ChevronDown, ChevronUp } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';

const MACRO_COLORS = { protein: '#6c63ff', carbs: '#38bdf8', fat: '#fbbf24' };

const MEAL_EMOJI = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎',
  'pre-workout': '⚡', 'post-workout': '💪', bedtime: '🌙', evening: '🌆', morning: '☀️',
};
const getMealEmoji = (name = '') => {
  const lower = name.toLowerCase();
  for (const key of Object.keys(MEAL_EMOJI)) { if (lower.includes(key)) return MEAL_EMOJI[key]; }
  return '🍽️';
};

// ─── Parse diet plan ─────────────────────────────────────────
const parseDiet = (raw) => {
  if (!raw) return null;
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch { return null; }
};

// ─── MacroBar component ───────────────────────────────────────
const MacroBar = ({ label, value, total, color, unit = 'g' }) => {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color }}>{value}{unit}</span>
      </div>
      <div style={{ height: '5px', background: 'var(--clr-surface-3)', borderRadius: '100px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '100px', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
};

// ─── Meal Card with checkboxes ─────────────────────────────────
const MealCard = ({ meal }) => {
  const [checked, setChecked] = useState({});
  const [expanded, setExpanded] = useState(true);
  const allDone = Array.isArray(meal.items) && meal.items.length > 0 && meal.items.every((_, i) => checked[i]);
  const donePct = Array.isArray(meal.items) && meal.items.length > 0
    ? Math.round((Object.values(checked).filter(Boolean).length / meal.items.length) * 100)
    : 0;

  const toggleItem = (i) => setChecked(prev => ({ ...prev, [i]: !prev[i] }));

  return (
    <div style={{
      background: 'var(--clr-surface)', border: `1px solid ${allDone ? 'var(--clr-accent-green)' : 'var(--clr-border)'}`,
      borderRadius: 'var(--radius-lg)', overflow: 'hidden', transition: 'all 0.25s',
      boxShadow: allDone ? '0 0 20px rgba(74,222,128,0.08)' : 'none',
    }}>
      {/* Card Header — clickable to expand/collapse */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ padding: '18px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', userSelect: 'none', background: allDone ? 'rgba(74,222,128,0.04)' : 'transparent' }}
      >
        <span style={{ fontSize: '1.8rem', flexShrink: 0 }}>{getMealEmoji(meal.name)}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: allDone ? 'var(--clr-accent-green)' : 'var(--clr-text)', textDecoration: allDone ? 'line-through' : 'none', textDecorationColor: 'var(--clr-accent-green)' }}>{meal.name}</span>
            {allDone && <span style={{ fontSize: '0.75rem', background: 'rgba(74,222,128,0.15)', color: 'var(--clr-accent-green)', padding: '1px 8px', borderRadius: '100px', fontWeight: 700 }}>✓ Done</span>}
          </div>
          {meal.time && (
            <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={11} /> {meal.time}
              {Array.isArray(meal.items) && meal.items.length > 0 && (
                <span style={{ marginLeft: '8px', color: 'var(--clr-text-muted)' }}>· {Object.values(checked).filter(Boolean).length}/{meal.items.length} items</span>
              )}
            </div>
          )}
          {/* Progress bar */}
          {Array.isArray(meal.items) && meal.items.length > 0 && (
            <div style={{ marginTop: '8px', height: '3px', background: 'var(--clr-surface-3)', borderRadius: '100px', overflow: 'hidden' }}>
              <div style={{ width: `${donePct}%`, height: '100%', background: allDone ? 'var(--clr-accent-green)' : 'var(--clr-primary)', borderRadius: '100px', transition: 'width 0.3s ease' }} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ff6b6b' }}>{meal.calories}<span style={{ fontSize: '0.68rem', fontWeight: 400, color: 'var(--clr-text-muted)', marginLeft: '2px' }}>kcal</span></div>
          {expanded ? <ChevronUp size={14} color="var(--clr-text-muted)" /> : <ChevronDown size={14} color="var(--clr-text-muted)" />}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: '0 20px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Checkbox food items */}
          {Array.isArray(meal.items) && meal.items.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {meal.items.map((item, i) => (
                <div
                  key={i}
                  onClick={() => toggleItem(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                    borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    background: checked[i] ? 'rgba(74,222,128,0.07)' : 'var(--clr-surface-2)',
                    border: `1px solid ${checked[i] ? 'rgba(74,222,128,0.3)' : 'var(--clr-border)'}`,
                    transition: 'all 0.18s',
                    userSelect: 'none',
                  }}
                  onMouseEnter={e => !checked[i] && (e.currentTarget.style.borderColor = 'rgba(108,99,255,0.35)')}
                  onMouseLeave={e => !checked[i] && (e.currentTarget.style.borderColor = 'var(--clr-border)')}
                >
                  {checked[i]
                    ? <CheckSquare size={17} color="var(--clr-accent-green)" style={{ flexShrink: 0 }} />
                    : <Square size={17} color="var(--clr-text-muted)" style={{ flexShrink: 0 }} />}
                  <span style={{
                    fontSize: '0.88rem', color: checked[i] ? 'var(--clr-text-muted)' : 'var(--clr-text)',
                    textDecoration: checked[i] ? 'line-through' : 'none', transition: 'all 0.2s', flex: 1,
                  }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Macro bars */}
          {(meal.protein != null || meal.carbs != null || meal.fat != null) && (
            <div style={{ display: 'flex', gap: '16px', paddingTop: '10px', borderTop: '1px solid var(--clr-border)' }}>
              <MacroBar label="Protein" value={meal.protein || 0} total={100} color={MACRO_COLORS.protein} />
              <MacroBar label="Carbs" value={meal.carbs || 0} total={200} color={MACRO_COLORS.carbs} />
              <MacroBar label="Fat" value={meal.fat || 0} total={80} color={MACRO_COLORS.fat} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main DietView ────────────────────────────────────────────
const DietView = () => {
  const { dietPlan } = useAuthStore();
  const navigate = useNavigate();
  const diet = useMemo(() => parseDiet(dietPlan), [dietPlan]);

  if (!dietPlan || !diet) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Salad size={32} color="var(--clr-accent-green)" />Your Diet Plan
          </h1>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🥗</div>
          <h2 style={{ marginBottom: '8px' }}>No Diet Plan Found</h2>
          <p style={{ color: 'var(--clr-text-muted)', marginBottom: '24px' }}>Complete your assessment to receive your personalized meal plan.</p>
          <button className="btn btn-primary" onClick={() => navigate('/assessment')}>Go to Assessment</button>
        </div>
      </div>
    );
  }

  const { dailyCalories, macros, meals = [] } = diet;
  const checkedCount = 0; // placeholder — tracked per-card
  const totalMeals = meals.length;
  const totalProt = meals.reduce((s, m) => s + (m.protein || 0), 0);
  const totalCarbs = meals.reduce((s, m) => s + (m.carbs || 0), 0);
  const totalFat = meals.reduce((s, m) => s + (m.fat || 0), 0);
  const totalCal = meals.reduce((s, m) => s + (m.calories || 0), 0);

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Salad size={32} color="var(--clr-accent-green)" />Your Diet Plan
        </h1>
        <p className="page-subtitle">Check off each food item as you eat it — track your meals in real time.</p>
      </div>

      {/* Daily Summary Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { icon: <Flame size={18} />, label: 'Daily Target', value: dailyCalories || totalCal, unit: 'kcal', color: 'var(--clr-accent)', bg: 'rgba(255,107,107,0.1)' },
          { icon: <Zap size={18} />, label: 'Protein', value: macros?.protein || totalProt, unit: 'g', color: MACRO_COLORS.protein, bg: 'rgba(108,99,255,0.1)' },
          { icon: <Zap size={18} />, label: 'Carbs', value: macros?.carbs || totalCarbs, unit: 'g', color: MACRO_COLORS.carbs, bg: 'rgba(56,189,248,0.1)' },
          { icon: <Droplets size={18} />, label: 'Fat', value: macros?.fat || totalFat, unit: 'g', color: MACRO_COLORS.fat, bg: 'rgba(251,191,36,0.1)' },
        ].map((stat, i) => (
          <div key={i} style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: stat.bg, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: stat.color }}>
                {stat.value}<span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--clr-text-muted)', marginLeft: '3px' }}>{stat.unit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Meal Cards */}
      {meals.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {meals.map((meal, i) => <MealCard key={i} meal={meal} />)}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--clr-text-muted)' }}>
          <p>No meal data found. Ask JimBro to regenerate your plan!</p>
        </div>
      )}
    </div>
  );
};

export default DietView;
