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

export type WorkoutComment = {
  id: string;
  workoutPostId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: { id: string; username: string; displayName: string };
};

export type PostImageItem = {
  id: string;
  imageKey: string;
  displayOrder: number;
  imageUrl: string;
};

export type WorkoutPost = {
  id: string;
  userId: string;
  title: string;
  note: string | null;
  trainedOn: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  user: {
    id: string;
    username: string;
    displayName: string;
  };
  workoutExercises: WorkoutExercise[];
  postImages: PostImageItem[];
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
