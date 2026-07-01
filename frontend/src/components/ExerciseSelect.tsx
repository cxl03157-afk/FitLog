import { useState } from 'react';
import axios from 'axios';
import { EXERCISE_CATEGORIES, type Exercise } from '../types/workout';
import { createExercise } from '../api/exercises';
import { useToast } from '../hooks/useToast';

type ExerciseSelectProps = {
  exercises: Exercise[];
  value: string;
  onChange: (id: string) => void;
  onExerciseCreated: (exercise: Exercise) => void;
  placeholder?: string;
  disabled?: boolean;
  showCreate?: boolean;
};

export default function ExerciseSelect({
  exercises,
  value,
  onChange,
  onExerciseCreated,
  placeholder = '種目を選択してください',
  disabled = false,
  showCreate = true,
}: ExerciseSelectProps) {
  const { showToast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const standard = exercises.filter((e) => e.userId === null);
  const custom = [...exercises.filter((e) => e.userId !== null)].sort((a, b) =>
    a.name.localeCompare(b.name, 'ja'),
  );

  const handleCreate = async () => {
    if (!newName.trim()) {
      setFormError('種目名を入力してください');
      return;
    }
    if (!newCategory) {
      setFormError('カテゴリを選択してください');
      return;
    }
    setFormError(null);
    setIsCreating(true);
    try {
      const created = await createExercise({
        name: newName.trim(),
        category: newCategory,
      });
      onExerciseCreated(created);
      onChange(created.id);
      setIsFormOpen(false);
      setNewName('');
      setNewCategory('');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const data = err.response.data as { message?: string } | null;
        setFormError(data?.message ?? '同じ名前の種目がすでに存在します');
      } else {
        showToast('error', '種目の作成に失敗しました');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setNewName('');
    setNewCategory('');
    setFormError(null);
  };

  return (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400 disabled:bg-gray-100"
      >
        <option value="">{placeholder}</option>
        {EXERCISE_CATEGORIES.map((cat) => {
          const items = standard.filter((e) => e.category === cat);
          if (items.length === 0) return null;
          return (
            <optgroup key={cat} label={cat}>
              {items.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </optgroup>
          );
        })}
        {custom.length > 0 && (
          <optgroup label="独自種目">
            {custom.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}（{e.category}）
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {showCreate && (
        <div className="mt-1">
          {!isFormOpen ? (
            <button
              type="button"
              onClick={() => setIsFormOpen(true)}
              disabled={disabled}
              className="text-xs text-orange-600 hover:text-orange-700 disabled:opacity-50"
            >
              ＋ 新しい種目を作成
            </button>
          ) : (
            <div className="mt-2 p-3 border border-gray-200 rounded-md bg-gray-50 space-y-2">
              <input
                type="text"
                aria-label="種目名"
                placeholder="種目名（例: ケーブルフライ変形）"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setFormError(null);
                }}
                maxLength={100}
                className="block w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
              <select
                aria-label="カテゴリ"
                value={newCategory}
                onChange={(e) => {
                  setNewCategory(e.target.value);
                  setFormError(null);
                }}
                className="block w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
              >
                <option value="">カテゴリを選択</option>
                {EXERCISE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {formError && (
                <p className="text-xs text-red-600">{formError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="px-3 py-1.5 bg-orange-500 text-white text-xs font-medium rounded-md hover:bg-orange-600 disabled:opacity-50"
                >
                  {isCreating ? '作成中...' : '作成'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 hover:bg-gray-100"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
