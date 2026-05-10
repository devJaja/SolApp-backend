import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios, { AxiosError } from 'axios';

// Token mint addresses on Solana
export const TOKEN_MINTS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
};

// Token decimals
export const TOKEN_DECIMALS = {
  SOL: 9,
  USDC: 6,
  BONK: 5,
  WIF: 6,
};

// Fallback exchange rates (approximate)
const FALLBACK_RATES = {
  SOL_USDC: 100,
  USDC_SOL: 0.01,
  SOL_BONK: 10000000,
  BONK_SOL: 0.0000001,
  SOL_WIF: 50,
  WIF_SOL: 0.02,
  USDC_BONK: 100000,
  BONK_USDC: 0.00001,
  USDC_WIF: 0.5,
  WIF_USDC: 2,
  BONK_WIF: 0.000005,
  WIF_BONK: 200000,
};

interface JupiterQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: any[];
}

@Injectable()
export class JupiterService {
  private readonly logger = new Logger(JupiterService.name);
  private readonly JUPITER_API = 'https://quote-api.jup.ag/v6';
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute cache

  /**
   * Get real-time quote from Jupiter with timeout and retry
   */
  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    inputDecimals: number,
  ): Promise<JupiterQuote | null> {
    try {
      // Convert amount to smallest unit based on token decimals
      const amountInSmallestUnit = Math.floor(amount * Math.pow(10, inputDecimals));

      this.logger.log(
        `Requesting Jupiter quote: ${inputMint} -> ${outputMint}, amount: ${amountInSmallestUnit} (${amount} tokens)`,
      );

      const response = await axios.get(`${this.JUPITER_API}/quote`, {
        params: {
          inputMint,
          outputMint,
          amount: amountInSmallestUnit,
          slippageBps: 50, // 0.5% slippage
        },
        timeout: 5000, // 5 second timeout
      });

      this.logger.log(`Jupiter quote received: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        this.logger.error(
          `Jupiter API error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`,
        );
      } else if (axiosError.request) {
        this.logger.error(`Jupiter API timeout or network error`);
      } else {
        this.logger.error(`Jupiter request setup error: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Get token price in USDC with caching
   */
  async getTokenPrice(tokenSymbol: string): Promise<number> {
    // Check cache first
    const cacheKey = `${tokenSymbol}_USDC`;
    const cached = this.priceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.log(`Using cached price for ${tokenSymbol}: $${cached.price}`);
      return cached.price;
    }

    const tokenMint = TOKEN_MINTS[tokenSymbol];
    if (!tokenMint) {
      throw new BadRequestException(`Unknown token: ${tokenSymbol}`);
    }

    // Special case for USDC
    if (tokenSymbol === 'USDC') {
      return 1;
    }

    try {
      // Get price by getting quote for 1 token to USDC
      const inputDecimals = TOKEN_DECIMALS[tokenSymbol];
      const quote = await this.getQuote(tokenMint, TOKEN_MINTS.USDC, 1, inputDecimals);

      if (quote) {
        // Convert output amount from smallest unit to USDC
        const usdcAmount = parseInt(quote.outAmount) / Math.pow(10, TOKEN_DECIMALS.USDC);
        
        // Cache the price
        this.priceCache.set(cacheKey, { price: usdcAmount, timestamp: Date.now() });
        
        this.logger.log(`Got price for ${tokenSymbol}: $${usdcAmount}`);
        return usdcAmount;
      }
    } catch (error) {
      this.logger.warn(`Jupiter API failed for ${tokenSymbol}, using fallback`);
    }

    // Return fallback prices if Jupiter API fails
    const fallbackPrices = {
      SOL: 100,
      USDC: 1,
      BONK: 0.00001,
      WIF: 2,
    };
    
    const fallbackPrice = fallbackPrices[tokenSymbol] || 0;
    this.logger.log(`Using fallback price for ${tokenSymbol}: $${fallbackPrice}`);
    return fallbackPrice;
  }

  /**
   * Calculate swap output amount with fallback
   */
  async calculateSwap(
    fromToken: string,
    toToken: string,
    fromAmount: number,
  ): Promise<{ toAmount: number; rate: number; priceImpact: string }> {
    const fromMint = TOKEN_MINTS[fromToken];
    const toMint = TOKEN_MINTS[toToken];

    if (!fromMint || !toMint) {
      throw new BadRequestException('Invalid token pair');
    }

    this.logger.log(
      `Calculating swap: ${fromAmount} ${fromToken} -> ${toToken}`,
    );

    // Try Jupiter API first (but it may not be accessible)
    const inputDecimals = TOKEN_DECIMALS[fromToken];
    const outputDecimals = TOKEN_DECIMALS[toToken];
    
    const quote = await this.getQuote(fromMint, toMint, fromAmount, inputDecimals);

    if (quote && quote.outAmount) {
      try {
        // Convert output amount from smallest unit using correct decimals
        const toAmount = parseInt(quote.outAmount) / Math.pow(10, outputDecimals);
        
        if (toAmount > 0) {
          const rate = toAmount / fromAmount;

          this.logger.log(
            `Jupiter swap calculated: ${fromAmount} ${fromToken} = ${toAmount} ${toToken} (rate: ${rate})`,
          );

          return {
            toAmount,
            rate,
            priceImpact: quote.priceImpactPct || '0',
          };
        }
      } catch (error) {
        this.logger.warn(`Failed to parse Jupiter quote: ${error.message}`);
      }
    } else {
      this.logger.warn(`Jupiter API unavailable, using fallback rates`);
    }

    // Fallback to approximate rates
    this.logger.log(`Using fallback calculation for ${fromToken} -> ${toToken}`);
    
    const rateKey = `${fromToken}_${toToken}`;
    const fallbackRate = FALLBACK_RATES[rateKey];

    if (fallbackRate) {
      const toAmount = fromAmount * fallbackRate;
      
      this.logger.log(
        `Fallback swap (direct): ${fromAmount} ${fromToken} = ${toAmount} ${toToken} (rate: ${fallbackRate})`,
      );

      return {
        toAmount,
        rate: fallbackRate,
        priceImpact: '0',
      };
    }

    // Calculate via USDC if direct rate not available
    this.logger.log(`No direct rate, calculating via USDC prices`);
    const fromPrice = await this.getTokenPrice(fromToken);
    const toPrice = await this.getTokenPrice(toToken);
    
    if (fromPrice === 0 || toPrice === 0) {
      this.logger.error(`Cannot calculate: fromPrice=${fromPrice}, toPrice=${toPrice}`);
      throw new BadRequestException('Unable to calculate swap rate');
    }

    const calculatedRate = fromPrice / toPrice;
    const toAmount = fromAmount * calculatedRate;

    this.logger.log(
      `Fallback swap (via USDC): ${fromAmount} ${fromToken} = ${toAmount} ${toToken} (rate: ${calculatedRate}, fromPrice: $${fromPrice}, toPrice: $${toPrice})`,
    );

    return {
      toAmount,
      rate: calculatedRate,
      priceImpact: '0',
    };
  }

  /**
   * Get all token prices with parallel fetching
   */
  async getAllTokenPrices(): Promise<Record<string, number>> {
    this.logger.log('Fetching all token prices...');
    
    const pricePromises = Object.keys(TOKEN_MINTS).map(async (symbol) => {
      try {
        const price = await this.getTokenPrice(symbol);
        return { symbol, price };
      } catch (error) {
        this.logger.warn(`Failed to get price for ${symbol}, using fallback`);
        const fallbackPrices = {
          SOL: 100,
          USDC: 1,
          BONK: 0.00001,
          WIF: 2,
        };
        return { symbol, price: fallbackPrices[symbol] || 0 };
      }
    });

    const results = await Promise.all(pricePromises);
    const prices: Record<string, number> = {};
    
    results.forEach(({ symbol, price }) => {
      prices[symbol] = price;
    });

    this.logger.log(`Token prices fetched: ${JSON.stringify(prices)}`);
    return prices;
  }
}
