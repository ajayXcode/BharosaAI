export type Plan = "free" | "pro" | "enterprise";

export interface PlanCard {
  id: Plan;
  name: string;
  price: string;
  period: string;
  note: string;
  features: string[];
  featured?: boolean;
}

export const PLANS: PlanCard[] = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "forever",
    note: "Try the full document review on your first policy or loan.",
    features: [
      "Upload and decode financial documents",
      "Cited answers in English, Hindi and Hinglish",
      "Risk flags, summaries and cost checks",
      "Private per-account workspace",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹499",
    period: "per month",
    note: "For people comparing loans, cards and policies regularly.",
    features: [
      "Everything in Free",
      "Higher monthly usage and faster analysis",
      "Voice questions and read-aloud answers",
      "Stress tests, document compare and decision receipts",
      "Priority support",
    ],
    featured: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "annual",
    note: "For banks, NBFCs, insurers and advice teams.",
    features: [
      "Everything in Pro",
      "Admin panel with user plan controls",
      "Audit, consent and compliance exports",
      "Custom integrations and SLA",
      "Dedicated onboarding",
    ],
  },
];
