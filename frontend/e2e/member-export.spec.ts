import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { crc32, inflateRawSync } from "node:zlib";
import { AccountsResponse, TransactionsResponse } from "../src/api/schemas/index.zod";
import {
  createAccount,
  createTransaction,
  expect,
  readJson,
  signedInMember,
  test,
  unique,
} from "./support";

const dataEntry = "data.json";
const endOfDirectory = Buffer.from([0x50, 0x4b, 0x05, 0x06]);

function readZipEntry(zip: Buffer, name: string) {
  const end = zip.lastIndexOf(endOfDirectory);
  let offset = zip.readUInt32LE(end + 16);
  for (let index = 0; index < zip.readUInt16LE(end + 10); index += 1) {
    const nameLength = zip.readUInt16LE(offset + 28);
    if (zip.toString("utf8", offset + 46, offset + 46 + nameLength) === name) {
      const local = zip.readUInt32LE(offset + 42);
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const data = zip.subarray(start, start + zip.readUInt32LE(offset + 20));
      return zip.readUInt16LE(offset + 10) === 8 ? inflateRawSync(data) : data;
    }
    offset += 46 + nameLength + zip.readUInt16LE(offset + 30) + zip.readUInt16LE(offset + 32);
  }
  throw new Error(`${name} is not in the archive`);
}

function zipWithOneEntry(name: string, content: Buffer) {
  const fileName = Buffer.from(name, "utf8");
  const checksum = crc32(content);
  const firstDosDate = 0x21;
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(firstDosDate, 12);
  local.writeUInt32LE(checksum, 14);
  local.writeUInt32LE(content.length, 18);
  local.writeUInt32LE(content.length, 22);
  local.writeUInt16LE(fileName.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(firstDosDate, 14);
  central.writeUInt32LE(checksum, 16);
  central.writeUInt32LE(content.length, 20);
  central.writeUInt32LE(content.length, 24);
  central.writeUInt16LE(fileName.length, 28);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + fileName.length, 12);
  end.writeUInt32LE(local.length + fileName.length + content.length, 16);
  return Buffer.concat([local, fileName, content, central, fileName, end]);
}

function withNewIds(data: string) {
  const ids = new Map<string, string>();
  function renamed(id: string) {
    const known = ids.get(id);
    if (known) {
      return known;
    }
    const fresh = randomUUID();
    ids.set(id, fresh);
    return fresh;
  }
  return data.replaceAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, renamed);
}

function asUpload(buffer: Buffer) {
  return { name: "jx-finance-export.zip", mimeType: "application/zip", buffer };
}

test("a member's download is refused as already present and moves into an empty member with new ids", async ({
  page,
  browser,
}, testInfo) => {
  const accountName = unique("Export account");
  const description = unique("Export groceries");

  const { member: source } = await signedInMember(page, browser, testInfo, "export-source");
  const accountId = await createAccount(source.request, accountName);
  await createTransaction(source.request, accountId, description, "12.50");

  await source.goto("/profile?section=import");
  const downloading = source.waitForEvent("download");
  await source.getByRole("link", { name: "Download my data" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^jx-finance-export-\d{4}-\d{2}-\d{2}\.zip$/);
  const original = readFileSync(await download.path());
  const data = readZipEntry(original, dataEntry).toString("utf8");
  expect(data).toContain(description);
  await source.context().close();

  const { member: target } = await signedInMember(page, browser, testInfo, "export-target");
  await target.goto("/profile?section=import");
  const file = target.locator("#data-import-file");
  const submit = target.getByRole("button", { name: "Import my data" });

  await file.setInputFiles(asUpload(original));
  await submit.click();
  await expect(
    target.getByText("Some of these records already exist here, so nothing was imported."),
  ).toBeVisible();

  await file.setInputFiles(asUpload(zipWithOneEntry(dataEntry, Buffer.from(withNewIds(data)))));
  await submit.click();
  await expect(target.getByText(/^Imported \d+ records and 0 attached files\.$/)).toBeVisible();

  const accounts = await readJson(await target.request.get("/api/accounts"), AccountsResponse);
  expect(accounts.map((account) => account.name)).toEqual([accountName]);
  const entries = await readJson(
    await target.request.get(
      `/api/transactions?search=${encodeURIComponent(description)}&page=1&pageSize=200`,
    ),
    TransactionsResponse,
  );
  expect(entries.items.map((entry) => entry.description)).toEqual([description]);

  await target.goto(`/transactions?search=${encodeURIComponent(description)}`);
  await expect(target.getByRole("row", { name: new RegExp(description) })).toBeVisible();

  await target.context().close();
});
