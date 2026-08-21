'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { getSubjects, deleteSubject } from '@/lib/firebase/firestore';
import { signOut } from '@/lib/firebase/auth';
import { AppShell } from '@/components/layout/AppShell';
import { Tag, ProgressBar, Btn, Spinner, IconSearch, IconFlame, IconSparkles, F } from '@/components/ui/primitives';
import type { Subject, PublicCourse } from '@/types';
import OnboardingSplash from '@/components/OnboardingSplash';
import { canCreateSubject, getPlanById } from '@/lib/plans';
import { Footer } from '@/components/layout/Footer';

export default function DashboardPage() {
  const { user, profile, loading, isDemo, exitDemoMode } = useAuth();
  const { theme: T } = useTheme();
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [tab, setTab] = useState('home');
  const [exploreQuery, setExploreQuery] = useState('');
  const [publicCourses, setPublicCourses] = useState<PublicCourse[]>([]);
  const [exploreLoading, setExploreLoading] = useState(true);
  const [reportedCourses, setReportedCourses] = useState<Set<string>>(new Set());
  const [showSplash, setShowSplash] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', '🔬 Science', '📐 Math', '💻 Code', '📚 A-Level', '⚡ Exam Prep', '🎨 Arts'];

  const handleReport = async (courseId: string, courseName: string) => {
    const subject = encodeURIComponent('MonetStudy Course Report');
    const body = encodeURIComponent(
      'Reported Course: ' + courseName + '\n' +
      'Course ID: ' + courseId + '\n' +
      'Reported by: ' + (profile?.name || user?.email) + '\n\n' +
      'Reason for report:\n[Please describe the issue]'
    );
    window.open('mailto:neithenbrooke@gmail.com?subject=' + subject + '&body=' + body);
    setReportedCourses(prev => new Set(Array.from(prev).concat(courseId)));
  };

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      getSubjects(user.uid).then(s => {
        setSubjects(s || []);
        setSubjectsLoading(false);
      }).catch(() => {
        setSubjectsLoading(false);
      });

      import('firebase/firestore').then(({ doc, getDoc }) => {
        import('@/lib/firebase/config').then(({ db }) => {
          getDoc(doc(db, 'users', user.uid)).then(snap => {
            if (snap.exists() && !snap.data().onboarded) {
              setShowSplash(true);
            }
          }).catch(() => {});
        });
      }).catch(() => {});
    }
  }, [user]);

  const handleSplashDone = async () => {
    setShowSplash(false);
    if (user) {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/config');
      await updateDoc(doc(db, 'users', user.uid), { onboarded: true });
    }
  };

  const refreshSubjects = async () => {
    if (user) {
      const s = await getSubjects(user.uid);
      setSubjects(s || []);
    }
  };

  const handleDelete = async (e: React.MouseEvent, subjectId: string) => {
    e.stopPropagation();
    if (!user || !confirm('Delete this subject?')) return;
    // Optimistically remove ONLY this single subject from state
    setSubjects(prev => prev.filter(s => s.id !== subjectId));
    await deleteSubject(user.uid, subjectId);
  };

  const handleSignOut = async () => {
    try { exitDemoMode(); } catch {}
    await signOut();
    router.replace('/auth/login');
  };

  const isLimited = profile ? !canCreateSubject(profile.plan, subjects.length) : false;
  const currentPlan = profile ? getPlanById(profile.plan) : null;

  const filteredCourses = publicCourses.filter(c => {
    const mQ = !exploreQuery || c.name.toLowerCase().includes(exploreQuery.toLowerCase()) || c.tags.some(t => t.toLowerCase().includes(exploreQuery.toLowerCase()));
    const mT = activeCategory === 'All' || c.tags.some(t => activeCategory.includes(t));
    return mQ && mT;
  });

  if (showSplash) return <OnboardingSplash name={profile?.name} onDone={handleSplashDone} />;

  if (loading || !user) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={36} />
    </div>
  );

  const completedCount = subjects.filter(s => s.status === 'Completed' || s.progress === 100).length;
  const avgProgress = subjects.length ? Math.round(subjects.reduce((acc, s) => acc + (s.progress || 0), 0) / subjects.length) : 0;

  return (
    <AppShell tab={tab} onTabChange={setTab}>
      {/* ── HOME TAB ── */}
      {tab === 'home' && (
        <div style={{ flex: 1, overflowY: 'auto' }} className="animate-fade-up">
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px 48px' }}>
            
            {/* Greeting Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, color: T.textSub, fontFamily: F.sans, fontWeight: 600 }}>Welcome back</span>
                  <span style={{ fontSize: 14 }}>☕</span>
                </div>
                <h1 style={{ fontSize: 28, color: T.text, fontWeight: 900, fontFamily: F.sans, letterSpacing: '-0.5px', margin: 0 }}>
                  {profile?.name ?? 'Learner'}
                </h1>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  background: T.card, border: `1.5px solid ${T.borderMid}`, borderRadius: 999,
                  padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 2px 8px rgba(44, 24, 16, 0.04)',
                }}>
                  <IconFlame size={18} color={T.teal} />
                  <span style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 800, color: T.text }}>
                    {subjects.length > 0 ? `${subjects.length} Courses Active` : 'Ready to Learn'}
                  </span>
                </div>
                <Btn size="sm" variant="primary" onClick={isLimited ? () => router.push('/upgrade') : () => router.push('/subject/new')} className="hidden sm:flex">
                  + New Subject
                </Btn>
              </div>
            </div>

            {/* Desktop Hero Section: 2-Column Split on PC */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 20,
              marginBottom: 28,
            }}>
              {/* Hero Highlight Card */}
              <div style={{
                background: T.name === 'dark' || T.name === 'midnight'
                  ? 'linear-gradient(135deg, #2D1C13 0%, #1E120B 100%)'
                  : 'linear-gradient(135deg, #FAF3EB 0%, #F5EBE1 100%)',
                border: `1.5px solid ${T.borderMid}`,
                borderRadius: 32, padding: '28px 28px',
                position: 'relative', overflow: 'hidden',
                boxShadow: '0 12px 32px rgba(44, 24, 16, 0.06)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <div>
                  <Tag color={T.teal} bg={T.card}>
                    <IconSparkles size={13} color={T.teal} />
                    <span>AI Study Assistant</span>
                  </Tag>
                  <h2 style={{ fontSize: 22, color: T.text, fontWeight: 900, margin: '14px 0 6px', fontFamily: F.sans, letterSpacing: '-0.4px' }}>
                    {subjects.length === 0 ? 'Create your first course' : 'Continue your study momentum'}
                  </h2>
                  <p style={{ fontSize: 14, color: T.textSub, margin: 0, fontFamily: F.sans, lineHeight: 1.6, maxWidth: 480 }}>
                    {subjects.length === 0
                      ? 'Upload study notes, PDFs, or slides to generate full interactive lessons and recall quizzes.'
                      : `You have completed ${completedCount} topics. Average progress is ${avgProgress}% across your enrolled courses.`}
                  </p>
                </div>

                <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Btn size="md" variant="primary" onClick={isLimited ? () => router.push('/upgrade') : () => router.push('/subject/new')}>
                    + Create New Subject
                  </Btn>
                  {subjects.length > 0 && (
                    <Btn size="md" variant="ghost" onClick={() => router.push(`/course/${subjects[0].id}`)}>
                      Resume Current Lesson →
                    </Btn>
                  )}
                </div>
              </div>

              {/* Quick Learning Stats Card (Desktop Highlight) */}
              <div style={{
                background: T.card, border: `1.5px solid ${T.borderMid}`,
                borderRadius: 32, padding: '24px 24px',
                boxShadow: '0 8px 24px rgba(44, 24, 16, 0.04)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: T.text, fontFamily: F.sans }}>Study Summary</span>
                  <Tag color={T.teal}>{currentPlan?.name ?? 'Free Tier'}</Tag>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 20, padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: T.teal, fontFamily: F.sans }}>{subjects.length}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.textSub, fontFamily: F.sans, marginTop: 2 }}>Active Courses</div>
                  </div>
                  <div style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 20, padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: T.green, fontFamily: F.sans }}>{avgProgress}%</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.textSub, fontFamily: F.sans, marginTop: 2 }}>Avg Completion</div>
                  </div>
                </div>

                <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: T.textSub, fontFamily: F.sans }}>Subjects capacity:</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: T.text, fontFamily: F.sans }}>
                    {profile?.plan === 'unlimited' ? 'Unlimited' : `${subjects.length} / ${profile?.subjectLimit || 3}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Limit Notice if applicable */}
            {isLimited && (
              <div onClick={() => router.push('/upgrade')} style={{
                background: T.card, border: `1.5px solid ${T.violet}44`,
                borderRadius: 24, padding: '16px 22px', marginBottom: 24,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 4px 16px rgba(44, 24, 16, 0.04)',
              }}>
                <div>
                  <div style={{ fontSize: 14, color: T.text, fontWeight: 800, fontFamily: F.sans }}>🔒 Free tier subject limit reached</div>
                  <div style={{ fontSize: 12, color: T.textSub, fontFamily: F.sans }}>Upgrade to unlock unlimited courses, vision diagrams, and timed mock exams.</div>
                </div>
                <Tag color={T.violet}>Upgrade Plan →</Tag>
              </div>
            )}

            {/* Category Quick Chips */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, marginBottom: 12, scrollbarWidth: 'none' }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                  padding: '8px 18px', borderRadius: 999,
                  background: activeCategory === cat ? (T.name === 'dark' || T.name === 'midnight' ? '#FAF5EE' : '#2C1810') : T.card,
                  border: `1.5px solid ${activeCategory === cat ? 'transparent' : T.borderMid}`,
                  color: activeCategory === cat ? (T.name === 'dark' || T.name === 'midnight' ? '#140E0A' : '#FAF5EE') : T.textSub,
                  fontSize: 13, fontFamily: F.sans, fontWeight: 700,
                  whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: activeCategory === cat ? '0 4px 14px rgba(44, 24, 16, 0.15)' : 'none',
                }}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Section Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ fontSize: 18, color: T.text, fontWeight: 900, margin: 0, fontFamily: F.sans, letterSpacing: '-0.3px' }}>Enrolled Courses</h3>
                <span style={{ background: T.card2, color: T.textSub, fontSize: 12, fontWeight: 800, padding: '2px 10px', borderRadius: 999, border: `1px solid ${T.border}` }}>
                  {subjects.length}
                </span>
              </div>
              <button onClick={isLimited ? () => router.push('/upgrade') : () => router.push('/subject/new')} style={{
                background: 'none', border: 'none', color: T.teal,
                fontSize: 13, fontWeight: 800, fontFamily: F.sans, cursor: 'pointer',
              }}>
                + Create New Course
              </button>
            </div>

            {/* Subjects Responsive Multi-Column Grid */}
            {subjectsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><Spinner /></div>
            ) : subjects.length === 0 ? (
              <div style={{
                background: T.card, border: `2px dashed ${T.borderMid}`,
                borderRadius: 32, padding: '56px 20px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>📚</div>
                <div style={{ fontSize: 20, color: T.text, fontWeight: 800, marginBottom: 6, fontFamily: F.sans }}>No subjects yet</div>
                <p style={{ color: T.textSub, fontSize: 14, marginBottom: 24, fontFamily: F.sans, maxWidth: 360, margin: '0 auto 24px' }}>
                  Upload your syllabus, lecture slides, or textbook notes to get your first personalized AI course.
                </p>
                <Btn onClick={() => router.push('/subject/new')}>Create Your First Subject →</Btn>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 16,
              }}>
                {subjects.map(s => {
                  const sc = s.status === 'Completed' ? T.green : s.status === 'Generating' ? T.amber : T.teal;
                  return (
                    <div key={s.id} onClick={() => router.push(`/course/${s.id}`)}
                      className="card-hover"
                      style={{
                        background: T.card, border: `1.5px solid ${T.borderMid}`,
                        borderRadius: 28, padding: '22px 22px', cursor: 'pointer',
                        boxShadow: '0 4px 18px rgba(44, 24, 16, 0.04)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 160,
                      }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 }}>
                            <div style={{
                              width: 40, height: 40, borderRadius: 14,
                              background: `${sc}18`, border: `1.5px solid ${sc}33`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 18, flexShrink: 0,
                            }}>
                              📖
                            </div>
                            <h4 style={{ fontSize: 16, color: T.text, fontWeight: 800, margin: 0, lineHeight: 1.3, fontFamily: F.sans }}>
                              {s.name}
                            </h4>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Tag color={sc}>{s.status === 'Generating' ? '⟳ Generating' : s.status === 'Completed' ? '✓ Done' : `${s.progress}%`}</Tag>
                            <button onClick={e => handleDelete(e, s.id)} title="Delete course" style={{
                              background: 'none', border: 'none', color: T.muted,
                              fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px',
                            }}>
                              ×
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, color: T.textSub, fontFamily: F.sans, fontWeight: 600 }}>{s.topicCount} topics</span>
                          <span style={{ fontSize: 12, color: T.teal, fontWeight: 800, fontFamily: F.sans }}>{s.progress}% complete</span>
                        </div>
                        <ProgressBar value={s.progress} height={7} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: 40 }}>
              <Footer />
            </div>
          </div>
        </div>
      )}

      {/* ── EXPLORE TAB ── */}
      {tab === 'explore' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px 48px' }}>
            {/* Search and Filter Bar */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <IconSearch size={20} color={T.muted} />
                </div>
                <input value={exploreQuery} onChange={e => setExploreQuery(e.target.value)}
                  placeholder="Search community courses by topic, syllabus, or keywords..."
                  style={{
                    width: '100%', padding: '14px 20px 14px 48px',
                    background: T.card, border: `1.5px solid ${T.borderMid}`,
                    borderRadius: 999, color: T.text, fontSize: 14,
                    fontFamily: F.sans, caretColor: T.teal,
                    boxShadow: '0 4px 16px rgba(44, 24, 16, 0.04)',
                  }} />
              </div>

              {/* Category Chips */}
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
                {categories.map(tag => {
                  const isActive = activeCategory === tag;
                  return (
                    <button key={tag} onClick={() => setActiveCategory(tag)} style={{
                      padding: '8px 18px', borderRadius: 999,
                      background: isActive ? (T.name === 'dark' || T.name === 'midnight' ? '#FAF5EE' : '#2C1810') : T.card,
                      border: `1.5px solid ${isActive ? 'transparent' : T.borderMid}`,
                      color: isActive ? (T.name === 'dark' || T.name === 'midnight' ? '#140E0A' : '#FAF5EE') : T.textSub,
                      fontSize: 13, fontFamily: F.sans, fontWeight: 700,
                      whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.2s',
                    }}>
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: T.text, fontFamily: F.sans }}>Community Courses ({filteredCourses.length})</span>
              <Tag color={T.teal}>Public Library</Tag>
            </div>

            {exploreLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}><Spinner /></div>
            ) : filteredCourses.length === 0 ? (
              <div style={{
                background: T.card, border: `1.5px solid ${T.borderMid}`,
                borderRadius: 32, padding: '48px 20px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.7 }}>🔍</div>
                <div style={{ color: T.text, fontSize: 17, fontWeight: 800, marginBottom: 4, fontFamily: F.sans }}>
                  {exploreQuery ? 'No matching courses found' : 'No public courses published yet'}
                </div>
                <div style={{ color: T.textSub, fontSize: 13, fontFamily: F.sans }}>
                  {exploreQuery ? 'Try broadening your search term' : 'Be the first creator to share a course!'}
                </div>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 16,
              }}>
                {filteredCourses.map(c => (
                  <div key={c.id} className="card-hover" style={{
                    background: T.card, border: `1.5px solid ${T.borderMid}`,
                    borderRadius: 28, padding: '22px',
                    boxShadow: '0 4px 18px rgba(44, 24, 16, 0.04)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: T.tealDim, border: `1.5px solid ${T.borderMid}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, color: T.teal, fontWeight: 800, flexShrink: 0,
                        }}>
                          {c.authorInitial}
                        </div>
                        <span style={{ fontSize: 13, color: T.textSub, fontFamily: F.sans, fontWeight: 700 }}>{c.authorName}</span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                          {c.tags.slice(0, 2).map(tag => <Tag key={tag} color={T.violet}>{tag}</Tag>)}
                        </div>
                      </div>
                      <h4 style={{ fontSize: 16, color: T.text, fontWeight: 800, marginBottom: 6, lineHeight: 1.3, fontFamily: F.sans }}>{c.name}</h4>
                      <p style={{ fontSize: 13, color: T.textSub, lineHeight: 1.6, marginBottom: 16, fontFamily: F.sans }}>{c.preview}</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
                      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: T.muted, fontFamily: F.sans, fontWeight: 700 }}>
                        <span>📚 {c.topicCount}</span>
                        <span>👥 {c.enrolled}</span>
                        <span style={{ color: T.amber }}>★ {c.rating}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Btn size="sm" variant="primary" onClick={() => router.push(`/course/${c.id}`)}>
                          Enrol Now →
                        </Btn>
                        <button onClick={() => handleReport(c.id, c.name)} title="Report course" style={{
                          background: 'none', border: 'none', color: reportedCourses.has(c.id) ? T.muted : T.red,
                          fontSize: 14, cursor: 'pointer', padding: '4px 6px', opacity: 0.7,
                        }}>
                          {reportedCourses.has(c.id) ? '✓' : '⚑'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 40 }}>
              <Footer />
            </div>
          </div>
        </div>
      )}

      {/* ── PROFILE TAB ── */}
      {tab === 'profile' && profile && (
        <div style={{ flex: 1, overflowY: 'auto' }} className="animate-fade-up">
          <div style={{ maxWidth: 840, margin: '0 auto', padding: '32px 20px 48px' }}>
            
            {/* Profile Avatar Header */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{
                width: 84, height: 84, borderRadius: '50%',
                background: `linear-gradient(135deg, ${T.teal}, ${T.violet})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 34, color: '#FFFFFF', margin: '0 auto 14px',
                fontWeight: 900, fontFamily: F.sans,
                boxShadow: `0 12px 32px ${T.tealGlow}`,
              }}>
                {profile.name[0].toUpperCase()}
              </div>
              <h2 style={{ fontSize: 24, color: T.text, fontWeight: 900, fontFamily: F.sans, margin: '0 0 8px', letterSpacing: '-0.4px' }}>
                {profile.name}
              </h2>
              <Tag color={profile.plan === 'free' ? T.amber : T.teal}>
                {profile.plan === 'free' ? 'Free Tier Learner' : `✦ ${getPlanById(profile.plan).name} Member`}
              </Tag>
            </div>

            {/* Desktop 2-Column Split: Stats & Settings */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 20,
              marginBottom: 28,
            }}>
              {/* Left: Stats */}
              <div style={{
                background: T.card, border: `1.5px solid ${T.borderMid}`,
                borderRadius: 28, padding: '24px',
                boxShadow: '0 8px 24px rgba(44, 24, 16, 0.04)',
              }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.text, fontFamily: F.sans, marginBottom: 16 }}>Learning Performance</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 20, padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: T.teal, fontFamily: F.sans }}>{subjects.length}</div>
                    <div style={{ fontSize: 11, color: T.textSub, fontFamily: F.sans, fontWeight: 700, marginTop: 2 }}>Enrolled Courses</div>
                  </div>
                  <div style={{ background: T.card2, border: `1px solid ${T.border}`, borderRadius: 20, padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: T.green, fontFamily: F.sans }}>{completedCount}</div>
                    <div style={{ fontSize: 11, color: T.textSub, fontFamily: F.sans, fontWeight: 700, marginTop: 2 }}>Topics Mastered</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: 13, color: T.textSub, fontFamily: F.sans, fontWeight: 600 }}>Average Score</span>
                  <span style={{ fontSize: 14, color: T.teal, fontFamily: F.sans, fontWeight: 800 }}>{avgProgress}%</span>
                </div>
              </div>

              {/* Right: Account Info & Actions */}
              <div style={{
                background: T.card, border: `1.5px solid ${T.borderMid}`,
                borderRadius: 28, padding: '24px',
                boxShadow: '0 8px 24px rgba(44, 24, 16, 0.04)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: T.text, fontFamily: F.sans, marginBottom: 16 }}>Account Details</div>
                  {[
                    { l: 'Email', v: profile.email },
                    { l: 'Current Plan', v: getPlanById(profile.plan).name },
                    { l: 'Status', v: 'Active' },
                  ].map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 2 ? `1px solid ${T.border}` : 'none' }}>
                      <span style={{ fontSize: 13, color: T.textSub, fontFamily: F.sans, fontWeight: 600 }}>{r.l}</span>
                      <span style={{ fontSize: 13, color: T.text, fontFamily: F.sans, fontWeight: 800 }}>{r.v}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  {profile.plan !== 'unlimited' && (
                    <Btn variant="violet" onClick={() => router.push('/upgrade')} style={{ flex: 1.4, padding: '12px' }}>
                      Upgrade Plan ✦
                    </Btn>
                  )}
                  <Btn variant="ghost" onClick={handleSignOut} style={{ flex: 1, padding: '12px' }}>
                    Sign Out
                  </Btn>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 32 }}>
              <Footer />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
