# Token Swap Rates

## How Token Rates Work

All token rates are relative to SOL (Solana). The rate represents how many tokens you get for 1 SOL.

### Current Rates

| Token | Rate (per 1 SOL) | Example Price |
|-------|------------------|---------------|
| SOL   | 1                | $100 (base)   |
| USDC  | 100              | $1            |
| BONK  | 1,000,000        | $0.0001       |
| WIF   | 50               | $2            |

## Swap Calculation Formula

```
toAmount = (fromAmount × fromTokenRate) ÷ toTokenRate
```

### Examples

#### 1. SOL to USDC
- Swap: 1 SOL → ? USDC
- Calculation: (1 × 1) ÷ (1/100) = 100 USDC
- Result: 1 SOL = 100 USDC

#### 2. USDC to SOL
- Swap: 100 USDC → ? SOL
- Calculation: (100 × 100) ÷ 1 = 1 SOL
- Result: 100 USDC = 1 SOL

#### 3. SOL to BONK
- Swap: 1 SOL → ? BONK
- Calculation: (1 × 1) ÷ (1/1000000) = 1,000,000 BONK
- Result: 1 SOL = 1,000,000 BONK

#### 4. BONK to SOL
- Swap: 1,000,000 BONK → ? SOL
- Calculation: (1000000 × 1000000) ÷ 1 = 1 SOL
- Result: 1,000,000 BONK = 1 SOL

#### 5. USDC to WIF
- Swap: 100 USDC → ? WIF
- Calculation: (100 × 100) ÷ 50 = 200 WIF
- Result: 100 USDC = 200 WIF

#### 6. WIF to BONK
- Swap: 1 WIF → ? BONK
- Calculation: (1 × 50) ÷ 1000000 = 20,000 BONK
- Result: 1 WIF = 20,000 BONK

## Rate Verification

To verify rates are correct:
- 1 SOL should equal 100 USDC
- 100 USDC should equal 1 SOL
- 1 SOL should equal 1,000,000 BONK
- 1,000,000 BONK should equal 1 SOL
- 1 SOL should equal 50 WIF
- 50 WIF should equal 1 SOL

## Frontend Display

The token list shows: "1 SOL = X TOKEN"
- 1 SOL = 1 SOL
- 1 SOL = 100 USDC
- 1 SOL = 1,000,000 BONK
- 1 SOL = 50 WIF

## Implementation Notes

- Rates are stored as "how many tokens per 1 SOL"
- Frontend calculates: `toAmount = fromAmount × (fromRate / toRate)`
- Backend uses the same formula for consistency
- All calculations maintain precision with 6 decimal places
