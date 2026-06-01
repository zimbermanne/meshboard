import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { initDatabase } from './db.js';

// Import routes
import clientRoutes from './routes/client.js';
import operatorRoutes from './routes/operator.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (dashboard)
app.use(express.static('public'));

// API Routes
app.use('/api', clientRoutes);
app.use('/api', operatorRoutes);
app.use('/api/admin', authRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'MeshBoard super-node is running' });
});

// Dashboard route
app.get('/dashboard', (req, res) => {
  res.sendFile('public/index.html', { root: '.' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Initialize database and start server
function start() {
  try {
    console.log('🔄 Initializing database...');
    initDatabase();
    
    app.listen(PORT, () => {
      console.log(`✅ MeshBoard super-node running on http://localhost:${PORT}`);
      console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
