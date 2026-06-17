export type Exercise = {
  id: string;
  name: string;
  category: string;
  description: string | null;
};

export type ExerciseSet = {
  id: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  isPr: boolean;
  memo: string | null;
};

export type WorkoutExercise = {
  id: string;
  exerciseId: string;
  orderIndex: number;
  exercise: Exercise;
  sets: ExerciseSet[];
};

export type WorkoutPost = {
  id: string;
  userId: string;
  title: string;
  note: string | null;
  trainedOn: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
  };
  workoutExercises: WorkoutExercise[];
};

export type WorkoutPostsResponse = {
  data: WorkoutPost[];
  total: number;
};

export type CreateExerciseSetDto = {
  setNumber: number;
  weightKg: number;
  reps: number;
  isPr?: boolean;
  memo?: string;
};

export type CreateWorkoutExerciseDto = {
  exerciseId: string;
  orderIndex: number;
  sets: CreateExerciseSetDto[];
};

export type CreateWorkoutPostDto = {
  title: string;
  note?: string;
  trainedOn: string;
  exercises: CreateWorkoutExerciseDto[];
};
