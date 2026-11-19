class PaymentError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function createPaymentService({ db, gateway = null }) {
  function initiate({ orderId, userId }) {
    if (!gateway) {
      throw new PaymentError(503, "درگاه پرداخت تنظیم نشده است.");
    }

    const order = db.prepare(`
      SELECT id, status, payment_status, total_amount, currency
      FROM orders
      WHERE id = ? AND user_id = ?
    `).get(orderId, userId);

    if (!order) {
      throw new PaymentError(404, "سفارش پیدا نشد.");
    }

    if (order.payment_status !== "pending" || order.status !== "pending_payment") {
      throw new PaymentError(409, "این سفارش در انتظار پرداخت نیست.");
    }

    const payment = db.prepare(`
      SELECT id, provider, provider_reference, redirect_url, amount, currency, status
      FROM payments
      WHERE order_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(order.id);

    if (
      !payment ||
      payment.status !== "pending" ||
      payment.amount !== order.total_amount ||
      payment.currency !== order.currency
    ) {
      throw new PaymentError(409, "اطلاعات پرداخت با مبلغ سفارش هم‌خوانی ندارد.");
    }

    if (payment.provider_reference && payment.redirect_url) {
      return {
        provider: payment.provider,
        redirectUrl: payment.redirect_url,
        status: "pending",
      };
    }

    const intent = gateway.createPayment({
      orderId: order.id,
      paymentId: payment.id,
      amount: order.total_amount,
      currency: order.currency,
    });

    if (
      !intent ||
      typeof intent.provider !== "string" ||
      !intent.provider ||
      typeof intent.reference !== "string" ||
      !intent.reference ||
      typeof intent.redirectUrl !== "string" ||
      !intent.redirectUrl.startsWith("https://")
    ) {
      throw new PaymentError(502, "پاسخ ایجاد پرداخت معتبر نیست.");
    }

    const update = db.prepare(`
      UPDATE payments
      SET provider = ?,
          provider_reference = ?,
          redirect_url = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'pending'
    `).run(intent.provider, intent.reference, intent.redirectUrl, payment.id);

    if (update.changes !== 1) {
      throw new PaymentError(409, "پرداخت سفارش پیش‌تر آغاز شده است.");
    }

    return {
      provider: intent.provider,
      redirectUrl: intent.redirectUrl,
      status: "pending",
    };
  }

  function verifyCallback(notification) {
    if (!gateway) {
      throw new PaymentError(503, "درگاه پرداخت تنظیم نشده است.");
    }

    let result;
    try {
      result = gateway.verifyCallback(notification);
    } catch (error) {
      console.error("Payment gateway verification error:", error.message);
      throw new PaymentError(502, "تأیید پرداخت از سمت درگاه انجام نشد.");
    }

    if (
      !result ||
      result.verified !== true ||
      typeof result.provider !== "string" ||
      typeof result.reference !== "string" ||
      typeof result.orderId !== "string" ||
      !Number.isSafeInteger(result.amount) ||
      result.amount < 0 ||
      result.currency !== "IRR" ||
      result.status !== "paid"
    ) {
      throw new PaymentError(400, "پاسخ درگاه معتبر یا موفق نیست.");
    }

    const verify = db.transaction(() => {
      const payment = db.prepare(`
        SELECT
          p.id, p.order_id, p.provider, p.provider_reference,
          p.amount, p.currency, p.status,
          o.total_amount, o.currency AS order_currency,
          o.payment_status, o.status AS order_status
        FROM payments p
        JOIN orders o ON o.id = p.order_id
        WHERE p.order_id = ?
        ORDER BY p.created_at DESC
        LIMIT 1
      `).get(result.orderId);

      if (
        !payment ||
        payment.provider !== result.provider ||
        payment.provider_reference !== result.reference ||
        payment.amount !== result.amount ||
        payment.total_amount !== result.amount ||
        payment.currency !== result.currency ||
        payment.order_currency !== result.currency
      ) {
        throw new PaymentError(409, "مبلغ یا شناسه پرداخت با سفارش مطابقت ندارد.");
      }

      if (payment.status === "paid" && payment.payment_status === "paid") {
        return { orderId: payment.order_id, repeated: true };
      }

      if (
        payment.status !== "pending" ||
        payment.payment_status !== "pending" ||
        payment.order_status !== "pending_payment"
      ) {
        throw new PaymentError(409, "وضعیت سفارش برای این پرداخت معتبر نیست.");
      }

      db.prepare(`
        UPDATE payments
        SET status = 'paid', verified_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'pending'
      `).run(payment.id);
      db.prepare(`
        UPDATE orders
        SET payment_status = 'paid', status = 'processing',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND payment_status = 'pending'
      `).run(payment.order_id);
      db.prepare(`
        INSERT INTO order_status_history (
          id, order_id, actor_user_id, previous_status, next_status, note
        )
        VALUES (
          lower(hex(randomblob(16))), ?, NULL,
          'pending_payment', 'processing', 'تأیید پرداخت از درگاه'
        )
      `).run(payment.order_id);

      return { orderId: payment.order_id, repeated: false };
    });

    return verify();
  }

  return { initiate, verifyCallback };
}

module.exports = { createPaymentService, PaymentError };
