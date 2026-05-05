export const DRIVE_API = "https://www.googleapis.com/drive/v3/files";
export const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";

export class DriveService {
  constructor(private accessToken: string) {}

  private async fetch(url: string, options: RequestInit = {}) {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        ...options.headers,
      },
    });
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res.json();
  }

  async findFolder(name: string, parentId?: string): Promise<string | null> {
    const q = [
      `name='${name}'`,
      `mimeType='application/vnd.google-apps.folder'`,
      `trashed=false`,
      parentId ? `'${parentId}' in parents` : null
    ].filter(Boolean).join(" and ");

    const res = await this.fetch(`${DRIVE_API}?q=${encodeURIComponent(q)}&fields=files(id)`);
    return res.files?.[0]?.id || null;
  }

  async createFolder(name: string, parentId?: string): Promise<string> {
    const metadata: Record<string, unknown> = { name, mimeType: 'application/vnd.google-apps.folder' };
    if (parentId) metadata.parents = [parentId];
    
    const res = await this.fetch(DRIVE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadata)
    });
    return res.id;
  }

  async findOrCreateFolder(name: string, parentId?: string): Promise<string> {
    const id = await this.findFolder(name, parentId);
    if (id) return id;
    return this.createFolder(name, parentId);
  }

  async getAppFolderId(): Promise<string> {
    return this.findOrCreateFolder("App Foco");
  }

  async getProjectFolderId(projectName: string, appFolderId: string): Promise<string> {
    return this.findOrCreateFolder(projectName, appFolderId);
  }

  async listFilesInFolder(folderId: string) {
    const q = `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed=false`;
    const res = await this.fetch(`${DRIVE_API}?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,webViewLink,iconLink)`);
    return res.files || [];
  }

  async saveDatabase(appFolderId: string, data: unknown): Promise<void> {
    const fileName = "foco-database.json";
    const q = `name='${fileName}' and '${appFolderId}' in parents and trashed=false`;
    const searchRes = await this.fetch(`${DRIVE_API}?q=${encodeURIComponent(q)}&fields=files(id)`);
    const fileId = searchRes.files?.[0]?.id;

    const fileMetadata = { name: fileName, parents: fileId ? undefined : [appFolderId] };
    const boundary = "-------314159265358979323846";
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const multipartRequestBody =
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      JSON.stringify(fileMetadata) +
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      JSON.stringify(data) +
      close_delim;

    const endpoint = fileId 
      ? `${UPLOAD_API}/${fileId}?uploadType=multipart`
      : `${UPLOAD_API}?uploadType=multipart`;

    const res = await fetch(endpoint, {
      method: fileId ? "PATCH" : "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    });
    if (!res.ok) throw new Error(await res.text());
  }

  async loadDatabase(appFolderId: string): Promise<Record<string, unknown> | null> {
    const fileName = "foco-database.json";
    const q = `name='${fileName}' and '${appFolderId}' in parents and trashed=false`;
    const searchRes = await this.fetch(`${DRIVE_API}?q=${encodeURIComponent(q)}&fields=files(id)`);
    const fileId = searchRes.files?.[0]?.id;
    if (!fileId) return null;

    const res = await fetch(`${DRIVE_API}/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async uploadFile(file: File, folderId: string): Promise<string> {
    const metadata = { name: file.name, parents: [folderId] };
    const boundary = "-------314159265358979323846";
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const fileContent = reader.result as ArrayBuffer;
        const metadataBlob = new Blob([
          delimiter,
          'Content-Type: application/json\r\n\r\n',
          JSON.stringify(metadata),
          delimiter,
          'Content-Type: ', file.type || 'application/octet-stream', '\r\n\r\n'
        ], { type: 'text/plain' });

        const endBlob = new Blob([close_delim], { type: 'text/plain' });
        const body = new Blob([metadataBlob, fileContent, endBlob]);

        try {
          const res = await fetch(`${UPLOAD_API}?uploadType=multipart`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              "Content-Type": `multipart/related; boundary=${boundary}`
            },
            body: body
          });
          if (!res.ok) throw new Error(await res.text());
          const json = await res.json();
          resolve(json.id);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
}
