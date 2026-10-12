import { cmsMetadata } from "@/lib/api/cms-server";

// Child route parameters are available here, not in the parent layout.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return cmsMetadata("/membership/" + slug);
}
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
