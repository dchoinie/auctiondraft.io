# 🚀 Quick Start: Production Deployment

## Prerequisites

- Node.js 18+ installed
- npm or yarn installed
- Vercel account
- PartyKit account
- Supabase account
- Clerk account
- Stripe account (for payments)
- Resend account (for emails)

## Step-by-Step Deployment

### 1. **Environment Setup**

```bash
# Copy environment template
cp env.example .env.local

# Edit .env.local with your production values
# See PRODUCTION_SETUP.md for detailed variable descriptions
```

### 2. **Database Setup**

```bash
# Create Supabase production project
# Get your connection string from Supabase dashboard

# Run migrations
npm run db:push

# (Optional) Seed production data
npm run seed:production
```

### 3. **PartyKit Deployment**

```bash
# Install PartyKit CLI
npm install -g partykit

# Login to PartyKit
partykit login

# Deploy PartyKit
partykit deploy
```

### 4. **Vercel Deployment**

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### 5. **Configure Environment Variables**

In Vercel Dashboard:

1. Go to your project settings
2. Navigate to Environment Variables
3. Add all variables from `env.example`

### 6. **Configure Webhooks**

#### Stripe Webhooks:

- Endpoint: `https://yourdomain.com/api/webhooks/stripe`
- Events: `checkout.session.completed`, `customer.subscription.updated`

#### Clerk Webhooks:

- Endpoint: `https://yourdomain.com/api/webhooks/clerk`
- Events: `user.created`, `user.updated`

## Automated Deployment

### Using the Deployment Scripts:

**Linux/Mac:**

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

**Windows:**

```powershell
.\scripts\deploy.ps1
```

## Post-Deployment Checklist

- [ ] ✅ Environment variables configured
- [ ] ✅ Database migrations run
- [ ] ✅ PartyKit deployed and accessible
- [ ] ✅ Vercel deployment successful
- [ ] ✅ Custom domain configured (if needed)
- [ ] ✅ SSL certificate valid
- [ ] ✅ Webhooks configured and tested
- [ ] ✅ Authentication flow working
- [ ] ✅ Real-time features working
- [ ] ✅ Payment flow working
- [ ] ✅ Email notifications working

## Testing Your Deployment

1. **Authentication Test**:
   - Sign up with a new account
   - Sign in with existing account
   - Test protected routes

2. **Real-time Test**:
   - Create a league
   - Join a draft room
   - Test real-time bidding

3. **Payment Test**:
   - Purchase credits
   - Verify webhook processing
   - Check credit balance updates

4. **Email Test**:
   - Send invitation emails
   - Verify email delivery

## Troubleshooting

### Common Issues:

1. **PartyKit Connection Errors**:
   - Check PartyKit deployment status
   - Verify environment variables in PartyKit dashboard
   - Check CORS settings

2. **Database Connection Issues**:
   - Verify `POSTGRES_URL_NON_POOLING` is correct
   - Check Supabase connection limits
   - Verify SSL settings

3. **Authentication Issues**:
   - Check Clerk environment variables
   - Verify webhook endpoints
   - Check domain configuration in Clerk

4. **Payment Issues**:
   - Verify Stripe keys are correct
   - Check webhook endpoint configuration
   - Verify price IDs are correct

### Getting Help:

- Check the detailed `PRODUCTION_SETUP.md` guide
- Review Vercel deployment logs
- Check PartyKit deployment logs
- Monitor Supabase dashboard for database issues

## Monitoring & Maintenance

### Regular Tasks:

- Monitor Vercel Analytics
- Check Supabase usage and limits
- Review error logs
- Update dependencies regularly
- Monitor Stripe webhook delivery

### Scaling Considerations:

- Monitor database connection usage
- Watch PartyKit connection limits
- Track API rate limits
- Monitor Vercel function execution times
