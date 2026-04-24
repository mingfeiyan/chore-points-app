import { getValidAccessToken } from "./google-calendar";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  createdTime?: string;
}

export interface DriveUploadResult {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
  webViewLink?: string;
}

async function driveFetch(
  userId: string,
  path: string,
  init: RequestInit = {},
  baseUrl: string = DRIVE_API
): Promise<Response> {
  const accessToken = await getValidAccessToken(userId);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(`${baseUrl}${path}`, { ...init, headers });
}

export async function findOrCreateFolder(
  userId: string,
  folderName: string
): Promise<string> {
  const query = encodeURIComponent(
    `name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const searchRes = await driveFetch(
    userId,
    `/files?q=${query}&spaces=drive&fields=files(id,name)&pageSize=1`
  );
  if (!searchRes.ok) {
    throw new Error(`Drive search failed: ${await searchRes.text()}`);
  }
  const searchData = (await searchRes.json()) as { files: DriveFile[] };
  if (searchData.files[0]?.id) return searchData.files[0].id;

  const createRes = await driveFetch(userId, "/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  if (!createRes.ok) {
    throw new Error(`Drive folder create failed: ${await createRes.text()}`);
  }
  const folder = (await createRes.json()) as DriveFile;
  return folder.id;
}

export async function uploadFileToFolder(
  userId: string,
  folderId: string,
  filename: string,
  mimeType: string,
  body: Blob | ArrayBuffer
): Promise<DriveUploadResult> {
  // Multipart upload: one request containing both metadata and bytes.
  // Keeps things simple for small files (<5MB, matches our existing cap).
  const boundary = "gemsteps-" + Math.random().toString(36).slice(2);
  const metadata = { name: filename, parents: [folderId], mimeType };
  const bodyBytes =
    body instanceof Blob ? new Uint8Array(await body.arrayBuffer()) : new Uint8Array(body);

  const parts = [
    `--${boundary}\r\n`,
    `Content-Type: application/json; charset=UTF-8\r\n\r\n`,
    `${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\n`,
    `Content-Type: ${mimeType}\r\n\r\n`,
  ];
  const headerBytes = new TextEncoder().encode(parts.join(""));
  const footerBytes = new TextEncoder().encode(`\r\n--${boundary}--`);
  const multipart = new Uint8Array(
    headerBytes.length + bodyBytes.length + footerBytes.length
  );
  multipart.set(headerBytes, 0);
  multipart.set(bodyBytes, headerBytes.length);
  multipart.set(footerBytes, headerBytes.length + bodyBytes.length);

  const res = await driveFetch(
    userId,
    `/files?uploadType=multipart&fields=id,name,mimeType,thumbnailLink,webContentLink,webViewLink`,
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body: multipart,
    },
    DRIVE_UPLOAD_API
  );
  if (!res.ok) {
    throw new Error(`Drive upload failed: ${await res.text()}`);
  }
  return (await res.json()) as DriveUploadResult;
}

export async function getFileMetadata(
  userId: string,
  fileId: string
): Promise<DriveUploadResult> {
  const res = await driveFetch(
    userId,
    `/files/${fileId}?fields=id,name,mimeType,thumbnailLink,webContentLink,webViewLink`
  );
  if (!res.ok) {
    throw new Error(`Drive metadata failed: ${await res.text()}`);
  }
  return (await res.json()) as DriveUploadResult;
}

export async function deleteFile(userId: string, fileId: string): Promise<void> {
  const res = await driveFetch(userId, `/files/${fileId}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Drive delete failed: ${await res.text()}`);
  }
}
