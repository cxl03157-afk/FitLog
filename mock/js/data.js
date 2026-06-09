const MOCK_USER = {
  id: 1,
  username: 'tanaka_fit',
  displayName: '田中 健太',
  email: 'tanaka@example.com',
  bio: '週4でジム通い。ベンチ100kg目標中',
  avatarColor: 'bg-blue-500',
  postCount: 24,
  followingCount: 18,
  followerCount: 32,
};

const MOCK_POSTS = [
  {
    id: 1,
    userId: 1,
    displayName: '田中 健太',
    username: 'tanaka_fit',
    avatarColor: 'bg-blue-500',
    title: '胸の日',
    trainedOn: '2026-06-08',
    exercises: [
      { name: 'ベンチプレス', sets: 4, summary: '80kg x 8, 85kg x 6' },
      { name: 'インクラインダンベル', sets: 3, summary: '30kg x 10' },
    ],
    note: 'フォーム意識して重量上げた。',
    likes: 12,
    comments: 3,
    liked: false,
    isMine: true,
  },
  {
    id: 2,
    userId: 2,
    displayName: '佐藤 美咲',
    username: 'sato_misaki',
    avatarColor: 'bg-pink-500',
    title: '脚の日',
    trainedOn: '2026-06-07',
    exercises: [
      { name: 'スクワット', sets: 5, summary: '60kg x 10' },
      { name: 'レッグプレス', sets: 4, summary: '120kg x 12' },
    ],
    note: '脚がパンパン。',
    likes: 8,
    comments: 1,
    liked: true,
    isMine: false,
  },
  {
    id: 3,
    userId: 3,
    displayName: '鈴木 大輔',
    username: 'suzuki_dai',
    avatarColor: 'bg-green-500',
    title: '背中の日',
    trainedOn: '2026-06-06',
    exercises: [
      { name: 'デッドリフト', sets: 4, summary: '100kg x 5' },
      { name: 'ラットプルダウン', sets: 3, summary: '50kg x 12' },
    ],
    note: 'デッドリフトPR更新！',
    likes: 21,
    comments: 5,
    liked: false,
    isMine: false,
  },
  {
    id: 4,
    userId: 4,
    displayName: '山田 翔',
    username: 'yamada_run',
    avatarColor: 'bg-purple-500',
    title: 'ランニング＋体幹',
    trainedOn: '2026-06-05',
    exercises: [
      { name: 'ジョギング', sets: 1, summary: '5km 25分' },
      { name: 'プランク', sets: 3, summary: '60秒 x 3' },
    ],
    note: '朝ラン後に体幹強化。キレ良し。',
    likes: 6,
    comments: 2,
    liked: false,
    isMine: false,
  },
];

const MOCK_POST_DETAILS = {
  1: {
    exerciseDetails: [
      {
        name: 'ベンチプレス',
        sets: [
          { number: 1, weight: 60, reps: 12, isPr: false, memo: 'ウォームアップ' },
          { number: 2, weight: 80, reps: 8, isPr: false, memo: '' },
          { number: 3, weight: 85, reps: 6, isPr: true, memo: 'フォーム良好' },
          { number: 4, weight: 80, reps: 8, isPr: false, memo: '' },
        ],
      },
      {
        name: 'インクラインダンベル',
        sets: [
          { number: 1, weight: 30, reps: 10, isPr: false, memo: '' },
          { number: 2, weight: 30, reps: 10, isPr: false, memo: '' },
          { number: 3, weight: 28, reps: 12, isPr: false, memo: 'ドロップセット' },
        ],
      },
    ],
    comments: [
      { id: 1, user: '佐藤 美咲', username: 'sato_misaki', avatarColor: 'bg-pink-500', content: 'すごい！ベンチ伸びてるね', createdAt: '2026-06-08 19:30' },
      { id: 2, user: '鈴木 大輔', username: 'suzuki_dai', avatarColor: 'bg-green-500', content: 'フォーム大事にしてるのが伝わる', createdAt: '2026-06-08 20:15' },
      { id: 3, user: '田中 健太', username: 'tanaka_fit', avatarColor: 'bg-blue-500', content: 'ありがとう！', createdAt: '2026-06-08 21:00', isMine: true },
    ],
  },
  2: {
    exerciseDetails: [
      {
        name: 'スクワット',
        sets: [
          { number: 1, weight: 40, reps: 10, isPr: false, memo: 'ウォームアップ' },
          { number: 2, weight: 60, reps: 10, isPr: false, memo: '' },
          { number: 3, weight: 60, reps: 8, isPr: true, memo: '' },
        ],
      },
      {
        name: 'レッグプレス',
        sets: [
          { number: 1, weight: 100, reps: 12, isPr: false, memo: '' },
          { number: 2, weight: 120, reps: 12, isPr: false, memo: '' },
        ],
      },
    ],
    comments: [
      { id: 1, user: '田中 健太', username: 'tanaka_fit', avatarColor: 'bg-blue-500', content: '脚トレお疲れさま！', createdAt: '2026-06-07 18:00' },
    ],
  },
  3: {
    exerciseDetails: [
      {
        name: 'デッドリフト',
        sets: [
          { number: 1, weight: 80, reps: 5, isPr: false, memo: '' },
          { number: 2, weight: 100, reps: 5, isPr: true, memo: 'PR更新！' },
        ],
      },
      {
        name: 'ラットプルダウン',
        sets: [
          { number: 1, weight: 50, reps: 12, isPr: false, memo: '' },
          { number: 2, weight: 50, reps: 10, isPr: false, memo: '' },
        ],
      },
    ],
    comments: [
      { id: 1, user: '佐藤 美咲', username: 'sato_misaki', avatarColor: 'bg-pink-500', content: 'デッドすごい！', createdAt: '2026-06-06 20:00' },
      { id: 2, user: '田中 健太', username: 'tanaka_fit', avatarColor: 'bg-blue-500', content: 'おめでとう！', createdAt: '2026-06-06 21:00' },
    ],
  },
  4: {
    exerciseDetails: [
      {
        name: 'ジョギング',
        sets: [
          { number: 1, weight: 0, reps: 1, isPr: false, memo: '5km 25分、ペース5:00/km' },
        ],
      },
      {
        name: 'プランク',
        sets: [
          { number: 1, weight: 0, reps: 60, isPr: false, memo: '秒' },
          { number: 2, weight: 0, reps: 60, isPr: false, memo: '秒' },
          { number: 3, weight: 0, reps: 45, isPr: false, memo: '秒' },
        ],
      },
    ],
    comments: [
      { id: 1, user: '田中 健太', username: 'tanaka_fit', avatarColor: 'bg-blue-500', content: '朝ランいいね！', createdAt: '2026-06-05 07:30' },
      { id: 2, user: '佐藤 美咲', username: 'sato_misaki', avatarColor: 'bg-pink-500', content: '体幹もバッチリ', createdAt: '2026-06-05 12:00' },
    ],
  },
};

