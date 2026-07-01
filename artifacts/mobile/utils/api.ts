import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "homestay_token";

/** Host root URL without /api suffix — matches _layout.tsx setBaseUrl */
export function getServerBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/api\/?$/, "");
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return `https://${process.env.EXPO_PUBLIC_DOMAIN.replace(/^https?:\/\//, "")}`;
  }

  return "https://homestay-booking--junaid001.replit.app";
}

/** Full API prefix, e.g. https://host/api */
export function getApiBaseUrl(): string {
  return `${getServerBaseUrl()}/api`;
}

export async function getAuthToken(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(TOKEN_KEY)) || "";
  } catch {
    return "";
  }
}

export function resolveAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = getServerBaseUrl();
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const url = path.startsWith("http") ? path : `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, { ...options, headers });
}
