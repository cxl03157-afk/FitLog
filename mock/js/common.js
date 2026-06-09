function renderNav(activePage) {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const items = [
    { href: 'timeline.html', label: 'ホーム', key: 'timeline', icon: '🏠' },
    { href: 'search.html', label: '検索', key: 'search', icon: '🔍' },
    { href: 'workout-post-new.html', label: '投稿', key: 'post', icon: '✏️' },
    { href: 'stats.html', label: '統計', key: 'stats', icon: '📊' },
    { href: 'goals.html', label: '目標', key: 'goals', icon: '🎯' },
    { href: 'profile.html', label: 'プロフィール', key: 'profile', icon: '👤' },
  ];
  nav.innerHTML = `
    <header class="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div class="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <a href="timeline.html" class="text-xl font-bold text-indigo-600">FitLog</a>
        <nav class="flex items-center gap-1">
          ${items.map((item) => `
            <a href="${item.href}"
               class="px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${activePage === item.key ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}">
              <span class="mr-1">${item.icon}</span>${item.label}
            </a>
          `).join('')}
          <a href="sessions.html" class="px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100" title="デバイス管理">⚙️</a>
          <a href="login.html" class="ml-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50">ログアウト</a>
        </nav>
      </div>
    </header>`;
}

function avatarHtml(color, size = 'w-10 h-10') {
  return `<div class="${size} ${color} rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0">F</div>`;
}

function statusBadge(status) {
  const map = { IN_PROGRESS: 'bg-blue-100 text-blue-800', ACHIEVED: 'bg-green-100 text-green-800', ABANDONED: 'bg-gray-100 text-gray-600' };
  const labels = { IN_PROGRESS: '進行中', ACHIEVED: '達成', ABANDONED: '中止' };
  return `<span class="px-2 py-1 rounded-full text-xs font-medium ${map[status]}">${labels[status]}</span>`;
}

function goalEffectiveStatus(goal) {
  if (goal.status !== 'IN_PROGRESS') return goal.status;
  if (goal.deadline < todayISO()) return 'OVERDUE';
  return 'IN_PROGRESS';
}

function goalStatusBadge(goal) {
  const status = goalEffectiveStatus(goal);
  const map = {
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    OVERDUE: 'bg-amber-100 text-amber-800',
    ACHIEVED: 'bg-green-100 text-green-800',
    ABANDONED: 'bg-gray-100 text-gray-600',
  };
  const labels = {
    IN_PROGRESS: '進行中',
    OVERDUE: '期限切れ',
    ACHIEVED: '達成',
    ABANDONED: '中止',
  };
  return `<span class="px-2 py-1 rounded-full text-xs font-medium ${map[status]}">${labels[status]}</span>`;
}

function goalProgressHtml(goal) {
  const active = goal.status === 'IN_PROGRESS';
  if (!active) return '';

  const p = getGoalProgress(goal);
  const recordLine = p.hasQualifying
    ? `<p class="text-sm text-gray-600 mt-2">現在の最高記録: <span class="font-medium">${p.qualifying.weight} kg × ${p.qualifying.reps} 回</span></p>`
    : p.hasRecord
      ? `<p class="text-sm text-gray-600 mt-2">現在の最高記録: <span class="font-medium">${p.overall.weight} kg × ${p.overall.reps} 回</span></p>`
      : '<p class="text-sm text-gray-500 mt-2">現在の最高記録: 記録なし</p>';

  const gapLine = p.achieved
    ? '<p class="text-sm text-green-600 mt-1">目標重量に到達しています</p>'
    : `<p class="text-sm text-indigo-600 mt-1">達成まであと <span class="font-medium">${p.remaining} kg</span></p>`;

  return recordLine + gapLine;
}

function isFollowableUser(userId) {
  const id = Number(userId);
  return id !== getCurrentUser().id && getFollowableUserList().some((u) => u.id === id);
}

