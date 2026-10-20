import { cmsMetadata } from "@/lib/api/cms-server";

export function generateMetadata() { return cmsMetadata("/member-spotlight"); }

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
