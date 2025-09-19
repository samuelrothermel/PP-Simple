# How to Add Apple Pay Integration to PayPal Checkout

This guide walks you through adding Apple Pay support to your existing PayPal Checkout project using the latest requirements and best practices.

## Prerequisites

- Apple device with Safari browser (for testing)
- PayPal Developer Account with Apple Pay enabled
- HTTPS domain (required for production, localhost works for development)
- Existing PayPal Checkout implementation

## Key Implementation Steps

### Step 1: Include the Apple Pay SDK Script

Add the Apple Pay SDK script to your HTML head section. This is **required** for the Apple Pay button to render properly:

```html
<head>
  <!-- Other head elements -->
  <!-- Apple Pay SDK - Required for apple-pay-button element -->
  <script src="https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js"></script>
</head>
```

### Step 2: Update Content Security Policy

Ensure your Content Security Policy (CSP) allows the Apple Pay SDK:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self' 'unsafe-inline' https://www.paypal.com https://*.paypal.com https://*.paypalobjects.com https://applepay.cdn-apple.com; connect-src 'self' https://*.paypal.com https://api.sandbox.paypal.com https://api.paypal.com; frame-src https://*.paypal.com https://*.paypalobjects.com; img-src 'self' data: https://*.paypal.com https://*.paypalobjects.com; style-src 'self' 'unsafe-inline' https://*.paypal.com; font-src 'self' https://*.paypal.com;"
/>
```

### Step 3: Configure PayPal SDK with Apple Pay Components

Include Apple Pay in your PayPal SDK components list:

```javascript
function loadPayPalSDK() {
  const scriptUrl = `https://www.paypal.com/sdk/js?components=buttons,card-fields,messages,applepay&intent=capture&client-id=${clientId}&enable-funding=venmo,paylater,applepay&currency=USD`;

  const scriptElement = document.createElement('script');
  scriptElement.src = scriptUrl;
  scriptElement.onload = initializePayPal;
  scriptElement.onerror = () => console.error('Failed to load PayPal SDK');

  document.head.appendChild(scriptElement);
}
```

### Step 4: Add Apple Pay Container to HTML

Add a container for the Apple Pay button in your checkout page. We've found it works best as a standalone payment section with no heading for seamless integration:

```html
<div class="payment-section" id="applepay-section">
  <div id="applepay-container">
    <!-- Apple Pay button will be inserted here when eligible -->
  </div>
</div>
```

### Step 5: Style the Apple Pay Button

Apply these essential styles to make the Apple Pay button match the width of other payment buttons and render correctly:

```css
/* Apple Pay Button Styles */
#applepay-container {
  margin: 0 0 20px 0;
  text-align: center;
  min-height: 60px;
}

apple-pay-button {
  -webkit-appearance: -apple-pay-button;
  appearance: -apple-pay-button;
  -apple-pay-button-type: buy;
  -apple-pay-button-style: black;
  width: 100%;
  height: 50px;
  display: inline-block;
  cursor: pointer;
}

