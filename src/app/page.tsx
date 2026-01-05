import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import HomeLanding from "@/components/home/HomeLanding";

export default async function Home() {
  const session = await getSession();

  // If logged in, redirect to dashboard
  if (session?.user) {
    redirect("/dashboard");
  }

  // Landing page for non-authenticated users
  return <HomeLanding />;
}
