import {
  createCheckoutOrder as createCheckoutOrderApi,
  capturePayment as capturePaymentApi,
  authorizePayment as authorizePaymentApi,
} from '../services/ordersApi.js';

// Create order request from Checkout page
export const createCheckoutOrder = async (req, res, next) => {
  console.log('Creating PayPal Checkout Order...');
  try {
    const order = await createCheckoutOrderApi(req.body);
    res.json(order);
  } catch (err) {
    next(err);
  }
};

// Capture payment
export const capturePayment = async (req, res, next) => {
  console.log('Capturing PayPal payment...');
  const { orderID } = req.params;
  try {
    const captureData = await capturePaymentApi(orderID);
    res.json(captureData);
  } catch (err) {
    next(err);
  }
};

// Authorize payment
export const authorizePayment = async (req, res, next) => {
  console.log('Authorizing PayPal payment...');
  const { orderID } = req.params;
  try {
    const authorizeData = await authorizePaymentApi(orderID);
    res.json(authorizeData);
  } catch (err) {
    next(err);
  }
};
