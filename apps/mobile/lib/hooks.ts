import { ImageURISource } from "react-native";
import { useQuery } from "@tanstack/react-query";

import useAppSettings from "./settings";
import { buildApiHeaders } from "./utils";

export function useAssetUrl(assetId: string): ImageURISource {
  const { settings } = useAppSettings();
  return {
    uri: `${settings.address}/api/assets/${assetId}`,
    headers: buildApiHeaders(settings.apiKey, settings.customHeaders),
  };
}

export function useServerVersion() {
  const { settings } = useAppSettings();

  return useQuery({
    queryKey: ["serverVersion", settings.address],
    queryFn: async () => {
      const response = await fetch(`${settings.address}/api/version`, {
        headers: buildApiHeaders(settings.apiKey, settings.customHeaders),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch server version: ${response.status}`);
      }

      const data = await response.json();
      return data.version as string;
    },
    enabled: !!settings.address,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

export interface ClientConfig {
  subscriptionsEnabled: boolean;
  inferenceEnabled: boolean;
  serverVersion: string;
}

export function useClientConfig() {
  const { settings } = useAppSettings();

  return useQuery({
    queryKey: ["clientConfig", settings.address],
    queryFn: async (): Promise<ClientConfig> => {
      const response = await fetch(`${settings.address}/api/clientConfig`, {
        headers: buildApiHeaders(settings.apiKey, settings.customHeaders),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch client config: ${response.status}`);
      }

      return response.json();
    },
    enabled: !!settings.address,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}
