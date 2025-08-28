import Joi from 'joi';

// Active validation schemas (used by working endpoints)
export const transferRequestSchema = Joi.object({
  fromAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  toAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  amount: Joi.string().pattern(/^\d+$/).required(),
  coinType: Joi.string().valid(
    '0x1::aptos_coin::AptosCoin',
    '0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC' // Test USDC
  ).required()
});

// Gasless transaction validation schemas (PRODUCTION SAFE - user pays USDC fees)
export const gaslessQuoteRequestSchema = Joi.object({
  fromAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  toAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  amount: Joi.string().pattern(/^\d+$/).required(),
  coinType: Joi.string().valid(
    '0x1::aptos_coin::AptosCoin',
    '0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC'
  ).required()
});

export const gaslessSubmitRequestSchema = Joi.object({
  transaction: Joi.object().required(), // Raw transaction object
  userSignature: Joi.object().required(), // User's signature
  fromAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  toAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  amount: Joi.string().pattern(/^\d+$/).required(),
  coinType: Joi.string().valid(
    '0x1::aptos_coin::AptosCoin',
    '0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC'
  ).required(),
  relayerFee: Joi.string().pattern(/^\d+$/).required()
});

export const gaslessWithWalletRequestSchema = Joi.object({
  userSignature: Joi.object({
    signature: Joi.string().min(1).required(),
    publicKey: Joi.string().min(1).required()
  }).required(),
  fromAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  toAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  amount: Joi.string().pattern(/^\d+$/).required(),
  coinType: Joi.string().valid(
    '0x1::aptos_coin::AptosCoin',
    '0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC'
  ).required(),
  relayerFee: Joi.string().pattern(/^\d+$/).required()
});

export const addressSchema = Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/); 