import { CmsImage } from "@/components/cms/CmsImage";
import { copy, linkUrl, RichContent } from "@/components/cms/ContentRenderer";
import { brandText } from "@/components/ui/BrandText";
import type { CmsSection } from "@/lib/api/cms";

export function HomeTestimonial({ section }: { section: CmsSection }) {
  const data = section.data;
  const quote = copy(data, "copy", "text", "description", "summary");
  if (!quote.trim()) return null;
  const heading = copy(data, "heading", "title", "label") || "Testimonials";
  const attribution = copy(data, "attribution");
  const [name, ...details] = attribution.split(",");
  const role = details.join(",").trim();
  const photo = linkUrl(section.primary_media?.file_url || copy(data, "image_url"));
  const href = linkUrl(copy(data, "button_href"));

  return (
    <section aria-label={heading} className="home-testimonial">
      <div aria-hidden="true" className="home-testimonial-art"><i /><i /><i /><i /></div>
      <figure>
        <span aria-hidden="true" className="home-testimonial-mark">“</span>
        <blockquote><RichContent value={quote} /></blockquote>
        {(name || photo) && <figcaption>
          {photo && <CmsImage src={photo} alt={section.primary_media?.alt_text || copy(data, "alt_text")} width={56} height={56} className="h-14 w-14 rounded-full object-cover" />}
          <div><strong>{brandText(name.trim())}</strong>{role && <div>{brandText(role)}</div>}</div>
        </figcaption>}
        {href && <a href={href} className="link-arrow mt-5">{brandText(copy(data, "button_label") || "Learn more")}</a>}
      </figure>
    </section>
  );
}
