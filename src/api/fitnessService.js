import axiosInstance from './axiosInstance';

// /ai/generate: { height, weight, age, gender, goal, fitnessLevel }
export const generateAIPlan = (data) =>
  axiosInstance.post('/ai/generate', data).then((res) => res.data);

// /workout/generate: { goal, fitnessLevel }
export const generateWorkout = (data) =>
  axiosInstance.post('/workout/generate', data).then((res) => res.data);

// /diet/generate: { tdee, goal }
export const generateDiet = (data) =>
  axiosInstance.post('/diet/generate', data).then((res) => res.data);

// /fitness/assess: { height, weight, age, gender, activityLevel }
export const assessFitness = (data) =>
  axiosInstance.post('/fitness/assess', data).then((res) => res.data);