function followButtonClasses(following, compact) {
  if (compact) {
    return following
      ? 'follow-btn text-xs px-2.5 py-1 rounded-md border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 cursor-pointer transition-colors'
      : 'follow-btn text-xs px-2.5 py-1 rounded-md border border-indigo-300 text-indigo-600 bg-white hover:bg-indigo-50 cursor-pointer transition-colors';
  }
  return following
    ? 'follow-btn text-sm px-4 py-1.5 rounded-lg border border-gray-300 text-gray-700 cursor-pointer transition-colors'
    : 'follow-btn text-sm px-4 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer transition-colors';
}

function followButtonHtml(userId, following, compact = false) {
  const label = following ? 'フォロー中' : 'フォロー';
  const compactAttr = compact ? ' data-follow-compact="1"' : '';
  return `<button type="button" class="${followButtonClasses(following, compact)}" data-user-id="${userId}"${compactAttr}>${label}</button>`;
}

function updateFollowButton(btn, following) {
  const compact = btn.dataset.followCompact === '1';
  btn.className = followButtonClasses(following, compact);
  btn.textContent = following ? 'フォロー中' : 'フォロー';
}

function syncFollowButtonsIn(container) {
  const root = container || document;
  root.querySelectorAll('.follow-btn').forEach((btn) => {
    updateFollowButton(btn, isFollowing(Number(btn.dataset.userId)));
  });
}

function getFollowDisplayName(userId) {
  const user = getUserById(userId);
  return user?.displayName || 'このユーザー';
}

function bindFollowButtons(container, onChange) {
  const root = container || document;
  root._followOnChange = onChange || (() => syncFollowButtonsIn(root));
  if (root._followDelegationBound) return;
  root._followDelegationBound = true;
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.follow-btn');
    if (!btn || !root.contains(btn)) return;
    e.preventDefault();
    e.stopPropagation();
    const userId = Number(btn.dataset.userId);
    if (isFollowing(userId)) {
      const name = getFollowDisplayName(userId);
      if (!confirm(`${name}のフォローを解除しますか？`)) return;
    }
    toggleFollow(userId);
    root._followOnChange(userId);
  });
}

function calcWorkoutStats(post) {
  let totalSets = 0;
  (post.exercises || []).forEach((ex) => {
    totalSets += Number(ex.sets) || 0;
  });

  let totalVolume = 0;
  const detail = getPost(post.id);
  if (detail?.exerciseDetails?.length) {
    detail.exerciseDetails.forEach((ex) => {
      ex.sets.forEach((s) => {
        totalVolume += (Number(s.weight) || 0) * (Number(s.reps) || 0);
      });
    });
  }
  return { totalSets, totalVolume };
}

function workoutStatsText(post) {
  const { totalSets, totalVolume } = calcWorkoutStats(post);
  const volumeText = totalVolume > 0
    ? `総ボリューム ${totalVolume.toLocaleString('ja-JP')} kg`
    : '総ボリューム —';
  return `合計${totalSets}セット・${volumeText}`;
}

function workoutStatsHtml(post) {
  return `<p class="text-xs text-gray-400 mb-2">${workoutStatsText(post)}</p>`;
}

function getUserIdByUsername(username) {
  const current = getCurrentUser();
  if (username === current.username) return current.id;
  if (username === MOCK_USER.username) return MOCK_USER.id;
  const profile = MOCK_USER_PROFILES.find((u) => u.username === username);
  if (profile) return profile.id;
  const user = MOCK_USERS.find((u) => u.username === username);
  if (user) return user.id;
  const registered = loadState().registeredUsers.find((u) => u.username === username);
  return registered?.id ?? null;
}

function profileUrlForUserId(userId) {
  if (Number(userId) === getCurrentUser().id) return 'profile.html';
  return `profile.html?user=${userId}`;
}

function commentAuthorProfileUrl(comment) {
  const id = comment.isMine
    ? getCurrentUser().id
    : getUserIdByUsername(comment.username);
  return id ? profileUrlForUserId(id) : null;
}

