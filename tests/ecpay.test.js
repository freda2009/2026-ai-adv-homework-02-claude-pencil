const { app, request, registerUser } = require('./setup');
const { generateCheckMacValue, ECPAY_CONFIG } = require('../src/utils/ecpay');

// 以 stub 取代 fetch，模擬綠界 QueryTradeInfo 回應（不連外網）
function stubQuery(fields) {
  const params = { MerchantID: ECPAY_CONFIG.merchantId, ...fields };
  params.CheckMacValue = generateCheckMacValue(params, ECPAY_CONFIG.hashKey, ECPAY_CONFIG.hashIV);
  vi.stubGlobal('fetch', async () => ({
    ok: true,
    text: async () => new URLSearchParams(params).toString(),
  }));
}

describe('ECPay 付款查詢', () => {
  let token;
  let productId;

  async function createOrder() {
    await request(app).post('/api/cart').set('Authorization', `Bearer ${token}`).send({ productId, quantity: 1 });
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientName: '測試', recipientEmail: 'a@example.com', recipientAddress: '台北市' });
    return res.body.data;
  }

  const check = (id) => request(app).post(`/api/orders/${id}/check-payment`).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    token = (await registerUser()).token;
    productId = (await request(app).get('/api/products')).body.data.products[0].id;
  });

  afterEach(() => vi.unstubAllGlobals());

  it('付款頁回傳含 CheckMacValue 的自動送出表單', async () => {
    const order = await createOrder();
    const res = await request(app).get(`/ecpay/payment/${order.id}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('AioCheckOut/V5');
    expect(res.text).toContain('name="CheckMacValue"');
    expect(res.text).toContain(`value="${order.merchant_trade_no}"`);
  });

  it('TradeStatus=1 且金額相符 → 訂單轉為 paid', async () => {
    const order = await createOrder();
    stubQuery({ MerchantTradeNo: order.merchant_trade_no, TradeStatus: '1', TradeAmt: String(order.total_amount) });
    const res = await check(order.id);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('paid');
  });

  it('尚未付款（TradeStatus=0）→ 維持 pending', async () => {
    const order = await createOrder();
    stubQuery({ MerchantTradeNo: order.merchant_trade_no, TradeStatus: '0', TradeAmt: String(order.total_amount) });
    const res = await check(order.id);
    expect(res.body.data.status).toBe('pending');
  });

  it('金額不符 → 不得標記 paid', async () => {
    const order = await createOrder();
    stubQuery({ MerchantTradeNo: order.merchant_trade_no, TradeStatus: '1', TradeAmt: '1' });
    const res = await check(order.id);
    expect(res.body.data.status).toBe('pending');
  });

  it('回應簽章錯誤 → 502 且訂單不變', async () => {
    const order = await createOrder();
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      text: async () => `MerchantID=1&MerchantTradeNo=${order.merchant_trade_no}&TradeStatus=1&TradeAmt=${order.total_amount}&CheckMacValue=BAD`,
    }));
    const res = await check(order.id);
    expect(res.status).toBe(502);
    const detail = await request(app).get(`/api/orders/${order.id}`).set('Authorization', `Bearer ${token}`);
    expect(detail.body.data.status).toBe('pending');
  });
});
