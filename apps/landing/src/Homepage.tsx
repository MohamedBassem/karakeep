import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowDownNarrowWide,
  ArrowRight,
  Bookmark,
  BrainCircuit,
  CheckCheck,
  Code2,
  Github,
  Globe,
  Highlighter,
  Layers,
  Plug,
  Rocket,
  Rss,
  Search,
  Server,
  Shield,
  Sparkles,
  Star,
  SunMoon,
  TextSearch,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { Link } from "react-router";

import {
  CLOUD_SIGNUP_LINK,
  DEMO_LINK,
  DOCS_LINK,
  GITHUB_LINK,
} from "./constants";
import NavBar from "./Navbar";
import appStoreBadge from "/app-store-badge.png?url";
import chromeExtensionBadge from "/chrome-extension-badge.png?url";
import firefoxAddonBadge from "/firefox-addon.png?url";
import playStoreBadge from "/google-play-badge.webp?url";
import screenshot from "/hero.webp?url";

const platforms = [
  {
    name: "iOS",
    url: "https://apps.apple.com/us/app/karakeep-app/id6479258022",
    badge: appStoreBadge,
  },
  {
    name: "Android",
    url: "https://play.google.com/store/apps/details?id=app.hoarder.hoardermobile&pcampaignid=web_share",
    badge: playStoreBadge,
  },
  {
    name: "Chrome Extension",
    url: "https://chromewebstore.google.com/detail/karakeep/kgcjekpmcjjogibpjebkhaanilehneje",
    badge: chromeExtensionBadge,
  },
  {
    name: "Firefox Addon",
    url: "https://addons.mozilla.org/en-US/firefox/addon/karakeep/",
    badge: firefoxAddonBadge,
  },
];

const featuresList = [
  {
    icon: Bookmark,
    title: "Bookmark",
    description: "Save links, take simple notes and store images and PDFs.",
  },
  {
    icon: BrainCircuit,
    title: "AI Tagging",
    description:
      "Automatically tags your bookmarks using AI for faster retrieval.",
  },
  {
    icon: Users,
    title: "Collaborative Lists",
    description:
      "Collaborate with others on shared lists for team bookmarking.",
  },
  {
    icon: Rss,
    title: "RSS Feeds",
    description:
      "Auto-hoard content from RSS feeds to stay updated effortlessly.",
  },
  {
    icon: Workflow,
    title: "Rule Engine",
    description:
      "Customize bookmark management with powerful automation rules.",
  },
  {
    icon: Highlighter,
    title: "Highlights",
    description:
      "Mark and store highlights from your hoarded content for quick reference.",
  },
  {
    icon: Plug,
    title: "API & Webhooks",
    description: "Integrate with other services using REST API and webhooks.",
  },
  {
    icon: TextSearch,
    title: "Full Text Search",
    description: "Search through all your bookmarks using full text search.",
  },
  {
    icon: Server,
    title: "Self Hosting",
    description: "Easy self hosting with Docker for privacy and control.",
  },
  {
    icon: CheckCheck,
    title: "Bulk Actions",
    description: "Quickly manage your bookmarks with bulk actions.",
  },
  {
    icon: ArrowDownNarrowWide,
    title: "Auto Fetch",
    description:
      "Automatically fetches title, description and images for links.",
  },
  {
    icon: SunMoon,
    title: "Dark Mode",
    description: "Karakeep supports dark mode for a better reading experience.",
  },
];

const showcaseFeatures = [
  {
    badge: "AI-Powered",
    title: "Let AI organize your bookmarks",
    description:
      "Stop spending time manually tagging and categorizing. Karakeep uses AI to automatically analyze your saved content, generate relevant tags, and make everything instantly searchable. Supports OpenAI, local models via Ollama, and more.",
    features: [
      "Automatic AI tagging on every bookmark",
      "Full text search across all your content",
      "Smart suggestions based on your collection",
    ],
    icon: BrainCircuit,
    gradient: "from-purple-500 to-indigo-600",
    lightGradient: "from-purple-50 to-indigo-50",
  },
  {
    badge: "Save Everything",
    title: "More than just links",
    description:
      "Karakeep goes beyond traditional bookmarking. Save links that get automatically crawled, write quick notes, upload images and PDFs, subscribe to RSS feeds, and highlight important passages. Everything lives in one place.",
    features: [
      "Links, notes, images, and PDF support",
      "RSS feed subscriptions with auto-import",
      "Text highlights from saved content",
    ],
    icon: Layers,
    gradient: "from-rose-500 to-orange-500",
    lightGradient: "from-rose-50 to-orange-50",
  },
  {
    badge: "Self-Hosted & Open Source",
    title: "Your data, your rules",
    description:
      "Deploy Karakeep on your own infrastructure with a simple Docker setup. Your bookmarks, your server, your privacy. Fully open source with 22k+ stars on GitHub and an active community of contributors.",
    features: [
      "One-command Docker deployment",
      "Complete data ownership and privacy",
      "Active open source community",
    ],
    icon: Shield,
    gradient: "from-emerald-500 to-teal-600",
    lightGradient: "from-emerald-50 to-teal-50",
  },
];

