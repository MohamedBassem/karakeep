import KarakeepLogo from "@/components/KarakeepIcon";
import SignUpForm from "@/components/signup/SignUpForm";

import { validateRedirectUrl } from "@karakeep/shared/utils/redirectUrl";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectUrl?: string }>;
}) {
  const { redirectUrl: rawRedirectUrl } = await searchParams;
  const redirectUrl = validateRedirectUrl(rawRedirectUrl) ?? "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex items-center justify-center">
          <KarakeepLogo height={80} />
        </div>
        <SignUpForm redirectUrl={redirectUrl} />
      </div>
    </div>
  );
}
