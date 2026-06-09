const STORE_KEY = 'fitlog_mock_v4';
const LEGACY_STORE_KEYS = ['fitlog_mock_v1', 'fitlog_mock_v2', 'fitlog_mock_v3'];

function clearMockState() {
  LEGACY_STORE_KEYS.forEach((k) => sessionStorage.removeItem(k));
  sessionStorage.removeItem(STORE_KEY);
}

function ensureAuthState(state) {
  if (!Array.isArray(state.registeredUsers)) state.registeredUsers = [];
  if (!Array.isArray(state.accounts)) state.accounts = [];
  if (!state.nextUserId) state.nextUserId = 100;
  return state;
}

function getFollowableUserList(state) {
  const s = ensureAuthState(state || loadState());
  const registered = s.registeredUsers.map((u) => ({
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatarColor: u.avatarColor,
  }));
  const mockIds = new Set(MOCK_USERS.map((u) => u.id));
  return [...MOCK_USERS, ...registered.filter((u) => !mockIds.has(u.id))];
}

function normalizeFollowState(state) {
  ensureAuthState(state);
  const validIds = new Set(getFollowableUserList(state).map((u) => u.id));

  if (Array.isArray(state.followingIds)) {
    state.followingIds = [...new Set(
      state.followingIds.map((id) => Number(id)).filter((id) => validIds.has(id)),
    )];
  } else if (state.followingMap && typeof state.followingMap === 'object') {
    state.followingIds = MOCK_USERS
      .filter((u) => {
        const raw = state.followingMap[u.id] ?? state.followingMap[String(u.id)];
        return raw !== undefined ? Boolean(raw) : Boolean(u.following);
      })
      .map((u) => u.id);
  } else {
    state.followingIds = MOCK_USERS.filter((u) => u.following).map((u) => u.id);
  }

  delete state.followingMap;
  syncFollowingCount(state);
}

function ensureSeedPosts(state) {
  const existingIds = new Set(state.posts.map((p) => p.id));
  let changed = false;
  MOCK_POSTS.forEach((seed) => {
    if (existingIds.has(seed.id)) return;
    state.posts.push({ ...seed });
    const detail = MOCK_POST_DETAILS[seed.id];
    if (detail) {
      state.postDetails[seed.id] = JSON.parse(JSON.stringify(detail));
      state.commentsMap[seed.id] = [...detail.comments];
    }
    state.likesMap[seed.id] = seed.liked;
    changed = true;
  });
  return changed;
}

function buildSeedState() {
  const likesMap = {};
  MOCK_POSTS.forEach((p) => { likesMap[p.id] = p.liked; });

  const commentsMap = {};
  Object.entries(MOCK_POST_DETAILS).forEach(([id, detail]) => {
    commentsMap[id] = [...detail.comments];
  });

  const state = {
    currentUser: { ...MOCK_USER },
    followingIds: MOCK_USERS.filter((u) => u.following).map((u) => u.id),
    likesMap,
    posts: MOCK_POSTS.map((p) => ({ ...p })),
    postDetails: JSON.parse(JSON.stringify(MOCK_POST_DETAILS)),
    commentsMap,
    goals: MOCK_GOALS.map((g) => ({ ...g })),
    registeredUsers: [],
    accounts: [],
    nextPostId: 100,
    nextCommentId: 100,
    nextGoalId: 100,
    nextUserId: 100,
  };
  normalizeFollowState(state);
  return state;
}

function loadState() {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      ensureAuthState(state);
      normalizeFollowState(state);
      if (ensureSeedPosts(state)) saveState(state);
      return state;
    }
    for (const key of LEGACY_STORE_KEYS) {
      const legacy = sessionStorage.getItem(key);
      if (legacy) {
        const migrated = JSON.parse(legacy);
        normalizeFollowState(migrated);
        ensureSeedPosts(migrated);
        saveState(migrated);
        sessionStorage.removeItem(key);
        return migrated;
      }
    }
  } catch (_) { /* reset on corrupt data */ }
  LEGACY_STORE_KEYS.forEach((k) => sessionStorage.removeItem(k));
  const state = buildSeedState();
  saveState(state);
  return state;
}

