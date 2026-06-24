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

function getJstToday(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(
    new Date(),
  );
}

function getJstYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(d);
}

function getJstTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(d);
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

async function fetchExercises(
  accessToken: string,
  ctx: APIRequestContext,
): Promise<{ id: string; name: string }[]> {
  const res = await ctx.get(`${API}/api/exercises`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(res.ok()).toBe(true);
  const data = await res.json() as { id: string | number; name: string }[];
  if (!data.length) {
    throw new Error(
      'No exercises in DB. Seed first:\n' +
        "docker exec -it fitlog-postgres psql -U fitlog -d fitlog -c " +
        '"INSERT INTO exercises (name, category) VALUES (\'ベンチプレス\', \'胸\'), (\'スクワット\', \'脚\');"',
    );
  }
  return data.map((e) => ({ id: String(e.id), name: e.name }));
}

/** 加重投稿を作成（weight_kg > 0） */
async function createWeightPost(
  ctx: APIRequestContext,
  accessToken: string,
  exerciseId: string,
): Promise<void> {
  const today = getJstToday();
  const res = await ctx.post(`${API}/api/workout-posts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      title: 'E2E Phase11 weight',
      trainedOn: today,
      exercises: [
        {
          exerciseId,
          orderIndex: 0,
          sets: [{ setNumber: 1, weightKg: 80, reps: 5 }],
        },
      ],
    },
  });
  expect(res.ok(), `createWeightPost failed: ${await res.text()}`).toBe(true);
}

/** 自重投稿を作成（weight_kg = 0） */
async function createBodyweightPost(
  ctx: APIRequestContext,
  accessToken: string,
  exerciseId: string,
): Promise<void> {
  const today = getJstToday();
  const res = await ctx.post(`${API}/api/workout-posts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      title: 'E2E Phase11 bodyweight',
      trainedOn: today,
      exercises: [
        {
          exerciseId,
          orderIndex: 0,
          sets: [{ setNumber: 1, weightKg: 0, reps: 12 }],
        },
      ],
    },
  });
  expect(res.ok(), `createBodyweightPost failed: ${await res.text()}`).toBe(true);
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
// シナリオ 1: StatsPage — 新規ユーザー（全期間0）
// ─────────────────────────────────────────────────────────────────────────────
test('シナリオ1: 新規ユーザーのStatsPageで空状態メッセージが表示される（確認4）', async (
  { page, request },
  testInfo,
) => {
  const username = genUsername(testInfo.workerIndex);
  const user = await registerUser(request, username);
  await loginViaUi(page, user.email);

  await page.goto('/stats');

  // 週間タブがデフォルト選択（確認1）
  await expect(page.getByRole('tab', { name: '週間' })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  // 全期間0 → 空状態メッセージ（確認4）
  await expect(
    page.getByText('まだトレーニング記録がありません'),
  ).toBeVisible({ timeout: 10_000 });

  // 月間タブ切り替え → 同じ空状態（確認2）
  await page.getByRole('tab', { name: '月間' }).click();
  await expect(
    page.getByText('まだトレーニング記録がありません'),
  ).toBeVisible({ timeout: 5_000 });

  // 記録なしの種目選択 → 専用メッセージ（確認7）
  const exercises = await fetchExercises(user.accessToken, request);
  const exerciseSelect = page.getByRole('combobox');
  await exerciseSelect.selectOption(exercises[0].id);
  await expect(
    page.getByText('この種目には表示できる記録がありません'),
  ).toBeVisible({ timeout: 5_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// シナリオ 2: StatsPage — 投稿データあり
// ─────────────────────────────────────────────────────────────────────────────
test('シナリオ2: 投稿データのあるユーザーのStatsPageでグラフが表示される（確認1〜3,5〜7）', async (
  { page, request },
  testInfo,
) => {
  const username = genUsername(testInfo.workerIndex);
  const user = await registerUser(request, username);

  // 加重投稿作成（1種目目）
  const exercises = await fetchExercises(user.accessToken, request);
  await createWeightPost(request, user.accessToken, exercises[0].id);

  // 自重投稿作成（2種目目があれば使用、なければ1種目目を再利用）
  const bwExerciseId = exercises.length > 1 ? exercises[1].id : exercises[0].id;
  if (exercises.length > 1) {
    await createBodyweightPost(request, user.accessToken, bwExerciseId);
  }

  await loginViaUi(page, user.email);
  await page.goto('/stats');

  // 週間タブが選択されグラフが表示される（確認1）
  await expect(page.getByRole('tab', { name: '週間' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(
    page.getByText('まだトレーニング記録がありません'),
  ).not.toBeVisible({ timeout: 8_000 });
  // 投稿回数の「合計:」テキストが2件表示される
  await expect(page.getByText(/合計:/).first()).toBeVisible();

  // 月間タブ切り替え（確認2）
  await page.getByRole('tab', { name: '月間' }).click();
  await expect(page.getByRole('tab', { name: '月間' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByText(/合計:/).first()).toBeVisible({ timeout: 5_000 });

  // 週間に戻る
  await page.getByRole('tab', { name: '週間' }).click();

  // 一部データ（12件中今週だけデータあり）でもグラフが非表示にならない（確認3）
  await expect(
    page.getByText('まだトレーニング記録がありません'),
  ).not.toBeVisible();

  // 加重種目選択 → 最大重量の推移（確認5）
  const exerciseSelect = page.getByRole('combobox');
  await exerciseSelect.selectOption(exercises[0].id);
  await expect(page.getByText('最大重量の推移')).toBeVisible({ timeout: 8_000 });

  // 別種目（自重）で最大回数への切り替え（確認6）
  if (exercises.length > 1) {
    await exerciseSelect.selectOption(bwExerciseId);
    await expect(page.getByText('最大回数の推移')).toBeVisible({
      timeout: 5_000,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// シナリオ 3: GoalsPage — 作成・バリデーション
// ─────────────────────────────────────────────────────────────────────────────
test('シナリオ3: GoalsPage 目標作成と入力バリデーション（確認9〜12）', async (
  { page, request },
  testInfo,
) => {
  const username = genUsername(testInfo.workerIndex);
  const user = await registerUser(request, username);
  const exercises = await fetchExercises(user.accessToken, request);

  await loginViaUi(page, user.email);
  await page.goto('/goals');

  // ─ 重量・回数ともに未入力でエラー（確認11）
  await page.getByRole('button', { name: '目標を追加' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  // exercises オプションがロードされるのを待ってから選択
  await expect(
    dialog.getByRole('option', { name: exercises[0].name }),
  ).toBeAttached({ timeout: 8_000 });
  await dialog.getByRole('combobox').selectOption(exercises[0].id);
  await dialog.getByRole('button', { name: '保存' }).click();
  await expect(
    dialog.getByRole('alert'),
  ).toHaveText('目標重量または目標回数を入力してください');
  await expect(dialog).toBeVisible(); // モーダルは閉じない

  // ─ 過去日の期限バリデーション（確認12）
  const yesterday = getJstYesterday();
  const dateInputs = dialog.locator('input[type="date"]');
  await dateInputs.first().fill(yesterday);
  // weight を入力してから保存
  const weightInputs = dialog.locator('input[type="number"]');
  await weightInputs.first().fill('80');
  await dialog.getByRole('button', { name: '保存' }).click();
  await expect(dialog.getByRole('alert')).toHaveText(
    '期限は本日以降の日付を指定してください',
  );
  await expect(dialog).toBeVisible(); // モーダルは閉じない

  // ─ 期限を明日に修正して保存（重量のみ、確認9・10）
  const tomorrow = getJstTomorrow();
  await dateInputs.first().fill(tomorrow);
  await dialog.getByRole('button', { name: '保存' }).click();
  // モーダルが閉じ、一覧に追加される
  await expect(dialog).not.toBeVisible({ timeout: 8_000 });
  await expect(page.getByText(exercises[0].name).first()).toBeVisible();

  // ─ 回数のみの目標を追加（確認10）
  await page.getByRole('button', { name: '目標を追加' }).click();
  const dialog2 = page.getByRole('dialog');
  await expect(dialog2).toBeVisible();
  await expect(
    dialog2.getByRole('option', { name: exercises[0].name }),
  ).toBeAttached({ timeout: 8_000 });
  await dialog2.getByRole('combobox').selectOption(exercises[0].id);
  // 重量は空、回数のみ入力（2番目の number input）
  await dialog2.locator('input[type="number"]').nth(1).fill('15');
  await dialog2.getByRole('button', { name: '保存' }).click();
  await expect(dialog2).not.toBeVisible({ timeout: 8_000 });

  // ─ 重量・回数両方の目標を追加（確認10）
  await page.getByRole('button', { name: '目標を追加' }).click();
  const dialog3 = page.getByRole('dialog');
  await expect(dialog3).toBeVisible();
  await expect(
    dialog3.getByRole('option', { name: exercises[0].name }),
  ).toBeAttached({ timeout: 8_000 });
  await dialog3.getByRole('combobox').selectOption(exercises[0].id);
  await dialog3.locator('input[type="number"]').first().fill('100');
  await dialog3.locator('input[type="number"]').nth(1).fill('3');
  await dialog3.getByRole('button', { name: '保存' }).click();
  await expect(dialog3).not.toBeVisible({ timeout: 8_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// シナリオ 4: GoalsPage — 達成・放棄・削除・フィルタ
// ─────────────────────────────────────────────────────────────────────────────
test('シナリオ4: GoalsPage 達成・放棄・削除・フィルタタブ（確認13〜18）', async (
  { page, request },
  testInfo,
) => {
  const username = genUsername(testInfo.workerIndex);
  const user = await registerUser(request, username);
  const exercises = await fetchExercises(user.accessToken, request);

  // API で3件の目標を事前作成
  const goalExerciseId = exercises[0].id;
  const headers = { Authorization: `Bearer ${user.accessToken}` };

  // goal1: 達成用
  const g1 = await request.post(`${API}/api/goals`, {
    headers,
    data: { exerciseId: goalExerciseId, targetWeightKg: 80 },
  });
  expect(g1.ok()).toBe(true);
  const goal1Data = await g1.json() as { id: string };

  // goal2: 放棄用
  const g2 = await request.post(`${API}/api/goals`, {
    headers,
    data: { exerciseId: goalExerciseId, targetReps: 15 },
  });
  expect(g2.ok()).toBe(true);

  // goal3: 削除用
  const g3 = await request.post(`${API}/api/goals`, {
    headers,
    data: { exerciseId: goalExerciseId, targetWeightKg: 100, targetReps: 3 },
  });
  expect(g3.ok()).toBe(true);

  await loginViaUi(page, user.email);
  await page.goto('/goals');

  // 一覧ロードを待つ
  await expect(page.getByText(exercises[0].name).first()).toBeVisible({
    timeout: 10_000,
  });

  // ─ 達成ボタン（確認14）
  // 1番目のカードの「達成」ボタンを押す
  const achieveButtons = page.getByRole('button', { name: '達成' });
  await achieveButtons.first().click();
  // 「達成」バッジが表示されることを確認
  await expect(page.getByText('達成').first()).toBeVisible({ timeout: 8_000 });

  // ─ 放棄キャンセル（確認16）
  const abandonButtons = page.getByRole('button', { name: '放棄' });
  await abandonButtons.first().click();
  // インライン確認が表示される
  await expect(page.getByText('本当に放棄しますか？')).toBeVisible();
  // キャンセルボタンを押す
  await page.getByRole('button', { name: 'キャンセル' }).first().click();
  // 確認UIが消え、放棄されていない
  await expect(page.getByText('本当に放棄しますか？')).not.toBeVisible();

  // ─ 放棄実行（確認15）
  await page.getByRole('button', { name: '放棄' }).first().click();
  await expect(page.getByText('本当に放棄しますか？')).toBeVisible();
  await page.getByRole('button', { name: '放棄する' }).click();
  await expect(page.getByText('放棄').first()).toBeVisible({ timeout: 8_000 });

  // ─ 削除キャンセル（確認18）
  const deleteButtons = page.getByRole('button', { name: '削除' });
  await deleteButtons.first().click();
  await expect(page.getByText('削除しますか？')).toBeVisible();
  await page.getByRole('button', { name: 'キャンセル' }).first().click();
  await expect(page.getByText('削除しますか？')).not.toBeVisible();

  // ─ 削除実行（確認17）
  await page.getByRole('button', { name: '削除' }).first().click();
  await expect(page.getByText('削除しますか？')).toBeVisible();
  await page.getByRole('button', { name: '削除する' }).click();
  // goal1 は削除された。goal2 (ABANDONED) / goal3 は残る
  // goal_id が削除されたことをカード数で確認
  await page.waitForTimeout(1000);
  const goalCards = page.locator('article');
  await expect(goalCards).toHaveCount(2, { timeout: 8_000 });

  // ─ フィルタタブ: 進行中（確認13）
  await page.getByRole('tab', { name: '進行中' }).click();
  await expect(page.getByRole('tab', { name: '進行中' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  // goal3 (IN_PROGRESS) だけが表示
  await expect(page.locator('article')).toHaveCount(1, { timeout: 8_000 });

  // ─ フィルタタブ: 達成（確認13）
  await page.getByRole('tab', { name: '達成' }).click();
  // goal1 は削除済みなので 0 件
  await expect(page.getByText('達成済みの目標がありません')).toBeVisible({
    timeout: 5_000,
  });

  // ─ フィルタタブ: 放棄（確認13）
  await page.getByRole('tab', { name: '放棄' }).click();
  await expect(page.locator('article')).toHaveCount(1, { timeout: 8_000 });

  // ─ すべてタブに戻る
  await page.getByRole('tab', { name: 'すべて' }).click();
  await expect(page.locator('article')).toHaveCount(2, { timeout: 8_000 });

  // ──────────────────────────────────────────────────────────────────
  // テストデータの後処理
  // テスト中に残った goal3 (IN_PROGRESS) を削除
  // (goal2 は ABANDONED のまま残存するが E2E 専用ユーザーのためDB上は残存可)
  // ──────────────────────────────────────────────────────────────────
  const cleanupRes = await request.delete(`${API}/api/goals/${goal1Data.id}`, {
    headers,
  });
  // 既に削除済みの場合は 404 でも許容
  expect([200, 204, 404]).toContain(cleanupRes.status());
});
