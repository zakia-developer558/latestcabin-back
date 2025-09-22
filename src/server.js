import express from "express";
import routes from "./routes/index.js";
import dotenv from "dotenv";
import cors from "cors";
import admin from "firebase-admin";

dotenv.config();

// Check if Firebase environment variables are set
const requiredFirebaseVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL'
];

// Debug: Log environment variables to see what's available
console.log('🔍 Checking Firebase environment variables...');
requiredFirebaseVars.forEach(varName => {
  console.log(`${varName}: ${process.env[varName] ? '✅ Present' : '❌ Missing'}`);
});

const missingVars = requiredFirebaseVars.filter(varName => !process.env[varName] || process.env[varName].trim() === '');
if (missingVars.length > 0) {
  console.error('❌ Missing required Firebase environment variables:', missingVars.join(', '));
  console.error('Please add these variables to your .env file');
  console.error('⚠️ Cannot initialize Firebase without proper credentials');
  process.exit(1);
} else {
  console.log('✅ All Firebase environment variables found');
  
  // Initialize Firebase with real credentials
  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID || '',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL || ''
  };

  console.log('🔧 Initializing Firebase with service account...');
  console.log('📧 Client email:', serviceAccount.client_email);
  console.log('🆔 Project ID:', serviceAccount.project_id);

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
    console.log("✅ Firebase initialized successfully with service account credentials");
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    console.error('🔍 Service account details:', {
      project_id: serviceAccount.project_id,
      client_email: serviceAccount.client_email,
      private_key_length: serviceAccount.private_key ? serviceAccount.private_key.length : 0
    });
    process.exit(1);
  }
}

// Initialize Firestore
const db = admin.firestore();

const app = express();

// middlewares
app.use(express.json());

app.use(cors({
  origin: "http://localhost:3000", // frontend URL
  credentials: true,               // if using cookies/auth headers
}));

// use routes
app.use("/v1", routes);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
