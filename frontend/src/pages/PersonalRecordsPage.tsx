import { useCallback, useEffect, useRef, useState } from 'react';
import NavBar from '../components/NavBar';
import ExerciseSelect from '../components/ExerciseSelect';
import { fetchExercises } from '../api/exercises';
import {
  createPersonalRecord,
  deletePersonalRecord,
  fetchPersonalRecords,
  updatePersonalRecord,
} from '../api/personalRecords';
import type {
  CreatePersonalRecordPayload,
  PersonalRecord,
  PersonalRecordType,
  UpdatePersonalRecordPayload,
} from '../types/personalRecord';
import type { Exercise } from '../types/workout';
import { useToast } from '../hooks/useToast';

const RECORD_TYPE_LABEL: Record<PersonalRecordType, string> = {
  MAX_WEIGHT: '最大重量',
  MAX_REPS: '最大回数',
};

const parseWeight = (val: string): number | undefined => {
  if (val.trim() === '') return undefined;
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

const parseReps = (val: string): number | undefined => {
  if (val.trim() === '') return undefined;
  const n = Number(val);
  return Number.isFinite(n) && Number.isInteger(n) && n >= 1 ? n : undefined;
};

const formatDate = (iso: string): string => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${y}/${m}/${d}`;
};

const PersonalRecordsPage = () => {
  // ─── 一覧 ─────────────────────────────────────────────────────────────
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── 種目（独立フェッチ）────────────────────────────────────────────
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isExercisesLoading, setIsExercisesLoading] = useState(true);
  const [exercisesError, setExercisesError] = useState<string | null>(null);

  // ─── 共通Toast ───────────────────────────────────────────────────────
  const { showToast } = useToast();

  // ─── モーダル ─────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PersonalRecord | null>(null);
  const [exerciseId, setExerciseId] = useState('');
  const [recordType, setRecordType] = useState<PersonalRecordType>('MAX_WEIGHT');
  const [weightKgStr, setWeightKgStr] = useState('');
  const [repsStr, setRepsStr] = useState('');
  const [achievedAt, setAchievedAt] = useState('');
  const [noteStr, setNoteStr] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── 削除確認 ─────────────────────────────────────────────────────────
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const addButtonRef = useRef<HTMLButtonElement>(null);

  // ─── 初回フェッチ（一覧）────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetchPersonalRecords()
      .then((data) => {
        if (cancelled) return;
        setRecords(data);
        setIsLoading(false);
        setError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setError('一覧の取得に失敗しました');
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── 初回フェッチ（種目・独立）──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetchExercises()
      .then((data) => {
        if (cancelled) return;
        setExercises(data);
        setIsExercisesLoading(false);
        setExercisesError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setExercisesError('種目の取得に失敗しました');
        setIsExercisesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── モーダル制御 ────────────────────────────────────────────────────
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingRecord(null);
    setExerciseId('');
    setRecordType('MAX_WEIGHT');
    setWeightKgStr('');
    setRepsStr('');
    setAchievedAt('');
    setNoteStr('');
    setModalError(null);
    addButtonRef.current?.focus();
  }, []);

  const openCreateModal = () => {
    setEditingRecord(null);
    setExerciseId('');
    setRecordType('MAX_WEIGHT');
    setWeightKgStr('');
    setRepsStr('');
    setAchievedAt('');
    setNoteStr('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (record: PersonalRecord) => {
    setEditingRecord(record);
    setExerciseId(record.exerciseId);
    setRecordType(record.recordType);
    setWeightKgStr(record.weightKg != null ? String(record.weightKg) : '');
    setRepsStr(record.reps != null ? String(record.reps) : '');
    setAchievedAt(record.achievedAt);
    setNoteStr(record.note ?? '');
    setModalError(null);
    setIsModalOpen(true);
  };

  // ─── バリデーション ──────────────────────────────────────────────────
  const validateForm = (): string | null => {
    if (!exerciseId) return '種目を選択してください';
    if (!achievedAt) return '達成日を入力してください';
    if (noteStr.trim().length > 200) return 'メモは200文字以内で入力してください';
    if (recordType === 'MAX_WEIGHT') {
      if (parseWeight(weightKgStr) === undefined)
        return '重量は0より大きい数値を入力してください';
    } else {
      if (parseReps(repsStr) === undefined)
        return '回数を1以上の整数で入力してください';
    }
    return null;
  };

  // ─── 再取得ヘルパー ──────────────────────────────────────────────────
  const refetchAfterMutation = (successMsg: string, failMsg: string) =>
    fetchPersonalRecords()
      .then((data) => {
        setRecords(data);
        showToast('success', successMsg);
      })
      .catch(() => {
        showToast('error', failMsg);
      });

  // ─── 登録・更新送信 ──────────────────────────────────────────────────
  const handleSubmit = () => {
    const validationError = validateForm();
    if (validationError) {
      setModalError(validationError);
      return;
    }

    const trimmedNote = noteStr.trim();
    setIsSubmitting(true);
    setModalError(null);

    if (editingRecord === null) {
      const payload: CreatePersonalRecordPayload = {
        exerciseId,
        recordType,
        achievedAt,
        ...(recordType === 'MAX_WEIGHT'
          ? { weightKg: parseWeight(weightKgStr) as number }
          : { reps: parseReps(repsStr) as number }),
        ...(trimmedNote ? { note: trimmedNote } : {}),
      };

      createPersonalRecord(payload)
        .then(() => {
          closeModal();
          void refetchAfterMutation(
            'パーソナルレコードを登録しました',
            '登録しましたが、一覧の再取得に失敗しました',
          );
        })
        .catch(() => {
          setModalError('登録に失敗しました');
        })
        .finally(() => setIsSubmitting(false));
    } else {
      const payload: UpdatePersonalRecordPayload = {
        achievedAt,
        note: trimmedNote === '' ? null : trimmedNote,
        ...(recordType === 'MAX_WEIGHT'
          ? { weightKg: parseWeight(weightKgStr) as number }
          : { reps: parseReps(repsStr) as number }),
      };

      updatePersonalRecord(editingRecord.id, payload)
        .then(() => {
          closeModal();
          void refetchAfterMutation(
            'パーソナルレコードを更新しました',
            '更新しましたが、一覧の再取得に失敗しました',
          );
        })
        .catch(() => {
          setModalError('更新に失敗しました');
        })
        .finally(() => setIsSubmitting(false));
    }
  };

  // ─── 削除 ─────────────────────────────────────────────────────────────
  const handleDelete = (id: string) => {
    setIsDeleting(true);
    setDeleteConfirmId(null);
    deletePersonalRecord(id)
      .then(() =>
        void refetchAfterMutation(
          'パーソナルレコードを削除しました',
          '削除しましたが、一覧の再取得に失敗しました',
        ),
      )
      .catch(() => {
        showToast('error', '削除に失敗しました');
      })
      .finally(() => setIsDeleting(false));
  };

  const canOpenCreateModal =
    !isExercisesLoading && !exercisesError && exercises.length > 0;

  const createButtonTitle = isExercisesLoading
    ? '種目を読み込み中...'
    : exercisesError
      ? '種目の読み込みに失敗しました'
      : exercises.length === 0
        ? '登録できる種目がありません'
        : undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">PR記録</h1>
          <button
            ref={addButtonRef}
            onClick={openCreateModal}
            disabled={!canOpenCreateModal}
            title={createButtonTitle}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            新規登録
          </button>
        </div>

        {/* 種目取得エラー */}
        {exercisesError && (
          <p
            className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2"
            role="alert"
          >
            種目の読み込みに失敗しました。新規登録は現在利用できません。
          </p>
        )}
        {!isExercisesLoading && !exercisesError && exercises.length === 0 && (
          <p className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            登録できる種目がありません。
          </p>
        )}

        {/* PR 一覧 */}
        {isLoading ? (
          <p className="text-gray-500 text-center py-8">読み込み中...</p>
        ) : error ? (
          <p className="text-red-500 text-center py-8" role="alert">
            {error}
          </p>
        ) : records.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            まだパーソナルレコードがありません
          </p>
        ) : (
          <ul className="space-y-4">
            {records.map((record) => (
              <li key={record.id}>
                <article className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">
                        {record.exercise.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {record.exercise.category}
                      </p>
                    </div>
                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                      {RECORD_TYPE_LABEL[record.recordType]}
                    </span>
                  </div>

                  <div className="mt-2 space-y-1 text-sm text-gray-700">
                    {record.recordType === 'MAX_WEIGHT' &&
                      record.weightKg != null && (
                        <p>{record.weightKg} kg</p>
                      )}
                    {record.recordType === 'MAX_REPS' && record.reps != null && (
                      <p>{record.reps} 回</p>
                    )}
                    <p>達成日: {formatDate(record.achievedAt)}</p>
                    {record.note && (
                      <p className="text-gray-500 text-xs">{record.note}</p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => openEditModal(record)}
                      disabled={isDeleting}
                      className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      編集
                    </button>

                    {deleteConfirmId === record.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">
                          本当に削除しますか？
                        </span>
                        <button
                          disabled={isDeleting}
                          onClick={() => handleDelete(record.id)}
                          className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          {isDeleting ? '削除中...' : 'はい'}
                        </button>
                        <button
                          disabled={isDeleting}
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-1.5 border border-gray-300 text-xs rounded hover:bg-gray-100 disabled:opacity-50"
                        >
                          いいえ
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(record.id)}
                        disabled={isDeleting}
                        className="px-3 py-1.5 border border-red-400 text-red-600 text-xs rounded hover:bg-red-50 disabled:opacity-50"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* モーダル */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <h2
              id="modal-title"
              className="text-lg font-bold text-gray-800 mb-4"
            >
              {editingRecord ? 'PR記録を編集' : 'PR記録を登録'}
            </h2>

            <div className="space-y-4">
              {/* 種目 */}
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  種目 <span className="text-red-500">*</span>
                </span>
                {editingRecord ? (
                  <input
                    type="text"
                    value={editingRecord.exercise.name}
                    readOnly
                    className="mt-1 block w-full border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                  />
                ) : isExercisesLoading ? (
                  <p className="mt-1 text-sm text-gray-500">種目を読み込み中...</p>
                ) : exercisesError ? (
                  <p className="mt-1 text-sm text-red-500" role="alert">
                    {exercisesError}
                  </p>
                ) : (
                  <div className="mt-1">
                    <ExerciseSelect
                      exercises={exercises}
                      value={exerciseId}
                      onChange={setExerciseId}
                      onExerciseCreated={(newEx) => {
                        setExercises((prev) =>
                          prev.some((e) => e.id === newEx.id) ? prev : [...prev, newEx],
                        );
                      }}
                      placeholder="種目を選択してください"
                    />
                  </div>
                )}
              </label>

              {/* 記録タイプ */}
              <div>
                <span className="text-sm font-medium text-gray-700">
                  記録タイプ <span className="text-red-500">*</span>
                </span>
                {editingRecord ? (
                  <p className="mt-1 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                    {RECORD_TYPE_LABEL[recordType]}（変更不可）
                  </p>
                ) : (
                  <select
                    value={recordType}
                    onChange={(e) => {
                      setRecordType(e.target.value as PersonalRecordType);
                      setWeightKgStr('');
                      setRepsStr('');
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="MAX_WEIGHT">最大重量</option>
                    <option value="MAX_REPS">最大回数</option>
                  </select>
                )}
              </div>

              {/* 重量 or 回数 */}
              {recordType === 'MAX_WEIGHT' ? (
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    重量（kg）<span className="text-red-500">*</span>
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={weightKgStr}
                    onChange={(e) => setWeightKgStr(e.target.value)}
                    placeholder="例: 100"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </label>
              ) : (
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    回数（回）<span className="text-red-500">*</span>
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={repsStr}
                    onChange={(e) => setRepsStr(e.target.value)}
                    placeholder="例: 15"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </label>
              )}

              {/* 達成日 */}
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  達成日 <span className="text-red-500">*</span>
                </span>
                <input
                  type="date"
                  value={achievedAt}
                  onChange={(e) => setAchievedAt(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </label>

              {/* メモ */}
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  メモ（任意）
                </span>
                <textarea
                  value={noteStr}
                  onChange={(e) => setNoteStr(e.target.value)}
                  rows={3}
                  placeholder="200文字以内"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
                <p
                  className={`mt-0.5 text-xs text-right ${noteStr.length > 200 ? 'text-red-500' : 'text-gray-400'}`}
                >
                  {noteStr.length}/200
                </p>
              </label>

              {/* モーダル内エラー */}
              {modalError && (
                <p className="text-red-500 text-sm" role="alert">
                  {modalError}
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeModal}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalRecordsPage;
