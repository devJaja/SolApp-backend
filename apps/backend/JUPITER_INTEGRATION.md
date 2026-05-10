# Jupiter Integration for Real Token Swaps

## Overview

The token swap feature now uses **Jupiter Aggregator API** to provide real-time pricing and swap quotes from actual Solana DEXs.

## What is Jupiter?

Jupiter is the leading DEX aggregator on Solana that:
- Aggregates liquidity from all major Solana DEXs (Raydium, Orca, Serum, etc.)
- Provides best execution prices
- Handles complex routing for optimal swaps
- Offers real-time price data

## Implementation

### Backend Services

#### JupiterService (`jupiter.service.ts`)
Handles all Jupiter API interactions:

1. **getQuote()** - Get real-time swap quotes
2. **getTokenPrice()** - Get current token price in USDC
3. **calculateSwap()** - Calculate swap output with price impact
4. **getAllTokenPrices()** - Fetch all token prices at once

### Supported Tokens

| Token | Mint Address | Description |
|-------|--------------|-------------|
| SOL | `So11111111111111111111111111111111111111112` | Wrapped SOL |
| USDC | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | USD Coin |
| BONK | `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263` | Bonk |
| WIF | `EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm` | Dogwifhat |

## API Endpoints

### Get Token Prices
```
GET /api/mini-apps/token-prices
```

Returns current USD prices for all supported tokens:
```json
{
  "SOL": 100.25,
  "USDC": 1.00,
  "BONK": 0.00001234,
  "WIF": 2.45
}
```

### Swap Tokens
```
POST /api/mini-apps/swap
Body: {
  "fromToken": "SOL",
  "toToken": "USDC",
  "fromAmount": 1.0
}
```

Returns:
```json
{
  "fromToken": "SOL",
  "toToken": "USDC",
  "fromAmount": 1.0,
  "toAmount": 100.25,
  "rate": 100.25,
  "priceImpact": "0.01",
  "signature": "jupiter_swap_1234567890"
}
```

## How It Works

### 1. Real-Time Pricing
- Frontend loads token prices on mount
- Prices are fetched from Jupiter API
- Shows actual USD value per token
- Refresh button to update prices

### 2. Live Quote Calculation
- As user types amount, frontend requests quote
- Backend calls Jupiter API for real-time quote
- Shows exact output amount
- Displays price impact percentage

### 3. Swap Execution (Demo Mode)
Currently returns quote data. To enable real swaps:

```typescript
// In jupiter.service.ts, add:
async executeSwap(quote: JupiterQuote, userKeypair: Keypair) {
  const swapResponse = await axios.post(
    `${this.JUPITER_API}/swap`,
    {
      quoteResponse: quote,
      userPublicKey: userKeypair.publicKey.toString(),
    }
  );
  
  // Sign and send transaction
  const swapTransaction = swapResponse.data.swapTransaction;
  // ... transaction signing logic
}
```

## Features

### ✅ Implemented
- Real-time token prices from Jupiter
- Live swap quotes with price impact
- Support for SOL, USDC, BONK, WIF
- Token selection modals
- Price refresh functionality
- Accurate rate calculations

### 🚧 To Implement (Production)
- Actual on-chain swap execution
- Transaction signing with user wallet
- Slippage tolerance settings
- Transaction history
- Failed transaction handling
- Multi-hop routing display

## Price Accuracy

Prices are fetched directly from Jupiter's aggregated liquidity:
- **SOL**: Real-time market price
- **USDC**: Stablecoin (≈$1.00)
- **BONK**: Real meme coin price
- **WIF**: Real meme coin price

No assumptions or hardcoded rates!

## Error Handling

If Jupiter API fails:
- Falls back to cached prices
- Shows error toast to user
- Logs error for debugging
- Prevents swap execution

## Testing

Test the integration:

```bash
# Get token prices
curl http://localhost:3000/api/mini-apps/token-prices \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get swap quote
curl -X POST http://localhost:3000/api/mini-apps/swap \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fromToken":"SOL","toToken":"USDC","fromAmount":1}'
```

## Dependencies

```json
{
  "axios": "^1.13.6"
}
```

## Jupiter API Documentation

- API Docs: https://station.jup.ag/docs/apis/swap-api
- Quote API: https://quote-api.jup.ag/v6
- Swap API: https://quote-api.jup.ag/v6/swap

## Notes

- Jupiter API is free to use
- No API key required for quotes
- Rate limits apply (reasonable usage)
- Supports all Solana tokens with liquidity
- Best execution across all DEXs
