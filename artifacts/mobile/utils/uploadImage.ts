import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const TOKEN_KEY = "homestay_token";

export async function uploadImage(imageUri: string): Promise<string> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  // Use the same base URL as the app configuration
  const baseUrl = process.env.EXPO_PUBLIC_API_URL 
    ? process.env.EXPO_PUBLIC_API_URL.replace('/api', '')
    : "https://homestay-booking--junaid001.replit.app";

  const rawFilename = imageUri.split("/").pop()?.split("?")[0] || "photo.jpg";
  const ext = rawFilename.includes(".") ? (rawFilename.split(".").pop()?.toLowerCase() ?? "jpg") : "jpg";
  const mimeType = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";
  const safeFilename = `photo.${ext}`;

  const formData = new FormData();

  if (Platform.OS === "web" || imageUri.startsWith("blob:") || imageUri.startsWith("data:")) {
    // Web: fetch the blob/data URI and create a proper File object
    const blobResponse = await fetch(imageUri);
    const blob = await blobResponse.blob();
    const file = new File([blob], safeFilename, { type: blob.type || mimeType });
    formData.append("file", file);
  } else {
    // Native (iOS/Android): React Native FormData style
    formData.append("file", {
      uri: imageUri,
      name: safeFilename,
      type: mimeType,
    } as any);
  }

  const response = await fetch(`${baseUrl}/api/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Upload failed (${response.status}): ${text}`);
  }

  const result = await response.json();
  
  // Handle both url and path formats from API
  if (result.url) {
    // If API returns full URL, use it directly
    if (result.url.startsWith('http')) {
      return result.url;
    }
    // If relative URL, prepend baseUrl
    return `${baseUrl}${result.url}`;
  }
  
  // Fallback to path format
  return `${baseUrl}${result.path}`;
}
