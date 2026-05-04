import dotenv from 'dotenv';
import app from './app.js';
import { initializeDatabase } from './db/init.js';

dotenv.config();

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set in production.');
  process.exit(1);
}

const port = process.env.PORT || 3001;

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error.message);
    process.exit(1);
  });
