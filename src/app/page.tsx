import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const role = (session.user as any).role;
  if (role === "TEACHER" || role === "SCHOOL_ADMIN") {
    redirect("/teacher");
  } else if (role === "STUDENT") {
    redirect("/student");
  } else {
    redirect("/auth/login");
  }
}
