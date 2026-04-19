import type { PlanTier } from '@/types';

export interface Plan {
  id: PlanTier;
  name: string;
  price: number;       // USD
  subjectLimit: number; // -1 = unlimited
  hasImageGen: boolean;
  label: string;
  description: string;
  features: string[];
  badge?: string;
  color: 'teal' | 'violet' | 'amber';
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    subjectLimit: 1,
    hasImageGen: false,
    label: 'Free',
    description: 'Try it out',
    features: [
      '1 subject',
      'Full AI course generation',
      'Quizzes & assessments',
      'Mock exams',
    ],
    color: 'teal',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 1.20,
    subjectLimit: 3,
    hasImageGen: false,
    label: '$1.20',
    description: 'One-time payment',
    features: [
      '3 subjects',
      'Full AI course generation',
      'Quizzes & assessments',
      'Mock exams',
      'PDF & .docx upload',
    ],
    color: 'teal',
  },
  {
    id: 'scholar',
    name: 'Scholar',
    price: 5.00,
    subjectLimit: 10,
    hasImageGen: true,
    label: '$5.00',
    description: 'One-time payment',
    badge: 'Popular',
    features: [
      '10 subjects',
      'Everything in Starter',
      'Request a Course (AI-described)',
      'AI-generated illustrations ✦',
      'Priority AI generation',
      'Weak area analytics',
    ],
    color: 'violet',
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    price: 10.00,
    subjectLimit: -1,
    hasImageGen: true,
    label: '$10.00',
    description: 'One-time payment',
    badge: 'Best value',
    features: [
      'Unlimited subjects',
      'Everything in Scholar',
      'AI-generated illustrations ✦',
      'Community course publishing',
      'Early access to new features',
    ],
    color: 'amber',
  },
];

export const getPlanById = (id: PlanTier): Plan =>
  PLANS.find(p => p.id === id) ?? PLANS[0];

export const canCreateSubject = (plan: PlanTier, currentCount: number): boolean => {
  const p = getPlanById(plan);
  return p.subjectLimit === -1 || currentCount < p.subjectLimit;
};

export const canGenerateImages = (plan: PlanTier): boolean => {
  const p = getPlanById(plan);
  return p.hasImageGen;
};
