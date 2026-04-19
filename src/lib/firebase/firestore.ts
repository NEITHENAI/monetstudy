import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  deleteDoc, query, where, orderBy, addDoc, Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { Subject, Topic, UserProfile } from '@/types';

// ─── USER ──────────────────────────────────────────────────────────
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  await setDoc(doc(db, 'users', uid), data, { merge: true });
}

// ─── SUBJECTS ──────────────────────────────────────────────────────
export async function getSubjects(userId: string): Promise<Subject[]> {
  const q = query(
    collection(db, 'users', userId, 'subjects'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Subject));
}

export function generateSubjectId(userId: string): string {
  return doc(collection(db, 'users', userId, 'subjects')).id;
}

export async function createSubject(userId: string, data: Omit<Subject, 'id'>, id?: string): Promise<string> {
  if (id) {
    await setDoc(doc(db, 'users', userId, 'subjects', id), data);
    return id;
  }
  const ref = await addDoc(collection(db, 'users', userId, 'subjects'), data);
  return ref.id;
}

export async function updateSubject(userId: string, subjectId: string, data: Partial<Subject>) {
  await updateDoc(doc(db, 'users', userId, 'subjects', subjectId), {
    ...data,
    updatedAt: Date.now(),
  });
}

export async function deleteSubject(userId: string, subjectId: string) {
  // Delete all topics first
  const topicsSnap = await getDocs(collection(db, 'users', userId, 'subjects', subjectId, 'topics'));
  const deletes = topicsSnap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletes);
  await deleteDoc(doc(db, 'users', userId, 'subjects', subjectId));
}

// ─── TOPICS ────────────────────────────────────────────────────────
export async function getTopics(userId: string, subjectId: string): Promise<Topic[]> {
  const q = query(
    collection(db, 'users', userId, 'subjects', subjectId, 'topics'),
    orderBy('order', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Topic));
}

export async function saveTopic(userId: string, subjectId: string, topic: Omit<Topic, 'id'>): Promise<string> {
  const ref = await addDoc(
    collection(db, 'users', userId, 'subjects', subjectId, 'topics'),
    topic
  );
  return ref.id;
}

export async function updateTopic(userId: string, subjectId: string, topicId: string, data: Partial<Topic>) {
  await updateDoc(
    doc(db, 'users', userId, 'subjects', subjectId, 'topics', topicId),
    data
  );
}

// ── Public courses (Explore tab) ─────────────────────────────────
export async function getPublicCourses(): Promise<import('@/types').PublicCourse[]> {
  const { collection, query, where, getDocs, limit, orderBy } = await import('firebase/firestore');
  const q = query(
    collection(db, 'publicCourses'),
    where('isPublic', '==', true),
    orderBy('enrolledCount', 'desc'),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as import('@/types').PublicCourse));
}
