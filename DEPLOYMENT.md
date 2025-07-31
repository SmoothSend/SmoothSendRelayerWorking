# SmoothSend Deployment Checklist

## Pre-deployment Setup

### 1. Azure Resources
- [ ] Create Azure App Service (Node.js 18)
- [ ] Create Azure Database for PostgreSQL
- [ ] Create Azure Cache for Redis
- [ ] Note down connection strings

### 2. Supabase Setup
- [ ] Create Supabase project
- [ ] Create `waitlist` table with columns: id, email, twitter, created_at
- [ ] Get project URL and anon key

## Backend Deployment (Azure)

### 3. Configure Environment Variables
Copy these to Azure App Service -> Configuration -> Application Settings:

```
PORT=8080
NODE_ENV=production
APTOS_NETWORK=testnet
RELAYER_PRIVATE_KEY=your_private_key
CONTRACT_ADDRESS=your_contract_address
APTOS_RPC_URL=https://fullnode.testnet.aptoslabs.com/v1
DATABASE_URL=postgresql://user:pass@your-db.postgres.database.azure.com:5432/smoothsend
REDIS_URL=redis://your-cache.redis.cache.windows.net:6380
CORS_ORIGIN=https://your-frontend.vercel.app
```

### 4. Deploy Backend
```bash
cd /home/ved-mohan/Desktop/smoothsendxyz
git add .
git commit -m "Production deployment"
git remote add azure https://$username@your-app.scm.azurewebsites.net:443/your-app.git
git push azure main
```

### 5. Test Backend
- [ ] Visit: https://your-backend.azurewebsites.net/health
- [ ] Should return: `{"status": "healthy"}`

## Frontend Deployment (Vercel)

### 6. Deploy Frontend
```bash
cd smoothsend-frontend
npx vercel --prod
```

### 7. Configure Vercel Environment Variables
In Vercel Dashboard -> Project -> Settings -> Environment Variables:

```
NEXT_PUBLIC_API_URL=https://your-backend.azurewebsites.net
NEXT_PUBLIC_APTOS_NETWORK=testnet
NEXT_PUBLIC_USDC_CONTRACT=0x3c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c::test_coins::USDC
NEXT_PUBLIC_TESTNET_SENDER_ADDRESS=0x5d39e7e11ebab92bcf930f3723c2498eb7accea57fce3c064ab1dba2df5ff29a
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 8. Test Frontend
- [ ] Visit your Vercel URL
- [ ] Test wallet connection
- [ ] Test USDC transfer
- [ ] Test email signup

## Post-deployment

### 9. Final Configuration
- [ ] Update Azure CORS_ORIGIN with final Vercel domain
- [ ] Test full end-to-end flow
- [ ] Monitor Azure and Vercel logs

### 10. Optional Enhancements
- [ ] Set up custom domains
- [ ] Configure Azure CDN
- [ ] Set up monitoring/alerts
- [ ] Enable Azure Application Insights

## Troubleshooting

Common issues:
- CORS errors: Check CORS_ORIGIN in Azure matches Vercel domain
- 500 errors: Check Azure logs in App Service -> Log stream
- Build failures: Check package.json build script
- Database connection: Verify DATABASE_URL and firewall rules
