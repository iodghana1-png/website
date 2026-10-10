"use client";

import { ReactNode, useEffect, useId, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export const inputClass = "mt-2 w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2.5 text-sm font-normal";
export const buttonClass = "rounded-lg border border-[var(--color-line)] bg-white px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
export const primaryClass = buttonClass + " !border-[var(--color-ink)] !bg-[var(--color-ink)] text-white";
export function Field({ label, value, onChange, required = false, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; placeholder?: string }) {
  return <label className="block text-sm font-semibold">{label}<input className={inputClass} type={type} value={value} required={required} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></label>;
}
export function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="block text-sm font-semibold">{label}<textarea className={inputClass + " min-h-24"} value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}
export function Panel({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return <details open={open} className="rounded-xl border border-[var(--color-line)] bg-white"><summary className="cursor-pointer px-5 py-4 font-semibold">{title}</summary><div className="space-y-5 border-t border-[var(--color-line)] p-5">{children}</div></details>;
}
export function safeHref(value: string) {
  return /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(value.trim()) ? value.trim() : "";
}
export function plainHtml(value: string) {
  if (/<\/?[a-z][\s\S]*>/i.test(value)) return value;
  return value.split("\n").map((line) => "<p>" + line.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;") + "</p>").join("");
}
export function RichText({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  const [link, setLink] = useState<string | null>(null);
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, code: false, codeBlock: false, horizontalRule: false, link: { openOnClick: false } })],
    content: plainHtml(value), immediatelyRender: false,
    editorProps: { attributes: { class: "cms-rich-text min-h-36 p-4 outline-none", role: "textbox", "aria-multiline": "true", "aria-labelledby": id } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  useEffect(() => { if (editor && value !== editor.getHTML()) editor.commands.setContent(plainHtml(value), { emitUpdate: false }); }, [editor, value]);
  return <div><p id={id} className="mb-2 text-sm font-semibold">{label}</p><div className="rounded-lg border border-[var(--color-line)] bg-white"><div className="flex flex-wrap gap-1 border-b border-[var(--color-line)] bg-[var(--color-paper)] p-2" role="toolbar" aria-label={label + " formatting"}>
    {[
      ["Bold", () => editor?.chain().focus().toggleBold().run()],
      ["Italic", () => editor?.chain().focus().toggleItalic().run()],
      ["Underline", () => editor?.chain().focus().toggleUnderline().run()],
      ["Heading", () => editor?.chain().focus().toggleHeading({ level: 2 }).run()],
      ["Paragraph", () => editor?.chain().focus().setParagraph().run()],
      ["Bullets", () => editor?.chain().focus().toggleBulletList().run()],
      ["Numbered list", () => editor?.chain().focus().toggleOrderedList().run()],
      ["Link", () => setLink(editor?.getAttributes("link").href || "")],
    ].map(([name, action]) => <button className="rounded px-2 py-1 text-xs font-medium hover:bg-white" type="button" key={String(name)} onClick={action as () => void}>{String(name)}</button>)}
    </div>{link !== null && <div className="flex flex-wrap items-end gap-2 border-b p-3"><Field label="Link address" value={link} onChange={setLink} /><button type="button" className={buttonClass} disabled={!!link && !safeHref(link)} onClick={() => { if (link) editor?.chain().focus().extendMarkRange("link").setLink({ href: safeHref(link) }).run(); else editor?.chain().focus().unsetLink().run(); setLink(null); }}>Apply link</button><button type="button" className={buttonClass} onClick={() => setLink(null)}>Cancel</button></div>}<EditorContent editor={editor} /></div></div>;
}
