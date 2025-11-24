/**
 * Stripe Payment Integration
 * 
 * This is a MOCK implementation for development/demo purposes.
 * In production, you would use the official Stripe SDK:
 * 
 * ```bash
 * npm install stripe @stripe/stripe-js
 * ```
 * 
 * Then replace this file with:
 * 
 * ```typescript
 * import Stripe from 'stripe';
 * 
 * export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
 *   apiVersion: '2024-11-20.acacia',
 * });
 * ```
 */

export interface StripePaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret: string;
  metadata: Record<string, string>;
  created: number;
}

export interface StripeCharge {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_intent: string;
}

export const stripe = {
  /**
   * MOCK: Create a payment intent
   * Real implementation:
   * stripe.paymentIntents.create({ amount, currency, metadata })
   */
  paymentIntents: {
    create: async (params: {
      amount: number;
      currency: string;
      metadata?: Record<string, string>;
    }): Promise<StripePaymentIntent> => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockPaymentIntent: StripePaymentIntent = {
        id: `pi_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: params.amount,
        currency: params.currency,
        status: 'requires_payment_method',
        client_secret: `pi_secret_${Math.random().toString(36).substr(2, 32)}`,
        metadata: params.metadata || {},
        created: Math.floor(Date.now() / 1000),
      };

      console.log('🔵 [MOCK STRIPE] Payment Intent Created:', {
        id: mockPaymentIntent.id,
        amount: params.amount / 100,
        currency: params.currency.toUpperCase(),
      });

      return mockPaymentIntent;
    },

    /**
     * MOCK: Retrieve a payment intent
     * Real implementation:
     * stripe.paymentIntents.retrieve(paymentIntentId)
     */
    retrieve: async (paymentIntentId: string): Promise<StripePaymentIntent> => {
      await new Promise((resolve) => setTimeout(resolve, 300));

      return {
        id: paymentIntentId,
        amount: 10000, // Mock amount
        currency: 'jpy',
        status: 'succeeded',
        client_secret: `${paymentIntentId}_secret`,
        metadata: {},
        created: Math.floor(Date.now() / 1000),
      };
    },

    /**
     * MOCK: Confirm a payment intent
     * Real implementation:
     * stripe.paymentIntents.confirm(paymentIntentId, { payment_method })
     */
    confirm: async (
      paymentIntentId: string,
      params: { payment_method?: string }
    ): Promise<StripePaymentIntent> => {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log('✅ [MOCK STRIPE] Payment Intent Confirmed:', paymentIntentId);

      return {
        id: paymentIntentId,
        amount: 10000,
        currency: 'jpy',
        status: 'succeeded',
        client_secret: `${paymentIntentId}_secret`,
        metadata: {},
        created: Math.floor(Date.now() / 1000),
      };
    },
  },

  /**
   * MOCK: Charges API
   * Real implementation:
   * stripe.charges.retrieve(chargeId)
   */
  charges: {
    retrieve: async (chargeId: string): Promise<StripeCharge> => {
      await new Promise((resolve) => setTimeout(resolve, 300));

      return {
        id: chargeId,
        amount: 10000,
        currency: 'jpy',
        status: 'succeeded',
        payment_intent: `pi_mock_${chargeId}`,
      };
    },
  },
};

/**
 * Convert amount to Stripe format (cents)
 * Stripe expects amounts in the smallest currency unit (e.g., cents for USD, yen for JPY)
 */
export function toStripeAmount(amount: number, currency: string = 'jpy'): number {
  // JPY doesn't have decimal places, so no conversion needed
  if (currency.toLowerCase() === 'jpy') {
    return Math.round(amount);
  }
  // For currencies with decimal places (USD, EUR, etc.), multiply by 100
  return Math.round(amount * 100);
}

/**
 * Convert Stripe amount back to regular format
 */
export function fromStripeAmount(amount: number, currency: string = 'jpy'): number {
  if (currency.toLowerCase() === 'jpy') {
    return amount;
  }
  return amount / 100;
}

/**
 * Generate a mock payment method ID
 * Real implementation would use Stripe Elements or Payment Method API
 */
export function mockPaymentMethod(): string {
  return `pm_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
