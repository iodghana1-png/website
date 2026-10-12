import { cmsMetadata } from "@/lib/api/cms-server";

export function generateMetadata() { return cmsMetadata("/about"); }
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