const MOCK_USER_PROFILES = [
  { id: 2, username: 'sato_misaki', displayName: '佐藤 美咲', avatarColor: 'bg-pink-500', bio: 'ヨガと筋トレのハイブリッド派', postCount: 15, followingCount: 22, followerCount: 45, following: true },
  { id: 3, username: 'suzuki_dai', displayName: '鈴木 大輔', avatarColor: 'bg-green-500', bio: 'パワーリフティングに挑戦中', postCount: 31, followingCount: 12, followerCount: 28, following: false },
  { id: 4, username: 'yamada_run', displayName: '山田 翔', avatarColor: 'bg-purple-500', bio: 'ランニングと体幹トレ', postCount: 8, followingCount: 30, followerCount: 19, following: true },
  { id: 5, username: 'ito_yoga', displayName: '伊藤 花', avatarColor: 'bg-yellow-500', bio: 'ストレッチ重視のトレーニング', postCount: 12, followingCount: 15, followerCount: 33, following: false },
];

const MOCK_USERS = [
  { id: 2, username: 'sato_misaki', displayName: '佐藤 美咲', avatarColor: 'bg-pink-500', following: true },
  { id: 3, username: 'suzuki_dai', displayName: '鈴木 大輔', avatarColor: 'bg-green-500', following: false },
  { id: 4, username: 'yamada_run', displayName: '山田 翔', avatarColor: 'bg-purple-500', following: true },
  { id: 5, username: 'ito_yoga', displayName: '伊藤 花', avatarColor: 'bg-yellow-500', following: false },
];

const MOCK_GOALS = [
  { id: 1, exercise: 'ベンチプレス', targetWeight: 100, targetReps: 5, deadline: '2026-09-30', status: 'IN_PROGRESS' },
  { id: 2, exercise: 'スクワット', targetWeight: 80, targetReps: 8, deadline: '2026-05-31', status: 'IN_PROGRESS' },
  { id: 3, exercise: 'デッドリフト', targetWeight: 120, targetReps: 3, deadline: '2026-06-01', status: 'ACHIEVED' },
];

const MOCK_SESSIONS = [
  { id: 'sess-1', deviceName: 'MacBook Pro', lastUsed: '2026-06-09 13:00', ip: '192.168.1.10', current: true },
  { id: 'sess-2', deviceName: 'iPhone 15', lastUsed: '2026-06-08 22:30', ip: '192.168.1.25', current: false },
  { id: 'sess-3', deviceName: 'iPad Air', lastUsed: '2026-06-07 08:15', ip: '192.168.1.30', current: false },
];

const MOCK_EXERCISES = [
  { category: '胸', name: 'ベンチプレス' },
  { category: '胸', name: 'インクラインダンベル' },
  { category: '脚', name: 'スクワット' },
  { category: '脚', name: 'レッグプレス' },
  { category: '背中', name: 'デッドリフト' },
  { category: '背中', name: 'ラットプルダウン' },
];
