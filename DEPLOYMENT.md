# Vercel Deployment Guide

This guide will help you deploy the Cabin Booking API to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install globally with `npm i -g vercel`
3. **Firebase Project**: Ensure your Firebase project is set up with Firestore

## Environment Variables Setup

Before deploying, you need to configure the following environment variables in your Vercel project:

### Required Environment Variables

```bash
# Server Configuration
PORT=5000
NODE_ENV=production
JWT_SECRET=your-jwt-secret-here

# Frontend URL (update with your frontend domain)
FRONTEND_URL=https://your-frontend-domain.vercel.app

# SendGrid Email Configuration
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=your-verified-sender-email

# Firebase Configuration
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com
FIREBASE_UNIVERSE_DOMAIN=googleapis.com
```

## Deployment Steps

### Method 1: Using Vercel CLI

1. **Login to Vercel**:
   ```bash
   vercel login
   ```

2. **Deploy the project**:
   ```bash
   vercel
   ```

3. **Follow the prompts**:
   - Set up and deploy? `Y`
   - Which scope? Choose your account
   - Link to existing project? `N` (for first deployment)
   - Project name: `cabin-booking-api` (or your preferred name)
   - Directory: `./` (current directory)

4. **Set environment variables**:
   ```bash
   vercel env add FIREBASE_PROJECT_ID
   vercel env add FIREBASE_PRIVATE_KEY
   vercel env add FIREBASE_CLIENT_EMAIL
   # ... add all other environment variables
   ```

5. **Redeploy with environment variables**:
   ```bash
   vercel --prod
   ```

### Method 2: Using Vercel Dashboard

1. **Connect Repository**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your Git repository

2. **Configure Project**:
   - Framework Preset: `Other`
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: Leave empty
   - Install Command: `npm install`

3. **Add Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add all the required environment variables listed above

4. **Deploy**:
   - Click "Deploy"
   - Wait for the deployment to complete

## Post-Deployment

### 1. Test Your API

Once deployed, test your API endpoints:

```bash
# Health check
curl https://your-project.vercel.app/

# Test authentication
curl -X POST https://your-project.vercel.app/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test cabins endpoint
curl https://your-project.vercel.app/v1/cabins
```

### 2. Update Frontend Configuration

Update your frontend application to use the new API URL:

```javascript
// Replace localhost with your Vercel deployment URL
const API_BASE_URL = 'https://your-project.vercel.app';
```

### 3. Configure CORS

Make sure to update the `FRONTEND_URL` environment variable with your actual frontend domain.

## Troubleshooting

### Common Issues

1. **Firebase Connection Issues**:
   - Ensure all Firebase environment variables are correctly set
   - Check that the private key is properly formatted with `\n` line breaks
   - Verify Firebase project permissions

2. **CORS Errors**:
   - Update `FRONTEND_URL` environment variable
   - Ensure your frontend domain is correctly specified

3. **Function Timeout**:
   - The function timeout is set to 30 seconds in `vercel.json`
   - For longer operations, consider implementing async processing

4. **Environment Variables Not Loading**:
   - Redeploy after adding environment variables
   - Check variable names for typos
   - Ensure sensitive variables are not exposed in client-side code

### Logs and Monitoring

- View function logs in Vercel Dashboard → Functions tab
- Monitor performance and errors in the Analytics section
- Set up alerts for critical issues

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to your repository
2. **CORS**: Restrict CORS to your specific frontend domain
3. **Rate Limiting**: Consider implementing rate limiting for production
4. **Authentication**: Ensure JWT secrets are strong and unique
5. **Firebase Rules**: Configure proper Firestore security rules

## Performance Optimization

1. **Cold Starts**: Vercel functions may have cold start delays
2. **Database Connections**: Firebase handles connection pooling automatically
3. **Caching**: Implement caching strategies for frequently accessed data
4. **Bundle Size**: Keep dependencies minimal for faster cold starts

Your Cabin Booking API is now ready for production on Vercel! 🚀