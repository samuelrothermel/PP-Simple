# How to Add Apple Pay Integration to PayPal Checkout

This guide walks you through adding Apple Pay support to your existing PayPal Checkout project.

## Prerequisites

- Apple device with Apple Pay configured (for testing)
- PayPal Developer Account with Apple Pay enabled
- HTTPS domain (required for production, localhost works for development)
- Existing PayPal Checkout implementation

## Step-by-Step Implementation

### Step 1: Update PayPal SDK Configuration

In your `public/checkout.js` file, update the `loadPayPalSDK()` function to include Apple Pay components:

```javascript
function loadPayPalSDK() {
  // Add 'applepay' to components and enable-funding
  const scriptUrl = `https://www.paypal.com/sdk/js?components=buttons,card-fields,messages,applepay&intent=capture&client-id=${clientId}&enable-funding=venmo,paylater,applepay&currency=USD`;

  const scriptElement = document.createElement('script');
  scriptElement.src = scriptUrl;
  scriptElement.onload = initializePayPal;
  document.head.appendChild(scriptElement);
}
```

### Step 2: Add Apple Pay Container to HTML

In your checkout template (`views/checkout.ejs`), add an Apple Pay container between your PayPal buttons and other payment options:

```html
<div class="payment-section">
  <h3>Quick Checkout with PayPal</h3>
  <div id="paypal-button-container"></div>
</div>

<!-- ADD THIS: Apple Pay container (no header for seamless integration) -->
<div class="payment-section" id="applepay-section">
  <div id="applepay-container"></div>
</div>

<div class="payment-section">
  <div id="paylater-message-container"></div>
