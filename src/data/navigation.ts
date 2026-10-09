import { examinationPortalUrl } from "@/lib/examinationPortal";

export type NavigationItem = {
  label: string;
  href: string;
  children?: { label: string; href: string; description?: string }[];
};

export const navigation: NavigationItem[] = [
  { label: "About", href: "/about", children: [
    { label: "Who we are", href: "/about", description: "Our role, purpose and direction" },
    { label: "Our history", href: "/about/history" }, { label: "Vision & mission", href: "/about/vision-mission" }, { label: "Council", href: "/about/council" }, { label: "Secretariat", href: "/about/secretariat" },
    { label: "Our services", href: "/services", description: "Practical governance support" },
    { label: "Contact us", href: "/contact" },
  ] },
    { label: "Membership", href: "/membership", children: [
    { label: "Membership categories", href: "/membership", description: "Find your place at IoD-Gh" }, { label: "Members in good standing", href: "/membership/members-in-good-standing" },
    { label: "Membership benefits", href: "/membership/benefits" }, { label: "Membership fees", href: "/membership/fees" }, { label: "Corporate membership", href: "/membership/corporate" },
  ] },
  { label: "Training", href: "/training", children: [
    { label: "Professional training", href: "/training/professional", description: "Learning for the boardroom" },
    { label: "CPD & Seminars", href: "/training/cpd" }, { label: "Examinations", href: examinationPortalUrl, description: "Secure examination portal" }, { label: "All programmes", href: "/training" },
  ] },
  { label: "Events", href: "/events", children: [
    { label: "Upcoming events", href: "/events", description: "Learn, connect and lead" },
    { label: "Governance conference", href: "/events/national-corporate-governance-conference" }, { label: "Leadership & ethics forum", href: "/events/leadership-and-ethics-forum" },
  ] },
  { label: "Media", href: "/news", children: [
    { label: "News", href: "/news", description: "Institute news and perspectives" },
    { label: "Publications", href: "/knowledge/publications" }, { label: "Event gallery", href: "/media/event-gallery" },
  ] },
  { label: "Knowledge", href: "/knowledge", children: [
    { label: "Knowledge centre", href: "/knowledge", description: "Insight for better decisions" },
    { label: "Publications", href: "/knowledge/publications" }, { label: "Reports", href: "/knowledge/reports" }, { label: "Research", href: "/knowledge/research" }, { label: "Resources", href: "/knowledge/resources" },
  ] },
];
