import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      userProfile: {
        height: '',
        weight: '',
        age: '',
        gender: 'Male',
        goal: 'Weight Loss',
        fitnessLevel: 'Beginner',
        bmi: null,
        tdee: null,
      },
      dietPlan: null,
      workoutPlan: null,
      pendingChatMessage: null,
      reminders: [
        { id: 1, text: "Drink 3L of Water", done: false },
        { id: 2, text: "Hit Protein Goal", done: false },
        { id: 3, text: "Get 7-8 hours of sleep", done: false },
        { id: 4, text: "10-min morning stretch", done: false },
      ],
      
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setUserProfile: (profileUpdates) => set((state) => ({ 
        userProfile: { ...state.userProfile, ...profileUpdates } 
      })),
      
      setDietPlan: (dietPlan) => set({ dietPlan }),
      setWorkoutPlan: (workoutPlan) => set({ workoutPlan }),
      setReminders: (reminders) => set({ reminders }),
      setPendingChatMessage: (msg) => set({ pendingChatMessage: msg }),
      
      toggleReminder: (id) => set((state) => ({
        reminders: state.reminders.map(r => r.id === id ? { ...r, done: !r.done } : r)
      })),
      
      logout: () => set({ 
        user: null, 
        isAuthenticated: false, 
        userProfile: { height: '', weight: '', age: '', gender: 'Male', goal: 'Weight Loss', fitnessLevel: 'Beginner', bmi: null, tdee: null },
        dietPlan: null,
        workoutPlan: null,
        pendingChatMessage: null,
        reminders: []
      }),
    }),
    { name: 'jimbro_auth' }
  )
);

export default useAuthStore;