</div>
```

### Step 3: Add Apple Pay Initialization

In your `public/checkout.js` file, add Apple Pay initialization to the `initializePayPal()` function:

```javascript
function initializePayPal() {
  // ... existing PayPal buttons initialization ...

  // ADD THIS: Initialize Apple Pay (if supported)
  if (
    paypal.Applepay &&
    window.ApplePaySession &&
    ApplePaySession.canMakePayments()
  ) {
    initializeApplePay();
  }

  // ... rest of existing code ...
}
```

### Step 4: Add Apple Pay Initialization Function

Add this new function to your `public/checkout.js` file:

```javascript
// ADD THIS ENTIRE FUNCTION
function initializeApplePay() {
  try {
    const applepay = paypal.Applepay();

    applepay
      .config()
      .then(applepayConfig => {
        if (applepayConfig.isEligible) {
          const applePayContainer =
            document.getElementById('applepay-container');
          if (applePayContainer) {
            applePayContainer.innerHTML =
              '<apple-pay-button id="btn-appl" buttonstyle="black" type="buy" locale="en"></apple-pay-button>';

            const applePayButton = document.getElementById('btn-appl');
            if (applePayButton) {
              applePayButton.addEventListener('click', () => {
                startApplePaySession(applepay);
              });
            }
          }
        } else {
          document.getElementById('applepay-section').style.display = 'none';
        }
      })
      .catch(error => {
        console.error('Apple Pay config error:', error);
        document.getElementById('applepay-section').style.display = 'none';
      });
  } catch (error) {
    console.error('Apple Pay initialization error:', error);
    document.getElementById('applepay-section').style.display = 'none';
  }
}
```

### Step 5: Add Apple Pay Session Handler

Add this new function to your `public/checkout.js` file to handle the native Apple Pay session:

```javascript
// ADD THIS ENTIRE FUNCTION
function startApplePaySession(applepay) {
  const amount = document.getElementById('amount-input').value || '10.00';

  const request = {
    countryCode: 'US',
    currencyCode: 'USD',
    supportedNetworks: ['visa', 'masterCard', 'amex', 'discover'],
    merchantCapabilities: ['supports3DS'],
    total: {
      label: 'PayPal Checkout Demo',
      amount: amount,
      type: 'final',
    },
  };

  const session = new ApplePaySession(3, request);

  // Handle merchant validation
  session.onvalidatemerchant = event => {
    applepay
      .validateMerchant({
        validationUrl: event.validationURL,
        displayName: 'PayPal Checkout Demo',
      })
      .then(validateResult => {
        session.completeMerchantValidation(validateResult.merchantSession);
      })
      .catch(validateError => {
        console.error('Merchant validation failed:', validateError);
        session.abort();
        displayOrderInfo(
          'Apple Pay Error',
          `Merchant validation failed: ${validateError.message}`
        );
      });
  };

  // Handle payment authorization
  session.onpaymentauthorized = event => {
    // Create order
    fetch('/api/checkout-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalAmount: amount,
        paymentSource: 'applepay',
      }),
    })
      .then(response => response.json())
      .then(createOrderData => {
        // Confirm order with Apple Pay token
        return applepay.confirmOrder({
          orderId: createOrderData.id,
          token: event.payment.token,
          billingContact: event.payment.billingContact,
          shippingContact: event.payment.shippingContact,
        });
      })
      .then(confirmResult => {
        session.completePayment(ApplePaySession.STATUS_SUCCESS);
        // Capture payment
        return fetch(`/api/orders/${confirmResult.orderID}/capture`, {
          method: 'POST',
        });
      })
      .then(response => response.json())
      .then(captureResult => {
        const transaction =
          captureResult.purchase_units[0].payments.captures[0];
        displayOrderInfo(
          'Apple Pay Payment Successful',
          `Transaction ID: ${transaction.id}<br>
           Amount: ${transaction.amount.value} ${transaction.amount.currency_code}<br>
           Status: ${transaction.status}`
        );
        showSuccessMessage('Apple Pay payment completed successfully!');
      })
      .catch(error => {
        console.error('Apple Pay payment error:', error);
        session.completePayment(ApplePaySession.STATUS_FAILURE);
        displayOrderInfo('Apple Pay Error', `Payment failed: ${error.message}`);
      });
  };

  // Handle payment cancellation
  session.oncancel = event => {
    displayOrderInfo('Apple Pay Cancelled', 'User cancelled Apple Pay');
  };

  session.begin();
}
```

### Step 6: Update Server-Side Order Creation

In your `src/services/ordersApi.js` file, update the `createCheckoutOrder` function to handle Apple Pay payment source:

```javascript
export const createCheckoutOrder = async orderData => {
  const { totalAmount = '10.00', paymentSource = 'paypal' } = orderData;
  const accessToken = await generateAccessToken();

  let payment_source = {};

  if (paymentSource === 'paypal') {
    payment_source.paypal = {
      experience_context: {
        return_url: `${
          process.env.BASE_URL || 'https://your-domain.com'
        }/checkout`,
        cancel_url: `${
          process.env.BASE_URL || 'https://your-domain.com'
        }/checkout`,
        user_action: 'PAY_NOW',
      },
    };
  } else if (paymentSource === 'card') {
    payment_source.card = {};
  } else if (paymentSource === 'applepay') {
    // ADD THIS: For Apple Pay, include apple_pay payment source
    payment_source.apple_pay = {};
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
    payment_source: payment_source, // Always include payment_source
  };

  // ... rest of existing code ...
};
```

### Step 7: Add Domain Verification Route (Production Only)

For production deployment, add this route to your `src/routes/pages.js` file:

```javascript
import path from 'path';

// ADD THIS ROUTE for Apple Pay domain verification
router.get(
  '/.well-known/apple-developer-merchantid-domain-association',
  (req, res) => {
    res.sendFile(
      path.join(
        process.cwd(),
        'public/apple-developer-merchantid-domain-association'
      )
    );
  }
);
```

## Configuration Requirements

### PayPal Developer Dashboard Setup

1. Log into [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Navigate to your app settings
3. Enable Apple Pay in the "Features" section
4. Add your domain for Apple Pay verification
5. Configure Apple Pay merchant settings

### Environment Variables

Ensure your `.env` file includes:

```properties
CLIENT_ID=your_paypal_client_id
CLIENT_SECRET=your_paypal_client_secret
BASE_URL=https://your-domain.com
```

## Testing

Apple Pay will only work on:

- Apple devices (iPhone, iPad, Mac with Touch ID/Face ID)
- Safari browser (or Safari-based browsers)
- Devices with Apple Pay configured in Wallet
- HTTPS in production (localhost HTTP works for development)

## How It Works

1. **Automatic Detection**: Code checks if device supports Apple Pay
2. **Button Display**: Apple Pay button appears seamlessly below PayPal buttons
3. **Native Session**: Uses Apple's native payment sheet for user interaction
4. **PayPal Processing**: Payments are processed through PayPal's infrastructure
5. **Error Handling**: Graceful fallbacks for unsupported devices/browsers

The integration provides a seamless experience where Apple Pay appears as a natural part of your payment options without disrupting the existing flow.
