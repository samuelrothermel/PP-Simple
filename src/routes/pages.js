import express from 'express';
import { renderCheckout } from '../controllers/pageController.js';
import path from 'path';

const router = express.Router();

// Redirect root to checkout
router.get('/', (req, res) => {
  res.redirect('/checkout');
});

// Checkout page - the main page for this simplified demo
router.get('/checkout', renderCheckout);

// Apple Pay domain verification (required for production)
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

export default router;
