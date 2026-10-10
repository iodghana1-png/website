import { SignIn } from "../components/Portal";

// Keep the base address usable even in browsers that do not preserve redirects.
// The examination dashboard remains available after a successful code check.
export default function Page() {
  return <SignIn />;
}
