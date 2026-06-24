import { useCallback, useEffect, useRef, useState } from 'react';
import NavBar from '../components/NavBar';
import { fetchExercises } from '../api/exercises';
import { createGoal, deleteGoal, getGoals, updateGoal } from '../api/goals';
import type { CreateGoalPayload, Goal, GoalStatus } from '../types/goal';
import type { Exercise } from '../types/workout';

type ActiveTab = 'all' | GoalStatus;

const getJstToday = (): string =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());

const TAB_ITEMS: { value: ActiveTab; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'IN_PROGRESS', label: '進行中' },
  { value: 'ACHIEVED', label: '達成' },
  { value: 'ABANDONED', label: '放棄' },
];

const EMPTY_MESSAGES: Record<ActiveTab, string> = {
  all: '目標がありません',
  IN_PROGRESS: '進行中の目標がありません',
  ACHIEVED: '達成済みの目標がありません',
  ABANDONED: '放棄済みの目標がありません',
};

const statusBadgeConfig = (status: GoalStatus) => {
  switch (status) {
    case 'IN_PROGRESS':
      return { label: '進行中', className: 'bg-indigo-100 text-indigo-700' };
    case 'ACHIEVED':
      return { label: '達成', className: 'bg-green-100 text-green-700' };
    case 'ABANDONED':
      return { label: '放棄', className: 'bg-gray-100 text-gray-600' };
  }
};

