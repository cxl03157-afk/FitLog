import { useEffect, useState } from 'react';
import axios from 'axios';
import NavBar from '../components/NavBar';
import {
  fetchExercises,
  createExercise,
  updateExercise,
  deleteExercise,
} from '../api/exercises';
import { EXERCISE_CATEGORIES, type Exercise } from '../types/workout';
import { useToast } from '../hooks/useToast';

export default function ExercisesPage() {
  const { showToast } = useToast();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const customExercises = exercises.filter((e) => e.userId !== null);

  useEffect(() => {
    fetchExercises()
      .then(setExercises)
      .catch(() => setError('種目の取得に失敗しました'))
      .finally(() => setIsLoading(false));
  }, []);

  const openCreateModal = () => {
    setEditingExercise(null);
    setFormName('');
    setFormCategory('');
    setFormDescription('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setFormName(exercise.name);
    setFormCategory(exercise.category);
    setFormDescription(exercise.description ?? '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingExercise(null);
    setFormName('');
    setFormCategory('');
    setFormDescription('');
    setFormError(null);
  };

  const handleSubmit = () => {
    if (!formName.trim()) {
      setFormError('種目名を入力してください');
      return;
    }
    if (!formCategory) {
      setFormError('カテゴリを選択してください');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    const descriptionValue = formDescription.trim() === '' ? null : formDescription.trim();

    if (editingExercise === null) {
      createExercise({ name: formName.trim(), category: formCategory })
        .then((created) => {
          setExercises((prev) => [...prev, { ...created, description: descriptionValue }]);
          closeModal();
          showToast('success', '種目を作成しました');
          return fetchExercises();
        })
        .then(setExercises)
        .catch((err: unknown) => {
          if (axios.isAxiosError(err) && err.response?.status === 409) {
            const data = err.response.data as { message?: string } | null;
            setFormError(data?.message ?? '同じ名前の種目がすでに存在します');
          } else {
            setFormError('作成に失敗しました');
          }
        })
        .finally(() => setIsSubmitting(false));
    } else {
      const dto = {
        name: formName.trim(),
        category: formCategory,
        description: descriptionValue,
      };
      updateExercise(editingExercise.id, dto)
        .then(() => fetchExercises())
        .then((updated) => {
          setExercises(updated);
          closeModal();
          showToast('success', '種目を更新しました');
        })
        .catch((err: unknown) => {
          if (axios.isAxiosError(err) && err.response?.status === 409) {
            const data = err.response.data as { message?: string } | null;
            setFormError(data?.message ?? '同じ名前の種目がすでに存在します');
          } else {
            setFormError('更新に失敗しました');
          }
        })
        .finally(() => setIsSubmitting(false));
    }
  };

  const handleDelete = (id: string) => {
    setIsDeleting(true);
    setDeleteConfirmId(null);
    deleteExercise(id)
      .then(() => fetchExercises())
      .then((updated) => {
        setExercises(updated);
        showToast('success', '種目を削除しました');
      })
      .catch((err: unknown) => {
        if (axios.isAxiosError(err) && err.response?.status === 409) {
          showToast('error', 'この種目は使用中のため削除できません');
        } else {
          showToast('error', '削除に失敗しました');
        }
      })
      .finally(() => setIsDeleting(false));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">独自種目管理</h1>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            ＋ 新しい種目を作成
          </button>
        </div>

        {isLoading ? (
          <p className="text-gray-500 text-center py-8">読み込み中...</p>
        ) : error ? (
          <p className="text-red-500 text-center py-8" role="alert">
            {error}
          </p>
        ) : customExercises.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            独自種目はまだありません。＋ボタンから作成できます。
          </p>
        ) : (
          <ul className="space-y-3">
            {customExercises.map((exercise) => (
              <li key={exercise.id}>
                <article className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm font-semibold text-gray-800 truncate">
                          {exercise.name}
                        </h2>
                        <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                          {exercise.category}
                        </span>
                      </div>
                      {exercise.description && (
                        <p className="mt-1 text-xs text-gray-500 break-words">
                          {exercise.description}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center gap-3">
                      <button
                        onClick={() => openEditModal(exercise)}
                        disabled={isDeleting}
                        className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(exercise.id)}
                        disabled={isDeleting}
                        className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
                      >
                        削除
                      </button>
                    </div>
                  </div>

                  {deleteConfirmId === exercise.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3">
                      <p className="text-xs text-gray-600">本当に削除しますか？</p>
                      <button
                        onClick={() => handleDelete(exercise.id)}
                        disabled={isDeleting}
                        className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {isDeleting ? '削除中...' : 'はい'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        disabled={isDeleting}
                        className="px-3 py-1 border border-gray-300 text-xs rounded hover:bg-gray-100 disabled:opacity-50"
                      >
                        いいえ
                      </button>
                    </div>
                  )}
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="exercise-modal-title"
            className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl"
          >
            <h2
              id="exercise-modal-title"
              className="text-lg font-bold text-gray-800 mb-4"
            >
              {editingExercise ? '種目を編集' : '新しい種目を作成'}
            </h2>

            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  種目名 <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    setFormError(null);
                  }}
                  maxLength={100}
                  placeholder="例: ケーブルフライ変形"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  カテゴリ <span className="text-red-500">*</span>
                </span>
                <select
                  value={formCategory}
                  onChange={(e) => {
                    setFormCategory(e.target.value);
                    setFormError(null);
                  }}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">選択してください</option>
                  {EXERCISE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">説明（任意）</span>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="種目の説明（省略可）"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </label>

              {formError && (
                <p className="text-sm text-red-600" role="alert">
                  {formError}
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
