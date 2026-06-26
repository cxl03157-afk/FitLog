import {
  test,
  expect,
  request as playwrightRequest,
  type APIRequestContext,
  type Page,
} from '@playwright/test';

// ── 定数 ─────────────────────────────────────────────────────────────────────
const API = 'http://localhost:3000';
const E2E_PASSWORD = 'e2epass123';

// ── Username 生成 ─────────────────────────────────────────────────────────────
let usernameSequence = 0;

function genUsername(workerIndex: number): string {
  usernameSequence += 1;
  const worker = workerIndex.toString(36);
  const seq = usernameSequence.toString(36);
  const ts = Date.now().toString(36);
  const username = `e2e${worker}${seq}${ts}`.slice(0, 20);
  if (
    username.length < 3 ||
    username.length > 20 ||
    !/^[a-zA-Z0-9_]+$/.test(username)
  ) {
    throw new Error(`Invalid E2E username: ${username}`);
  }
  return username;
}

// ── API ヘルパー ───────────────────────────────────────────────────────────────
async function registerUser(
  ctx: APIRequestContext,
  username: string,
): Promise<{ userId: string; username: string; email: string; accessToken: string }> {
  const email = `${username}@e2e.test`;
  const res = await ctx.post(`${API}/api/auth/register`, {
    data: { username, displayName: username, email, password: E2E_PASSWORD },
  });
  expect(res.ok(), `register failed: ${await res.text()}`).toBe(true);
  const data = await res.json();
  return {
    userId: data.user.id as string,
    username,
    email,
    accessToken: data.accessToken as string,
  };
}

