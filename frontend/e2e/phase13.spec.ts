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
