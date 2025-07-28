import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './utils/logger';
import { rateLimiter } from './middleware/rateLimiter';
import { initRedis } from './database/redis';
import { db } from './database/postgres';
import relayerRoutes from './routes/relayer';
import cron from 'node-cron';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// Health check endpoint
app.get('/ping', (req, res) => {
  res.json({ message: 'Aptos Gasless Relayer is running!', timestamp: new Date() });
});

// API routes
app.use('/api/v1/relayer', relayerRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  try {
    await db.destroy();
  } catch (error) {
    logger.warn('Error closing database connection:', error);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  try {
    await db.destroy();
  } catch (error) {
    logger.warn('Error closing database connection:', error);
  }
  process.exit(0);
});

// Cleanup function to run periodically
const cleanupOldTransactions = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const deletedCount = await db('transactions')
      .where('created_at', '<', thirtyDaysAgo)
      .del();
    
    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} old transactions`);
    }
  } catch (error) {
    logger.error('Error during cleanup:', error);
  }
};

// Initialize services and start server
async function startServer() {
  try {
    // Initialize Redis (optional)
    await initRedis();

    // Test database connection (optional for testing)
    try {
      await db.raw('SELECT 1');
      logger.info('Database connection established');
      
      // Run migrations
      await db.migrate.latest();
      logger.info('Database migrations completed');
      
      // Schedule cleanup job (runs daily at midnight)
      cron.schedule('0 0 * * *', cleanupOldTransactions);
      logger.info('Cleanup job scheduled');
    } catch (dbError) {
      logger.warn('Database connection failed, some features will be limited:', dbError);
    }

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`Aptos Gasless Relayer started on port ${config.port}`);
      logger.info(`Environment: ${config.aptosNetwork}`);
      logger.info('Service is ready to accept requests');
    });

    // Handle server errors
    server.on('error', (error: any) => {
      logger.error('Server error:', error);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 