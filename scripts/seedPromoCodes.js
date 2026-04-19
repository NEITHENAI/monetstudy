const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDocs } = require('firebase/firestore');
const codes = require('../promoCodes.json');

require('fs').readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const [k, ...rest] = line.split('=');
  if (k && rest.length) process.env[k.trim()] = rest.join('=').trim();
});

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

const db = getFirestore(app);

async function seed() {
  const snap = await getDocs(collection(db, 'promoCodes'));
  const existing = new Set(snap.docs.map(d => d.data().code));
  let added = 0;
  for (const entry of codes) {
    const code = entry.code.toUpperCase();
    if (existing.has(code)) { console.log(`Skipped: ${code}`); continue; }
    await setDoc(doc(collection(db, 'promoCodes')), {
      code, plan: entry.plan, used: false, usedBy: null, usedAt: null, createdAt: new Date(),
    });
    console.log(`Added: ${code} → ${entry.plan}`);
    added++;
  }
  console.log(`\nDone — ${added} new code(s) added.`);
  process.exit(0);
}
seed().catch(e => { console.error(e); process.exit(1); });