#applepay-section {
  min-height: 60px;
}
```

### Step 6: Initialize Apple Pay with Hidden-by-Default Pattern

This pattern ensures the Apple Pay button only shows when fully eligible:

```javascript
// Initialize PayPal components after SDK loads
function initializePayPal() {
  // Initialize PayPal Buttons
  paypal
    .Buttons({
      style: {
        layout: 'vertical',
        color: 'blue',
        shape: 'rect',
        label: 'paypal',
      },
      createOrder: createOrder,
      onApprove: onApprove,
      onCancel: onCancel,
      onError: onError,
    })
    .render('#paypal-button-container');

  // Hide Apple Pay section by default
  const applePaySection = document.getElementById('applepay-section');
  if (applePaySection) {
    applePaySection.style.display = 'none';
  }

  // Initialize Apple Pay (if supported)
  if (
    paypal.Applepay &&
    window.ApplePaySession &&
    ApplePaySession.canMakePayments()
  ) {
    initializeApplePay();
  }

  // Initialize other payment methods...
}
```

### Step 7: Implement the Apple Pay Initialization Logic

```javascript
function initializeApplePay() {
  try {
    // Keep Apple Pay section hidden by default - only show if fully eligible
    const applePaySection = document.getElementById('applepay-section');
    if (applePaySection) {
      applePaySection.style.display = 'none';
    }

    if (!window.ApplePaySession) {
      console.log('This device does not support Apple Pay');
      return;
    }

    if (!ApplePaySession.canMakePayments()) {
      console.log('This device is not capable of making Apple Pay payments');
      return;
    }

    const applepay = paypal.Applepay();

    applepay
      .config()
      .then(applepayConfig => {
        if (applepayConfig.isEligible) {
          const applePayContainer =
            document.getElementById('applepay-container');
          if (applePayContainer) {
            // Create the Apple Pay button
            applePayContainer.innerHTML =
              '<apple-pay-button id="btn-appl" buttonstyle="black" type="buy" locale="en"></apple-pay-button>';

            const applePayButton = document.getElementById('btn-appl');
            if (applePayButton) {
              applePayButton.addEventListener('click', () => {
                startApplePaySession(applepay, applepayConfig);
              });

              // Only show the section if everything is successful
              if (applePaySection) {
                applePaySection.style.display = 'block';
              }
            }
          }
        } else {
          console.log('Apple Pay not eligible for this merchant');
        }
      })
      .catch(error => {
        console.error('Apple Pay config error:', error);
      });
  } catch (error) {
    console.error('Apple Pay initialization error:', error);
  }
}
```

### Step 8: Create the Apple Pay Session Handler

```javascript
function startApplePaySession(applepay, applepayConfig) {
  const amount = document.getElementById('amount-input').value || '10.00';

  // Use configuration values from the applepay config
  const request = {
    countryCode: applepayConfig.countryCode,
    merchantCapabilities: applepayConfig.merchantCapabilities,
    supportedNetworks: applepayConfig.supportedNetworks,
    currencyCode: 'USD',
    requiredShippingContactFields: ['name', 'phone', 'email', 'postalAddress'],
    requiredBillingContactFields: ['postalAddress'],
    total: {
      label: 'PayPal Checkout Demo',
      type: 'final',
      amount: amount,
    },
  };

  // Create session with version 4 (per PayPal documentation)
  const session = new ApplePaySession(4, request);

  // Handle merchant validation
  session.onvalidatemerchant = event => {
    applepay
      .validateMerchant({
        validationUrl: event.validationURL,
        displayName: 'Your Store Name',
      })
      .then(validateResult => {
        session.completeMerchantValidation(validateResult.merchantSession);
      })
      .catch(validateError => {
        console.error('Merchant validation failed:', validateError);
        session.abort();
        displayOrderInfo(
          'Apple Pay Error',
          `Merchant validation failed: ${
            validateError.message || 'Unknown error'
          }`
        );
      });
  };

  // Handle payment authorization
  session.onpaymentauthorized = event => {
    // Create order via your API
    fetch('/api/checkout-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalAmount: amount,
        paymentSource: 'applepay',
      }),
    })
      .then(response => {
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
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
      .then(response => {
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then(captureResult => {
        // Handle successful payment
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
        displayOrderInfo(
          'Apple Pay Error',
          `Payment failed: ${error.message || 'Unknown error'}`
        );
      });
  };

  // Handle cancellation
  session.oncancel = event => {
    console.log('Apple Pay session cancelled');
    displayOrderInfo('Apple Pay Cancelled', 'User cancelled Apple Pay');
  };

  // Start the session
  session.begin();
}
```

## Server-Side Requirements

### Domain Verification File

Host the Apple domain verification file at `.well-known/apple-developer-merchantid-domain-association`:

```javascript
// In your Express.js app
app.get(
  '/.well-known/apple-developer-merchantid-domain-association',
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        'public/apple-developer-merchantid-domain-association'
      )
    );
  }
);
```

### Update Order API for Apple Pay

Ensure your order creation API supports Apple Pay as a payment source:

```javascript
// In your order creation API
if (paymentSource === 'applepay') {
  payment_source.apple_pay = {};
}
```

## PayPal Developer Dashboard Setup

1. Log into [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Go to Apps & Credentials
3. Navigate to your app settings
4. Under Features, enable Apple Pay
5. Register your domain for Apple Pay

## Key Requirements for Apple Pay to Work

Based on our implementation experience, Apple Pay will only work if:

1. **Apple Pay SDK Script**: Include the script directly in your HTML

   ```html
   <script src="https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js"></script>
   ```

2. **Content Security Policy**: Allow `applepay.cdn-apple.com` in script-src

3. **Hidden by Default Pattern**: Only show the Apple Pay button after confirming:

   - Device supports Apple Pay (`window.ApplePaySession`)
   - Device can make payments (`ApplePaySession.canMakePayments()`)
   - Merchant is eligible (`applepayConfig.isEligible`)

4. **Proper Button Styling**: Use the official Apple-specified CSS properties:

   ```css
   apple-pay-button {
     -webkit-appearance: -apple-pay-button;
     appearance: -apple-pay-button;
   }
   ```

5. **Dynamic Configuration**: Use PayPal's configuration values for:

   - `countryCode`
   - `merchantCapabilities`
   - `supportedNetworks`

6. **Safari Browser**: Testing must be done in Safari on a Mac or iOS device

## Troubleshooting

If Apple Pay isn't appearing:

1. **Check browser console** for any errors related to Apple Pay initialization
2. **Verify device compatibility** (must be an Apple device with Safari browser)
3. **Check merchant eligibility** in the PayPal Developer Dashboard
4. **Ensure the Apple Pay SDK script** is loaded before your payment script
5. **Validate your domain** is registered in the PayPal Developer Dashboard
6. **Check your button styling** follows Apple's requirements

## Apple Pay Features

The Apple Pay integration supports:

- One-time payments
- Billing and shipping information collection
- Custom payment sheet styling
- Multiple card networks (Visa, Mastercard, Amex, Discover)
- Seamless integration with PayPal's payment processing

## Testing

Apple Pay will only work on:

- Apple devices with Safari browser
- iOS 12.1+ or macOS 10.14.1+
- Devices with Apple Pay configured in Wallet
- HTTPS in production (localhost works for development)

For testing in development:

- Log into the iCloud account where Apple Pay is configured
- Use Safari browser
- Make sure you're on an Apple device with Touch ID/Face ID or a Mac
