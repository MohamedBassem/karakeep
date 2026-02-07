"use client";

import { useRouter } from "next/navigation";

import type { ButtonProps } from "@karakeep/shared-react/components/ui/button";
import { Button } from "@karakeep/shared-react/components/ui/button";

export function BackButton({ ...props }: ButtonProps) {
  const router = useRouter();
  return <Button {...props} onClick={() => router.back()} />;
}
