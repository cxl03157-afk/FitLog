import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { fetchExercises } from '../api/exercises';
import { createWorkoutPost } from '../api/workoutPosts';
import type { Exercise } from '../types/workout';

type SetForm = { weightKg: string; reps: string; memo: string };
type ExerciseForm = { exerciseId: string; sets: SetForm[] };

const todayLocal = (): string => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const emptySet = (): SetForm => ({ weightKg: '', reps: '', memo: '' });
const emptyExercise = (): ExerciseForm => ({ exerciseId: '', sets: [emptySet()] });

const WorkoutPostNewPage = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [trainedOn, setTrainedOn] = useState(todayLocal);
  const [note, setNote] = useState('');
  const [exercises, setExercises] = useState<ExerciseForm[]>([emptyExercise()]);

  const [exerciseMaster, setExerciseMaster] = useState<Exercise[]>([]);
  const [masterLoading, setMasterLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchExercises()
      .then(setExerciseMaster)
      .catch(() => setError('種目マスタの取得に失敗しました。ページを再読み込みしてください。'))
      .finally(() => setMasterLoading(false));
  }, []);

  // 種目操作
  const addExercise = () => setExercises((prev) => [...prev, emptyExercise()]);
  const removeExercise = (ei: number) =>
    setExercises((prev) => prev.filter((_, i) => i !== ei));
  const updateExerciseId = (ei: number, exerciseId: string) =>
    setExercises((prev) =>
      prev.map((e, i) => (i === ei ? { ...e, exerciseId } : e)),
    );

  // セット操作
  const addSet = (ei: number) =>
    setExercises((prev) =>
      prev.map((e, i) => (i === ei ? { ...e, sets: [...e.sets, emptySet()] } : e)),
    );
  const removeSet = (ei: number, si: number) =>
    setExercises((prev) =>
      prev.map((e, i) =>
        i === ei ? { ...e, sets: e.sets.filter((_, j) => j !== si) } : e,
      ),
    );
  const updateSet = (ei: number, si: number, field: keyof SetForm, value: string) =>
    setExercises((prev) =>
      prev.map((e, i) =>
        i === ei
          ? {
              ...e,
              sets: e.sets.map((s, j) => (j === si ? { ...s, [field]: value } : s)),
            }
          : e,
      ),
    );

  const validate = (): string | null => {
    if (!title.trim()) return 'タイトルを入力してください。';
    if (title.trim().length > 100) return 'タイトルは100文字以内で入力してください。';
    if (!trainedOn) return 'トレーニング日を選択してください。';
    if (exercises.length === 0) return '種目を1つ以上追加してください。';
    for (let ei = 0; ei < exercises.length; ei++) {
      const e = exercises[ei];
      if (!e.exerciseId) return `${ei + 1}番目の種目を選択してください。`;
      if (e.sets.length === 0) return `${ei + 1}番目の種目にセットを1つ以上追加してください。`;
      for (let si = 0; si < e.sets.length; si++) {
        const s = e.sets[si];
        const wkg = parseFloat(s.weightKg);
        const r = parseInt(s.reps, 10);
        if (s.weightKg === '' || isNaN(wkg) || wkg < 0)
          return `${ei + 1}番目の種目、${si + 1}セット目の重量を正しく入力してください（0以上）。`;
        if (s.reps === '' || isNaN(r) || r < 1)
          return `${ei + 1}番目の種目、${si + 1}セット目の回数を正しく入力してください（1以上）。`;
      }
    }
    if (note.length > 500) return 'メモは500文字以内で入力してください。';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createWorkoutPost({
        title: title.trim(),
        note: note.trim() || undefined,
        trainedOn,
        exercises: exercises.map((e, ei) => ({
          exerciseId: e.exerciseId,
          orderIndex: ei,
          sets: e.sets.map((s, si) => ({
            setNumber: si + 1,
            weightKg: parseFloat(s.weightKg),
            reps: parseInt(s.reps, 10),
            memo: s.memo.trim() || undefined,
          })),
        })),
      });
      navigate('/');
    } catch {
      setError('投稿に失敗しました。再度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  // カテゴリ別グルーピング
  const categories = Array.from(new Set(exerciseMaster.map((e) => e.category))).sort();

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <div className="max-w-xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">トレーニングを記録する</h1>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5">
          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：胸の日"
              maxLength={100}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* トレーニング日 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              トレーニング日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={trainedOn}
              onChange={(e) => setTrainedOn(e.target.value)}
              max={todayLocal()}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 種目セクション */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              種目 <span className="text-red-500">*</span>
            </p>

            {masterLoading && (
              <p className="text-sm text-gray-400">種目マスタを読み込み中...</p>
            )}

            {exercises.map((ex, ei) => (
              <div key={ei} className="bg-white rounded-2xl shadow-sm p-4 mb-3 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <select
                    value={ex.exerciseId}
                    onChange={(e) => updateExerciseId(ei, e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">種目を選択</option>
                    {categories.map((cat) => (
                      <optgroup key={cat} label={cat}>
                        {exerciseMaster
                          .filter((e) => e.category === cat)
                          .map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                  {exercises.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeExercise(ei)}
                      className="text-red-400 hover:text-red-600 text-sm transition"
                    >
                      削除
                    </button>
                  )}
                </div>

                {/* セット一覧 */}
                <table className="w-full text-sm mb-2">
                  <thead>
                    <tr className="text-left text-gray-400 border-b">
                      <th className="pb-1 w-10">セット</th>
                      <th className="pb-1 w-24">重量 (kg)</th>
                      <th className="pb-1 w-20">回数</th>
                      <th className="pb-1">メモ</th>
                      <th className="pb-1 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ex.sets.map((s, si) => (
                      <tr key={si} className="border-b last:border-0">
                        <td className="py-1 text-gray-500">{si + 1}</td>
                        <td className="py-1 pr-1">
                          <input
                            type="number"
                            value={s.weightKg}
                            onChange={(e) => updateSet(ei, si, 'weightKg', e.target.value)}
                            min="0"
                            step="0.5"
                            placeholder="0"
                            className="w-full border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        </td>
                        <td className="py-1 pr-1">
                          <input
                            type="number"
                            value={s.reps}
                            onChange={(e) => updateSet(ei, si, 'reps', e.target.value)}
                            min="1"
                            placeholder="0"
                            className="w-full border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        </td>
                        <td className="py-1 pr-1">
                          <input
                            type="text"
                            value={s.memo}
                            onChange={(e) => updateSet(ei, si, 'memo', e.target.value)}
                            maxLength={200}
                            placeholder="メモ"
                            className="w-full border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        </td>
                        <td className="py-1 text-center">
                          {ex.sets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSet(ei, si)}
                              className="text-gray-300 hover:text-red-400 transition text-xs"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <button
                  type="button"
                  onClick={() => addSet(ei)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium transition"
                >
                  ＋ セット追加
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addExercise}
              className="w-full border-2 border-dashed border-gray-300 hover:border-blue-400 text-gray-500 hover:text-blue-600 rounded-lg py-2 text-sm font-medium transition"
            >
              ＋ 種目追加
            </button>
          </div>

          {/* 全体メモ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              全体メモ（任意）
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="今日のトレーニングの感想など..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-right text-xs text-gray-400 mt-0.5">{note.length}/500</p>
          </div>

          {/* ボタン */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-2 rounded-lg transition"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting || masterLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 rounded-lg transition"
            >
              {submitting ? '投稿中...' : '投稿する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkoutPostNewPage;
