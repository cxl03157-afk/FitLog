import path from 'path';
import { fileURLToPath } from 'url';
import {
  test,
  expect,
  request as playwrightRequest,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from '@playwright/test';

// ── 定数 ─────────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API = 'http://localhost:3000';
const E2E_PASSWORD = 'e2epass123';
const FIXTURE_IMAGE = path.join(__dirname, 'fixtures', 'test-image.png');

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

/**
 * ユーザー登録。
 * 同一テスト内では fixture の request の Cookie jar を共有するが、
 * 登録時に設定される refresh_token は後続処理では使用しない。
 * 戻り値の user 情報のみを利用する。
 * 別ユーザーとして認証済み API を使用する場合は
 * createAuthenticatedApiContext() で独立した context を作成する。
 */
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

/** UI ログイン用 */
async function loginViaUi(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(E2E_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('/');
}

/**
 * 別ユーザーのデータ準備用: ユーザーごとに独立した APIRequestContext を作成してログイン。
 * Cookie jar が分離されるため複数ユーザーの refresh_token が混在しない。
 * 呼び出し側で必ず try/finally で dispose() すること。
 */
async function createAuthenticatedApiContext(
  email: string,
): Promise<{ apiContext: APIRequestContext; accessToken: string }> {
  const apiContext = await playwrightRequest.newContext({ baseURL: API });
  const res = await apiContext.post('/api/auth/login', {
    data: { email, password: E2E_PASSWORD },
  });
  expect(res.ok(), `login failed: ${await res.text()}`).toBe(true);
  const data = await res.json();
  return { apiContext, accessToken: data.accessToken as string };
}

/** 認証済み API で投稿を作成。post id を返す */
async function createPostViaApi(
  ctx: APIRequestContext,
  accessToken: string,
  title: string,
  exerciseId: string,
): Promise<string> {
  const today = new Date();
  const yy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const trainedOn = `${yy}-${mm}-${dd}`;

  const res = await ctx.post(`${API}/api/workout-posts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      title,
      trainedOn,
      exercises: [
        {
          exerciseId,
          orderIndex: 0,
          sets: [{ setNumber: 1, weightKg: 60, reps: 10 }],
        },
      ],
    },
  });
  expect(res.ok(), `createPost failed: ${await res.text()}`).toBe(true);
  const data = await res.json();
  return data.id as string;
}

/**
 * exercises テーブルから最初の種目 ID を取得する。
 * テーブルが空の場合は種目データを INSERT してから再取得する。
 */
async function fetchFirstExerciseId(
  accessToken: string,
  ctx: APIRequestContext,
): Promise<string> {
  const res = await ctx.get(`${API}/api/exercises`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(res.ok()).toBe(true);
  const data = await res.json() as { id: string | number }[];
  if (!data.length) {
    throw new Error(
      'No exercises in DB. Seed first:\n' +
      "docker exec -it fitlog-postgres psql -U fitlog -d fitlog -c " +
      "\"INSERT INTO exercises (name, category) VALUES ('ベンチプレス', '胸'), ('スクワット', '脚'), ('デッドリフト', '背中');\"",
    );
  }
  return String(data[0].id);
}

// ── Backend 疎通確認（describe 外・全テスト共通） ──────────────────────────────
let healthCheckContext: APIRequestContext | undefined;

test.beforeAll(async () => {
  healthCheckContext = await playwrightRequest.newContext({ baseURL: API });
  try {
    const res = await healthCheckContext.get('/api/exercises');
    // 認証なし → 401 が正常。接続不可の場合は例外が throw される
    if (res.status() !== 401) {
      throw new Error(`Backend unexpected response: HTTP ${res.status()}`);
    }
  } catch (e) {
    await healthCheckContext.dispose();
    healthCheckContext = undefined;
    throw new Error(
      'Backend is not available. Run: cd backend && npm run start:dev\nCause: ' + String(e),
      { cause: e },
    );
  }
});

test.afterAll(async () => {
  await healthCheckContext?.dispose();
  healthCheckContext = undefined;
});

// ─────────────────────────────────────────────────────────────────────────────
// シナリオ 1: 画像付き投稿
// ─────────────────────────────────────────────────────────────────────────────
test('シナリオ1: 画像付き投稿を作成し、タイムラインと詳細に表示される', async (
  { page, request },
  testInfo,
) => {
  const username = genUsername(testInfo.workerIndex);
  const user = await registerUser(request, username);
  const exerciseId = await fetchFirstExerciseId(user.accessToken, request);

  const postTitle = `E2E img ${username}`;

  await loginViaUi(page, user.email);

  // 投稿作成画面へ
  await page.goto('/workout-posts/new');

  // タイトル入力
  await page.locator('input[placeholder="例：胸の日"]').fill(postTitle);

  // 種目を選択（フォームは初期状態で1行の種目行を持つ）
  // exerciseMaster がロードされるまで待機
  await expect(page.locator(`select option[value="${exerciseId}"]`).first()).toBeAttached({
    timeout: 10_000,
  });
  await page.locator('select').first().selectOption({ value: exerciseId });

  // セット入力（初期で 1 セット存在）
  await page.locator('input[placeholder="0"]').first().fill('80');
  await page.locator('input[placeholder="0"]').nth(1).fill('5');

  // 画像選択
  await page.getByTestId('image-file-input').setInputFiles(FIXTURE_IMAGE);

  // プレビューが表示されることを確認
  await expect(page.getByTestId('image-preview-0')).toBeVisible();

  // 投稿する
  await page.getByRole('button', { name: '投稿する' }).click();

  // タイムラインへ遷移
  await page.waitForURL('/');

  // タイムラインに投稿タイトルが表示される
  await expect(page.getByText(postTitle)).toBeVisible();

  // 投稿詳細へ遷移（PostCard の <Link> をクリック）
  await page.getByText(postTitle).click();
  await page.waitForURL(/\/workout-posts\//);

  // 詳細ページに画像 <img> が存在する
  const detailImgs = page.locator('img[alt=""]');
  await expect(detailImgs.first()).toBeVisible({ timeout: 5_000 });

  // 画像 src が LocalStack URL であることを確認
  const src = await detailImgs.first().getAttribute('src');
  expect(src).toBeTruthy();
  expect(src).toContain('localhost:4566');

  // 画像 URL にアクセスできる（200）
  const imgRes = await request.get(src!);
  expect(imgRes.status()).toBe(200);
});

// ─────────────────────────────────────────────────────────────────────────────
// シナリオ 2: プロフィール更新
// ─────────────────────────────────────────────────────────────────────────────
test('シナリオ2: プロフィールと bio を更新し、プロフィール画面に反映される', async (
  { page, request },
  testInfo,
) => {
  const username = genUsername(testInfo.workerIndex);
  const user = await registerUser(request, username);
  await loginViaUi(page, user.email);

  // プロフィール画面へ
  await page.goto(`/users/${user.userId}`);
  await expect(page.getByTestId('edit-profile-button')).toBeVisible();

  // 編集モーダルを開く
  await page.getByTestId('edit-profile-button').click();
  await expect(page.getByTestId('edit-modal')).toBeVisible();

  // 表示名を更新
  const newDisplayName = `${username.slice(0, 8)}Updated`;
  await page.getByTestId('edit-display-name-input').fill(newDisplayName);

  // bio を更新
  const newBio = 'E2E テスト用の自己紹介';
  await page.getByTestId('edit-bio-input').fill(newBio);

  // 保存
  await page.getByRole('button', { name: '保存する' }).click();

  // モーダルが閉じる
  await expect(page.getByTestId('edit-modal')).not.toBeVisible();

  // プロフィール画面に変更後の値が表示される
  await expect(page.getByText(newDisplayName)).toBeVisible();
  await expect(page.getByText(newBio)).toBeVisible();

  // reload 後も変更が残る（サーバー永続化の確認）
  await page.reload();
  await expect(page.getByText(newDisplayName)).toBeVisible();
  await expect(page.getByText(newBio)).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// シナリオ 3: アバター更新（NavBar 即時反映）
// ─────────────────────────────────────────────────────────────────────────────
test('シナリオ3: アバターを更新し、NavBar に新しい画像が表示される', async (
  { page, request },
  testInfo,
) => {
  const username = genUsername(testInfo.workerIndex);
  const user = await registerUser(request, username);
  await loginViaUi(page, user.email);

  // プロフィール画面へ
  await page.goto(`/users/${user.userId}`);

  // 初期状態: イニシャル円が表示されている
  await expect(page.getByTestId('avatar-initial')).toBeVisible();
  expect(await page.getByTestId('avatar-image').count()).toBe(0);

  // 編集モーダルを開く
  await page.getByTestId('edit-profile-button').click();
  await expect(page.getByTestId('edit-modal')).toBeVisible();

  // アバターを選択
  const avatarInput = page.getByTestId('avatar-file-input');
  await avatarInput.setInputFiles(FIXTURE_IMAGE);

  // アップロード完了を待つ（アバターボタンのテキストが戻るまで）
  await expect(page.getByTestId('avatar-change-button')).toHaveText('アバターを変更', {
    timeout: 10_000,
  });

  // プロフィール画面でアバター画像に切り替わる
  await expect(page.getByTestId('avatar-image')).toBeVisible();
  expect(await page.getByTestId('avatar-initial').count()).toBe(0);

  // NavBar にも <img> が表示される（即時反映）
  const navAvatarImg = page.locator('nav img');
  await expect(navAvatarImg).toBeVisible();
  const navSrc = await navAvatarImg.getAttribute('src');
  expect(navSrc).toBeTruthy();
  expect(navSrc).toContain('localhost:4566');

  // reload 後も NavBar に画像が残る（永続化の確認）
  await page.reload();
  await expect(page.locator('nav img')).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// シナリオ 4: フォロー中タイムライン
// ─────────────────────────────────────────────────────────────────────────────
test('シナリオ4: 他ユーザーをフォローし、フォロー中タイムラインに投稿が表示される', async (
  { page, request },
  testInfo,
) => {
  const usernameA = genUsername(testInfo.workerIndex);
  const usernameB = genUsername(testInfo.workerIndex);
  const usernameC = genUsername(testInfo.workerIndex);

  const userA = await registerUser(request, usernameA);
  const userB = await registerUser(request, usernameB);
  const userC = await registerUser(request, usernameC);

  // 種目 ID 取得（A の access token を使用）
  const exerciseId = await fetchFirstExerciseId(userA.accessToken, request);

  // B・C の投稿をそれぞれ独立 context で作成（Cookie jar 分離）
  let ctxB: APIRequestContext | undefined;
  let ctxC: APIRequestContext | undefined;
  const postTitleB = `B's post ${usernameB}`;
  const postTitleC = `C's post ${usernameC}`;

  try {
    const authB = await createAuthenticatedApiContext(userB.email);
    ctxB = authB.apiContext;
    const authC = await createAuthenticatedApiContext(userC.email);
    ctxC = authC.apiContext;

    await createPostViaApi(ctxB, authB.accessToken, postTitleB, exerciseId);
    await createPostViaApi(ctxC, authC.accessToken, postTitleC, exerciseId);
  } finally {
    await ctxB?.dispose();
    await ctxC?.dispose();
  }

  // A として UI ログイン
  await loginViaUi(page, userA.email);

  // 検索ページで B を検索しフォロー
  await page.goto('/search');
  await page.getByTestId('search-input').fill(usernameB);
  // デバウンス（300ms）+ レスポンス待機
  await page.waitForTimeout(500);
  await expect(page.getByText(`@${usernameB}`)).toBeVisible({ timeout: 5_000 });

  // UserCard のフォローボタン（`data-testid="follow-button"`）をクリック
  // 検索結果が 1 件のため first() で確定
  await page.getByTestId('follow-button').first().click();
  await expect(page.getByTestId('follow-button').first()).toHaveText('フォロー中', {
    timeout: 5_000,
  });

  // タイムラインの「フォロー中」タブをクリック
  await page.goto('/');
  await page.getByRole('button', { name: 'フォロー中' }).click();

  // B の投稿が表示される
  await expect(page.getByText(postTitleB)).toBeVisible({ timeout: 5_000 });

  // C の投稿は表示されない（A は C をフォローしていない）
  expect(await page.getByText(postTitleC).count()).toBe(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// シナリオ 5: ユーザー検索→プロフィール遷移
// ─────────────────────────────────────────────────────────────────────────────
test('シナリオ5: ユーザー検索からプロフィール画面へ遷移できる', async (
  { page, request },
  testInfo,
) => {
  const usernameA = genUsername(testInfo.workerIndex);
  const usernameB = genUsername(testInfo.workerIndex);

  const userA = await registerUser(request, usernameA);
  const userB = await registerUser(request, usernameB);

  await loginViaUi(page, userA.email);

  // 検索ページへ
  await page.goto('/search');
  await page.getByTestId('search-input').fill(usernameB);

  // デバウンス待機後に結果が表示される
  await page.waitForTimeout(500);
  // displayName（usernameB と同一）は exact=true で他要素と区別する
  await expect(page.getByText(usernameB, { exact: true }).first()).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(`@${usernameB}`)).toBeVisible();

  // B のカードをクリック → プロフィール画面へ遷移
  await page.locator(`[href="/users/${userB.userId}"]`).first().click();
  await page.waitForURL(`/users/${userB.userId}`);

  // 表示名・username が一致する
  await expect(page.getByText(usernameB, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(`@${usernameB}`)).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────
// シナリオ 6: 別セッション削除
// ─────────────────────────────────────────────────────────────────────────────
test('シナリオ6: 別セッションを削除できる（現在の端末は残る）', async (
  { page, request, browser },
  testInfo,
) => {
  const username = genUsername(testInfo.workerIndex);
  const user = await registerUser(request, username);

  // context2: 別セッション（先にログインしておく）
  let context2: BrowserContext | undefined;
  let page2: Page | undefined;

  try {
    context2 = await browser.newContext();
    page2 = await context2.newPage();
    await loginViaUi(page2, user.email);

    // context1（メイン）でログイン
    await loginViaUi(page, user.email);

    // セッション管理ページへ
    await page.goto('/settings/sessions');

    // 複数セッションが存在する（register + context2 + context1）
    const sessionItems = page.locator('[data-testid^="session-item-"]');
    // 非同期ロード完了を待機してからカウント取得
    await expect(sessionItems.first()).toBeVisible({ timeout: 5_000 });
    const initialCount = await sessionItems.count();
    expect(initialCount).toBeGreaterThanOrEqual(2);

    // 「現在の端末」バッジが 1 件
    await expect(page.getByTestId('current-badge')).toHaveCount(1);

    // 「この端末を除く全端末をログアウト」で現在端末以外を一括失効
    // （register セッション・context2 セッションを両方失効させ context2 の 401 を確実に検証できる）
    const revokeAllButton = page.getByTestId('revoke-all-button');
    await expect(revokeAllButton).toBeVisible({ timeout: 5_000 });
    await revokeAllButton.click();

    // 現在端末 1 件のみ残る
    await expect(sessionItems).toHaveCount(1, { timeout: 5_000 });

    // 現在端末バッジがまだ存在する
    await expect(page.getByTestId('current-badge')).toHaveCount(1);

    // context2 側で refresh → 401（セッションが失効しているため）
    // Origin ヘッダーを付与して OriginRefererGuard を通過させる（ブラウザ操作と同等の条件）
    const refreshRes = await page2.request.post(`${API}/api/auth/refresh`, {
      headers: { Origin: 'http://localhost:5173' },
    });
    expect(refreshRes.status()).toBe(401);
  } finally {
    await context2?.close();
  }
});
