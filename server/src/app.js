import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import groupRoutes from './routes/groups.js';
import sessionRoutes from './routes/sessions.js';
import ratingRoutes from './routes/ratings.js';
import invitationRoutes from './routes/invitations.js';

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || true;
app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, project: 'study-group-matcher' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api', sessionRoutes);
app.use('/api', ratingRoutes);
app.use('/api/invitations', invitationRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    success: false,
    message: 'Server error.'
  });
});

export default app;
