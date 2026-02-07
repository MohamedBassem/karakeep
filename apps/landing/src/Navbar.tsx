import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { Link } from "react-router";

import { DEMO_LINK, DOCS_LINK, GITHUB_LINK } from "./constants";
import Logo from "/icons/karakeep-full.svg?url";

const navLinks = [
  { label: "Pricing", to: "/pricing", internal: true },
  { label: "Docs", href: DOCS_LINK },
  { label: "GitHub", href: GITHUB_LINK },
] as const;

export default function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="relative flex items-center justify-between px-3 py-4">
      <Link to="/">
        <img src={Logo} alt="Karakeep" className="w-36" />
      </Link>

      {/* Desktop navigation */}
      <div className="hidden items-center gap-8 sm:flex">
        {navLinks.map((link) =>
          "internal" in link && link.internal ? (
            <Link
              key={link.label}
              to={link.to}
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              {link.label}
            </Link>
          ) : (
            <a
              key={link.label}
              href={"href" in link ? link.href : "#"}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              {link.label}
            </a>
          ),
        )}
        <div className="flex items-center gap-3">
          <a
            href="https://cloud.karakeep.app"
            target="_blank"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "px-4",
            )}
            rel="noreferrer"
          >
            Login
          </a>
          <a
            href={DEMO_LINK}
            target="_blank"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "px-4",
            )}
            rel="noreferrer"
          >
            Try Demo
          </a>
        </div>
      </div>

      {/* Mobile menu button */}
      <button
        className="flex items-center sm:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? (
          <X className="size-6 text-gray-700" />
        ) : (
          <Menu className="size-6 text-gray-700" />
        )}
      </button>

      {/* Mobile navigation */}
      {mobileOpen && (
        <div className="absolute left-0 right-0 top-full z-50 border-b border-gray-200 bg-white px-4 pb-6 pt-2 shadow-lg sm:hidden">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) =>
              "internal" in link && link.internal ? (
                <Link
                  key={link.label}
                  to={link.to}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={"href" in link ? link.href : "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  {link.label}
                </a>
              ),
            )}
            <hr className="border-gray-100" />
            <div className="flex flex-col gap-2">
              <a
                href="https://cloud.karakeep.app"
                target="_blank"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "w-full",
                )}
                rel="noreferrer"
              >
                Login
              </a>
              <a
                href={DEMO_LINK}
                target="_blank"
                className={cn(
                  buttonVariants({ variant: "default", size: "sm" }),
                  "w-full",
                )}
                rel="noreferrer"
              >
                Try Demo
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
