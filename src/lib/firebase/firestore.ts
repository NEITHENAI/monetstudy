import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  deleteDoc, query, where, orderBy, addDoc, Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { Subject, Topic, UserProfile } from '@/types';

// Helper for local storage storage fallback
function getLocalSubjects(userId: string): Subject[] {
  try {
    const raw = localStorage.getItem(`monet_local_subjects_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function setLocalSubjects(userId: string, subjects: Subject[]) {
  try {
    localStorage.setItem(`monet_local_subjects_${userId}`, JSON.stringify(subjects));
  } catch {}
}

function getLocalTopics(userId: string, subjectId: string): Topic[] {
  try {
    const raw = localStorage.getItem(`monet_local_topics_${userId}_${subjectId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function setLocalTopics(userId: string, subjectId: string, topics: Topic[]) {
  try {
    localStorage.setItem(`monet_local_topics_${userId}_${subjectId}`, JSON.stringify(topics));
  } catch {}
}

// ─── USER ──────────────────────────────────────────────────────────
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch (err) {
    return null;
  }
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  try {
    await setDoc(doc(db, 'users', uid), data, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Profile update fallback:', err);
  }
}

// ─── SUBJECTS ──────────────────────────────────────────────────────
export async function getSubjects(userId: string): Promise<Subject[]> {
  try {
    const q = query(
      collection(db, 'users', userId, 'subjects'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Subject));
    setLocalSubjects(userId, list);
    return list;
  } catch (err) {
    console.warn('[Firestore] Fetch subjects fallback to local cache:', err);
    return getLocalSubjects(userId);
  }
}

export function generateSubjectId(userId: string): string {
  try {
    return doc(collection(db, 'users', userId, 'subjects')).id;
  } catch {
    return 'subj_' + Math.random().toString(36).substring(2, 9);
  }
}

export async function createSubject(userId: string, data: Omit<Subject, 'id'>, id?: string): Promise<string> {
  const subjectId = id || generateSubjectId(userId);
  const newSubject: Subject = { id: subjectId, ...data } as Subject;

  // Always update local cache first
  const current = getLocalSubjects(userId);
  setLocalSubjects(userId, [newSubject, ...current.filter(s => s.id !== subjectId)]);

  try {
    if (id) {
      await setDoc(doc(db, 'users', userId, 'subjects', id), data);
    } else {
      await setDoc(doc(db, 'users', userId, 'subjects', subjectId), data);
    }
  } catch (err) {
    console.warn('[Firestore] createSubject fallback to local store:', err);
  }
  return subjectId;
}

export async function updateSubject(userId: string, subjectId: string, data: Partial<Subject>) {
  const current = getLocalSubjects(userId);
  setLocalSubjects(userId, current.map(s => s.id === subjectId ? { ...s, ...data, updatedAt: Date.now() } : s));

  try {
    await updateDoc(doc(db, 'users', userId, 'subjects', subjectId), {
      ...data,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.warn('[Firestore] updateSubject fallback:', err);
  }
}

export async function deleteSubject(userId: string, subjectId: string) {
  const current = getLocalSubjects(userId);
  setLocalSubjects(userId, current.filter(s => s.id !== subjectId));

  try {
    const topicsSnap = await getDocs(collection(db, 'users', userId, 'subjects', subjectId, 'topics'));
    const deletes = topicsSnap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletes);
    await deleteDoc(doc(db, 'users', userId, 'subjects', subjectId));
  } catch (err) {
    console.warn('[Firestore] deleteSubject fallback:', err);
  }
}

// ─── TOPICS ────────────────────────────────────────────────────────
export async function getTopics(userId: string, subjectId: string): Promise<Topic[]> {
  try {
    const q = query(
      collection(db, 'users', userId, 'subjects', subjectId, 'topics'),
      orderBy('order', 'asc')
    );
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Topic));
    if (list.length > 0) {
      setLocalTopics(userId, subjectId, list);
      return list;
    }
  } catch (err) {
    console.warn('[Firestore] Fetch topics fallback to local cache:', err);
  }
  return getLocalTopics(userId, subjectId);
}

export async function saveTopic(userId: string, subjectId: string, topic: Omit<Topic, 'id'>): Promise<string> {
  const topicId = 'topic_' + Math.random().toString(36).substring(2, 9);
  const newTopic: Topic = { id: topicId, ...topic } as Topic;

  // Always update local cache
  const current = getLocalTopics(userId, subjectId);
  setLocalTopics(userId, subjectId, [...current, newTopic]);

  try {
    const ref = await addDoc(
      collection(db, 'users', userId, 'subjects', subjectId, 'topics'),
      topic
    );
    return ref.id;
  } catch (err) {
    console.warn('[Firestore] saveTopic fallback to local store:', err);
    return topicId;
  }
}

export async function updateTopic(userId: string, subjectId: string, topicId: string, data: Partial<Topic>) {
  const current = getLocalTopics(userId, subjectId);
  setLocalTopics(userId, subjectId, current.map(t => t.id === topicId ? { ...t, ...data } : t));

  try {
    await updateDoc(
      doc(db, 'users', userId, 'subjects', subjectId, 'topics', topicId),
      data
    );
  } catch (err) {
    console.warn('[Firestore] updateTopic fallback:', err);
  }
}

// ── Public courses (Explore tab) ─────────────────────────────────
export async function getPublicCourses(): Promise<import('@/types').PublicCourse[]> {
  try {
    const { collection, query, where, getDocs, limit, orderBy } = await import('firebase/firestore');
    const q = query(
      collection(db, 'publicCourses'),
      where('isPublic', '==', true),
      orderBy('enrolledCount', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as import('@/types').PublicCourse));
  } catch (err) {
    return [];
  }
}