const formatDate = (iso: string): string => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${y}/${m}/${d}`;
};

const GoalsPage = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const [exercises, setExercises] = useState<Exercise[]>([]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exerciseId, setExerciseId] = useState('');
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [targetReps, setTargetReps] = useState('');
  const [deadline, setDeadline] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  // Per-goal processing state
  const [processingGoalId, setProcessingGoalId] = useState<string | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [abandonConfirmId, setAbandonConfirmId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  const refetch = useCallback(() => setRefetchKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    const statusParam = activeTab === 'all' ? undefined : activeTab;
    getGoals(statusParam)
      .then((data) => {
        if (cancelled) return;
        setGoals(data);
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
      setGoals([]);
      setIsLoading(true);
      setError(null);
    };
  }, [activeTab, refetchKey]);

  useEffect(() => {
    let cancelled = false;
    fetchExercises()
      .then((data) => {
        if (cancelled) return;
        setExercises(data);
      })
      .catch(() => {
        // exercise load failure is non-fatal
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resetForm = () => {
    setExerciseId('');
    setTargetWeightKg('');
    setTargetReps('');
    setDeadline('');
    setModalError(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
    addButtonRef.current?.focus();
  };

  const validateForm = (): string | null => {
    if (!exerciseId) return '種目を選択してください';
    const w = targetWeightKg.trim();
    const r = targetReps.trim();
    if (!w && !r) return '目標重量または目標回数を入力してください';
    if (w) {
      const wNum = parseFloat(w);
      if (isNaN(wNum) || wNum < 0.01 || wNum > 1000)
        return '目標重量は0.01以上1000以下で入力してください';
    }
    if (r) {
      const rNum = Number(r);
      if (!Number.isInteger(rNum) || rNum < 1 || rNum > 10000)
        return '目標回数は1以上10000以下の整数で入力してください';
    }
    if (deadline && deadline < getJstToday())
      return '期限は本日以降の日付を指定してください';
    return null;
  };

  const handleCreate = () => {
    const validationError = validateForm();
    if (validationError) {
      setModalError(validationError);
      return;
    }
    const w = targetWeightKg.trim();
    const r = targetReps.trim();
    const payload: CreateGoalPayload = {
      exerciseId,
      ...(w ? { targetWeightKg: parseFloat(w) } : {}),
      ...(r ? { targetReps: parseInt(r, 10) } : {}),
      ...(deadline ? { deadline } : {}),
    };
    setIsCreating(true);
    setModalError(null);
    createGoal(payload)
      .then(() => {
        closeModal();
        refetch();
      })
      .catch(() => {
        setModalError('保存に失敗しました');
      })
      .finally(() => setIsCreating(false));
  };

  const handleAchieve = (goalId: string) => {
    setProcessingGoalId(goalId);
    setCardErrors((prev) => ({ ...prev, [goalId]: '' }));
    updateGoal(goalId, { status: 'ACHIEVED' })
      .then(() => refetch())
      .catch((err) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        const msg =
          status === 400 ? 'この目標はすでに完了しています' : '操作に失敗しました';
        setCardErrors((prev) => ({ ...prev, [goalId]: msg }));
      })
      .finally(() => setProcessingGoalId(null));
  };

  const handleAbandon = (goalId: string) => {
    setProcessingGoalId(goalId);
    setAbandonConfirmId(null);
    setCardErrors((prev) => ({ ...prev, [goalId]: '' }));
    updateGoal(goalId, { status: 'ABANDONED' })
      .then(() => refetch())
      .catch(() => {
        setCardErrors((prev) => ({ ...prev, [goalId]: '操作に失敗しました' }));
      })
      .finally(() => setProcessingGoalId(null));
  };

  const handleDelete = (goalId: string) => {
    setDeletingGoalId(goalId);
    setDeleteConfirmId(null);
    setCardErrors((prev) => ({ ...prev, [goalId]: '' }));
    deleteGoal(goalId)
      .then(() => refetch())
      .catch(() => {
        setCardErrors((prev) => ({ ...prev, [goalId]: '削除に失敗しました' }));
      })
      .finally(() => setDeletingGoalId(null));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">目標設定</h1>
          <button
            ref={addButtonRef}
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
          >
            目標を追加
          </button>
        </div>

        {/* フィルタタブ */}
        <div className="flex flex-wrap gap-2 mb-6" role="tablist">
          {TAB_ITEMS.map(({ value, label }) => (
            <button
              key={value}
              role="tab"
              aria-selected={activeTab === value}
              onClick={() => setActiveTab(value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 一覧 */}
        {isLoading ? (
          <p className="text-gray-500 text-center py-8">読み込み中...</p>
        ) : error ? (
          <p className="text-red-500 text-center py-8" role="alert">
            {error}
          </p>
        ) : goals.length === 0 ? (
          <p className="text-gray-500 text-center py-8">{EMPTY_MESSAGES[activeTab]}</p>
        ) : (
          <ul className="space-y-4">
            {goals.map((goal) => {
              const badge = statusBadgeConfig(goal.status);
              const isProcessing = processingGoalId === goal.id;
              const isDeleting = deletingGoalId === goal.id;
              const cardError = cardErrors[goal.id];
              return (
                <li key={goal.id}>
                  <article className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800">{goal.exercise.name}</p>
                        <p className="text-xs text-gray-500">{goal.exercise.category}</p>
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1 text-sm text-gray-700">
                      {goal.targetWeightKg !== null && (
                        <p>目標重量: {goal.targetWeightKg} kg</p>
                      )}
                      {goal.targetReps !== null && (
                        <p>目標回数: {goal.targetReps} 回</p>
                      )}
                      <p>期限: {goal.deadline ? goal.deadline : '期限なし'}</p>
                      {goal.status === 'ACHIEVED' && goal.achievedAt && (
                        <p>達成日: {formatDate(goal.achievedAt)}</p>
                      )}
                    </div>

                    {cardError && (
                      <p className="mt-2 text-red-500 text-sm" role="alert">
                        {cardError}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {goal.status === 'IN_PROGRESS' && (
                        <>
                          <button
                            disabled={isProcessing || isDeleting}
                            onClick={() => handleAchieve(goal.id)}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            達成
                          </button>
                          {abandonConfirmId === goal.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600">本当に放棄しますか？</span>
                              <button
                                disabled={isProcessing}
                                onClick={() => handleAbandon(goal.id)}
                                className="px-3 py-1.5 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 disabled:opacity-50"
                              >
                                放棄する
                              </button>
                              <button
                                onClick={() => setAbandonConfirmId(null)}
                                className="px-3 py-1.5 border border-gray-300 text-xs rounded hover:bg-gray-100"
                              >
                                キャンセル
                              </button>
                            </div>
                          ) : (
                            <button
                              disabled={isProcessing || isDeleting}
                              onClick={() => setAbandonConfirmId(goal.id)}
                              className="px-3 py-1.5 border border-orange-400 text-orange-600 text-xs rounded hover:bg-orange-50 disabled:opacity-50"
                            >
                              放棄
                            </button>
                          )}
                        </>
                      )}

                      {deleteConfirmId === goal.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600">削除しますか？</span>
                          <button
                            disabled={isDeleting}
                            onClick={() => handleDelete(goal.id)}
                            className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            削除する
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-3 py-1.5 border border-gray-300 text-xs rounded hover:bg-gray-100"
                          >
                            キャンセル
                          </button>
                        </div>
                      ) : (
                        <button
                          disabled={isProcessing || isDeleting}
                          onClick={() => setDeleteConfirmId(goal.id)}
                          className="px-3 py-1.5 border border-red-400 text-red-600 text-xs rounded hover:bg-red-50 disabled:opacity-50"
                        >
                          削除
                        </button>
                      )}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}

        {/* 目標追加モーダル */}
        {isModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
              className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl"
            >
              <h2 id="modal-title" className="text-lg font-bold text-gray-800 mb-4">
                目標を追加
              </h2>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    種目 <span className="text-red-500">*</span>
                  </span>
                  <select
                    value={exerciseId}
                    onChange={(e) => setExerciseId(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">選択してください</option>
                    {exercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">目標重量 (kg)</span>
                  <input
                    type="number"
                    min="0.01"
                    max="1000"
                    step="0.01"
                    value={targetWeightKg}
                    onChange={(e) => setTargetWeightKg(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="例: 100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">目標回数</span>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    step="1"
                    value={targetReps}
                    onChange={(e) => setTargetReps(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="例: 10"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">期限</span>
                  <input
                    type="date"
                    min={getJstToday()}
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </label>
              </div>

              {modalError && (
                <p className="mt-3 text-red-500 text-sm" role="alert">
                  {modalError}
                </p>
              )}

              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  キャンセル
                </button>
                <button
                  disabled={isCreating}
                  onClick={handleCreate}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isCreating ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalsPage;
