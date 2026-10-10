import { redirect } from "next/navigation";
// A direct portal link should always show the candidate's code-entry screen.
// The examination dashboard remains available after a successful code check.
export default function Page() { redirect("/login"); }
