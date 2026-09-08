import archiver from "archiver";

export type ZipEntry = { name: string } & ({ path: string } | { content: string });

export function buildZipBuffer(entries: ZipEntry[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    archive.on("data", (c) => chunks.push(c));
    archive.on("error", reject);
    archive.on("end", () => resolve(Buffer.concat(chunks)));

    for (const entry of entries) {
      if ("path" in entry) archive.file(entry.path, { name: entry.name });
      else archive.append(entry.content, { name: entry.name });
    }
    archive.finalize();
  });
}
