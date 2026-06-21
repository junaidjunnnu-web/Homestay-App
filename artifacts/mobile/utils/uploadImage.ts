import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "homestay_token";

export async function uploadImage(imageUri: string): Promise<string> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const baseUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

  const filename = imageUri.split("/").pop() || "photo.jpg";
  const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
  const mimeType = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";

  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    name: filename,
    type: mimeType,
  } as any);

  const response = await fetch(`${baseUrl}/api/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Upload failed: ${text}`);
  }

  const result = await response.json();
  return `${baseUrl}${result.path}`;
}