function commentItemHtml(comment, postId) {
  const href = commentAuthorProfileUrl(comment);
  const avatarBlock = href
    ? `<a href="${href}" class="shrink-0 hover:opacity-80">${avatarHtml(comment.avatarColor, 'w-9 h-9')}</a>`
    : avatarHtml(comment.avatarColor, 'w-9 h-9');
  const nameLine = href
    ? `<a href="${href}" class="font-semibold hover:text-indigo-600">${comment.user}</a> <a href="${href}" class="text-gray-400 hover:text-indigo-600">@${comment.username}</a>`
    : `<span class="font-semibold">${comment.user}</span> <span class="text-gray-400">@${comment.username}</span>`;

  return `
    <div class="py-4">
      <div class="flex gap-3 group">
        ${avatarBlock}
        <div class="flex-1 min-w-0">
          <p class="text-sm">${nameLine}</p>
          <p class="text-gray-700 mt-1">${comment.content}</p>
          <p class="text-xs text-gray-400 mt-1">${comment.createdAt}</p>
        </div>
        ${comment.isMine ? `<button type="button" data-comment-id="${comment.id}" class="delete-comment text-xs text-red-500 opacity-0 group-hover:opacity-100 shrink-0">削除</button>` : ''}
      </div>
    </div>
  `;
}

function bindCommentDeletes(container, postId, onDelete) {
  (container || document).querySelectorAll('.delete-comment').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!confirm('このコメントを削除しますか？')) return;
      deleteComment(postId, Number(btn.dataset.commentId));
      if (onDelete) onDelete();
    });
  });
}

function profilePostCardHtml(post) {
  return `
    <a href="workout-post-detail.html?id=${post.id}" class="block bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-200 transition-colors">
      <p class="font-semibold text-gray-900">${post.title}</p>
      <p class="text-sm text-gray-500 mt-1">${post.trainedOn}</p>
      <p class="text-xs text-gray-400 mt-1">${workoutStatsText(post)}</p>
      <p class="text-sm text-gray-500 mt-2">♡ ${post.likes}　💬 ${post.comments}</p>
    </a>
  `;
}

function postMenuHtml(postId) {
  return `
    <div class="post-menu relative">
      <button type="button" class="post-menu-btn px-2.5 py-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors" data-post-id="${postId}" aria-label="投稿メニュー">…</button>
      <div class="post-menu-dropdown hidden absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
        <a href="workout-post-new.html?edit=${postId}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">編集</a>
        <button type="button" class="post-delete-btn block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50" data-post-id="${postId}">削除</button>
      </div>
    </div>
  `;
}

let postMenuDocListenerBound = false;

function bindPostMenus(container, onDelete) {
  (container || document).querySelectorAll('.post-menu').forEach((menu) => {
    const btn = menu.querySelector('.post-menu-btn');
    const dropdown = menu.querySelector('.post-menu-dropdown');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.post-menu-dropdown').forEach((d) => {
        if (d !== dropdown) d.classList.add('hidden');
      });
      dropdown.classList.toggle('hidden');
    });
    menu.querySelector('.post-delete-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const postId = Number(e.target.dataset.postId);
      if (confirm('この投稿を削除しますか？')) {
        deletePost(postId);
        dropdown.classList.add('hidden');
        if (onDelete) onDelete(postId);
      }
    });
  });
  if (!postMenuDocListenerBound) {
    document.addEventListener('click', () => {
      document.querySelectorAll('.post-menu-dropdown').forEach((d) => d.classList.add('hidden'));
    });
    postMenuDocListenerBound = true;
  }
}

function updateLikeButton(btn, liked, count) {
  btn.classList.toggle('liked', liked);
  btn.classList.toggle('text-red-500', liked);
  btn.classList.toggle('text-gray-500', !liked);
  btn.querySelector('.like-icon').textContent = liked ? '❤️' : '🤍';
  btn.querySelector('.like-count').textContent = count;
}

function handleLikeClick(btn, postId) {
  const liked = togglePostLike(postId);
  const post = getPost(postId);
  updateLikeButton(btn, liked, post.likes);
  btn.classList.add('scale-110');
  setTimeout(() => btn.classList.remove('scale-110'), 200);
}
