import { redirect } from "next/navigation";

// Auth-based redirect is handled by middleware.
// This is a fallback in case the middleware is bypassed.
export default function Home() {
  redirect("/signin");
}
