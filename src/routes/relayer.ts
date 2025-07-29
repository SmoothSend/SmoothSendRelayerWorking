import { Router } from 'express';
import { RelayerController } from '../controllers/relayerController';
import { AptosService } from '../services/aptosService';
import { PriceService } from '../services/priceService';
import { GasService } from '../services/gasService';
import { createAddressRateLimiter } from '../middleware/rateLimiter';

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

// Sponsored transaction routes (relayer pays gas)
router.post('/sponsored-quote', addressRateLimiter, (req, res) => 
  relayerController.getSponsoredQuote(req, res)
);

router.post('/sponsored-build', addressRateLimiter, (req, res) => 
  relayerController.buildSponsoredTransaction(req, res)
);

router.post('/sponsored-submit', addressRateLimiter, (req, res) => 
  relayerController.submitSponsoredTransaction(req, res)
);

// Previous implementation (for compatibility)
router.post('/gasless', addressRateLimiter, (req, res) => 
  relayerController.submitProperSponsoredTransaction(req, res)
);

// TRUE GASLESS: User pays USDC + markup, relayer pays gas
router.post('/true-gasless', addressRateLimiter, (req, res) => 
  relayerController.submitTrueGaslessTransaction(req, res)
);

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