const steps = [
  {
    step: "1",
    title: "Save",
    description:
      "Save a link, note, or image from your browser, phone, or any app using our extensions and APIs.",
    icon: Bookmark,
  },
  {
    step: "2",
    title: "Organize",
    description:
      "AI automatically tags and categorizes your content. Add to lists, create rules, and set up feeds.",
    icon: Sparkles,
  },
  {
    step: "3",
    title: "Find",
    description:
      "Instantly retrieve anything with full text search, tag filtering, or just browsing your organized collection.",
    icon: Search,
  },
];

const currentYear = new Date().getFullYear();

function Banner() {
  return (
    <div className="border-b border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 px-3 py-2 text-center sm:px-4 sm:py-3">
      <div className="container flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-slate-700 sm:gap-3 sm:text-base">
        <div className="flex flex-wrap items-center justify-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1">
          <Rocket className="size-4 text-amber-600 sm:size-5" />
          <span className="font-semibold text-slate-800">
            Karakeep Cloud Public Beta is Now Live
          </span>
        </div>
        <a
          href={CLOUD_SIGNUP_LINK}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-amber-700 underline decoration-amber-400 underline-offset-2 transition-all hover:text-amber-800 sm:rounded-full sm:border sm:border-amber-300 sm:bg-amber-500 sm:px-3 sm:py-1 sm:text-sm sm:text-white sm:no-underline sm:shadow-sm sm:hover:border-amber-400 sm:hover:bg-amber-600"
        >
          Join Now <span className="hidden sm:inline">→</span>
        </a>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <div className="mt-10 flex flex-grow flex-col items-center justify-center gap-8 px-4 sm:mt-20">
      <div className="mt-4 w-full space-y-6 text-center">
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-1.5 text-sm text-purple-700">
          <Code2 className="size-4" />
          <span className="font-medium">Open Source & Self-Hostable</span>
        </div>
        <h1 className="mx-auto max-w-4xl text-center text-4xl font-bold leading-tight tracking-tight sm:text-6xl sm:leading-tight">
          The{" "}
          <span className="bg-gradient-to-r from-purple-600 to-red-600 bg-clip-text text-transparent">
            Bookmark Everything
          </span>{" "}
          App
        </h1>
        <p className="mx-auto max-w-2xl text-center text-lg text-gray-600 sm:text-xl">
          Save links, notes, and images. Karakeep automatically tags and
          organizes them using AI so you can find anything instantly. Built for
          the data hoarders out there.
        </p>
        <a
          href={GITHUB_LINK}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
        >
          <Star className="size-4 fill-yellow-400 text-yellow-400" />
          <span className="font-semibold">22k+</span>
          <span className="text-gray-500">stars on GitHub</span>
        </a>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <a
          href={DEMO_LINK}
          target="_blank"
          className={cn(
            "flex gap-2",
            buttonVariants({ variant: "default", size: "lg" }),
          )}
          rel="noreferrer"
        >
          Try the Demo
          <ArrowRight className="size-4" />
        </a>
        <a
          href={GITHUB_LINK}
          target="_blank"
          className={cn(
            "flex gap-2",
            buttonVariants({ variant: "outline", size: "lg" }),
          )}
          rel="noreferrer"
        >
          <Github className="size-5" /> View on GitHub
        </a>
      </div>
    </div>
  );
}

function ScreenshotSection() {
  return (
    <div className="relative mx-auto mt-16 w-full max-w-6xl px-4 sm:mt-20 sm:px-6">
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-purple-100 via-pink-50 to-red-100 opacity-60 blur-2xl" />
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
        <img
          alt="Karakeep application screenshot"
          src={screenshot}
          className="w-full"
        />
      </div>
    </div>
  );
}

