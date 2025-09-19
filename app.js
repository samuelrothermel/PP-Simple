// Load environment variables first
const dotenv = await import('dotenv');
dotenv.config();

import express from 'express';
import { handleError } from './src/config/errorHandler.js';
import pageRoutes from './src/routes/pages.js';
import apiRoutes from './src/routes/api.js';

const PORT = process.env.PORT || 8888;

const app = express();

// Express configuration
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());

// Routes
app.use('/', pageRoutes);
app.use('/api', apiRoutes);

// Error handling middleware (must be last)
app.use(handleError);

// Start server
app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}/`);
});

export default app;
