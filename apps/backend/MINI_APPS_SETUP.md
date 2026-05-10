# Mini Apps Setup Guide

## Backend Deployment

The mini apps module has been added to the backend. To activate it:

### If running locally:
```bash
cd solcial-backend
pnpm install
pnpm run start:dev
```

### If deployed on Render:
1. Commit and push changes to GitHub:
```bash
git add .
git commit -m "Add mini apps module"
git push origin master
```

2. Render will automatically detect the changes and redeploy

3. Check deployment logs on Render dashboard to ensure no errors

## Available Endpoints

All endpoints require JWT authentication (Bearer token in Authorization header).

### 1. Dice Game
- **POST** `/api/mini-apps/dice/play`
- Body: `{ betAmount: number, prediction: 'over' | 'under', targetNumber: number }`
- Returns: `{ roll: number, won: boolean, winAmount: number, multiplier: number, signature: string }`

### 2. Coin Flip
- **POST** `/api/mini-apps/coinflip/play`
- Body: `{ betAmount: number, choice: 'heads' | 'tails' }`
- Returns: `{ result: 'heads' | 'tails', won: boolean, winAmount: number, multiplier: number, signature: string }`

### 3. Lucky Spin
- **POST** `/api/mini-apps/spin/play`
- Body: `{ betAmount: number }`
- Returns: `{ multiplier: number, winAmount: number, signature: string }`

### 4. Token Swap
- **POST** `/api/mini-apps/swap`
- Body: `{ fromToken: string, toToken: string, fromAmount: number }`
- Returns: `{ fromToken: string, toToken: string, fromAmount: number, toAmount: number, rate: number, signature: string }`

### 5. Daily Airdrop
- **POST** `/api/mini-apps/airdrop/claim`
- Returns: `{ amount: number, signature: string, nextClaimAt: Date }`

- **GET** `/api/mini-apps/airdrop/status`
- Returns: `{ canClaim: boolean, amount: number, nextClaimAt: Date | null, totalClaimed: number, lastClaimAt: Date }`

## Testing Endpoints

You can test the endpoints using curl:

```bash
# Get your auth token first by logging in
TOKEN="your_jwt_token_here"

# Test dice game
curl -X POST http://localhost:3000/api/mini-apps/dice/play \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"betAmount": 0.1, "prediction": "over", "targetNumber": 50}'

# Test airdrop status
curl -X GET http://localhost:3000/api/mini-apps/airdrop/status \
  -H "Authorization: Bearer $TOKEN"
```

## Troubleshooting

### Endpoints return 404
- Ensure backend has been restarted after adding the module
- Check that MiniAppsModule is imported in app.module.ts
- Verify the API URL in frontend .env file

### Airdrop fails
- Ensure you're on Solana devnet (not mainnet)
- Check SOLANA_RPC_URL environment variable
- Devnet faucet may have rate limits

### Games don't send SOL
- Check backend logs for errors
- Verify SolanaService.requestAirdrop() is working
- Ensure wallet has proper permissions

## Environment Variables

Required in backend `.env`:
```
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_32_byte_hex_key
```
