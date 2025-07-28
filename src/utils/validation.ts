import Joi from 'joi';

export const transferRequestSchema = Joi.object({
  fromAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  toAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  amount: Joi.string().pattern(/^\d+$/).required(),
  coinType: Joi.string().valid(
    '0x1::aptos_coin::AptosCoin',
    '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC',
    '0x62f153675a84e0b0b9ee1481324a19d3c3d5e4c9e0e8b11b0b5f4c5d4c5e4c5c::asset::USDT',
    '0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC' // Test USDC
  ).required()
});

export const sponsoredTransferRequestSchema = Joi.object({
  fromAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  toAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  amount: Joi.string().pattern(/^\d+$/).required(),
  coinType: Joi.string().valid(
    '0x1::aptos_coin::AptosCoin',
    '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC',
    '0x62f153675a84e0b0b9ee1481324a19d3c3d5e4c9e0e8b11b0b5f4c5d4c5e4c5c::asset::USDT',
    '0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC' // Test USDC
  ).required(),
  relayerFee: Joi.string().pattern(/^\d+$/).required(),
  userSignature: Joi.string().optional()
});

export const sponsoredBuildRequestSchema = Joi.object({
  fromAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  toAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  amount: Joi.string().pattern(/^\d+$/).required(),
  coinType: Joi.string().valid(
    '0x1::aptos_coin::AptosCoin',
    '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC',
    '0x62f153675a84e0b0b9ee1481324a19d3c3d5e4c9e0e8b11b0b5f4c5d4c5e4c5c::asset::USDT',
    '0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC' // Test USDC
  ).required(),
  relayerFee: Joi.string().pattern(/^\d+$/).required()
});

// NEW: Proper gasless flow validation
export const gaslessQuoteRequestSchema = Joi.object({
  fromAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  toAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  amount: Joi.string().pattern(/^\d+$/).required(),
  coinType: Joi.string().valid(
    '0x1::aptos_coin::AptosCoin',
    '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC',
    '0x62f153675a84e0b0b9ee1481324a19d3c3d5e4c9e0e8b11b0b5f4c5d4c5e4c5c::asset::USDT',
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
    '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC',
    '0x62f153675a84e0b0b9ee1481324a19d3c3d5e4c9e0e8b11b0b5f4c5d4c5e4c5c::asset::USDT',
    '0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC'
  ).required(),
  relayerFee: Joi.string().pattern(/^\d+$/).required()
});

export const addressSchema = Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/); 