import express from 'express';
import {
  createCheckoutOrder,
  capturePayment,
  authorizePayment,
} from '../controllers/orderController.js';

const router = express.Router();

// Essential order routes for checkout
router.post('/checkout-orders', createCheckoutOrder);
router.post('/orders/:orderID/capture', capturePayment);
router.post('/orders/:orderID/authorize', authorizePayment);

export default router;
