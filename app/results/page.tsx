import { redirect } from "next/navigation";

export default function ResultsPage() {
  // X03 will supply session state; no result exists in the foundation release.
  redirect("/");
}
