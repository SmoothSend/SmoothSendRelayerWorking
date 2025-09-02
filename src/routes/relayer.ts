import { Router } from 'express';
import { RelayerController } from '../controllers/relayerController';
import { AptosService } from '../services/aptosService';
import { PriceService } from '../services/priceService';
import { GasService } from '../services/gasService';
import { createAddressRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';

const router = Router();

// Initialize services with proper dependencies
const priceService = new PriceService();
const aptosService = new AptosService(priceService);
const gasService = new GasService(aptosService, priceService);
const relayerController = new RelayerController(aptosService, priceService, gasService);

// Address-specific rate limiter
const addressRateLimiter = createAddressRateLimiter();

// NEW: PROPER Gasless with serialized transaction (RECOMMENDED)
router.post('/gasless-wallet-serialized', addressRateLimiter, async (req, res) => {
  try {
    return await relayerController.submitGaslessWithProperWallet(req, res);
  } catch (error) {
    logger.error('Error in gasless-wallet-serialized endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to process serialized gasless transaction' 
    });
  }
});

// Traditional relayer routes (user pays gas)
router.post('/quote', addressRateLimiter, (req, res) => 
  relayerController.getQuote(req, res)
);

// Status and monitoring routes
router.get('/balance/:address', (req, res) => 
  relayerController.getBalance(req, res)
);

router.get('/status/:txnHash', (req, res) => 
  relayerController.getTransactionStatus(req, res)
);

router.get('/health', (req, res) => 
  relayerController.getHealth(req, res)
);

router.get('/stats', (req, res) => 
  relayerController.getStats(req, res)
);

// BETA SAFETY: Safety monitoring endpoint
router.get('/safety-stats', (req, res) => 
  relayerController.getSafetyStats(req, res)
);

export default router; 