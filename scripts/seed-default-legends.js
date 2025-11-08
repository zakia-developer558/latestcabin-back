import dotenv from 'dotenv';
import admin from 'firebase-admin';

dotenv.config();

// Ensure required Firebase env vars exist
const requiredFirebaseVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL'
];

const missing = requiredFirebaseVars.filter((k) => !process.env[k] || process.env[k].trim() === '');
if (missing.length) {
  console.error('Missing Firebase env vars:', missing.join(', '));
  process.exit(1);
}

// Initialize admin SDK (idempotent)
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

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
}

const db = admin.firestore();

// Helpers
const isHexColor = (c) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(c);

const toTimestamp = (isoString) => admin.firestore.Timestamp.fromDate(new Date(isoString));

// Default legends payloads
const defaultLegends = [
  {
    name: 'Bestilt',
    description: 'Bekreftede bestillinger',
    color: '#ef4444',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    isBookable: false,
    isActive: true,
    isDefault: true,
    createdAt: toTimestamp('2025-09-24T14:15:30Z'), // 19:15:30 UTC+5
    updatedAt: toTimestamp('2025-09-24T14:15:30Z')
  },
  {
    name: 'Utilgjengelig',
    description: 'Utilgjengelige perioder',
    color: '#6b7280',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-800',
    isBookable: false,
    isActive: true,
    isDefault: true,
    createdAt: toTimestamp('2025-09-24T14:15:32Z'), // 19:15:32 UTC+5
    updatedAt: toTimestamp('2025-09-24T14:15:32Z')
  }
];

async function upsertDefaultLegends() {
  try {
    const col = db.collection('legends');

    for (const legend of defaultLegends) {
      if (!isHexColor(legend.color)) {
        throw new Error(`Invalid hex color for legend ${legend.name}: ${legend.color}`);
      }

      // Idempotent: check by name + isDefault
      const snapshot = await col
        .where('name', '==', legend.name)
        .where('isDefault', '==', true)
        .get();

      if (snapshot.empty) {
        const docRef = await col.add(legend);
        console.log(`Created default legend '${legend.name}' with id ${docRef.id}`);
      } else {
        // Update existing to ensure fields are current
        const doc = snapshot.docs[0];
        await col.doc(doc.id).set({ ...doc.data(), ...legend }, { merge: true });
        console.log(`Updated default legend '${legend.name}' (${doc.id})`);
      }
    }

    console.log('✅ Default legends upsert complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to upsert default legends:', err?.message || err);
    process.exit(1);
  }
}

upsertDefaultLegends();