import type { CmsNavigationItem } from "@/lib/api/cms";
import { examinationHref } from "@/lib/examinationPortal";

export type HeaderLink = {
  label: string;
  href: string;
  newTab?: boolean;
  children?: Array<{ label: string; href: string; description?: string; newTab?: boolean }>;
};

export function asHeaderLinks(items: CmsNavigationItem[]): HeaderLink[] {
  const enabled = items
    .filter((item) => item.is_enabled && item.href.replace(/\/$/, "") !== "/training/customized")
    .sort((a, b) => a.position - b.position);
  return enabled.filter((item) => !item.parent_id).map((item) => ({
    label: item.label,
    href: examinationHref(item.href || "/"),
    newTab: item.open_in_new_tab,
    children: enabled.filter((child) => child.parent_id === item.id).map((child) => ({
      label: child.label,
      href: examinationHref(child.href || "/"),
      newTab: child.open_in_new_tab,
    })),
  }));
}