function SocialProof() {
  return (
    <div className="mt-20 border-y border-gray-100 bg-gray-50/50 py-12 sm:mt-28">
      <div className="container mx-auto px-4">
        <p className="mb-8 text-center text-sm font-medium uppercase tracking-wider text-gray-500">
          Trusted by thousands of users worldwide
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16">
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl font-bold text-gray-900">22k+</span>
            <span className="text-sm text-gray-500">GitHub Stars</span>
          </div>
          <div className="hidden h-8 w-px bg-gray-200 sm:block" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl font-bold text-gray-900">500+</span>
            <span className="text-sm text-gray-500">Contributors</span>
          </div>
          <div className="hidden h-8 w-px bg-gray-200 sm:block" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl font-bold text-gray-900">100%</span>
            <span className="text-sm text-gray-500">Open Source</span>
          </div>
          <div className="hidden h-8 w-px bg-gray-200 sm:block" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl font-bold text-gray-900">5</span>
            <span className="text-sm text-gray-500">Platforms</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureShowcase() {
  return (
    <div className="py-20 sm:py-28">
      <div className="container mx-auto px-4">
        <div className="mb-6 text-center">
          <span className="inline-block rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700">
            Features
          </span>
        </div>
        <h2 className="mb-4 text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Everything you need to save and organize
        </h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-lg text-gray-600">
          Karakeep combines powerful bookmarking with AI-driven organization,
          giving you a personal knowledge base that grows with you.
        </p>

        <div className="space-y-20 sm:space-y-32">
          {showcaseFeatures.map((feature, index) => (
            <div
              key={feature.title}
              className={cn(
                "flex flex-col items-center gap-10 sm:gap-16",
                index % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse",
              )}
            >
              <div className="flex-1 space-y-6">
                <span
                  className={cn(
                    "inline-block rounded-full bg-gradient-to-r px-3 py-1 text-sm font-medium text-white",
                    feature.gradient,
                  )}
                >
                  {feature.badge}
                </span>
                <h3 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                  {feature.title}
                </h3>
                <p className="text-lg leading-relaxed text-gray-600">
                  {feature.description}
                </p>
                <ul className="space-y-3">
                  {feature.features.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-1 flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r",
                          feature.gradient,
                        )}
                      >
                        <svg
                          className="size-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-1 items-center justify-center">
                <div
                  className={cn(
                    "relative flex aspect-square w-full max-w-md items-center justify-center rounded-2xl bg-gradient-to-br p-1",
                    feature.lightGradient,
                  )}
                >
                  <div className="flex size-full items-center justify-center rounded-xl border border-white/60 bg-white/80 shadow-sm">
                    <feature.icon
                      className={cn(
                        "size-24 bg-gradient-to-br bg-clip-text sm:size-32",
                        feature.gradient,
                      )}
                      strokeWidth={1}
                      style={{
                        color: "transparent",
                        stroke: `url(#gradient-${index})`,
                      }}
                    />
                    <svg width="0" height="0" className="absolute">
                      <defs>
                        <linearGradient
                          id={`gradient-${index}`}
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop
                            offset="0%"
                            stopColor={
                              index === 0
                                ? "#a855f7"
                                : index === 1
                                  ? "#f43f5e"
                                  : "#10b981"
                            }
                          />
                          <stop
                            offset="100%"
                            stopColor={
                              index === 0
                                ? "#6366f1"
                                : index === 1
                                  ? "#f97316"
                                  : "#14b8a6"
                            }
                          />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <div className="bg-gray-50 py-20 sm:py-28">
      <div className="container mx-auto px-4">
        <div className="mb-6 text-center">
          <span className="inline-block rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700">
            How It Works
          </span>
        </div>
        <h2 className="mb-4 text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Simple as 1, 2, 3
        </h2>
        <p className="mx-auto mb-16 max-w-xl text-center text-lg text-gray-600">
          Getting started with Karakeep is effortless. Save anything, let AI do
          the heavy lifting, and find it when you need it.
        </p>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-12">
          {steps.map((step) => (
            <div
              key={step.step}
              className="relative flex flex-col items-center text-center"
            >
              <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-red-600 shadow-lg shadow-purple-200">
                <step.icon className="size-8 text-white" strokeWidth={1.5} />
              </div>
              <span className="mb-1 text-sm font-semibold text-purple-600">
                Step {step.step}
              </span>
              <h3 className="mb-3 text-xl font-bold text-gray-900">
                {step.title}
              </h3>
              <p className="text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureGrid() {
  return (
    <div className="py-20 sm:py-28">
      <div className="container mx-auto px-4">
        <div className="mb-6 text-center">
          <span className="inline-block rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700">
            And Much More
          </span>
        </div>
        <h2 className="mb-4 text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Packed with features
        </h2>
        <p className="mx-auto mb-16 max-w-xl text-center text-lg text-gray-600">
          Every feature you need to manage your digital collection, all in one
          place.
        </p>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {featuresList.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-purple-100 hover:shadow-md"
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600 transition-colors group-hover:bg-purple-100">
                <feature.icon className="size-5" />
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Platforms() {
  return (
    <div className="border-t border-gray-100 bg-gray-50 py-20 sm:py-28">
      <div className="container mx-auto px-4">
        <div className="mb-6 text-center">
          <Globe className="mx-auto mb-4 size-10 text-purple-600" />
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Available Everywhere
          </h2>
          <p className="mx-auto max-w-xl text-lg text-gray-600">
            Access your bookmarks from any device with our native apps and
            browser extensions.
          </p>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 px-6">
          {platforms.map((platform) => (
            <a
              key={platform.name}
              href={platform.url}
              target="_blank"
              className="transition-transform hover:scale-105"
              rel="noreferrer"
            >
              <img
                className="h-12 w-auto rounded-md"
                alt={platform.name}
                src={platform.badge}
              />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function OpenSourceCTA() {
  return (
    <div className="py-20 sm:py-28">
      <div className="container mx-auto px-4">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 px-6 py-16 text-center shadow-xl sm:px-16">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50" />
          <div className="relative">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-gray-300">
              <Github className="size-4" />
              Open Source
            </div>
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
              Built in the open, for everyone
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-lg text-gray-400">
              Karakeep is fully open source. Contribute to the project, report
              issues, or self-host your own instance. Join our growing community
              of contributors.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <a
                href={GITHUB_LINK}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 font-medium text-gray-900 transition-colors hover:bg-gray-100"
              >
                <Github className="size-5" />
                Star on GitHub
              </a>
              <a
                href={DOCS_LINK}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 px-6 py-3 font-medium text-white transition-colors hover:bg-white/10"
              >
                Read the Docs
                <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinalCTA() {
  return (
    <div className="border-t border-gray-100 bg-gradient-to-b from-white to-purple-50/30 py-20 sm:py-28">
      <div className="container mx-auto px-4 text-center">
        <Zap className="mx-auto mb-6 size-10 text-purple-600" />
        <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Ready to organize your digital life?
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-lg text-gray-600">
          Try Karakeep for free. No credit card required. Self-host it or use
          our managed cloud service.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <a
            href={CLOUD_SIGNUP_LINK}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "flex gap-2",
              buttonVariants({ variant: "default", size: "lg" }),
            )}
          >
            Get Started Free
            <ArrowRight className="size-4" />
          </a>
          <a
            href={DEMO_LINK}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "flex gap-2",
              buttonVariants({ variant: "outline", size: "lg" }),
            )}
          >
            Try the Demo
          </a>
        </div>
        <p className="mt-6 text-sm text-gray-500">
          Or{" "}
          <a
            href={DOCS_LINK}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-purple-600 underline underline-offset-2 hover:text-purple-700"
          >
            self-host it yourself
          </a>{" "}
          — it&apos;s free and open source.
        </p>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <img
              src="/icons/karakeep-full.svg"
              alt="Karakeep"
              className="mb-4 w-32"
            />
            <p className="text-sm text-gray-500">
              The open source bookmark everything app with AI-powered
              organization.
            </p>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold text-gray-900">
              Product
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <a
                  href={DEMO_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-gray-900"
                >
                  Demo
                </a>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-gray-900">
                  Pricing
                </Link>
              </li>
              <li>
                <a
                  href={CLOUD_SIGNUP_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-gray-900"
                >
                  Cloud
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold text-gray-900">
              Resources
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <a
                  href={DOCS_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-gray-900"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href={GITHUB_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-gray-900"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href={`${GITHUB_LINK}/releases`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-gray-900"
                >
                  Changelog
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold text-gray-900">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link to="/privacy" className="hover:text-gray-900">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-8 sm:flex-row">
          <p className="text-sm text-gray-500">
            © 2024-{currentYear}{" "}
            <a
              href="https://localhostlabs.co.uk"
              target="_blank"
              rel="noreferrer"
              className="hover:text-gray-700"
            >
              Localhost Labs Ltd
            </a>
          </p>
          <div className="flex gap-4">
            <a
              href={GITHUB_LINK}
              target="_blank"
              rel="noreferrer"
              className="text-gray-400 transition-colors hover:text-gray-600"
            >
              <Github className="size-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function Homepage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Banner />
      <div className="container flex flex-col pb-10">
        <NavBar />
        <Hero />
      </div>
      <ScreenshotSection />
      <SocialProof />
      <FeatureShowcase />
      <HowItWorks />
      <FeatureGrid />
      <Platforms />
      <OpenSourceCTA />
      <FinalCTA />
      <Footer />
    </div>
  );
}
