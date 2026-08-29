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
    hasImageGen: true,
    label: 'Free',
    description: 'Get started immediately',
    features: [
      '1 active course',
      'Full AI course generation',
      'Interactive Mermaid & SVG diagrams',
      'Topic quizzes & assessments',
      'PDF & notes upload',
    ],
    color: 'teal',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 1.20,
    subjectLimit: 3,
    hasImageGen: true,
    label: '$1.20',
    description: 'One-time payment',
    features: [
      'Up to 3 active courses',
      'Interactive Mermaid & SVG diagrams',
      'Full-length timed mock exams',
      'PDF, Word & slides processing',
      'Lifetime course access',
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
      'Up to 10 active courses',
      'Everything in Starter',
      'Interactive Mermaid & SVG diagrams',
      'Priority AI generation speed',
      'Voice narrator lesson audio',
    ],
    color: 'violet',
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