function saveState(state) {
  normalizeFollowState(state);
  sessionStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function getCurrentUser() {
  return loadState().currentUser;
}

function updateCurrentUser(updates) {
  const state = loadState();
  state.currentUser = { ...state.currentUser, ...updates };
  saveState(state);
  return state.currentUser;
}

function getFollowingIds(state) {
  const ids = (state || loadState()).followingIds;
  return Array.isArray(ids) ? ids.map((id) => Number(id)) : [];
}

function getFollowingStatus(userId, state) {
  const id = Number(userId);
  return getFollowingIds(state).includes(id);
}

function syncFollowingCount(state) {
  if (!state.currentUser?.id) return;
  const myId = Number(state.currentUser.id);
  state.currentUser.followingCount = getFollowingIds(state)
    .filter((id) => id !== myId)
    .length;
}

function findUserProfile(userId, state) {
  const numId = Number(userId);
  const s = state || loadState();
  if (numId === s.currentUser.id) return { ...s.currentUser };
  if (numId === MOCK_USER.id) return { ...MOCK_USER };
  const mockProfile = MOCK_USER_PROFILES.find((u) => u.id === numId);
  if (mockProfile) return { ...mockProfile };
  const registered = s.registeredUsers.find((u) => u.id === numId);
  return registered ? { ...registered } : null;
}

function getUserById(id) {
  const numId = Number(id);
  const state = loadState();
  const base = findUserProfile(numId, state);
  if (!base) return null;
  if (numId === state.currentUser.id) {
    return {
      ...getCurrentUser(),
      postCount: state.posts.filter((p) => p.userId === numId).length,
      following: false,
    };
  }
  return {
    ...base,
    following: getFollowingStatus(numId, state),
  };
}

function getAllUsers() {
  const state = loadState();
  const myId = state.currentUser.id;
  return getFollowableUserList(state)
    .filter((u) => u.id !== myId)
    .map((u) => ({
      ...u,
      following: getFollowingStatus(u.id, state),
    }));
}

function isUsernameTaken(username) {
  const uname = username.trim().toLowerCase();
  const state = loadState();
  const names = [
    MOCK_USER.username,
    ...MOCK_USERS.map((u) => u.username),
    ...MOCK_USER_PROFILES.map((u) => u.username),
    ...state.registeredUsers.map((u) => u.username),
  ];
  return names.some((n) => n.toLowerCase() === uname);
}

function isEmailTaken(email) {
  const mail = email.trim().toLowerCase();
  if (mail === MOCK_USER.email.toLowerCase()) return true;
  return loadState().accounts.some((a) => a.email === mail);
}

function registerUser({ username, displayName, email, password }) {
  const state = loadState();
  const uname = username.trim().toLowerCase();
  const display = displayName.trim();
  const mail = email.trim().toLowerCase();

  if (!uname || !/^[a-z0-9_]{3,20}$/.test(uname)) {
    return { error: 'ユーザー名は3〜20文字の半角英数字とアンダースコアで入力してください' };
  }
  if (!display) return { error: '表示名を入力してください' };
  if (!mail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
    return { error: '有効なメールアドレスを入力してください' };
  }
  if (!password || password.length < 8) {
    return { error: 'パスワードは8文字以上で入力してください' };
  }
  if (isUsernameTaken(uname)) return { error: 'このユーザー名は既に使われています' };
  if (isEmailTaken(mail)) return { error: 'このメールアドレスは既に登録されています' };

  const colors = ['bg-red-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500'];
  const id = state.nextUserId++;
  const user = {
    id,
    username: uname,
    displayName: display,
    email: mail,
    bio: '',
    avatarColor: colors[id % colors.length],
    postCount: 0,
    followingCount: 0,
    followerCount: 0,
  };

  state.registeredUsers.push({ ...user });
  state.accounts.push({ email: mail, password, userId: id });
  state.currentUser = { ...user };
  state.followingIds = [];
  syncFollowingCount(state);
  saveState(state);
  return { user };
}

function loginUser({ email, password }) {
  const state = loadState();
  const mail = email.trim().toLowerCase();

  if (mail === MOCK_USER.email.toLowerCase()) {
    if (password !== 'password') {
      return { error: 'メールアドレスまたはパスワードが正しくありません' };
    }
    const preserved = state.currentUser?.id === MOCK_USER.id ? state.currentUser : null;
    state.currentUser = {
      ...MOCK_USER,
      ...(preserved ? { displayName: preserved.displayName, bio: preserved.bio } : {}),
    };
    state.currentUser.postCount = state.posts.filter((p) => p.userId === MOCK_USER.id).length;
    syncFollowingCount(state);
    saveState(state);
    return { user: state.currentUser };
  }

  const account = state.accounts.find((a) => a.email === mail);
  if (!account || account.password !== password) {
    return { error: 'メールアドレスまたはパスワードが正しくありません' };
  }

  const profile = state.registeredUsers.find((u) => u.id === account.userId);
  if (!profile) return { error: 'アカウントが見つかりません' };

  state.currentUser = {
    ...profile,
    postCount: state.posts.filter((p) => p.userId === profile.id).length,
  };
  syncFollowingCount(state);
  saveState(state);
  return { user: state.currentUser };
}

function toggleFollow(userId) {
  const state = loadState();
  const id = Number(userId);
  if (!getFollowableUserList(state).some((u) => u.id === id)) return getFollowingStatus(id, state);
  const ids = getFollowingIds(state);
  const idx = ids.indexOf(id);
  if (idx >= 0) ids.splice(idx, 1);
  else ids.push(id);
  state.followingIds = ids;
  saveState(state);
  return ids.includes(id);
}

function isFollowing(userId) {
  return getFollowingStatus(userId);
}

function getFollowingUserIds() {
  const state = loadState();
  const myId = state.currentUser.id;
  return state.followingIds.filter((id) => id !== myId);
}

function getPosts() {
  const state = loadState();
  return state.posts.map((p) => ({
    ...p,
    liked: !!state.likesMap[p.id],
    comments: (state.commentsMap[p.id] || []).length,
    isMine: p.userId === state.currentUser.id,
    displayName: p.userId === state.currentUser.id
      ? state.currentUser.displayName
      : p.displayName,
    username: p.userId === state.currentUser.id
      ? state.currentUser.username
      : p.username,
  }));
}

function getPost(id) {
  const postId = Number(id);
  const state = loadState();
  const post = state.posts.find((p) => p.id === postId);
  if (!post) return null;

  const detail = state.postDetails[postId] || {
    exerciseDetails: post.exercises.map((ex) => ({
      name: ex.name,
      sets: [{ number: 1, weight: 0, reps: 0, isPr: false, memo: ex.summary }],
    })),
    comments: [],
  };

  return {
    ...post,
    liked: !!state.likesMap[postId],
    isMine: post.userId === state.currentUser.id,
    exerciseDetails: detail.exerciseDetails,
    comments: state.commentsMap[postId] || detail.comments || [],
  };
}

function togglePostLike(postId) {
  const state = loadState();
  const id = Number(postId);
  const liked = !state.likesMap[id];
  state.likesMap[id] = liked;
  const post = state.posts.find((p) => p.id === id);
  if (post) post.likes += liked ? 1 : -1;
  saveState(state);
  return liked;
}

function addComment(postId, content) {
  const state = loadState();
  const id = Number(postId);
  const user = state.currentUser;
  const comment = {
    id: state.nextCommentId++,
    user: user.displayName,
    username: user.username,
    avatarColor: user.avatarColor,
    content: content.trim(),
    createdAt: new Date().toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit', month: '2-digit', day: '2-digit' }),
    isMine: true,
  };
  if (!state.commentsMap[id]) state.commentsMap[id] = [];
  state.commentsMap[id].push(comment);
  saveState(state);
  return comment;
}

function deleteComment(postId, commentId) {
  const state = loadState();
  const id = Number(postId);
  state.commentsMap[id] = (state.commentsMap[id] || []).filter((c) => c.id !== commentId);
  saveState(state);
}

function buildExercisePayload(formData) {
  const exercises = formData.exercises.map((ex) => ({
    name: ex.name,
    sets: ex.sets.length,
    summary: ex.sets.map((s) => `${s.weight}kg x ${s.reps}`).join(', '),
  }));
  const exerciseDetails = formData.exercises.map((ex) => ({
    name: ex.name,
    sets: ex.sets.map((s, i) => ({
      number: i + 1,
      weight: s.weight,
      reps: s.reps,
      isPr: s.isPr || false,
      memo: s.memo || '',
    })),
  }));
  return { exercises, exerciseDetails };
}

function addPost(formData) {
  const state = loadState();
  const user = state.currentUser;
  const id = state.nextPostId++;

  const { exercises, exerciseDetails } = buildExercisePayload(formData);

  const post = {
    id,
    userId: user.id,
    displayName: user.displayName,
    username: user.username,
    avatarColor: user.avatarColor,
    title: formData.title,
    trainedOn: formData.trainedOn,
    exercises,
    note: formData.note,
    likes: 0,
    comments: 0,
    liked: false,
    isMine: true,
  };

  state.posts.unshift(post);
  state.postDetails[id] = { exerciseDetails };
  state.commentsMap[id] = [];
  state.likesMap[id] = false;
  state.currentUser.postCount += 1;
  saveState(state);
  return post;
}

function updatePost(postId, formData) {
  const state = loadState();
  const id = Number(postId);
  const post = state.posts.find((p) => p.id === id);
  if (!post || post.userId !== state.currentUser.id) return null;

  const { exercises, exerciseDetails } = buildExercisePayload(formData);
  post.title = formData.title;
  post.trainedOn = formData.trainedOn;
  post.note = formData.note;
  post.exercises = exercises;
  post.displayName = state.currentUser.displayName;
  post.username = state.currentUser.username;

  state.postDetails[id] = { exerciseDetails };
  saveState(state);
  return post;
}

function deletePost(postId) {
  const state = loadState();
  const id = Number(postId);
  const post = state.posts.find((p) => p.id === id);
  if (post && post.userId === state.currentUser.id) {
    state.posts = state.posts.filter((p) => p.id !== id);
    delete state.postDetails[id];
    delete state.commentsMap[id];
    delete state.likesMap[id];
    state.currentUser.postCount = Math.max(0, state.currentUser.postCount - 1);
    saveState(state);
  }
}

function getGoals() {
  return loadState().goals;
}

function addGoal(goal) {
  const state = loadState();
  const g = { id: state.nextGoalId++, status: 'IN_PROGRESS', ...goal };
  state.goals.push(g);
  saveState(state);
  return g;
}

function updateGoal(goalId, updates) {
  const state = loadState();
  const id = Number(goalId);
  const idx = state.goals.findIndex((g) => g.id === id);
  if (idx >= 0) {
    state.goals[idx] = { ...state.goals[idx], ...updates };
    saveState(state);
    return state.goals[idx];
  }
  return null;
}

function deleteGoal(goalId) {
  const state = loadState();
  const id = Number(goalId);
  const before = state.goals.length;
  state.goals = state.goals.filter((g) => g.id !== id);
  if (state.goals.length < before) {
    saveState(state);
    return true;
  }
  return false;
}

function getExercisePersonalBest(exerciseName, targetReps) {
  const state = loadState();
  const userId = state.currentUser.id;
  let qualifying = { weight: 0, reps: 0 };
  let overall = { weight: 0, reps: 0 };

  state.posts.filter((p) => p.userId === userId).forEach((post) => {
    const detail = state.postDetails[post.id];
    if (!detail?.exerciseDetails) return;
    detail.exerciseDetails.forEach((ex) => {
      if (ex.name !== exerciseName) return;
      ex.sets.forEach((s) => {
        const w = Number(s.weight) || 0;
        const r = Number(s.reps) || 0;
        if (w > overall.weight || (w === overall.weight && r > overall.reps)) {
          overall = { weight: w, reps: r };
        }
        if (r >= targetReps && w > qualifying.weight) {
          qualifying = { weight: w, reps: r };
        }
      });
    });
  });
  return { qualifying, overall };
}

function getGoalProgress(goal) {
  const { qualifying, overall } = getExercisePersonalBest(goal.exercise, goal.targetReps);
  const hasQualifying = qualifying.weight > 0;
  const hasRecord = overall.weight > 0;
  const achieved = hasQualifying && qualifying.weight >= goal.targetWeight;
  const remaining = achieved ? 0 : Math.max(0, goal.targetWeight - (hasQualifying ? qualifying.weight : 0));
  return { qualifying, overall, hasQualifying, hasRecord, achieved, remaining };
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

if (getQueryParam('reset') === '1') {
  clearMockState();
  saveState(buildSeedState());
  const url = new URL(window.location.href);
  url.searchParams.delete('reset');
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
}
