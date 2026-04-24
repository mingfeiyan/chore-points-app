import { getValidAccessToken } from "./google-calendar";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

export type DriveErrorResponse = { status: number; body: { error: string } };

export function classifyDriveError(err: unknown): DriveErrorResponse | null {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes("accessNotConfigured") || raw.includes("SERVICE_DISABLED")) {
    return {
      status: 503,
      body: {
        error:
          "Google Drive API isn't enabled on the GemSteps Google Cloud project. Ask the app administrator to enable it.",
      },
    };
  }
  if (raw.includes("No Google account") || raw.includes("No refresh token")) {
    return {
      status: 502,
      body: {
        error: "Google Drive connection has expired. Reconnect in settings.",
      },
    };
  }
  return null;
}

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
  // Drive's `q` parameter uses backslash-escaping; escape `\` before `'`.
  const escaped = folderName.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const query = encodeURIComponent(
    `name='${escaped}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
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
  // Multipart upload keeps things simple for small files (<5MB). Build
  // the multipart envelope as a Blob so fetch can stream it without
  // copying the image bytes into a combined buffer.
  const boundary = "gemsteps-" + Math.random().toString(36).slice(2);
  const metadata = { name: filename, parents: [folderId], mimeType };
  const header =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`;
  const footer = `\r\n--${boundary}--`;
  const multipart = new Blob([header, body, footer], {
    type: `multipart/related; boundary=${boundary}`,
  });

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

export async function downloadFile(
  userId: string,
  fileId: string
): Promise<{ stream: ReadableStream; contentType: string }> {
  const res = await driveFetch(userId, `/files/${fileId}?alt=media`);
  if (!res.ok) {
    throw new Error(`Drive download failed: ${res.status} ${await res.text()}`);
  }
  return {
    stream: res.body as ReadableStream,
    contentType: res.headers.get("content-type") || "application/octet-stream",
  };
}
