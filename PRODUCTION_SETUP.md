# Production Deployment Guide for AuctionDraft.io

## 1. Clerk Authentication Setup

### Current Status: ✅ Clerk is already integrated

### Production Setup Required:

1. **Create Clerk Production Application**:
   - Go to [clerk.com](https://clerk.com) and create a new production application
   - Note down your production keys

2. **Configure Environment Variables**:

   ```bash
   # Add to your production environment
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
   ```

3. **Configure Webhooks** (if needed):
   - Set up Clerk webhooks for user events
   - Webhook endpoint: `https://yourdomain.com/api/webhooks/clerk`

## 2. PartyKit Setup

### Current Status: ✅ PartyKit is configured for development

### Production Setup Required:

1. **Deploy PartyKit to PartyKit Cloud**:

   ```bash
   # Install PartyKit CLI globally if not already installed
   npm install -g partykit

   # Login to PartyKit
   partykit login

   # Deploy your party
   partykit deploy
   ```

2. **Update PartyKit Configuration**:

   ```json
   // partykit.json - already configured correctly
   {
     "$schema": "https://www.partykit.io/schema.json",
     "name": "auctiondraftio-party",
     "main": "party/index.ts",
     "compatibilityDate": "2024-12-01",
     "parties": {
       "draft": "party/index.ts"
     }
   }
   ```

3. **Environment Variables for PartyKit**:
   ```bash
   # Add to PartyKit environment variables
   POSTGRES_URL_NON_POOLING=your_supabase_connection_string
   ```

## 3. Database Setup (Drizzle + Supabase)

### Current Status: ✅ Drizzle is configured with Supabase

### Production Setup Required:

1. **Create Supabase Production Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new production project
   - Note down your connection strings

2. **Environment Variables**:

   ```bash
   # Database connection
   POSTGRES_URL_NON_POOLING=postgresql://postgres:[password]@[host]:5432/postgres

   # Supabase (if using Supabase client)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

3. **Run Database Migrations**:

   ```bash
   # Generate migration files (if needed)
   npm run db:generate

   # Push schema to production database
   npm run db:push

   # Or run migrations
   npm run db:migrate
   ```

4. **Seed Production Data** (if needed):
   ```bash
   # Run your seeding script
   npm run seed:production
   ```

## 4. Vercel Deployment

### Current Status: ⚠️ Basic Next.js config, needs production optimization

### Production Setup Required:

1. **Update Next.js Configuration**:

   ```typescript
   // next.config.ts
   import type { NextConfig } from "next";

   const nextConfig: NextConfig = {
     // Enable static optimization
     output: "standalone",

     // Configure images
     images: {
       domains: ["your-image-domain.com"],
     },

     // Environment variables for build time
     env: {
       CUSTOM_KEY: process.env.CUSTOM_KEY,
     },

     // Configure headers for security
     async headers() {
       return [
         {
           source: "/(.*)",
           headers: [
             {
               key: "X-Frame-Options",
               value: "DENY",
             },
             {
               key: "X-Content-Type-Options",
               value: "nosniff",
             },
             {
               key: "Referrer-Policy",
               value: "origin-when-cross-origin",
             },
           ],
         },
       ];
     },
   };

   export default nextConfig;
   ```

2. **Create Vercel Configuration**:

   ```json
   // vercel.json
   {
     "buildCommand": "npm run build",
     "outputDirectory": ".next",
     "framework": "nextjs",
     "installCommand": "npm install",
     "functions": {
       "app/api/**/*.ts": {
         "maxDuration": 30
       }
     },
     "env": {
       "NODE_ENV": "production"
     }
   }
   ```

3. **Deploy to Vercel**:

   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Login to Vercel
   vercel login

   # Deploy
   vercel --prod
   ```

4. **Configure Environment Variables in Vercel Dashboard**:
   - Go to your Vercel project dashboard
   - Navigate to Settings > Environment Variables
   - Add all required environment variables

## 5. Stripe Payment Setup

### Current Status: ✅ Stripe is integrated with webhook handling

### Production Setup Required:

1. **Create Stripe Production Account**:
   - Go to [stripe.com](https://stripe.com) and create a production account
   - Switch from test mode to live mode
   - Note down your live keys

2. **Configure Stripe Products and Prices**:

   ```bash
   # Create products in Stripe Dashboard or via API
   # You need these price IDs for your credit packages:
   # - 1 Credit Package
   # - 3 Credit Package
   # - Unlimited Package
   ```

3. **Set Up Stripe Webhooks**:
   - Go to Stripe Dashboard > Developers > Webhooks
   - Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Select events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.updated` (if using subscriptions)
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
   - Copy the webhook signing secret

4. **Test Webhook Endpoints**:
   ```bash
   # Use Stripe CLI to test webhooks locally
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

## 6. Webhook Configuration

### Stripe Webhooks:

- **Endpoint**: `https://yourdomain.com/api/webhooks/stripe`
- **Events**: `checkout.session.completed`, `payment_intent.succeeded`
- **Verification**: Uses `STRIPE_WEBHOOK_SECRET` for signature verification
- **Processing**: Updates user credits and creates payment records

### Clerk Webhooks:

- **Endpoint**: `https://yourdomain.com/api/webhooks/clerk`
- **Events**: `user.created`, `user.updated`
- **Verification**: Uses Clerk's built-in webhook verification
- **Processing**: Syncs user data to your database

### Webhook Security:

```typescript
// Stripe webhook verification (already implemented)
const event = stripe.webhooks.constructEvent(
  Buffer.from(buf),
  sig!,
  STRIPE_WEBHOOK_SECRET
);

// Clerk webhook verification (already implemented)
const evt = await verifyWebhook(req);
```

## 7. Environment Variables Checklist

### Required Environment Variables:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...  # Use live keys in production
CLERK_SECRET_KEY=sk_live_...

# Database
POSTGRES_URL_NON_POOLING=postgresql://...

# Supabase (if using)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Stripe (Production Keys)
STRIPE_SECRET_KEY=sk_live_...  # Use live keys in production
STRIPE_WEBHOOK_SECRET=whsec_...  # From Stripe webhook configuration
NEXT_PUBLIC_STRIPE_1_PRICE_ID=price_...  # Live price IDs
NEXT_PUBLIC_STRIPE_3_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_UNLIMITED_PRICE_ID=price_...

# Email (Resend)
RESEND_API_KEY=re_...

# App Configuration
NEXT_PUBLIC_APP_URL=https://yourdomain.com
APP_URL=https://yourdomain.com

# PartyKit (if using separate deployment)
PARTYKIT_URL=https://your-partykit-url.partykit.dev
```

## 8. Security & Performance Optimizations

### Security:

1. **CORS Configuration**:

   ```typescript
   // Add to your API routes
   export const corsHeaders = {
     "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_APP_URL,
     "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
     "Access-Control-Allow-Headers": "Content-Type, Authorization",
   };
   ```

2. **Rate Limiting**:

   ```bash
   # Install rate limiting package
   npm install @upstash/ratelimit @upstash/redis
   ```

3. **Input Validation**:
   - Ensure all API routes use Zod validation
   - Sanitize user inputs

### Performance:

1. **Database Connection Pooling**:
   - Your current setup uses proper pooling
   - Monitor connection usage in production

2. **Caching Strategy**:
   - Implement Redis caching for frequently accessed data
   - Use Next.js built-in caching

3. **Image Optimization**:
   - Configure Next.js Image component properly
   - Use CDN for static assets

## 9. Monitoring & Analytics

### Setup Required:

1. **Error Monitoring**:

   ```bash
   # Install Sentry
   npm install @sentry/nextjs
   ```

2. **Performance Monitoring**:
   - Vercel Analytics (built-in)
   - Google Analytics 4

3. **Database Monitoring**:
   - Supabase dashboard
   - Set up alerts for connection limits

## 10. Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations run
- [ ] PartyKit deployed
- [ ] Clerk production keys set
- [ ] Stripe production account created
- [ ] Stripe products and prices configured
- [ ] Stripe webhooks configured and tested
- [ ] Clerk webhooks configured
- [ ] Email service configured
- [ ] SSL certificates valid
- [ ] Domain configured
- [ ] Error monitoring set up
- [ ] Performance monitoring set up
- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] Input validation in place
- [ ] CORS properly configured
- [ ] Payment flow tested in production
- [ ] Webhook endpoints accessible and secure

## 11. Post-Deployment Verification

1. **Test Authentication Flow**:
   - Sign up/sign in works
   - Protected routes are secure
   - Webhooks are receiving events

2. **Test Real-time Features**:
   - PartyKit connections work
   - Draft room functionality
   - Real-time updates

3. **Test Database Operations**:
   - CRUD operations work
   - Connection pooling is efficient
   - No connection leaks

4. **Test Payment Flow**:
   - Stripe checkout works
   - Webhooks are processing
   - Success/failure handling
   - Credit balance updates correctly
   - Payment records are created
   - Webhook signature verification works

5. **Performance Testing**:
   - Page load times
   - API response times
   - Database query performance

## 12. Maintenance & Updates

### Regular Tasks:

1. **Security Updates**:
   - Keep dependencies updated
   - Monitor security advisories
   - Regular security audits

2. **Performance Monitoring**:
   - Monitor database performance
   - Track API response times
   - Optimize slow queries

3. **Backup Strategy**:
   - Database backups (Supabase handles this)
   - Code repository backups
   - Environment variable backups

4. **Scaling Considerations**:
   - Monitor resource usage
   - Plan for traffic spikes
   - Consider auto-scaling options
