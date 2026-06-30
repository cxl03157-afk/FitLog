import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import ExerciseSelect from '../components/ExerciseSelect';
import { fetchExercises } from '../api/exercises';
import { createWorkoutPost, uploadPostImages } from '../api/workoutPosts';
import type { Exercise } from '../types/workout';

type SetForm = { weightKg: string; reps: string; memo: string };
type ExerciseForm = { exerciseId: string; sets: SetForm[] };
type SelectedImage = { file: File; previewUrl: string };

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [imageErrors, setImageErrors] = useState<string[]>([]);
  const selectedImagesRef = useRef<SelectedImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchExercises()
      .then(setExerciseMaster)
      .catch(() => setError('種目マスタの取得に失敗しました。ページを再読み込みしてください。'))
      .finally(() => setMasterLoading(false));
  }, []);

  useEffect(() => {
    selectedImagesRef.current = selectedImages;
  }, [selectedImages]);

  useEffect(() => {
    return () => {
      selectedImagesRef.current.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    e.target.value = '';

    const current = selectedImagesRef.current;
    const available = 4 - current.length;
    const errors: string[] = [];
    const valid: SelectedImage[] = [];

    for (const file of incoming) {
      const isDup =
        current.some(
          (img) =>
            img.file.name === file.name &&
            img.file.size === file.size &&
            img.file.lastModified === file.lastModified,
        ) ||
        valid.some(
          (img) =>
            img.file.name === file.name &&
            img.file.size === file.size &&
            img.file.lastModified === file.lastModified,
        );
      if (isDup) {
        errors.push(`${file.name}: 重複したファイルです`);
        continue;
      }
      if (!ALLOWED_MIME.includes(file.type)) {
        errors.push(`${file.name}: 対応していないファイル形式です（JPEG/PNG/WebP のみ）`);
        continue;
      }
      if (file.size === 0) {
        errors.push(`${file.name}: 空のファイルです`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: ファイルサイズが10MBを超えています`);
        continue;
      }
      valid.push({ file, previewUrl: URL.createObjectURL(file) });
    }

    let toAdd = valid;
    if (valid.length > available) {
      const excluded = valid.length - available;
      valid.slice(available).forEach((img) => URL.revokeObjectURL(img.previewUrl));
      errors.push(`最大4枚まで選択できます（${excluded}枚は除外されました）`);
      toAdd = valid.slice(0, available);
    }

    setImageErrors(errors);
    if (toAdd.length > 0) {
      setSelectedImages((prev) => [...prev, ...toAdd]);
    }
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(selectedImages[index].previewUrl);
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
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

    const dto = {
      title: title.trim(),
      note: note.trim() || undefined,
      trainedOn,
      exercises: exercises.map((ex, ei) => ({
        exerciseId: ex.exerciseId,
        orderIndex: ei,
        sets: ex.sets.map((s, si) => ({
          setNumber: si + 1,
          weightKg: parseFloat(s.weightKg),
          reps: parseInt(s.reps, 10),
          memo: s.memo.trim() || undefined,
        })),
      })),
    };

    let postId: string;
    try {
      const created = await createWorkoutPost(dto);
      postId = created.id;
    } catch {
      setError('投稿に失敗しました。再度お試しください。');
      setSubmitting(false);
      return;
    }

    if (selectedImages.length > 0) {
      try {
        await uploadPostImages(postId, selectedImages.map((img) => img.file));
      } catch {
        navigate('/', { state: { toast: '投稿は保存されましたが、画像のアップロードに失敗しました' } });
        return;
      }
    }

    navigate('/');
  };

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
                <div className="flex items-start gap-2 mb-3">
                  <div className="flex-1">
                    <ExerciseSelect
                      exercises={exerciseMaster}
                      value={ex.exerciseId}
                      onChange={(id) => updateExerciseId(ei, id)}
                      onExerciseCreated={(newEx) => {
                        setExerciseMaster((prev) =>
                          prev.some((e) => e.id === newEx.id) ? prev : [...prev, newEx],
                        );
                      }}
                      placeholder="種目を選択"
                      disabled={submitting}
                    />
                  </div>
                  {exercises.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeExercise(ei)}
                      className="text-red-400 hover:text-red-600 text-sm transition mt-2"
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

          {/* 画像（任意） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              画像（任意・最大4枚）
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleImageSelect}
              data-testid="image-file-input"
            />
            {imageErrors.length > 0 && (
              <ul className="mb-2 text-sm text-red-600 space-y-0.5">
                {imageErrors.map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
              </ul>
            )}
            {selectedImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-2">
                {selectedImages.map((img, i) => (
                  <div key={img.previewUrl} className="relative aspect-square">
                    <img
                      src={img.previewUrl}
                      alt={img.file.name}
                      className="w-full h-full object-cover rounded-lg"
                      data-testid={`image-preview-${i}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/70 leading-none"
                      aria-label={`画像${i + 1}を削除`}
                      data-testid={`remove-image-${i}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            {selectedImages.length < 4 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition"
                data-testid="add-image-button"
              >
                ＋ 画像を追加（{selectedImages.length}/4）
              </button>
            )}
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
