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

// NEW: Proper gasless flow endpoints (two-signature dance)
router.post('/gasless/quote', addressRateLimiter, (req, res) => 
  relayerController.getGaslessQuote(req, res)
);

router.post('/gasless/submit', addressRateLimiter, (req, res) => 
  relayerController.submitGaslessTransaction(req, res)
);

// NEW: Gasless transaction WITH wallet prompt (for transparency)
router.post('/gasless-with-wallet', addressRateLimiter, async (req, res) => {
  try {
    const result = await relayerController.submitGaslessWithWallet(req, res);
    return result;
  } catch (error) {
    logger.error('Error in gasless-with-wallet endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to process gasless transaction with wallet' 
    });
  }
});

// Traditional relayer routes (user pays gas)
router.post('/quote', addressRateLimiter, (req, res) => 
  relayerController.getQuote(req, res)
);

router.post('/submit', addressRateLimiter, (req, res) => 
  relayerController.submitTransaction(req, res)
);

// ⚠️ REMOVED DANGEROUS FREE ENDPOINTS FOR PRODUCTION SAFETY:
// - /sponsored-quote, /sponsored-build, /sponsored-submit (user pays $0)
// - /gasless (user pays $0) 
// - /true-gasless (user pays $0)
// These endpoints would bankrupt the relayer by providing free transactions.
// Use /gasless/quote + /gasless/submit instead (user pays USDC fees).

// Status and monitoring routes
router.get('/status/:txnHash', (req, res) => 
  relayerController.getTransactionStatus(req, res)
);

router.get('/health', (req, res) => 
  relayerController.getHealth(req, res)
);

router.get('/stats', (req, res) => 
  relayerController.getStats(req, res)
);

export default router; 