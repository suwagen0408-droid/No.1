import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

// Stripe configuration
export const STRIPE_CONFIG = {
  currency: 'jpy',
  paymentMethods: ['card', 'konbini'], // Credit card and convenience store
};

// Helper function to format amount for Stripe (JPY doesn't use decimals)
export function formatAmountForStripe(amount: number, currency: string): number {
  // JPY and other zero-decimal currencies
  const zeroDecimalCurrencies = ['jpy', 'krw'];
  
  if (zeroDecimalCurrencies.includes(currency.toLowerCase())) {
    return Math.round(amount);
  }
  
  // Other currencies use cents
  return Math.round(amount * 100);
}

// Helper function to format amount from Stripe
export function formatAmountFromStripe(amount: number, currency: string): number {
  const zeroDecimalCurrencies = ['jpy', 'krw'];
  
  if (zeroDecimalCurrencies.includes(currency.toLowerCase())) {
    return amount;
  }
  
  return amount / 100;
}
