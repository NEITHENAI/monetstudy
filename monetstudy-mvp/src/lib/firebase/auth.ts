import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import type { UserProfile } from '@/types';

const googleProvider = new GoogleAuthProvider();

export async function createUserDocument(user: User, name?: string): Promise<void> {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email,
      name: name || user.displayName || 'Learner',
      plan: 'free',
      subjectLimit: 1,
      theme: 'dark',
      createdAt: Date.now(),
    });
  }
}

export async function signUpWithEmail(email: string, password: string, name: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await createUserDocument(cred.user, name);
  return cred.user;
}

export async function signInWithEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signInWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  await createUserDocument(cred.user);
  return cred.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function updateUserTheme(uid: string, theme: string) {
  await setDoc(doc(db, 'users', uid), { theme }, { merge: true });
}
