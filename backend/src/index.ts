import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/auth';
import providersRoutes from './routes/providers';
import connectionsRoutes from './routes/connections';
import draftsRoutes from './routes/drafts';
import publishRoutes from './routes/publish';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Routes
app.use('/auth', authRoutes);
app.use('/providers', providersRoutes);
app.use('/connections', connectionsRoutes);
app.use('/drafts', draftsRoutes);
app.use('/publish', publishRoutes);

// Health check
app.get('/', (_, res) => res.json({ message: 'Universal Blog Publisher API' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});