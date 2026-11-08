const { app, request, registerUser } = require('./setup');

describe('Cart API', () => {
  const sessionId = 'test-session-' + Date.now();
  let productId;
  let cartItemId;
  let userToken;

  beforeAll(async () => {
    // Get a product id from the product list
    const res = await request(app).get('/api/products');
    productId = res.body.data.products[0].id;
  });

  it('should add product to cart (guest mode)', async () => {
    const res = await request(app)
      .post('/api/cart')
      .set('X-Session-Id', sessionId)
      .send({ productId, quantity: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('error', null);
    expect(res.body).toHaveProperty('message');
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('product_id', productId);
    expect(res.body.data).toHaveProperty('quantity');

    cartItemId = res.body.data.id;
  });

  it('should get cart (guest mode)', async () => {
    const res = await request(app)
      .get('/api/cart')
      .set('X-Session-Id', sessionId);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('error', null);
    expect(res.body.data).toHaveProperty('items');
    expect(res.body.data).toHaveProperty('total');
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });

  it('should update cart item quantity (guest mode)', async () => {
    const res = await request(app)
      .patch(`/api/cart/${cartItemId}`)
      .set('X-Session-Id', sessionId)
      .send({ quantity: 3 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('error', null);
    expect(res.body.data).toHaveProperty('quantity', 3);
  });

  it('should remove cart item (guest mode)', async () => {
    const res = await request(app)
      .delete(`/api/cart/${cartItemId}`)
      .set('X-Session-Id', sessionId);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('error', null);

    // Verify cart is empty
    const cartRes = await request(app)
      .get('/api/cart')
      .set('X-Session-Id', sessionId);
    expect(cartRes.body.data.items.length).toBe(0);
  });

  it('should add product to cart (authenticated mode)', async () => {
    const { token } = await registerUser();
    userToken = token;

    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId, quantity: 2 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('error', null);
    expect(res.body.data).toHaveProperty('product_id', productId);
  });

  it('should fail to add non-existent product to cart', async () => {
    const res = await request(app)
      .post('/api/cart')
      .set('X-Session-Id', sessionId)
      .send({ productId: 'non-existent-product-id', quantity: 1 });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('data', null);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).not.toBeNull();
  });

  describe('登入／註冊後合併訪客購物車', () => {
    const { registerUser } = require('./setup');
    const { v4: uuid } = require('uuid');

    async function firstProduct() {
      const res = await request(app).get('/api/products');
      return res.body.data.products[0];
    }

    it('註冊後訪客購物車併入使用者購物車', async () => {
      const sid = uuid();
      const product = await firstProduct();
      await request(app).post('/api/cart').set('X-Session-Id', sid).send({ productId: product.id, quantity: 2 });

      const email = `merge-${Date.now()}@example.com`;
      const reg = await request(app).post('/api/auth/register').set('X-Session-Id', sid)
        .send({ email, password: 'password123', name: '合併測試' });
      const token = reg.body.data.token;

      const cart = await request(app).get('/api/cart').set('Authorization', `Bearer ${token}`);
      expect(cart.body.data.items).toHaveLength(1);
      expect(cart.body.data.items[0].quantity).toBe(2);

      const sessionCart = await request(app).get('/api/cart').set('X-Session-Id', sid);
      expect(sessionCart.body.data.items).toHaveLength(0);
    });

    it('登入時同商品數量相加', async () => {
      const sid = uuid();
      const product = await firstProduct();
      const email = `merge2-${Date.now()}@example.com`;
      const reg = await request(app).post('/api/auth/register')
        .send({ email, password: 'password123', name: '合併測試2' });
      await request(app).post('/api/cart').set('Authorization', `Bearer ${reg.body.data.token}`)
        .send({ productId: product.id, quantity: 1 });
      await request(app).post('/api/cart').set('X-Session-Id', sid).send({ productId: product.id, quantity: 2 });

      const login = await request(app).post('/api/auth/login').set('X-Session-Id', sid)
        .send({ email, password: 'password123' });
      const cart = await request(app).get('/api/cart').set('Authorization', `Bearer ${login.body.data.token}`);
      expect(cart.body.data.items).toHaveLength(1);
      expect(cart.body.data.items[0].quantity).toBe(3);
    });

    it('未帶 X-Session-Id 登入不受影響', async () => {
      const { token } = await registerUser();
      const cart = await request(app).get('/api/cart').set('Authorization', `Bearer ${token}`);
      expect(cart.body.data.items).toHaveLength(0);
    });
  });
});
