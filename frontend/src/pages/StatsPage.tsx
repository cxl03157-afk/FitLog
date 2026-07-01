import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import NavBar from '../components/NavBar';
import ExerciseSelect from '../components/ExerciseSelect';
import { fetchExercises } from '../api/exercises';
import { getExerciseStats, getMonthlyStats, getWeeklyStats } from '../api/stats';
import type { ExerciseStatResponse, PeriodStat } from '../types/stats';
import type { Exercise } from '../types/workout';

type ActiveTab = 'weekly' | 'monthly';

// "2026-04-06" → "4/6週"
const formatWeekLabel = (period: string): string => {
  const [, m, d] = period.split('-');
  return `${parseInt(m, 10)}/${parseInt(d, 10)}週`;
};

// "2026-04" → "2026年4月"
const formatMonthLabel = (period: string): string => {
  const [y, m] = period.split('-');
  return `${y}年${parseInt(m, 10)}月`;
};

const formatVolumeTick = (v: number): string =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v));

const isAllZero = (stats: PeriodStat[]): boolean =>
  stats.every((s) => s.postCount === 0 && s.totalVolume === 0);

const StatsPage = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('weekly');

  const [stats, setStats] = useState<PeriodStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exercisesError, setExercisesError] = useState<string | null>(null);

  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [exerciseData, setExerciseData] = useState<ExerciseStatResponse | null>(null);
  const [exerciseLoading, setExerciseLoading] = useState(false);
  const [exerciseError, setExerciseError] = useState<string | null>(null);

  // タブ切り替えごとに週間・月間データを取得
  useEffect(() => {
    let cancelled = false;

    const fetch = activeTab === 'weekly' ? getWeeklyStats : getMonthlyStats;
    fetch()
      .then((data) => {
        if (cancelled) return;
        setStats(data);
        setStatsLoading(false);
        setStatsError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setStatsError('データ取得に失敗しました');
        setStatsLoading(false);
      });

    return () => {
      cancelled = true;
      setStats([]);
      setStatsLoading(true);
      setStatsError(null);
    };
  }, [activeTab]);

  // 種目一覧を初回のみ取得
  useEffect(() => {
    let cancelled = false;
    fetchExercises()
      .then((data) => {
        if (cancelled) return;
        setExercises(data);
      })
      .catch(() => {
        if (cancelled) return;
        setExercisesError('種目の取得に失敗しました');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 種目選択時に種目別データを取得
  useEffect(() => {
    if (!selectedExerciseId) return;

    let cancelled = false;

    getExerciseStats(selectedExerciseId)
      .then((data) => {
        if (cancelled) return;
        setExerciseData(data);
        setExerciseLoading(false);
        setExerciseError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setExerciseError('データ取得に失敗しました');
        setExerciseLoading(false);
      });

    return () => {
      cancelled = true;
      setExerciseData(null);
      setExerciseLoading(true);
      setExerciseError(null);
    };
  }, [selectedExerciseId]);

  const formatLabel = activeTab === 'weekly' ? formatWeekLabel : formatMonthLabel;

  const totalPosts = stats.reduce((sum, s) => sum + s.postCount, 0);
  const totalVolume = stats.reduce((sum, s) => sum + s.totalVolume, 0);

  const exerciseChartTitle =
    exerciseData?.metric === 'weight'
      ? '最大重量の推移'
      : exerciseData?.metric === 'reps'
        ? '最大回数の推移'
        : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">統計</h1>

        {/* タブ */}
        <div className="flex gap-2 mb-6" role="tablist">
          {(['weekly', 'monthly'] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
              }`}
            >
              {tab === 'weekly' ? '週間' : '月間'}
            </button>
          ))}
        </div>

        {/* 週間・月間グラフ */}
        {statsLoading ? (
          <p className="text-gray-500 text-center py-8">読み込み中...</p>
        ) : statsError ? (
          <p className="text-red-500 text-center py-8" role="alert">
            {statsError}
          </p>
        ) : isAllZero(stats) ? (
          <p className="text-gray-500 text-center py-8">
            まだトレーニング記録がありません
          </p>
        ) : (
          <>
            {/* 投稿回数グラフ */}
            <section aria-label="投稿回数" className="bg-white rounded-lg p-4 mb-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-1">投稿回数</h2>
              <p className="text-xs text-gray-500 mb-3">
                合計: <span className="font-bold text-gray-800">{totalPosts} 件</span>
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tickFormatter={formatLabel} tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip
                    labelFormatter={(label) => formatLabel(label as string)}
                    formatter={(value) => [
                      `${typeof value === 'number' ? value : 0} 件`,
                      '投稿回数',
                    ]}
                  />
                  <Bar dataKey="postCount" name="投稿回数" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </section>

            {/* 総ボリュームグラフ */}
            <section aria-label="総ボリューム" className="bg-white rounded-lg p-4 mb-6 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-1">総ボリューム</h2>
              <p className="text-xs text-gray-500 mb-3">
                合計:{' '}
                <span className="font-bold text-gray-800">
                  {Math.round(totalVolume).toLocaleString('ja-JP')} kg
                </span>
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tickFormatter={formatLabel} tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={formatVolumeTick} tick={{ fontSize: 10 }} />
                  <Tooltip
                    labelFormatter={(label) => formatLabel(label as string)}
                    formatter={(value) => {
                      const v = typeof value === 'number' ? value : 0;
                      return [
                        `${Math.round(v).toLocaleString('ja-JP')} kg`,
                        '総ボリューム',
                      ];
                    }}
                  />
                  <Bar dataKey="totalVolume" name="総ボリューム" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </section>
          </>
        )}

        {/* 種目別最大値推移 */}
        <section aria-label="種目別最大値推移" className="bg-white rounded-lg p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">種目別最大値推移</h2>

          <div className="block mb-4">
            <span className="text-xs text-gray-500 mb-1 block">種目を選択</span>
            <ExerciseSelect
              exercises={exercises}
              value={selectedExerciseId}
              onChange={setSelectedExerciseId}
              onExerciseCreated={() => {}}
              placeholder="選択してください"
              showCreate={false}
            />
          </div>

          {exercisesError && (
            <p className="text-red-500 text-sm" role="alert">
              {exercisesError}
            </p>
          )}

          {selectedExerciseId && (
            <>
              {exerciseLoading ? (
                <p className="text-gray-500 text-sm text-center py-4">読み込み中...</p>
              ) : exerciseError ? (
                <p className="text-red-500 text-sm text-center" role="alert">
                  {exerciseError}
                </p>
              ) : exerciseData?.metric === 'none' ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  この種目には表示できる記録がありません
                </p>
              ) : exerciseData ? (
                <>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">
                    {exerciseChartTitle}
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    単位: {exerciseData.unit === 'kg' ? 'kg' : '回'}
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={exerciseData.records}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis
                        unit={exerciseData.unit === 'kg' ? ' kg' : ' 回'}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip
                        formatter={(value) => [
                          `${typeof value === 'number' ? value : ''} ${exerciseData.unit ?? ''}`,
                          exerciseChartTitle ?? '',
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        name={
                          exerciseData.metric === 'weight' ? '最大重量(kg)' : '最大回数(回)'
                        }
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default StatsPage;
