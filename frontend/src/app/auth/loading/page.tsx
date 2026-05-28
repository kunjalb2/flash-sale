import { redirect } from "next/navigation";

export default function AuthLoadingPage() {
  redirect("/auth/login");
}
