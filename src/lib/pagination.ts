/** Read every batch; a later failure rejects rather than publishing partial discovery data. */
export async function readAllPages<T>(read: (offset: number, size: number) => Promise<{ data: T[] | null; error: unknown }>, size = 1000): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; ) {
    const result = await read(offset, size);
    if (result.error) throw new Error("Could not load the public catalogue");
    if (!result.data) throw new Error("Public catalogue response missing");
    if (result.data.length === 0) return rows;
    rows.push(...result.data);
    offset += result.data.length;
  }
}