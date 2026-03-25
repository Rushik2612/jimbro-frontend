import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { Activity, ArrowRight, Salad, CheckCircle, Edit3, ChevronDown } from 'lucide-react';
import useAuthStore from '../store/authStore';

// BMI-based goal suggestion
const suggestGoalFromBMI = (bmi) => {
  if (bmi < 18.5) return 'Muscle Gain';
  if (bmi < 25) return 'Maintenance';
  if (bmi < 30) return 'Weight Loss';
  return 'Weight Loss';
};

const BMI_CATEGORY = (bmi) => {
  if (bmi < 18.5) return { label: 'Underweight', color: '#38bdf8' };
  if (bmi < 25) return { label: 'Normal', color: '#4ade80' };
  if (bmi < 30) return { label: 'Overweight', color: '#fbbf24' };
  return { label: 'Obese', color: '#ff6b6b' };
};

// Steps: 0 = form, 1 = diet preferences, 2 = diet plan confirmation
const Assessment = () => {
  const { setUserProfile, setDietPlan, setWorkoutPlan } = useAuthStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    height: '', weight: '', age: '', gender: 'Male', goal: 'Weight Loss', fitnessLevel: 'Beginner'
  });
  const [computedBMI, setComputedBMI] = useState(null);
  const [suggestedGoal, setSuggestedGoal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dietPref, setDietPref] = useState(''); // 'veg' or 'nonveg'
  const [generatedPlans, setGeneratedPlans] = useState(null); // { workoutPlan, dietPlan }
  const [editingDiet, setEditingDiet] = useState(false);
  const [dietChangesRequest, setDietChangesRequest] = useState('');
  const [dietLoading, setDietLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = (data) => {
    const errs = {};
    const h = parseFloat(data.height), w = parseFloat(data.weight), a = parseInt(data.age);
    if (!data.height) errs.height = 'Required';
    else if (h < 100 || h > 250) errs.height = 'Must be 100–250 cm';
    if (!data.weight) errs.weight = 'Required';
    else if (w < 20 || w > 300) errs.weight = 'Must be 20–300 kg';
    if (!data.age) errs.age = 'Required';
    else if (a < 10 || a > 100) errs.age = 'Must be 10–100';
    return errs;
  };

  // ---- Step 0: Handle form submission ----
  const handleGenerate = async (e) => {
    e.preventDefault();
    const errs = validate(formData);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const h = parseFloat(formData.height);
    const w = parseFloat(formData.weight);
    const a = parseInt(formData.age);

    const heightInMeters = h / 100;
    const bmi = w / (heightInMeters * heightInMeters);
    setComputedBMI(bmi);

    let finalGoal = formData.goal;
    if (formData.goal === "Don't Know") {
      finalGoal = suggestGoalFromBMI(bmi);
      setSuggestedGoal(finalGoal);
    }

    setUserProfile({ ...formData, goal: finalGoal, bmi });
    setStep(1); // Move to diet preferences step
  };

  // ---- Step 1: Diet preference selected → generate plans ----
  const handleDietPrefSubmit = async () => {
    if (!dietPref) return;
    setLoading(true);
    const h = parseFloat(formData.height);
    const w = parseFloat(formData.weight);
    const a = parseInt(formData.age);
    const heightInMeters = h / 100;
    const bmi = w / (heightInMeters * heightInMeters);
    let bmr = formData.gender === 'Male'
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161;
    let tdee = bmr * 1.55;
    if (formData.goal === 'Weight Loss') tdee -= 500;
    if (formData.goal === 'Muscle Gain') tdee += 300;

    try {
      const payload = { ...formData, dietPreference: dietPref };
      const res = await axiosInstance.post('/api/chat/generate-plans', payload);
      const { workoutPlan, dietPlan } = res.data;
      setGeneratedPlans({ workoutPlan, dietPlan });
      setUserProfile({ ...formData, bmi, tdee, dietPreference: dietPref });
      setWorkoutPlan(workoutPlan);
      setStep(2);
    } catch (err) {
      console.error(err);
      alert('Network Error. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  // ---- Step 2: Confirm diet plan ----
  const handleConfirmDiet = () => {
    setDietPlan(generatedPlans.dietPlan);
    navigate('/dashboard');
  };

  const handleRequestDietChanges = async () => {
    if (!dietChangesRequest.trim()) return;
    setDietLoading(true);
    try {
      const res = await axiosInstance.post('/api/chat/revise-diet', {
        currentDiet: generatedPlans.dietPlan,
        changeRequest: dietChangesRequest,
        userProfile: formData,
        dietPreference: dietPref,
      });
      setGeneratedPlans(prev => ({ ...prev, dietPlan: res.data.dietPlan }));
      setDietChangesRequest('');
      setEditingDiet(false);
    } catch (err) {
      console.error(err);
      // Fallback: just confirm existing
      alert('Could not revise. Proceeding with existing plan.');
      setEditingDiet(false);
    } finally {
      setDietLoading(false);
    }
  };

  // ---- Render Step 0: Assessment Form ----
  const renderForm = () => (
    <div className="card" style={{ maxWidth: '700px', margin: '40px auto', padding: '40px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <Activity size={48} color="var(--clr-primary)" style={{ marginBottom: '16px' }} />
        <h1>Initial Assessment</h1>
        <p style={{ color: 'var(--clr-text-muted)' }}>Provide your stats and let JimBro build your total foundational plan.</p>
      </div>

      <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Height (cm)</label>
            <input type="number" className="form-input" placeholder="e.g. 175" min={100} max={250} value={formData.height}
              style={{ borderColor: errors.height ? 'var(--clr-accent)' : undefined }}
              onChange={e => { setFormData({ ...formData, height: e.target.value }); setErrors(prev => ({ ...prev, height: '' })); }} />
            {errors.height && <span style={{ fontSize: '0.78rem', color: 'var(--clr-accent)', marginTop: '2px' }}>{errors.height}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Weight (kg)</label>
            <input type="number" className="form-input" placeholder="e.g. 70" min={20} max={300} value={formData.weight}
              style={{ borderColor: errors.weight ? 'var(--clr-accent)' : undefined }}
              onChange={e => { setFormData({ ...formData, weight: e.target.value }); setErrors(prev => ({ ...prev, weight: '' })); }} />
            {errors.weight && <span style={{ fontSize: '0.78rem', color: 'var(--clr-accent)', marginTop: '2px' }}>{errors.weight}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Age</label>
            <input type="number" className="form-input" placeholder="e.g. 25" min={10} max={100} value={formData.age}
              style={{ borderColor: errors.age ? 'var(--clr-accent)' : undefined }}
              onChange={e => { setFormData({ ...formData, age: e.target.value }); setErrors(prev => ({ ...prev, age: '' })); }} />
            {errors.age && <span style={{ fontSize: '0.78rem', color: 'var(--clr-accent)', marginTop: '2px' }}>{errors.age}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Gender</label>
            <select className="form-input" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
              <option>Male</option>
              <option>Female</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Primary Goal</label>
          <select className="form-input" value={formData.goal} onChange={e => setFormData({ ...formData, goal: e.target.value })}>
            <option>Weight Loss</option>
            <option>Muscle Gain</option>
            <option>Maintenance</option>
            <option>Endurance</option>
            <option>Don't Know</option>
          </select>
          {formData.goal === "Don't Know" && (
            <p style={{ fontSize: '0.82rem', color: 'var(--clr-accent-blue)', marginTop: '6px' }}>
              💡 No worries! We'll suggest your best goal based on your BMI.
            </p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Fitness Level</label>
          <select className="form-input" value={formData.fitnessLevel} onChange={e => setFormData({ ...formData, fitnessLevel: e.target.value })}>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          Next: Diet Preferences <ArrowRight size={18} />
        </button>
      </form>
    </div>
  );

  // ---- Render Step 1: Diet Preferences ----
  const renderDietPreferences = () => {
    const bmiCategory = computedBMI ? BMI_CATEGORY(computedBMI) : null;
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '40px auto', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <Salad size={48} color="var(--clr-accent-green)" style={{ marginBottom: '16px' }} />
          <h1>Your Diet Preferences</h1>
          <p style={{ color: 'var(--clr-text-muted)', marginTop: '8px' }}>Almost there! Let us know your diet type to personalize your meal plan.</p>
        </div>

        {/* BMI Display */}
        {computedBMI && (
          <div style={{ background: 'var(--clr-surface-2)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your BMI</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: bmiCategory.color }}>{computedBMI.toFixed(1)}</div>
              <div style={{ fontSize: '0.85rem', color: bmiCategory.color, fontWeight: 600 }}>{bmiCategory.label}</div>
            </div>
            {suggestedGoal && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Suggested Goal</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--clr-primary)' }}>{suggestedGoal}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>Based on your BMI</div>
              </div>
            )}
          </div>
        )}

        <p style={{ fontWeight: 600, marginBottom: '16px' }}>Do you eat non-vegetarian food?</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
          <button
            type="button"
            onClick={() => setDietPref('nonveg')}
            style={{
              padding: '24px 16px', borderRadius: 'var(--radius-lg)', border: `2px solid ${dietPref === 'nonveg' ? 'var(--clr-primary)' : 'var(--clr-border)'}`,
              background: dietPref === 'nonveg' ? 'rgba(108,99,255,0.1)' : 'var(--clr-surface-2)', cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: 'var(--clr-text)'
            }}
          >
            <span style={{ fontSize: '2rem' }}>🍗</span>
            <span style={{ fontWeight: 600, fontSize: '1rem' }}>Non-Vegetarian</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted)' }}>Includes eggs, chicken, fish, meat</span>
          </button>
          <button
            type="button"
            onClick={() => setDietPref('veg')}
            style={{
              padding: '24px 16px', borderRadius: 'var(--radius-lg)', border: `2px solid ${dietPref === 'veg' ? 'var(--clr-accent-green)' : 'var(--clr-border)'}`,
              background: dietPref === 'veg' ? 'rgba(74,222,128,0.08)' : 'var(--clr-surface-2)', cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: 'var(--clr-text)'
            }}
          >
            <span style={{ fontSize: '2rem' }}>🥦</span>
            <span style={{ fontWeight: 600, fontSize: '1rem' }}>Vegetarian</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted)' }}>Plant-based, dairy, no meat</span>
          </button>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleDietPrefSubmit}
          disabled={!dietPref || loading}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          {loading ? <><span className="spinner" /> Generating Your Plans...</> : <>Generate My Plans <ArrowRight size={18} /></>}
        </button>
        <button className="btn btn-ghost" onClick={() => setStep(0)} style={{ width: '100%', marginTop: '10px' }}>← Back</button>
      </div>
    );
  };

  // ---- Render Step 2: Diet Plan Confirmation ----
  const renderDietConfirmation = () => {
    // Parse the diet plan JSON for preview
    let dietPreview = null;
    try {
      dietPreview = generatedPlans?.dietPlan
        ? (typeof generatedPlans.dietPlan === 'string' ? JSON.parse(generatedPlans.dietPlan) : generatedPlans.dietPlan)
        : null;
    } catch { dietPreview = null; }

    const meals = dietPreview?.meals || [];
    const MEAL_EMOJI = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎', 'pre-workout': '⚡', 'post-workout': '💪', bedtime: '🌙', evening: '🌆' };
    const getMealEmoji = (name = '') => { const l = name.toLowerCase(); for (const k of Object.keys(MEAL_EMOJI)) { if (l.includes(k)) return MEAL_EMOJI[k]; } return '🍽️'; };

    return (
      <div className="card" style={{ maxWidth: '820px', margin: '40px auto', padding: '36px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <CheckCircle size={48} color="var(--clr-accent-green)" style={{ marginBottom: '16px' }} />
          <h1>Review Your Diet Plan</h1>
          <p style={{ color: 'var(--clr-text-muted)' }}>
            Your personalized {dietPref === 'veg' ? 'vegetarian 🥦' : 'non-vegetarian 🍖'} meal plan.
            Confirm or request changes below.
          </p>
        </div>

        {/* Daily summary strip */}
        {dietPreview && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: 'Calories', value: dietPreview.dailyCalories || '—', unit: 'kcal', color: '#ff6b6b' },
              { label: 'Protein', value: dietPreview.macros?.protein || '—', unit: 'g', color: '#6c63ff' },
              { label: 'Carbs', value: dietPreview.macros?.carbs || '—', unit: 'g', color: '#38bdf8' },
              { label: 'Fat', value: dietPreview.macros?.fat || '—', unit: 'g', color: '#fbbf24' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'var(--clr-surface-2)', borderRadius: 'var(--radius-md)', padding: '14px', textAlign: 'center', border: '1px solid var(--clr-border)' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.value}<span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--clr-text-muted)', marginLeft: '2px' }}>{s.unit}</span></div>
                <div style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Meal cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {meals.length > 0 ? meals.map((meal, i) => (
            <div key={i} style={{ background: 'var(--clr-surface-2)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', border: '1px solid var(--clr-border)', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.8rem', flexShrink: 0 }}>{getMealEmoji(meal.name)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{meal.name}</div>
                    {meal.time && <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', marginTop: '2px' }}>🕐 {meal.time}</div>}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ff6b6b', textAlign: 'right' }}>
                    {meal.calories} <span style={{ fontSize: '0.7rem', color: 'var(--clr-text-muted)', fontWeight: 400 }}>kcal</span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--clr-text-muted)', fontWeight: 400 }}>
                      P:{meal.protein}g · C:{meal.carbs}g · F:{meal.fat}g
                    </div>
                  </div>
                </div>
                {Array.isArray(meal.items) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {meal.items.map((item, j) => (
                      <span key={j} style={{ fontSize: '0.78rem', background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', borderRadius: '100px', padding: '3px 10px', color: 'var(--clr-text-muted)' }}>
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', color: 'var(--clr-text-muted)', padding: '32px' }}>
              <p>Couldn't preview meals. Proceed to save — the plan will render correctly on the Diet page.</p>
            </div>
          )}
        </div>

        {!editingDiet ? (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-primary" onClick={handleConfirmDiet} style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <CheckCircle size={18} /> Looks Good, Save My Plan!
            </button>
            <button className="btn btn-ghost" onClick={() => setEditingDiet(true)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Edit3 size={16} /> Request Changes
            </button>
          </div>
        ) : (
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Describe what you'd like to change... e.g. 'Remove dairy', 'Add more protein', 'Keep it under 1800 calories'"
              value={dietChangesRequest}
              onChange={e => setDietChangesRequest(e.target.value)}
              style={{ resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary" onClick={handleRequestDietChanges} disabled={dietLoading} style={{ flex: 1 }}>
                {dietLoading ? <><span className="spinner" /> Revising...</> : 'Submit Changes'}
              </button>
              <button className="btn btn-ghost" onClick={() => setEditingDiet(false)} style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Progress steps indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '8px', marginTop: '16px' }}>
        {['Fitness Stats', 'Diet Preferences', 'Confirm Plan'].map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.78rem', fontWeight: 700,
              background: step > i ? 'var(--clr-accent-green)' : step === i ? 'var(--clr-primary)' : 'var(--clr-surface-2)',
              color: step >= i ? 'white' : 'var(--clr-text-muted)',
              border: `1px solid ${step === i ? 'var(--clr-primary)' : step > i ? 'var(--clr-accent-green)' : 'var(--clr-border)'}`
            }}>
              {step > i ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: '0.8rem', color: step === i ? 'var(--clr-text)' : 'var(--clr-text-muted)', fontWeight: step === i ? 600 : 400 }}>{label}</span>
            {i < 2 && <div style={{ width: '24px', height: '1px', background: step > i ? 'var(--clr-accent-green)' : 'var(--clr-border)' }} />}
          </div>
        ))}
      </div>

      {step === 0 && renderForm()}
      {step === 1 && renderDietPreferences()}
      {step === 2 && renderDietConfirmation()}
    </div>
  );
};

export default Assessment;
