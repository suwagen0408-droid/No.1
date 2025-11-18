# Stripe Payment Integration Guide

## 🚀 Overview

This document describes the Stripe payment integration for the ESSC platform's `paid_sampling` payment model.

**Current Status**: **MOCK IMPLEMENTATION** for development/demo purposes.

## 📋 Payment Flow

### 1. Campaign Creation
- Manufacturer creates campaign with `costModel: 'paid_sampling'`
- Sets `paymentTiming: 'on_approval'`
- Defines `unitPrice` and optional `shippingFee`

### 2. Facility Application
- Facility applies for campaign
- Campaign application goes to `pending` status

### 3. Manufacturer Approval
- Manufacturer approves facility application
- System calculates total amount (unit price × units + shipping)
- Creates `FacilityPayment` record with `paymentStatus: 'pending'`
- Application moves to `pending_payment` status

### 4. Payment Processing
Facility sees pending payment and initiates payment:

**Step 4.1: Create Payment Intent**
```
POST /api/facility/payments/create-intent
Body: { paymentId: "xxx" }
Response: { clientSecret: "pi_xxx_secret", paymentIntentId: "pi_xxx", amount: 10000 }
```

**Step 4.2: Process Payment**
```
POST /api/facility/payments
Body: { paymentId: "xxx", paymentMethod: "stripe" }
```

**Step 4.3: Stripe Webhook**
```
POST /api/webhooks/stripe
Event: payment_intent.succeeded
```

### 5. Completion
- Payment marked as `completed`
- Application status changes to `approved`
- Notifications sent to manufacturer
- Facility can now use the campaign

## 🔧 Implementation Details

### Current Mock Implementation

**File**: `lib/stripe.ts`

```typescript
export const stripe = {
  paymentIntents: {
    create: async (params) => { /* MOCK */ },
    retrieve: async (id) => { /* MOCK */ },
    confirm: async (id, params) => { /* MOCK */ },
  },
  charges: {
    retrieve: async (id) => { /* MOCK */ },
  },
};
```

### Production Implementation

**Step 1**: Install Stripe SDK
```bash
npm install stripe @stripe/stripe-js
```

**Step 2**: Set Environment Variables
```env
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**Step 3**: Replace Mock Implementation

**File**: `lib/stripe.ts`
```typescript
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});
```

**Step 4**: Add Frontend Stripe Elements

**Install**:
```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

**Example Component**:
```tsx
'use client';

import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutForm({ clientSecret }: { clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/facility/payments/success`,
      },
    });

    if (error) {
      alert(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button type="submit" disabled={!stripe}>支払う</button>
    </form>
  );
}

export default function PaymentPage({ paymentId }: { paymentId: string }) {
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    fetch('/api/facility/payments/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
      body: JSON.stringify({ paymentId }),
    })
      .then(res => res.json())
      .then(data => setClientSecret(data.clientSecret));
  }, [paymentId]);

  if (!clientSecret) return <div>Loading...</div>;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm clientSecret={clientSecret} />
    </Elements>
  );
}
```

**Step 5**: Configure Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copy webhook signing secret to `.env`

**Step 6**: Verify Webhook Signatures

**File**: `app/api/webhooks/stripe/route.ts`
```typescript
const sig = request.headers.get('stripe-signature');
const payload = await request.text();

let event;
try {
  event = stripe.webhooks.constructEvent(
    payload,
    sig!,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
} catch (err) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
}
```

## 🔐 Security Best Practices

### 1. Environment Variables
```env
# Never commit these to git
STRIPE_SECRET_KEY=sk_live_xxx  # Server-side only
STRIPE_WEBHOOK_SECRET=whsec_xxx  # Server-side only
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx  # Client-side safe
```

### 2. Webhook Signature Verification
Always verify webhook signatures to prevent fake events.

### 3. Amount Validation
```typescript
// Always validate amounts on the server
const expectedAmount = calculateAmount(payment);
if (paymentIntent.amount !== expectedAmount) {
  throw new Error('Amount mismatch');
}
```

### 4. Idempotency
```typescript
// Use idempotency keys for payment creation
const paymentIntent = await stripe.paymentIntents.create({
  amount: 10000,
  currency: 'jpy',
}, {
  idempotencyKey: `payment-${facilityPaymentId}`,
});
```

## 💴 Japanese Yen (JPY) Considerations

JPY is a **zero-decimal currency** in Stripe:
- Amount = ¥1,000 → Stripe amount = 1000 (not 100000)
- No need to multiply by 100 like with USD/EUR

```typescript
// lib/stripe.ts
export function toStripeAmount(amount: number, currency: string = 'jpy'): number {
  if (currency.toLowerCase() === 'jpy') {
    return Math.round(amount);  // No multiplication needed
  }
  return Math.round(amount * 100);  // For USD, EUR, etc.
}
```

## 📊 Database Schema

```prisma
model FacilityPayment {
  id                    String   @id @default(uuid())
  facilityId            String
  facilityCampaignId    String
  
  amount                Float    // Product amount
  shippingFee           Float    @default(0)
  totalAmount           Float    // amount + shippingFee
  currency              String   @default("JPY")
  
  paymentMethod         String   // "stripe", "bank_transfer"
  paymentStatus         String   @default("pending") // pending, completed, failed, refunded
  
  stripePaymentIntentId String?  @unique
  stripeChargeId        String?
  
  paidAt                DateTime?
  failedAt              DateTime?
  failedReason          String?
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  facility              Facility         @relation(...)
  facilityCampaign      FacilityCampaign @relation(...)
}
```

## 🧪 Testing

### Test Cards (Stripe Test Mode)

**Success**:
```
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
```

**Decline**:
```
Card: 4000 0000 0000 0002
```

**Requires 3D Secure**:
```
Card: 4000 0025 0000 3155
```

### Testing Webhooks

Use Stripe CLI for local webhook testing:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Trigger test events:
```bash
stripe trigger payment_intent.succeeded
```

## 📝 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/facility/payments` | GET | Get pending payments |
| `/api/facility/payments` | POST | Process payment (with Stripe) |
| `/api/facility/payments/create-intent` | POST | Create Stripe Payment Intent |
| `/api/webhooks/stripe` | POST | Stripe webhook handler |

## 🚨 Error Handling

### Payment Failures
- Status updated to `failed`
- `failedReason` stored in database
- Notification sent to facility
- Facility can retry payment

### Webhook Failures
- Stripe automatically retries failed webhooks
- Log all errors for debugging
- Implement idempotency to handle duplicate events

## 📈 Monitoring

**Recommended metrics to track**:
1. Payment success rate
2. Average payment amount
3. Payment processing time
4. Failed payment reasons
5. Refund rate

**Stripe Dashboard**:
- https://dashboard.stripe.com/test/payments
- https://dashboard.stripe.com/test/webhooks

## 🔄 Migration from Mock to Production

1. ✅ Install Stripe packages
2. ✅ Set environment variables
3. ✅ Replace mock implementation in `lib/stripe.ts`
4. ✅ Add Stripe Elements to frontend
5. ✅ Configure webhooks in Stripe Dashboard
6. ✅ Add signature verification to webhook handler
7. ✅ Test with test cards
8. ✅ Switch to live keys when ready

## 📞 Support

**Stripe Documentation**:
- https://stripe.com/docs/payments/payment-intents
- https://stripe.com/docs/webhooks
- https://stripe.com/docs/currencies#zero-decimal

**Stripe Support**:
- https://support.stripe.com

---

**Last Updated**: 2024-11-18  
**Status**: Mock Implementation (Ready for Production Migration)
