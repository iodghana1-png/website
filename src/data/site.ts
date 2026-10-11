export type ContentCard = {
  title: string;
  description: string;
  longDescription?: string;
  href: string;
  category?: string;
  date?: string;
  meta?: string;
};

export const membershipCategories: ContentCard[] = [
  { title: "Student", description: "For budding business leaders preparing for a future boardroom career or enterprise.", longDescription: "Student memberships are available for budding business leaders. This membership is a perfect fit for those interested in Business Studies, Entrepreneurship, Accountancy, Marketing, Economics, and related disciplines. IoD-Gh extends this hand of welcome to all students wishing to follow the path of a boardroom career or own a business either now or in the future.", href: "/membership/categories", meta: "For emerging leaders" },
  { title: "Associate", description: "For ambitious professionals building the knowledge and perspective required for future board service.", href: "/membership/categories", meta: "The starting point" },
  { title: "Member", description: "For established directors and senior executives committed to high standards of governance.", href: "/membership/categories", meta: "Professional recognition" },
  { title: "Fellow", description: "For distinguished directors whose contribution and leadership demonstrate sustained excellence.", href: "/membership/categories", meta: "The highest designation" },
  { title: "Corporate", description: "For organisations investing in stronger boards, leadership pipelines and governance culture.", href: "/membership/corporate", meta: "For organisations" },
];

export const trainingProgrammes: ContentCard[] = [
  { title: "Board Leadership Programme", description: "A practical intensive for directors seeking sharper boardroom judgement and impact.", href: "/training/board-leadership-programme", date: "12–14 November 2026", meta: "3 days · Accra · 18 CPD points" },
  { title: "Corporate Governance for Directors", description: "The essential governance programme for newly appointed and aspiring directors.", href: "/training/corporate-governance-for-directors", date: "3–4 December 2026", meta: "2 days · Hybrid · 12 CPD points" },
  { title: "The Effective Chair", description: "How to lead constructive debate, build trust and enable high-performing boards.", href: "/training/effective-chair", date: "21 January 2027", meta: "1 day · Accra · 6 CPD points" },
];

export const events: ContentCard[] = [
  { title: "National Corporate Governance Conference", description: "A national conversation on leadership, resilience and long-term value creation.", href: "/events/national-corporate-governance-conference", date: "18 October 2026", meta: "Kempinski Hotel Gold Coast City, Accra" },
  { title: "Leadership & Ethics Forum", description: "A considered discussion on values-led leadership in a changing operating environment.", href: "/events/leadership-and-ethics-forum", date: "4 November 2026", meta: "IoD-Gh Centre, Accra · Hybrid" },
  { title: "Directors’ Networking Evening", description: "An evening of peer exchange with Ghana’s director community.", href: "/events/directors-networking-evening", date: "20 November 2026", meta: "Kumasi · In person" },
];

export const knowledgeItems: ContentCard[] = [
  { title: "Governance Outlook 2026", description: "The issues shaping board agendas in Ghana and across the region.", href: "/knowledge/research", category: "Research" },
  { title: "Annual Report 2025", description: "A year of progress in professional directorship and institutional influence.", href: "/knowledge/reports", category: "Annual report" },
  { title: "A Director’s Guide to Board Evaluation", description: "A practical framework for improving board performance.", href: "/knowledge/resources", category: "Resource" },
];

export const newsItems: ContentCard[] = [
  { title: "IoD-Gh convenes leaders on the future of corporate governance", description: "Directors and senior decision-makers gathered in Accra for a timely conversation on responsible leadership.", href: "/news/governance-leadership-forum", category: "Institute news", date: "24 September 2026" },
  { title: "Why board composition matters more than ever", description: "A perspective on the skills, independence and diversity that make boards effective.", href: "/news/why-board-composition-matters", category: "Insight", date: "11 September 2026" },
  { title: "New cohort begins the Board Leadership Programme", description: "Directors from across sectors begin a focused journey in leadership and governance.", href: "/news/board-leadership-cohort", category: "Professional development", date: "28 August 2026" },
];

export const serviceItems: ContentCard[] = [
  { title: "Governance consultancy", description: "Independent advice that helps organisations build confidence in their governance foundations.", href: "/services/consultancy" },
  { title: "Board evaluation", description: "Rigorous, sensitive and evidence-led evaluation for better board performance.", href: "/services/board-evaluation" },
  { title: "Corporate meeting", description: "Well-supported meeting arrangements for focused board and leadership discussions.", href: "/services/corporate-meeting" },
];

export const pageCopy: Record<string, { eyebrow: string; title: string; description: string }> = {
  about: { eyebrow: "About IoD-Gh", title: "A stronger voice for better governance.", description: "We are Ghana’s professional institute for directors, bringing together the people who guide organisations and shape national progress." },
  history: { eyebrow: "Our story, vision & mission", title: "Built on a belief in responsible leadership.", description: "The history, direction and purpose that continue to guide IoD-Gh and the practice of corporate governance in Ghana." },
  "vision-mission": { eyebrow: "Vision & Mission", title: "Our vision and mission.", description: "The direction and purpose that guide the Institute's work." },
  council: { eyebrow: "Council", title: "Stewardship for the Institute and the profession.", description: "Our Council provides strategic direction and upholds the standards that guide IoD-Gh." },
  secretariat: { eyebrow: "Secretariat", title: "The team behind the Institute.", description: "Our Secretariat translates purpose into practical programmes, member experience and national influence." },
  partners: { eyebrow: "Strategic partners", title: "Partnerships that extend our impact.", description: "We collaborate with institutions that share our commitment to stronger governance and capable leadership." },
};
