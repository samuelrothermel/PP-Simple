// Simplified checkout page controller
export const renderCheckout = (req, res) => {
  const clientId = process.env.CLIENT_ID;

  if (!clientId) {
    console.error('CLIENT_ID not found in environment variables');
    return res.status(500).send('PayPal configuration error');
  }

  res.render('checkout', { clientId });
};
