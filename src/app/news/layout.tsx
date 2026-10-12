import { cmsMetadata } from "@/lib/api/cms-server";

export function generateMetadata() { return cmsMetadata("/news"); }
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
