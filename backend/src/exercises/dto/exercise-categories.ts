export const EXERCISE_CATEGORIES = [
  '胸',
  '背中',
  '脚',
  '肩',
  '腕',
  '体幹',
] as const;

export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];
