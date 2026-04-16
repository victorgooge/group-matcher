import dotenv from 'dotenv';
import app from './app.js';
import { initializeDatabase } from './db/init.js';

dotenv.config();

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
