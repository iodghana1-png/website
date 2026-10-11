// Render the real TSX components with React's server renderer. This small loader
// uses the existing TypeScript dependency and keeps the app's path aliases intact.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { runInThisContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = process.cwd();
const cache = new Map();
function load(source) {
  const filename = [source, source + ".tsx", source + ".ts"].find(existsSync);
  assert.ok(filename, `Missing test module ${source}`);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loadedModule = { exports: {} };
  cache.set(filename, loadedModule);
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  // This isolated server-rendering harness can load server-only page modules.
  const dependency = (specifier) => specifier === "server-only" ? {} : specifier.startsWith("@/") ? load(path.join(root, "src", specifier.slice(2))) : specifier.startsWith(".") ? load(path.resolve(path.dirname(filename), specifier)) : createRequire(filename)(specifier);
  runInThisContext(`(function(require,module,exports){${compiled}\n})`, { filename })(dependency, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
const { CmsPageContext } = load(path.join(root, "src/components/cms/PageContext"));
const { CmsPageText } = load(path.join(root, "src/components/content/useCmsContent"));
const { ArticlePage } = load(path.join(root, "src/components/cms/ArticlePage"));
const { HomepageContent } = load(path.join(root, "src/components/content/HomepageContent"));
const { PartnerLogos } = load(path.join(root, "src/components/content/PartnerLogos"));
const { default: MembershipDetail } = load(path.join(root, "src/app/membership/[slug]/page"));
const { default: EventsPage } = load(path.join(root, "src/app/events/page"));
const revision = {
  title: "Updated member register", eyebrow: "Current membership", summary: "The saved register introduction",
  body: "", sections: [{ slot: "hero_image", data: { image_url: "/images/updated-hero.png" }, is_enabled: true }],
};

const { BuiltInSection } = load(path.join(root, "src/components/cms/BuiltInSection"));
const { BuiltInSections } = load(path.join(root, "src/components/admin/cms/BuiltInSections"));
const { PageContent, SectionRenderer } = load(path.join(root, "src/components/cms/ContentRenderer"));
const { CmsRevisionRenderer } = load(path.join(root, "src/components/cms/CmsPublishedRoute"));
const { setSectionState, sectionState, replaceSectionGroup } = load(path.join(root, "src/lib/cms/sectionVisibility"));
const { builtInSections, nativeSectionTypes } = load(path.join(root, "src/lib/cms/builtInSections"));
const cmsRender = (element, sections, slug = "example") => renderToStaticMarkup(React.createElement(CmsPageContext.Provider, { value: { slug, revision: { ...revision, sections } } }, element));

test("CMS visibility hides and removes complete sections, and restores their content", () => {
  const element = React.createElement(BuiltInSection, { sectionId: "example", className: "background-and-spacing" }, "Saved section content");
  const initial = [...revision.sections];
  for (const state of ["hidden", "removed"]) {
    const sections = setSectionState(initial, "example", state);
    assert.equal(cmsRender(element, sections), "");
    assert.equal(sectionState({ sections }, "example"), state);
    const restored = setSectionState(sections, "example");
    assert.match(cmsRender(element, restored), /Saved section content/);
    assert.equal(restored.length, initial.length + 1);
    assert.strictEqual(restored[0], initial[0]);
  }
  assert.equal(initial.length, 1, "Visibility edits must not mutate the source draft");
});

test("CMS editor offers visibility controls and restores removed built-in sections", () => {
  const html = renderToStaticMarkup(React.createElement(BuiltInSections, {
    path: "/services", sections: setSectionState([], "services-process", "removed"), onChange() {},
  }));
  for (const text of ["Built-in page sections", "Our perspective", "What we offer", "What to expect", "Show section", "Remove section", "Restore section", "(removed)"]) assert.ok(html.includes(text), `Missing control: ${text}`);
});

test("CMS group edits never duplicate countdowns or galleries, and preserve unrelated sections", () => {
  const [hero, first, middle, second, layout] = ["hero", "first", "middle", "second", "layout"].map((id) => ({ id }));
  const all = [hero, first, middle, second, layout];
  const edited = { id: "edited" };
  assert.deepEqual(replaceSectionGroup(all, [first, second], [second]), [hero, second, middle, layout]);
  assert.deepEqual(replaceSectionGroup(all, [first, second], [first, edited]), [hero, first, middle, edited, layout]);
  assert.deepEqual(replaceSectionGroup(all, [first, second], []), [hero, middle, layout]);
  assert.deepEqual(replaceSectionGroup(all, [first, second], [first, second, edited]), [hero, first, middle, second, edited, layout]);
  assert.deepEqual(replaceSectionGroup(all, [], [edited]), [...all, edited]);
  assert.equal(all.length, 5);
});

test("CMS generic rendering hides hero and body and never renders layout metadata", () => {
  let sections = setSectionState([], "hero", "hidden");
  sections = setSectionState(sections, "body", "removed");
  const html = renderToStaticMarkup(React.createElement(PageContent, { revision: { ...revision, body: "Saved body", sections } }));
  assert.equal(html, "");
  const restored = setSectionState(setSectionState(sections, "hero"), "body");
  assert.match(renderToStaticMarkup(React.createElement(PageContent, { revision: { ...revision, body: "Saved body", sections: restored } })), /Saved body/);
  assert.equal(renderToStaticMarkup(React.createElement(SectionRenderer, { section: { slot: "main", section_type: "rich_text", is_enabled: false, data: { heading: "Hidden" } } })), "");
});

test("CMS custom native sections do not leave headings, placeholders or fallback assessments when removed", () => {
  const cases = [
    ["training/CpdMonthlySeminars", "CpdMonthlySeminars", "seminar_list", "training-cpd"],
    ["training/CpdVideoLibrary", "CpdVideoLibrary", "video_list", "training-cpd"],
    ["training/ExamAssessmentPreview", "ExamAssessmentPreview", "exam_assessment", "training-exams"],
    ["about/SecretariatGrid", "SecretariatGrid", "profile_gallery", "about-secretariat"],
    ["knowledge/ResourcesDocuments", "ReportsDocuments", "document_list", "knowledge-reports"],
  ];
  for (const [file, name, type, slug] of cases) {
    const Component = load(path.join(root, "src/components", file))[name];
    for (const sections of [[], [{ slot: "main", section_type: type, position: 0, data: {}, is_enabled: false }]]) {
      assert.equal(cmsRender(React.createElement(Component), sections, slug), "", `${name} should disappear`);
    }
    const sections = [{ slot: "main", section_type: type, position: 0, data: {}, is_enabled: true }];
    assert.match(cmsRender(React.createElement(Component), sections, slug), /<section/, `${name} should remain when enabled`);
  }
});

test("CMS native document and gallery data is not rendered a second time below the page", () => {
  for (const path of ["/knowledge/reports", "/media/event-gallery", "/training/exams"]) {
    const section_type = nativeSectionTypes(path)[0];
    const html = renderToStaticMarkup(React.createElement(PageContent, { sectionsOnly: true, omitSectionTypes: nativeSectionTypes(path), revision: { ...revision, sections: [{ slot: "main", section_type, data: { heading: "Duplicate heading" }, is_enabled: true }] } }));
    assert.equal(html, "");
  }
});

test("CMS actual static pages honor every registered built-in section control", async () => {
  const routes = [
    ["/services", "services/page"], ["/about", "about/page"], ["/events", "events/page"],
    ["/training", "training/page"], ["/membership", "membership/page"], ["/news", "news/page"],
    ["/knowledge", "knowledge/page"], ["/contact", "contact/page"],
    ["/about/council", "about/[slug]/page", "council"],
    ["/about/secretariat", "about/[slug]/page", "secretariat"],
    ["/about/partners", "about/[slug]/page", "partners"],
    ["/about/history", "about/[slug]/page", "history"],
    ["/membership/fees", "membership/[slug]/page", "fees"],
    ["/membership/members-in-good-standing", "membership/[slug]/page", "members-in-good-standing"],
    ["/membership/categories", "membership/[slug]/page", "categories"],
    ["/training/professional", "training/[slug]/page", "professional"],
    ["/training/cpd", "training/[slug]/page", "cpd"],
    ["/media/event-gallery", "media/event-gallery/page"],
    ["/services/board-evaluation", "services/[slug]/page", "board-evaluation"],
  ];
  for (const [route, file, slug] of routes) {
    const Component = load(path.join(root, "src/app", file)).default;
    const element = slug ? await Component({ params: Promise.resolve({ slug }) }) : React.createElement(Component);
    const hidden = builtInSections(route).reduce((sections, { key }) => setSectionState(sections, key, "hidden"), []);
    assert.equal(cmsRender(element, hidden), "", `All built-in sections should be hidden on ${route}`);
  }
});

test("CMS empty homepage remains empty after the last section is removed", () => {
  const html = renderToStaticMarkup(React.createElement(CmsRevisionRenderer, { templateKey: "home", revision: { ...revision, sections: [] } }));
  assert.equal(html, "<main></main>");
});

test("Existing Examinations navigation launches the separate app without duplication", async () => {
  const { navigation } = load(path.join(root, "src/data/navigation"));
  const { examinationPortalUrl, examinationHref } = load(path.join(root, "src/lib/examinationPortal"));
  const links = navigation.flatMap((item) => item.children || []);
  assert.equal(links.filter((item) => item.href === examinationPortalUrl).length, 1);
  assert.equal(examinationHref("/training/exams"), examinationPortalUrl);
  assert.equal(examinationHref("/training/cpd"), "/training/cpd");
  const { default: TrainingDetail } = load(path.join(root, "src/app/training/[slug]/page"));
  await assert.rejects(TrainingDetail({ params: Promise.resolve({ slug: "exams" }) }), (error) => error.digest?.includes(examinationPortalUrl));
});

test("Members in Good Standing renders CMS hero fields and selected image", async () => {
  const page = await MembershipDetail({ params: Promise.resolve({ slug: "members-in-good-standing" }) });
  const html = renderToStaticMarkup(React.createElement(CmsPageContext.Provider, { value: { slug: "membership-members-in-good-standing", revision } }, page));
  assert.match(html, /<h1[^>]*>Updated member register<\/h1>/);
  assert.match(html, /Current membership/);
  assert.match(html, /The saved register introduction/);
  assert.match(html, /src="\/images\/updated-hero.png"/);
  assert.doesNotMatch(html, /A public register for recognising/);
});

test("Clearing a CMS description does not resurrect fallback text", () => {
  const html = renderToStaticMarkup(React.createElement(CmsPageContext.Provider, { value: { slug: "example", revision: { ...revision, summary: "" } } }, React.createElement(CmsPageText, { slug: "example", field: "summary", fallback: "Old description" })));
  assert.equal(html, "");
});

test("Public articles and previews render byline, category, date, image, caption and content", () => {
  const html = renderToStaticMarkup(React.createElement(ArticlePage, { article: {
    content_type: "news", author_display_name: "Ama Example", category: { name: "Governance" }, published_at: "2026-10-03T12:00:00Z",
    revision: { title: "Edited article title", standfirst: "Edited excerpt", body: "Edited article body", cover_media: { file_url: "/images/test-news.png", alt_text: "Directors at the forum", caption: "The annual forum", credit: "IoD-Gh" } },
  } }));
  for (const value of ["Ama Example", "Governance", "3 October 2026", "Edited article title", "Edited excerpt", "Edited article body", "Directors at the forum", "The annual forum", "IoD-Gh"]) assert.ok(html.includes(value), `Missing ${value}`);
  assert.ok(html.indexOf("test-news.png", html.indexOf("<figure")) < html.indexOf("Edited article body"));
});

test("Homepage partner groups render the shared partner collection in saved order", () => {
  const { PartnerGroupSlider, partnerPageEntries } = load(path.join(root, "src/components/content/PartnerLogos"));
  const page = { revision: {
    sections: [{ slot: "main", section_type: "partner_logos", is_enabled: true, position: 0, data: {
      heading: "Corporate partners", items: [
        { id: "one", title: "First partner", image_url: "/images/partner-one.png", href: "https://partner.example" },
        { id: "two", title: "Second partner", image_url: "/images/partner-two.png", href: "" },
        { id: "empty", title: "Not uploaded yet", image_url: "", href: "" },
      ],
    } }],
  } };
  const partners = partnerPageEntries(page).filter((item) => item.image_url);
  const html = renderToStaticMarkup(React.createElement(PartnerGroupSlider, { groups: [{ title: "Corporate partners", partners }], fallbackHref: "" }));
  assert.match(html, /alt="First partner"/);
  assert.match(html, /alt="Second partner"/);
  assert.match(html, /href="https:\/\/partner.example"/);
  assert.match(html, /object-contain/);
  assert.ok(html.indexOf('alt="First partner"') < html.indexOf('alt="Second partner"'));
  assert.doesNotMatch(html, /Not uploaded yet|href="\/"/);
});

test("Partner logos omit missing or unsafe images and do not invent placeholders", () => {
  assert.equal(renderToStaticMarkup(React.createElement(PartnerLogos, { items: [] })), "");
  assert.equal(renderToStaticMarkup(React.createElement(PartnerLogos, { items: [{ id: "bad", title: "Invalid", image_url: "javascript:alert(1)", href: "", metadata: {} }] })), "");
});

test("Homepage upcoming events label and heading link to the Events page", () => {
  for (const props of [{}, { revision: { sections: [{
    slot: "main", section_type: "card_grid", is_enabled: true, position: 0,
    data: { home_section: "training", eyebrow: "Upcoming events", heading: "Meet our directors", button_label: "Explore all events", button_href: "/events" },
  }] } }]) {
    const html = renderToStaticMarkup(React.createElement(HomepageContent, props));
    assert.match(html, /<a[^>]*href="\/events"[^>]*>Upcoming events<\/a>/);
    assert.match(html, /<h2[^>]*><a[^>]*href="\/events"[^>]*>(?:Develop your directorship\.|Meet our directors)<\/a><\/h2>/);
    assert.match(html, /<a[^>]*href="\/events"[^>]*>Explore all events /);
    assert.match(html, /href="\/events\/[^"/]+"[^>]*>View event /);
  }
});

test("Events page and homepage source use the same editable event cards", () => {
  const { eventCardsFromRevision } = load(path.join(root, "src/lib/cms/events"));
  const sections = [
    { slot: "page_copy", data: { fields: [{ key: "coldlq", value: "Stale event title" }] } },
    { slot: "event_cards", section_type: "card_grid", is_enabled: true, position: 0, data: { items: [
      { id: "event-one", title: "Updated summit", description: "Edited event summary", href: "/events/summit", metadata: { display_meta: "5 December", detail: "Accra" } },
    ] } },
  ];
  const html = cmsRender(React.createElement(EventsPage), sections, "events-page");
  for (const text of ["Updated summit", "Edited event summary", "5 December", "Accra"]) assert.ok(html.includes(text));
  assert.doesNotMatch(html, /Stale event title|National Corporate Governance Conference/);
  assert.equal(eventCardsFromRevision({ sections })[0].title, "Updated summit");
  assert.deepEqual(eventCardsFromRevision({ sections: [] }), []);
  assert.deepEqual(eventCardsFromRevision({ sections: setSectionState(sections, "events-list", "hidden") }), []);
  assert.equal(renderToStaticMarkup(React.createElement(PageContent, { revision: { ...revision, sections }, sectionsOnly: true })), "");
});

test("Homepage feed editors direct staff to the source instead of editing unused cards", () => {
  const { Sections } = load(path.join(root, "src/components/admin/cms/Sections"));
  for (const name of ["news", "knowledge"]) {
    const html = renderToStaticMarkup(React.createElement(Sections, { canUpload: false, onChange() {}, sections: [
      { slot: "main", section_type: "card_grid", is_enabled: true, data: { home_section: name, items: [{ title: "Unused card" }] } },
    ] }));
    assert.doesNotMatch(html, /Unused card|Remove item/);
    assert.match(html, /Manage (news|document pages)/);
    assert.match(html, /Button text/);
  }
});

test("Council profiles use CMS names and biographies, including draft-only and new profiles", () => {
  const { ProfilePhotosProvider } = load(path.join(root, "src/components/about/ProfilePhotos"));
  const { CouncilProfiles } = load(path.join(root, "src/components/about/CouncilProfiles"));
  const element = React.createElement(ProfilePhotosProvider, { pageSlug: "about-council" }, React.createElement(CouncilProfiles));
  const sections = [{ section_type: "profile_gallery", is_enabled: true, data: { items: [
    { id: "new-person", title: "", metadata: { display_name: "New Council Name", role: "New role", summary: "Draft summary", biography: "Draft biography" } },
  ] } }];
  const html = cmsRender(element, sections, "about-council");
  for (const value of ["New Council Name", "New role", "Draft summary", "Draft biography"]) assert.ok(html.includes(value));
  assert.doesNotMatch(html, /Mary Asare-Yeboah/);
  assert.equal(cmsRender(element, [], "about-council"), "");
});

test("The retired vision-and-mission address redirects to the combined history page", async () => {
  const Component = load(path.join(root, "src/app/about/[slug]/page")).default;
  await assert.rejects(Component({ params: Promise.resolve({ slug: "vision-mission" }) }), (error) => error.digest?.includes("/about/history"));
});

test("CPD renders entries from every enabled seminar and recording section in saved order", () => {
  const { ImageConfigContext } = createRequire(import.meta.url)("next/dist/shared/lib/image-config-context.shared-runtime");
  const { imageConfigDefault } = createRequire(import.meta.url)("next/dist/shared/lib/image-config");
  for (const [name, section_type] of [["CpdMonthlySeminars", "seminar_list"], ["CpdVideoLibrary", "video_list"]]) {
    const Component = load(path.join(root, "src/components/training", name))[name];
    const sections = [2, 1, 3].map((position) => ({ slot: "main", section_type, position, is_enabled: position !== 3, data: { items: [
      { id: String(position), title: `CMS entry ${position}`, href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    ] } }));
    const element = React.createElement(ImageConfigContext.Provider, { value: { ...imageConfigDefault, remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" }] } }, React.createElement(Component));
    const html = cmsRender(element, sections, "training-cpd");
    assert.ok(html.includes("CMS entry 1") && html.includes("CMS entry 2"));
    assert.ok(html.indexOf("CMS entry 1") < html.indexOf("CMS entry 2"));
    assert.doesNotMatch(html, /CMS entry 3/);
    assert.equal(cmsRender(element, [], "training-cpd"), "");
  }
});

test("Privacy and Terms render saved CMS text and honor section visibility", () => {
  const defaults = JSON.parse(readFileSync(path.join(root, "backend/apps/content/migrations/data/legal_pages.json"), "utf8"));
  for (const source of defaults) {
    const Page = load(path.join(root, "src/app", source.kind, "page")).default;
    const fields = source.fields.map((field, index) => index === 0 ? { ...field, value: "Edited policy heading" } : field);
    const sections = [{ slot: "page_copy", section_type: "rich_text", is_enabled: true, data: { fields } }];
    const html = cmsRender(React.createElement(Page), sections, source.slug);
    assert.match(html, /Edited policy heading/);
    assert.match(html, /Updated member register/);
    assert.doesNotMatch(html, new RegExp(source.fields[0].value));
    const hidden = builtInSections(source.path).reduce((sections, { key }) => setSectionState(sections, key, "hidden"), sections);
    assert.equal(cmsRender(React.createElement(Page), hidden, source.slug), '<main class="bg-white"></main>');
  }
});
