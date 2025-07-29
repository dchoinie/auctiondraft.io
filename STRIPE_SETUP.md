# Stripe Payment Setup Guide

## Overview

Your auction draft app uses Stripe for processing credit purchases. This guide covers setting up Stripe for production deployment.

## Current Implementation

Your app already has:

- ✅ Stripe integration with checkout sessions
- ✅ Webhook handling for payment processing
- ✅ Credit balance updates
- ✅ Payment record creation

## Production Setup Steps

### 1. **Create Stripe Production Account**

1. Go to [stripe.com](https://stripe.com)
2. Create a production account (if you don't have one)
3. Switch from test mode to live mode
4. Note down your live keys:
   - Publishable key: `pk_live_...`
   - Secret key: `sk_live_...`

### 2. **Configure Products and Prices**

You need to create these products in Stripe:

#### Option A: Via Stripe Dashboard

1. Go to Products > Add Product
2. Create three products:
   - **1 Credit Package**
   - **3 Credit Package**
   - **Unlimited Package**
3. Set appropriate prices for each
4. Copy the price IDs (they start with `price_`)

#### Option B: Via Stripe API

```bash
# Create products programmatically
curl https://api.stripe.com/v1/products \
  -u sk_live_YOUR_SECRET_KEY: \
  -d name="1 Credit Package" \
  -d description="Purchase 1 league credit"

curl https://api.stripe.com/v1/prices \
  -u sk_live_YOUR_SECRET_KEY: \
  -d product=prod_... \
  -d unit_amount=500 \
  -d currency=usd \
  -d recurring[interval]=one_time
```

### 3. **Set Up Webhooks**

1. Go to Stripe Dashboard > Developers > Webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select these events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.updated` (if using subscriptions)
5. Click "Add endpoint"
6. Copy the webhook signing secret (starts with `whsec_`)

### 4. **Test Webhooks Locally**

```bash
# Install Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Windows: Download from https://github.com/stripe/stripe-cli/releases

# Login to Stripe
stripe login

# Forward webhooks to your local development server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# In another terminal, trigger a test webhook
stripe trigger checkout.session.completed
```

### 5. **Update Environment Variables**

Add these to your production environment:

```bash
# Stripe Production Keys
STRIPE_SECRET_KEY=sk_live_your_live_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Price IDs (from step 2)
NEXT_PUBLIC_STRIPE_1_PRICE_ID=price_your_1_credit_price_id
NEXT_PUBLIC_STRIPE_3_PRICE_ID=price_your_3_credit_price_id
NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID=price_your_unlimited_price_id
```

## Webhook Processing

Your webhook handler (`app/api/webhooks/stripe/route.ts`) processes:

### `checkout.session.completed` Event

- Extracts user ID and credits from session metadata
- Creates payment record in database
- Updates user's credit balance
- Handles errors gracefully

### Security Features

- Webhook signature verification
- Proper error handling
- Database transaction safety
- User validation

## Testing Your Stripe Integration

### 1. **Test Checkout Flow**

1. Navigate to credits page
2. Select a credit package
3. Complete checkout with test card
4. Verify credits are added to user account

### 2. **Test Webhook Processing**

1. Monitor webhook logs in Stripe Dashboard
2. Check database for payment records
3. Verify user credit balance updates
4. Test error scenarios

### 3. **Test Cards for Production**

Use these test cards in production:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Insufficient funds**: `4000 0000 0000 9995`

## Common Issues & Solutions

### Webhook Not Receiving Events

- Check webhook endpoint URL is correct
- Verify webhook is active in Stripe Dashboard
- Check server logs for errors
- Test with Stripe CLI

### Payment Processing Errors

- Verify Stripe keys are correct
- Check user exists in database
- Ensure proper error handling
- Monitor Stripe Dashboard for failed payments

### Credit Balance Not Updating

- Check webhook is processing correctly
- Verify database connection
- Check user ID in session metadata
- Review webhook logs

## Security Best Practices

1. **Never expose secret keys** in client-side code
2. **Always verify webhook signatures**
3. **Use HTTPS** for all webhook endpoints
4. **Implement proper error handling**
5. **Log all payment events** for debugging
6. **Regularly audit payment flows**

## Monitoring & Analytics

### Stripe Dashboard

- Monitor payment success rates
- Track webhook delivery
- Review failed payments
- Analyze revenue metrics

### Your Application

- Log all payment attempts
- Track credit purchases
- Monitor webhook processing
- Alert on payment failures

## Compliance & Legal

- Ensure PCI compliance
- Follow Stripe's terms of service
- Implement proper refund handling
- Maintain audit trails
- Consider tax implications

## Support Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com)
- [Webhook Testing Guide](https://stripe.com/docs/webhooks/test)
- [API Reference](https://stripe.com/docs/api)
