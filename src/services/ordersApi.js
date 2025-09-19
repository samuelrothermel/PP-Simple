import fetch from 'node-fetch';
import { generateAccessToken } from './authApi.js';

const base = 'https://api-m.sandbox.paypal.com';

// Handle response from PayPal API
const handleResponse = async response => {
  if (response.status === 200 || response.status === 201) {
    return response.json();
  }

  console.error('PayPal API Error:', response.status, response.statusText);
  const errorText = await response.text();
  console.error('Error details:', errorText);

  const error = new Error(errorText);
  error.status = response.status;
  throw error;
};

// Create a simple checkout order
export const createCheckoutOrder = async orderData => {
  const { totalAmount = '10.00', paymentSource = 'paypal' } = orderData;
  const accessToken = await generateAccessToken();

  // Build simple payment source based on type
  let payment_source = {};

  if (paymentSource === 'paypal') {
    payment_source.paypal = {
      experience_context: {
        return_url: `${
          process.env.BASE_URL || 'https://pp-simple.onrender.com'
        }/checkout`,
        cancel_url: `${
          process.env.BASE_URL || 'https://pp-simple.onrender.com'
        }/checkout`,
        user_action: 'PAY_NOW',
      },
    };
  } else if (paymentSource === 'card') {
    payment_source.card = {};
  } else if (paymentSource === 'venmo') {
    payment_source.venmo = {};
  }

  const requestBody = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code: 'USD',
          value: totalAmount,
        },
      },
    ],
  };

  // Add payment_source to request body for all payment types
  requestBody.payment_source = payment_source;

  const response = await fetch(`${base}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'PayPal-Request-Id': Date.now().toString(),
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  return handleResponse(response);
};

// Capture payment for an order
export const capturePayment = async orderId => {
  const accessToken = await generateAccessToken();

  const response = await fetch(
    `${base}/v2/checkout/orders/${orderId}/capture`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return handleResponse(response);
};

// Authorize payment for an order
export const authorizePayment = async orderId => {
  const accessToken = await generateAccessToken();

  const response = await fetch(
    `${base}/v2/checkout/orders/${orderId}/authorize`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return handleResponse(response);
};
