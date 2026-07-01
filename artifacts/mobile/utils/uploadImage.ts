import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getApiBaseUrl, getServerBaseUrl } from "./api";

const TOKEN_KEY = "homestay_token";

export async function uploadImage(imageUri: string): Promise<string> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const baseUrl = getServerBaseUrl();
  const apiUrl = getApiBaseUrl();

  const rawFilename = imageUri.split("/").pop()?.split("?")[0] || "photo.jpg";
  const ext = rawFilename.includes(".") ? (rawFilename.split(".").pop()?.toLowerCase() ?? "jpg") : "jpg";
  const mimeType = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";
  const safeFilename = `photo.${ext}`;

  const formData = new FormData();

  if (Platform.OS === "web" || imageUri.startsWith("blob:") || imageUri.startsWith("data:")) {
    const blobResponse = await fetch(imageUri);
    const blob = await blobResponse.blob();
    const file = new File([blob], safeFilename, { type: blob.type || mimeType });
    formData.append("file", file);
  } else {
    formData.append("file", {
      uri: imageUri,
      name: safeFilename,
      type: mimeType,
    } as any);
  }

  const response = await fetch(`${apiUrl}/upload`, {
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

  if (result.url) {
    if (result.url.startsWith("http")) {
      return result.url;
    }
    return `${baseUrl}${result.url}`;
  }

  return `${baseUrl}${result.path}`;
}
