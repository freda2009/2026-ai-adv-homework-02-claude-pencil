async (page) => {
  // 由 mcp__playwright__browser_run_code_unsafe 以 filename 載入執行。
  // MCP 程序內無 require / __dirname，故以絕對路徑定位專案。
  const BASE_DIR = '/home/vga222/2026_adv_AI_Course/2026-ai-adv-homework-02-claude-pencil';
  const OUT_DIR = `${BASE_DIR}/tests/e2e-records`;
  const BASE = 'http://localhost:3001';
  const PRODUCT = '迷你多肉組合盆';

  // 檔名時間戳 YYYY-MM-DD-HH-mm（台北時間）
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date()).map((x) => [x.type, x.value])
  );
  const ts = `${parts.year}-${parts.month}-${parts.day}-${parts.hour}-${parts.minute}`;
  const name = `${ts}-ecpay-webatm`;

  const browser = page.context().browser();
  if (!browser) return { status: 'FAIL', step: 'init', error: '無法取得 browser 物件' };

  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: `${OUT_DIR}/.tmp`, size: { width: 1280, height: 800 } },
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(30000);
  const pause = (ms = 800) => p.waitForTimeout(ms);

  const result = { status: 'FAIL', step: '', orderNo: null, url: null, video: null, screenshot: null, error: null };
  const step = (s) => { result.step = s; };

  try {
    step('1. 開啟登入頁');
    await p.goto(`${BASE}/login`);

    step('2. 登入');
    await p.getByRole('textbox', { name: '請輸入 Email' }).fill('admin@hexschool.com');
    await p.getByRole('textbox', { name: '請輸入密碼' }).fill('12345678');
    await pause(500);
    await p.getByRole('button', { name: '登入' }).click();
    await p.waitForURL(`${BASE}/`);
    await pause();

    step('3. 加入購物車');
    // 刻意不選第一件：vitest 固定使用 products[0]，避免爭用其庫存
    await p.getByRole('article').filter({ has: p.getByRole('heading', { name: PRODUCT }) })
      .getByRole('button', { name: '加入購物車' }).click();
    await pause(1200);
    await p.goto(`${BASE}/cart`);
    await pause();

    step('4. 結帳');
    await p.getByRole('button', { name: '前往結帳' }).click();
    await p.waitForURL('**/checkout');
    await p.getByRole('textbox', { name: '請輸入收件人姓名' }).fill('測試用戶');
    await p.getByRole('textbox', { name: '請輸入 Email' }).fill('admin@hexschool.com');
    await p.getByRole('textbox', { name: '請輸入收件地址' }).fill('台北市信義區測試路1號');
    await pause();
    await p.getByRole('button', { name: '確認送出訂單' }).click();

    step('5a. 綠界：選擇網路ATM');
    await p.waitForURL(/payment-stage\.ecpay\.com\.tw/);
    await pause(1000);
    await p.getByRole('listitem', { name: 'WebATM' }).click();
    await pause();

    step('5b. 綠界：選擇台灣土地銀行');
    await p.getByRole('combobox').filter({ hasText: '請選擇銀行' }).selectOption('台灣土地銀行');
    await pause();
    await p.getByRole('link', { name: '前往付款' }).click();
    await pause(1000);
    await p.locator('button:has-text("關閉")').click();

    step('6. 土地銀行模擬頁送出');
    await p.waitForURL(/MockMPPost\/LandWebAtm/);
    await pause(1000);
    await p.getByRole('button', { name: 'Save' }).click();
    await p.waitForURL(/webatm\/result/);
    await p.getByRole('heading', { name: '付款成功' }).waitFor();
    await pause(1500);

    step('7. 返回商店並驗證已付款');
    await p.getByRole('link', { name: '返回商店' }).click();
    await p.waitForURL(/\/orders\//);
    await p.getByText('已付款').first().waitFor();
    const sub = await p.getByText(/ORD-\d{8}-\w+/).first().textContent();
    result.orderNo = (sub.match(/ORD-\d{8}-\w+/) || [null])[0];
    result.url = p.url();
    await pause(2000);

    result.status = 'PASS';
  } catch (e) {
    result.error = e.message.split('\n')[0];
  }

  const suffix = result.status === 'PASS' ? '' : '-failed';
  result.screenshot = `${OUT_DIR}/${name}${suffix}.png`;
  result.video = `${OUT_DIR}/${name}${suffix}.webm`;
  try {
    await p.screenshot({ path: result.screenshot, fullPage: true });
  } catch (e) {
    result.screenshot = `截圖失敗：${e.message.split('\n')[0]}`;
  }
  const video = p.video();
  await ctx.close(); // 關閉後影片才完整寫出
  await video.saveAs(result.video);
  await video.delete();
  return result;
}
