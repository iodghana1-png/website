export type BuiltInSectionDefinition = { key: string; label: string };
const definitions = (entries: [string, string][]): BuiltInSectionDefinition[] => entries.map(([key, label]) => ({ key, label }));

export function nativeSectionTypes(path: string): string[] {
  if (path === "/training/exams") return ["exam_assessment"];
  if (path === "/membership/apply") return ["cohort_availability"];
  if (path === "/media/event-gallery") return ["gallery"];
  if (["/knowledge/resources", "/knowledge/reports", "/knowledge/research"].includes(path)) return ["document_list"];
  return [];
}

// Keys are explicit and stable: changing copy or rearranging a page must not
// restore a hidden section. Keep this catalog aligned with BuiltInSection tags.
export function builtInSections(path: string, legacy = true): BuiltInSectionDefinition[] {
  if (path === "/") return [];
  if (!legacy) return definitions([["hero", "Page hero / introduction"], ["body", "Additional page content"]]);
  let entries: [string, string][] = [];
  if (path === "/about") entries = [["about-introduction", "Introduction"], ["about-principles", "Our principles"], ["about-explore", "Explore the Institute"]];
  else if (path === "/about/history") entries = [["about-story", "Our history"], ["vision-mission", "Vision and mission"], ["values", "Our values"]];
  else if (path === "/about/vision-mission") entries = [["vision-mission", "Vision and mission"], ["values", "Our values"]];
  else if (path === "/about/council") entries = [["council", "Governing council"]];
  else if (path === "/about/secretariat") entries = [["secretariat-introduction", "How we work"], ["secretariat-profiles", "Secretariat profiles"]];
  else if (path === "/about/partners") entries = [["partners-introduction", "Partners introduction"], ["partner-logos", "Partner logos"]];
  else if (path.startsWith("/about/")) entries = [["about-story", "Our story / Institute content"]];
  else if (path === "/services") entries = [["services-perspective", "Our perspective"], ["services-offering", "What we offer"], ["services-process", "What to expect"], ["services-contact", "Start a conversation"]];
  else if (path.startsWith("/services/")) entries = [["service-overview", "Service overview"], ["service-outcomes", "Service outcomes"], ["service-contact", "Contact / enquiry"]];
  else if (path === "/training") entries = [["training-programmes", "Upcoming programmes"], ["training-pathways", "Learning pathways"]];
  else if (["/training/professional", "/training/corporate-governance-for-directors"].includes(path)) entries = [["course-overview", "Course overview"], ["course-objectives", "Learning objectives"], ["course-audience", "Duration and flexibility"], ["course-modules", "Faculty and target group"], ["course-fees", "Completion and certification"], ["course-registration", "Training schedules and fees"]];
  else if (path === "/training/exams") entries = [["exam-introduction", "Examinations introduction"], ["exam-assessment", "Practice assessment"]];
  else if (path === "/training/cpd") entries = [["cpd-introduction", "CPD introduction"], ["cpd-seminars", "Monthly seminars"], ["cpd-videos", "Seminar recordings"]];
  else if (path.startsWith("/training/")) entries = [["programme-overview", "Programme overview and registration"]];
  else if (path === "/membership") entries = [["membership-pathways", "Membership pathways"], ["membership-register", "Membership register"]];
  else if (path === "/membership/fees") entries = [["membership-fees", "Membership fees"], ["membership-payment", "Payment information"]];
  else if (path === "/membership/benefits") entries = [["benefits-introduction", "Why join IoD-Gh"], ["benefit-stories", "Membership benefit stories"], ["membership-documents", "Membership documents"]];
  else if (path === "/membership/members-in-good-standing") entries = [["member-directory", "Current member directory"], ["previous-register", "Previous year's register"]];
  else if (path.startsWith("/membership/") && path !== "/membership/apply") entries = [["membership-details", "Membership details / verification"]];
  else if (path === "/knowledge") entries = [["knowledge-insight", "Knowledge and insight listing"]];
  else if (["/knowledge/research", "/knowledge/reports", "/knowledge/resources"].includes(path)) entries = [["documents", "Document library"], ...(path === "/knowledge/resources" ? [["resources-explore", "Explore more insight"] as [string, string]] : [])];
  else if (path.startsWith("/knowledge/")) entries = [["knowledge-articles", "Articles and publications"]];
  else if (path === "/events") entries = [["events-list", "Upcoming events"]];
  else if (path === "/news") entries = [["news-list", "News articles"]];
  else if (path === "/media/event-gallery") entries = [["event-gallery", "Event gallery photos"]];
  else if (["/privacy", "/terms"].includes(path)) entries = [["policy-content", "Policy text and links"]];
  else if (path === "/contact") entries = [["contact-form", "Contact information and enquiry form"]];
  return definitions([["hero", "Page hero / introduction"], ...entries, ["body", "Additional page content"]]);
}
