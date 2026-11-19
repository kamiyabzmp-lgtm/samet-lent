const express = require("express");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");

const db = require("../database/db");
const gateway = require("../payments/gateway");
const { createPaymentService, PaymentError } = require("../services/paymentService");
const { requireCustomer, requireSameOrigin } = require("./auth");

const router = express.Router();
const paymentService = createPaymentService({ db, gateway });
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
const callbackSchema = z.record(z.string(), z.unknown()).refine(
  (value) => Object.keys(value).length <= 30,
  "Payment callback has too many fields."
);

router.post(
  "/orders/:id/payment",
  requireCustomer,
  requireSameOrigin,
  paymentLimiter,
  (req, res) => {
    const id = z.string().uuid().safeParse(req.params.id);
    if (!id.success) {
      return res.status(400).json({
        success: false,
        message: "شناسه سفارش معتبر نیست.",
      });
    }

    try {
      const data = paymentService.initiate({
        orderId: id.data,
        userId: req.session.user.id,
      });
      return res.json({ success: true, data });
    } catch (error) {
      if (error instanceof PaymentError) {
        return res.status(error.status).json({
          success: false,
          message: error.message,
        });
      }

      console.error("Payment initiation error:", error.message);
      return res.status(500).json({
        success: false,
        message: "ایجاد درخواست پرداخت انجام نشد.",
      });
    }
  }
);

router.post("/callback", paymentLimiter, (req, res) => {
  const validation = callbackSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "پاسخ درگاه معتبر نیست.",
    });
  }

  try {
    const result = paymentService.verifyCallback(validation.data);
    return res.json({
      success: true,
      data: { status: result.repeated ? "already_verified" : "verified" },
    });
  } catch (error) {
    if (error instanceof PaymentError) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Payment callback error:", error.message);
    return res.status(500).json({
      success: false,
      message: "تأیید پرداخت انجام نشد.",
    });
  }
});

module.exports = router;
