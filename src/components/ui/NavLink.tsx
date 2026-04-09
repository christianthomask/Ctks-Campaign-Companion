"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`px-3 py-3 text-sm font-medium transition-colors ${
        isActive
          ? "text-amber-400 border-b-2 border-amber-400"
          : "text-gray-400 hover:text-amber-400"
      }`}
    >
      {children}
    </Link>
  );
}
