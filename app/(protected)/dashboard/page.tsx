"use client";

import { useUser } from "@clerk/nextjs";

export default function Dashboard() {
  const { user } = useUser();

  console.log(user);

  return <div>Dashboard</div>;
}
