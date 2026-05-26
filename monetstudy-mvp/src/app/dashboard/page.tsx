'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { getSubjects, deleteSubject } from '@/lib/firebase/firestore';
import { signOut } from '@/lib/firebase/auth';
import { AppShell } from '@/components/layout/AppShell';
import { MonoLabel, Tag, ProgressBar, Btn, Spinner, Logo, IconSearch, F } from '@/components/ui/primitives';
import type { Subject, PublicCourse } from '@/types';
import { canCreateSubject, getPlanById } from '@/lib/plans';
import { Footer } from '@/components/layout/Footer';

const COMMUNITY_COURSES: PublicCourse[] = [
  { id: 'c1', name: 'Biology A-Level — Full Syllabus', authorName: 'Aisha K.', authorInitial: 'A', topicCount: 12, enrolled: 847, rating: 4.8, tags: ['Science', 'A-Level'], preview: 'Covers all AQA Biology units from cell structure to ecosystems with full assessments.' },
  { id: 'c2', name: 'Python for Data Science', authorName: 'James T.', authorInitial: 'J', topicCount: 8, enrolled: 1203, rating: 4.9, tags: ['Programming', 'Data'], preview: 'NumPy, Pandas, Matplotlib and intro to ML. Example-heavy with real datasets.' },
  { id: 'c3', name: 'MEXT Natural Sciences C Track', authorName: 'Neithen M.', authorInitial: 'N', topicCount: 14, enrolled: 312, rating: 4.7, tags: ['Exam Prep', 'Sciences'], preview: 'All 5 MEXT subjects: Maths, Physics, Chemistry, Biology & English. Exam-focused.' },
  { id: 'c4', name: 'Calculus from Scratch', authorName: 'Priya R.', authorInitial: 'P', topicCount: 10, enrolled: 654, rating: 4.6, tags: ['Mathematics'], preview: 'Limits, derivatives and integrals explained conceptually with worked examples.' },
  { id: 'c5', name: 'History of Art — Modern Era', authorName: 'Sofia L.', authorInitial: 'S', topicCount: 9, enrolled: 289, rating: 4.5, tags: ['Arts', 'History'], preview: 'From Impressionism to Contemporary art. Visual analysis techniques included.' },
  { id: 'c6', name: 'Organic Chemistry A-Level', authorName: 'Kwame O.', authorInitial: 'K', topicCount: 11, enrolled: 521, rating: 4.8, tags: ['Science', 'A-Level'], preview: 'Mechanisms, functional groups, synthesis routes and exam-style questions.' },
];

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const { theme: T } = useTheme();
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [tab, setTab] = useState('home');
  const [exploreQuery, setExploreQuery] = useState('');
  const [exploreTag, setExploreTag] = useState('All');

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      getSubjects(user.uid).then(s => { setSubjects(s); setSubjectsLoading(false); });
    }
  }, [user]);

  const refreshSubjects = async () => {
    if (user) setSubjects(await getSubjects(user.uid));
  };

  const handleDelete = async (e: React.MouseEvent, subjectId: string) => {
    e.stopPropagation();
    if (!user || !confirm('Delete this subject?')) return;
    await deleteSubject(user.uid, subjectId);
    refreshSubjects();
  };

  const handleSignOut = async () => { await signOut(); router.replace('/auth/login'); };

  const isLimited = profile ? !canCreateSubject(profile.plan, subjects.length) : false;
  const currentPlan = profile ? getPlanById(profile.plan) : null;

  const exploreTags = ['All', 'Science', 'Mathematics', 'Programming', 'A-Level', 'Exam Prep', 'Arts'];
  const filteredCourses = COMMUNITY_COURSES.filter(c => {
    const mQ = !exploreQuery || c.name.toLowerCase().includes(exploreQuery.toLowerCase()) || c.tags.some(t => t.toLowerCase().includes(exploreQuery.toLowerCase()));
    const mT = exploreTag === 'All' || c.tags.includes(exploreTag);
    return mQ && mT;
  });

  if (loading || !user) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={36} />
    </div>
  );

  return (
    <AppShell tab={tab} onTabChange={setTab}>
      {/* ── HOME TAB ── */}
      {tab === 'home' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }} className="animate-fade-up">
          <div style={{ marginBottom: 24 }}>
            <MonoLabel size={10}>Dashboard</MonoLabel>
            <h1 style={{ fontSize: 24, color: T.text, margin: '8px 0 3px', fontWeight: 600, fontFamily: F.sans }}>Hey, {profile?.name ?? 'there'} 👋</h1>
            <p style={{ color: T.textSub, fontSize: 14, fontFamily: F.sans }}>Your AI-powered learning hub.</p>
          </div>

          {isLimited && (
            <div onClick={() => router.push('/upgrade')} style={{ background: `linear-gradient(135deg, ${T.violetDim}, ${T.tealDim})`, border: `1px solid ${T.violet}33`, borderRadius: 14, padding: '16px 18px', marginBottom: 20, cursor: 'pointer' }}>
              <div style={{ fontSize: 14, color: T.text, fontWeight: 600, marginBottom: 3, fontFamily: F.sans }}>🔒 Free plan limit reached</div>
              <div style={{ fontSize: 13, color: T.textSub, marginBottom: 10, fontFamily: F.sans }}>Upgrade to Pro for unlimited subjects + Request a Course.</div>
              <Tag color={T.violet}>Upgrade to Pro →</Tag>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <MonoLabel>My Subjects — {subjects.length}</MonoLabel>
            <button onClick={isLimited ? () => router.push('/upgrade') : () => router.push('/subject/new')} style={{ background: isLimited ? T.dim : T.tealDim, border: `1px solid ${isLimited ? 'transparent' : T.borderMid}`, color: isLimited ? T.muted : T.teal, padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, fontFamily: F.sans, cursor: 'pointer' }}>
              + New
            </button>
          </div>

          {subjectsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}><Spinner /></div>
          ) : subjects.length === 0 ? (
            <div style={{ background: T.card, border: `2px dashed ${T.border}`, borderRadius: 16, padding: '52px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 42, marginBottom: 12 }}>📚</div>
              <div style={{ fontSize: 18, color: T.text, fontWeight: 600, marginBottom: 6, fontFamily: F.sans }}>No subjects yet</div>
              <div style={{ color: T.textSub, fontSize: 14, marginBottom: 24, fontFamily: F.sans }}>Upload notes or paste content to get a personalised AI course.</div>
              <Btn onClick={() => router.push('/subject/new')}>Create First Subject</Btn>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {subjects.map(s => {
                const sc = s.status === 'Completed' ? T.green : s.status === 'Generating' ? T.amber : T.teal;
                return (
                  <div key={s.id} onClick={() => router.push(`/course/${s.id}`)} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '18px 20px', cursor: 'pointer', transition: 'all 0.22s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = T.borderMid; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 24px ${T.tealGlow}`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = T.border; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <h3 style={{ fontSize: 15, color: T.text, fontWeight: 600, flex: 1, marginRight: 10, lineHeight: 1.35, fontFamily: F.sans }}>{s.name}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Tag color={sc}>{s.status === 'Generating' ? '⟳ Generating' : s.status === 'Completed' ? '✓ Done' : 'In Progress'}</Tag>
                        <button onClick={e => handleDelete(e, s.id)} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '0 2px', opacity: 0.5 }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = T.red; (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = T.muted; (e.currentTarget as HTMLButtonElement).style.opacity = '0.5'; }}>
                          ×
                        </button>
                      </div>
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: T.muted, marginBottom: 10 }}>{s.topicCount} topics · {s.progress}% complete</div>
                    <ProgressBar value={s.progress} />
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ marginTop: 24 }}>
            <Footer />
          </div>
        </div>
      )}

      {/* ── EXPLORE TAB ── */}
      {tab === 'explore' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <IconSearch size={16} color={T.muted} />
              </div>
              <input value={exploreQuery} onChange={e => setExploreQuery(e.target.value)} placeholder="Search community courses..." style={{ width: '100%', padding: '11px 14px 11px 38px', background: T.card2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 14, fontFamily: F.sans, caretColor: T.teal }} onFocus={e => (e.target.style.borderColor = T.borderMid)} onBlur={e => (e.target.style.borderColor = T.border)} />
            </div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12 }}>
              {exploreTags.map(tag => (
                <button key={tag} onClick={() => setExploreTag(tag)} style={{ padding: '6px 14px', borderRadius: 20, background: exploreTag === tag ? T.teal : T.card2, border: `1px solid ${exploreTag === tag ? T.teal : T.border}`, color: exploreTag === tag ? T.btnText : T.textSub, fontSize: 12, fontFamily: F.sans, fontWeight: exploreTag === tag ? 600 : 400, whiteSpace: 'nowrap', transition: 'all 0.2s', cursor: 'pointer' }}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <MonoLabel>Community — {filteredCourses.length}</MonoLabel>
              <MonoLabel size={9} color={T.teal}>Made public by users</MonoLabel>
            </div>

            {filteredCourses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '52px 20px' }}>
                <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>🔍</div>
                <div style={{ color: T.textSub, fontSize: 14, fontFamily: F.sans }}>No courses match "{exploreQuery}"</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredCourses.map(c => (
                  <div key={c.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '18px 18px 14px', transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = T.borderMid; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px ${T.tealGlow}`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = T.border; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: T.tealDim, border: `1px solid ${T.borderMid}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: T.teal, fontWeight: 700, flexShrink: 0, fontFamily: F.sans }}>{c.authorInitial}</div>
                      <span style={{ fontSize: 12, color: T.textSub, fontFamily: F.sans }}>{c.authorName}</span>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                        {c.tags.slice(0, 2).map(tag => <Tag key={tag} color={T.violet}>{tag}</Tag>)}
                      </div>
                    </div>
                    <div style={{ fontSize: 15, color: T.text, fontWeight: 600, marginBottom: 6, lineHeight: 1.35, fontFamily: F.sans }}>{c.name}</div>
                    <div style={{ fontSize: 13, color: T.textSub, lineHeight: 1.6, marginBottom: 12, fontFamily: F.sans }}>{c.preview}</div>
                    <div style={{ display: 'flex', alignItems: 'center', paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                      <div style={{ display: 'flex', gap: 16, flex: 1 }}>
                        <MonoLabel size={10}>📚 {c.topicCount}</MonoLabel>
                        <MonoLabel size={10}>👥 {c.enrolled.toLocaleString()}</MonoLabel>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: T.amber }}>★ {c.rating}</span>
                      </div>
                      <button style={{ background: T.tealDim, border: `1px solid ${T.borderMid}`, color: T.teal, padding: '7px 16px', borderRadius: 8, fontSize: 13, fontFamily: F.sans, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.teal; (e.currentTarget as HTMLButtonElement).style.color = T.btnText; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = T.tealDim; (e.currentTarget as HTMLButtonElement).style.color = T.teal; }}>
                        Enrol →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 20, background: `linear-gradient(135deg, ${T.tealDim}, ${T.violetDim})`, border: `1px solid ${T.borderMid}`, borderRadius: 14, padding: '18px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: T.text, fontWeight: 600, marginBottom: 4, fontFamily: F.sans }}>Share your course with the community</div>
              <div style={{ fontSize: 13, color: T.textSub, marginBottom: 14, fontFamily: F.sans }}>Any course you generate can be made public for others to enrol.</div>
              <Tag color={T.teal}>Go to a subject → ··· → Make Public</Tag>
            </div>
            <div style={{ marginTop: 24 }}>
              <Footer />
            </div>
          </div>
        </div>
      )}

      {/* ── PROFILE TAB ── */}
      {tab === 'profile' && profile && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 20px' }} className="animate-fade-up">
          <div style={{ textAlign: 'center', marginBottom: 26 }}>
            <div style={{ width: 68, height: 68, borderRadius: '50%', background: T.tealDim, border: `2px solid ${T.borderMid}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: T.teal, margin: '0 auto 12px', fontWeight: 700, fontFamily: F.sans }}>
              {profile.name[0].toUpperCase()}
            </div>
            <h2 style={{ fontSize: 20, color: T.text, fontWeight: 600, fontFamily: F.sans }}>{profile.name}</h2>
            <div style={{ marginTop: 8 }}><Tag color={profile.plan === 'free' ? T.amber : T.violet}>{profile.plan === 'free' ? 'Free Plan' : `✦ ${getPlanById(profile.plan).name}`}</Tag></div>
          </div>

          {[
            { l: 'Subjects', v: subjects.length },
            { l: 'Email', v: profile.email },
            { l: 'Plan', v: getPlanById(profile.plan).name },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 0', borderBottom: `1px solid ${T.border}` }}>
              <MonoLabel size={11}>{r.l}</MonoLabel>
              <span style={{ fontSize: 14, color: T.text, fontFamily: F.sans }}>{r.v}</span>
            </div>
          ))}

          <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {profile.plan !== 'unlimited' && (
              <Btn variant="violet" onClick={() => router.push('/upgrade')} style={{ width: '100%', padding: '13px' }}>Upgrade ✦</Btn>
            )}
            <Btn variant="ghost" onClick={handleSignOut} style={{ width: '100%', padding: '13px' }}>Sign Out</Btn>
          </div>
          <div style={{ marginTop: 24 }}>
            <Footer />
          </div>
        </div>
      )}
    </AppShell>
  );
}
