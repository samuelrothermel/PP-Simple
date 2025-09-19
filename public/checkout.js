// Simple PayPal Checkout Implementation

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function () {
  loadPayPalSDK();

  // Update total when amount changes
  document
    .getElementById('amount-input')
    .addEventListener('input', function () {
      updateTotal();
    });
});

// Update the total display
function updateTotal() {
  const amount = document.getElementById('amount-input').value || '10.00';
  document.getElementById('total-amount').textContent = amount;
}

// Load PayPal SDK and initialize components
function loadPayPalSDK() {
  // Enable card fields by removing card from disable-funding
  const scriptUrl = `https://www.paypal.com/sdk/js?components=buttons,card-fields,messages&intent=capture&client-id=${clientId}&enable-funding=venmo,paylater&currency=USD`;

  const scriptElement = document.createElement('script');
  scriptElement.src = scriptUrl;
  scriptElement.onload = initializePayPal;
  scriptElement.onerror = () => console.error('Failed to load PayPal SDK');

  document.head.appendChild(scriptElement);
}

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

  // Initialize PayLater Messages
  if (paypal.Messages) {
    paypal
      .Messages({
        amount: document.getElementById('amount-input').value || '10.00',
        placement: 'payment',
        style: {
          layout: 'text',
          logo: {
            type: 'inline',
          },
        },
      })
      .render('#paylater-message-container');
  }

  // Initialize Card Fields
  const cardField = paypal.CardFields({
    createOrder: createOrder,
    onApprove: onApprove,
    onError: onError,
  });

  if (cardField.isEligible()) {
    cardField.NumberField().render('#card-number-field');
    cardField.ExpiryField().render('#card-expiry-field');
    cardField.CVVField().render('#card-cvv-field');

    document
      .getElementById('card-submit-button')
      .addEventListener('click', () => {
        cardField.submit();
      });
  } else {
    document.getElementById('card-section').style.display = 'none';
  }
}

// Create order function
function createOrder(data = {}, actions) {
  const amount = document.getElementById('amount-input').value || '10.00';
  const paymentSource = data.paymentSource;

  return fetch('/api/checkout-orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      totalAmount: amount,
      paymentSource: paymentSource,
    }),
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(orderData => {
      displayOrderInfo('Order Created', `Order ID: ${orderData.id}`);
      return orderData.id;
    })
    .catch(error => {
      console.error('Error creating order:', error);
      displayOrderInfo('Error', `Failed to create order: ${error.message}`);
      throw error;
    });
}

// Handle successful payment approval
function onApprove(data, actions) {
  return fetch(`/api/orders/${data.orderID}/capture`, {
    method: 'POST',
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(orderData => {
      const transaction = orderData.purchase_units[0].payments.captures[0];
      displayOrderInfo(
        'Payment Successful',
        `Transaction ID: ${transaction.id}<br>
       Amount: ${transaction.amount.value} ${transaction.amount.currency_code}<br>
       Status: ${transaction.status}`
      );
    })
    .catch(error => {
      console.error('Error capturing payment:', error);
      displayOrderInfo('Error', `Failed to capture payment: ${error.message}`);
    });
}

// Handle payment cancellation
function onCancel(data) {
  displayOrderInfo('Payment Cancelled', 'User cancelled the payment');
}

// Handle payment errors
function onError(err) {
  console.error('PayPal payment error:', err);
  displayOrderInfo(
    'Payment Error',
    'An error occurred during payment processing'
  );
}

// Display order information
function displayOrderInfo(title, message) {
  const infoSection = document.getElementById('order-info');
  infoSection.innerHTML = `
    <div class="info-item">
      <h4>${title}</h4>
      <p>${message}</p>
    </div>
  `;
  infoSection.style.display = 'block';
}