async function loginViaUi(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(E2E_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('/');
}

/**
 * exercises テーブルから最初の exerciseId を返す。
 * 0件の場合は seed 方法を示すエラーを throw する。
 */
async function fetchFirstExerciseId(
  accessToken: string,
  ctx: APIRequestContext,
): Promise<string> {
  const res = await ctx.get(`${API}/api/exercises`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(res.ok()).toBe(true);
  const data = (await res.json()) as { id: string | number }[];
  if (!data.length) {
    throw new Error(
      'No exercises found. Seed at least one exercise before running E2E tests.\n' +
        "docker exec -it fitlog-postgres psql -U fitlog -d fitlog -c " +
        '"INSERT INTO exercises (name, category) VALUES (\'ベンチプレス\', \'胸\'), (\'スクワット\', \'脚\');"',
    );
  }
  return String(data[0].id);
}

/** API でワークアウト投稿を1件作成して id を返す */
async function createWorkoutPostViaApi(
  ctx: APIRequestContext,
  accessToken: string,
  title: string,
  exerciseId: string,
): Promise<string> {
  const res = await ctx.post(`${API}/api/workout-posts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      title,
      trainedOn: '2026-06-26',
      exercises: [
        {
          exerciseId,
          orderIndex: 0,
          sets: [{ setNumber: 1, weightKg: 80, reps: 5 }],
        },
      ],
    },
  });
  expect(res.ok(), `createWorkoutPost failed: ${await res.text()}`).toBe(true);
  const data = await res.json();
  return data.id as string;
}

/** API で PR を1件作成して id を返す */
async function createPersonalRecordViaApi(
  ctx: APIRequestContext,
  accessToken: string,
  exerciseId: string,
  weightKg = 100,
): Promise<string> {
  const res = await ctx.post(`${API}/api/personal-records`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      exerciseId,
      recordType: 'MAX_WEIGHT',
      weightKg,
      achievedAt: '2026-01-15',
    },
  });
  expect(res.ok(), `createPersonalRecord failed: ${await res.text()}`).toBe(true);
  const data = await res.json();
  return data.id as string;
}

// ── Backend 疎通確認 ──────────────────────────────────────────────────────────
let healthCheckContext: APIRequestContext | undefined;

test.beforeAll(async () => {
  healthCheckContext = await playwrightRequest.newContext({ baseURL: API });
  try {
    const res = await healthCheckContext.get('/api/exercises');
    if (res.status() !== 401) {
      throw new Error(`Backend unexpected response: HTTP ${res.status()}`);
    }
  } catch (e) {
    await healthCheckContext?.dispose();
    healthCheckContext = undefined;
    throw new Error(
      'Backend is not available. Run: cd backend && npm run start:dev\nCause: ' +
        String(e),
      { cause: e },
    );
  }
});

test.afterAll(async () => {
  await healthCheckContext?.dispose();
  healthCheckContext = undefined;
});

// ─────────────────────────────────────────────────────────────────────────────
// シナリオ 3: ナイス済み投稿の詳細画面で初期状態が正しく・解除と再ナイスが動作する（Bug 1）
// ─────────────────────────────────────────────────────────────────────────────
test('シナリオ3: ナイス済み投稿の詳細画面で初期状態が正しく・解除と再ナイスが動作する', async (
  { page, request },
  testInfo,
) => {
  // ── セットアップ ────────────────────────────────────────────────
  const username = genUsername(testInfo.workerIndex);
  const user = await registerUser(request, username);
  const exerciseId = await fetchFirstExerciseId(user.accessToken, request);

  const postTitle = `Phase13 Scenario3 Like ${Date.now()}`;
  const postId = await createWorkoutPostViaApi(request, user.accessToken, postTitle, exerciseId);

  // 事前ナイス: API で isLiked=true, likeCount=1 を準備する
  const prelikeRes = await request.post(`${API}/api/workout-posts/${postId}/likes`, {
    headers: { Authorization: `Bearer ${user.accessToken}` },
  });
  expect(prelikeRes.ok(), `pre-like failed: ${await prelikeRes.text()}`).toBe(true);

  // ── UI ログイン ─────────────────────────────────────────────────
  await loginViaUi(page, user.email);
  await page.waitForURL('/');

  // ── step 4: タイムラインで対象投稿のナイス件数を確認 ───────────
  // PostCard には aria-pressed がないため件数テキストで確認
  const article = page.locator('article').filter({ hasText: postTitle });
  await expect(article).toBeVisible({ timeout: 5_000 });
  await expect(article.getByText('👍 1')).toBeVisible();

  // ── step 5: 詳細画面へ移動 ─────────────────────────────────────
  await page.goto(`/workout-posts/${postId}`);
  await expect(page.getByText(postTitle)).toBeVisible({ timeout: 5_000 });

  // ── step 6-7: 初期状態がナイス済み（aria-pressed="true"）・件数=1 ─
  const likeBtn = page.getByRole('button', { name: /ナイス！/ });
  await expect(likeBtn).toBeVisible();
  await expect(likeBtn).toHaveAttribute('aria-pressed', 'true');
  await expect(likeBtn).toContainText('ナイス！ 1');

  // ── step 8-10: ナイス解除 → aria-pressed="false", 件数=0 ───────
  const unlikeRes = page.waitForResponse(
    (r) => r.url().includes('/likes') && r.request().method() === 'DELETE',
  );
  await likeBtn.click();
  await unlikeRes;

  await expect(likeBtn).toHaveAttribute('aria-pressed', 'false');
  await expect(likeBtn).toContainText('ナイス！ 0');

  // ── step 11-13: 再ナイス → aria-pressed="true", 件数=1 ─────────
  const relikeRes = page.waitForResponse(
    (r) => r.url().includes('/likes') && r.request().method() === 'POST',
  );
  await likeBtn.click();
  await relikeRes;

  await expect(likeBtn).toHaveAttribute('aria-pressed', 'true');
  await expect(likeBtn).toContainText('ナイス！ 1');

  // ── step 14-15: ページ再読み込み → ナイス済み状態・件数が維持 ──
  await page.reload();
  await expect(page.getByText(postTitle)).toBeVisible({ timeout: 5_000 });

  const likeBtnReloaded = page.getByRole('button', { name: /ナイス！/ });
  await expect(likeBtnReloaded).toHaveAttribute('aria-pressed', 'true');
  await expect(likeBtnReloaded).toContainText('ナイス！ 1');

  // ── step 16-17: タイムラインへ戻る → 件数一致 ─────────────────
  await page.getByRole('button', { name: /← タイムラインへ/ }).click();
  await page.waitForURL('/');

  const article2 = page.locator('article').filter({ hasText: postTitle });
  await expect(article2).toBeVisible({ timeout: 5_000 });
  await expect(article2.getByText('👍 1')).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// シナリオ 4: コメント追加後タイムラインの commentCount が更新される（Bug 2）
// ─────────────────────────────────────────────────────────────────────────────
test('シナリオ4: コメント追加後タイムラインへ戻ると commentCount が更新される', async (
  { page, request },
  testInfo,
) => {
  const username = genUsername(testInfo.workerIndex);
  const user = await registerUser(request, username);
  const exerciseId = await fetchFirstExerciseId(user.accessToken, request);

  const postTitle = `CommentBug2 ${username}`;
  const postId = await createWorkoutPostViaApi(request, user.accessToken, postTitle, exerciseId);

  await loginViaUi(page, user.email);
  await page.waitForURL('/');

  // タイムラインで初期 commentCount=0 を確認
  const article = page.locator('article').filter({ hasText: postTitle });
  await expect(article).toBeVisible({ timeout: 5_000 });
  await expect(article.getByText('💬 0')).toBeVisible();

  // 投稿詳細へ移動
  await page.goto(`/workout-posts/${postId}`);
  await expect(page.getByText(postTitle)).toBeVisible({ timeout: 5_000 });

  // コメントを入力して送信
  await page.locator('textarea').fill('E2Eテストコメント');
  const commentResponse = page.waitForResponse(
    (r) => r.url().includes('/comments') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: '送信' }).click();
  await commentResponse;

  // コメントが詳細画面に表示されたことを確認（POST 完了後に navigate する）
  await expect(page.getByText('E2Eテストコメント')).toBeVisible({ timeout: 5_000 });

  // 「← タイムラインへ」ボタンをクリック（コメント POST 完了後なので disabled でない）
  await page.getByRole('button', { name: /← タイムラインへ/ }).click();
  await page.waitForURL('/');

  // タイムラインの commentCount=1 を確認
  const article2 = page.locator('article').filter({ hasText: postTitle });
  await expect(article2).toBeVisible({ timeout: 5_000 });
  await expect(article2.getByText('💬 1')).toBeVisible();

  // 再度詳細へ入り、タイムラインへ戻っても 1 のまま
  await page.goto(`/workout-posts/${postId}`);
  await expect(page.getByText(postTitle)).toBeVisible({ timeout: 5_000 });
  await page.getByRole('button', { name: /← タイムラインへ/ }).click();
  await page.waitForURL('/');

  const article3 = page.locator('article').filter({ hasText: postTitle });
  await expect(article3.getByText('💬 1')).toBeVisible({ timeout: 5_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// シナリオ 1: PR登録と一覧表示
// ─────────────────────────────────────────────────────────────────────────────
test('シナリオ1: PR記録を登録し、一覧に表示される', async (
  { page, request },
  testInfo,
) => {
  const username = genUsername(testInfo.workerIndex);
  const user = await registerUser(request, username);
  const exerciseId = await fetchFirstExerciseId(user.accessToken, request);

  // UI ログイン（Cookie 設定）
  await loginViaUi(page, user.email);

  // /personal-records へ遷移
  await page.goto('/personal-records');
  await expect(page).toHaveURL('/personal-records');

  // 初期表示: 空状態メッセージ確認
  await expect(page.getByText('まだパーソナルレコードがありません')).toBeVisible();

  // 「新規登録」ボタンをクリック → モーダル表示確認
  await page.getByRole('button', { name: '新規登録' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'PR記録を登録' })).toBeVisible();

  // 種目セレクトに対象 exercise の option が読み込まれるまで待機
  await expect(
    page.locator(`select option[value="${exerciseId}"]`).first(),
  ).toBeAttached({ timeout: 10_000 });

  // 種目を選択
  await page.locator('select').first().selectOption(exerciseId);

  // MAX_WEIGHT（デフォルト）のまま重量を入力
  await page.locator('input[placeholder="例: 100"]').fill('120');

  // 達成日を入力
  await page.locator('input[type="date"]').fill('2026-06-25');

  // 「保存」をクリック → モーダルが閉じる
  const saveResponse = page.waitForResponse(
    (r) => r.url().includes('/api/personal-records') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: '保存' }).click();
  await saveResponse;

  // モーダルが閉じることを確認
  await expect(page.getByRole('dialog')).not.toBeVisible();

  // 一覧に登録内容が表示される（種目名・重量・達成日）
  await expect(page.getByText('120 kg')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText('達成日: 2026/06/25')).toBeVisible();

  // 成功トーストが表示される
  await expect(page.getByText('パーソナルレコードを登録しました')).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// シナリオ 2: 更新と削除
// ─────────────────────────────────────────────────────────────────────────────
test('シナリオ2: PR記録を更新・削除できる', async (
  { page, request },
  testInfo,
) => {
  const username = genUsername(testInfo.workerIndex);
  const user = await registerUser(request, username);
  const exerciseId = await fetchFirstExerciseId(user.accessToken, request);

  // API で PR を事前作成（registerUser が返す accessToken を使用）
  await createPersonalRecordViaApi(request, user.accessToken, exerciseId, 100);

  // UI ログイン
  await loginViaUi(page, user.email);

  // /personal-records へ遷移
  await page.goto('/personal-records');
  await expect(page).toHaveURL('/personal-records');

  // 1件が表示されることを確認
  await expect(page.getByText('100 kg')).toBeVisible({ timeout: 5_000 });

  // 「編集」ボタンをクリック → モーダル表示
  await page.getByRole('button', { name: '編集' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'PR記録を編集' })).toBeVisible();

  // recordType が変更不可と表示される
  await expect(page.getByText('最大重量（変更不可）')).toBeVisible();

  // 種目名が readOnly input で表示される
  const exerciseInput = page.locator('input[readonly]');
  await expect(exerciseInput).toBeVisible();

  // 重量を変更
  await page.locator('input[placeholder="例: 100"]').fill('150');

  // 「保存」をクリック → モーダルが閉じる
  const putResponse = page.waitForResponse(
    (r) =>
      r.url().includes('/api/personal-records') &&
      r.request().method() === 'PUT',
  );
  await page.getByRole('button', { name: '保存' }).click();
  await putResponse;

  // モーダルが閉じることを確認
  await expect(page.getByRole('dialog')).not.toBeVisible();

  // 一覧の値が更新される
  await expect(page.getByText('150 kg')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText('パーソナルレコードを更新しました')).toBeVisible();

  // 「削除」ボタン → 確認ダイアログ → 「はい」
  await page.getByRole('button', { name: '削除' }).click();
  await expect(page.getByText('本当に削除しますか？')).toBeVisible();

  const deleteResponse = page.waitForResponse(
    (r) =>
      r.url().includes('/api/personal-records') &&
      r.request().method() === 'DELETE',
  );
  await page.getByRole('button', { name: 'はい' }).click();
  await deleteResponse;

  // 対象レコードが消え 0件メッセージが表示される
  await expect(page.getByText('まだパーソナルレコードがありません')).toBeVisible({
    timeout: 5_000,
  });
  await expect(page.getByText('パーソナルレコードを削除しました')).toBeVisible();
});
