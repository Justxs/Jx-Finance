import { Blob as NodeBlob, File as NodeFile } from "node:buffer";

async function nodeFormData() {
  const form = await new Response(new URLSearchParams()).formData();
  return form.constructor;
}

function nodeRequest() {
  const parent: unknown = Object.getPrototypeOf(Request);
  return typeof parent === "function" && parent.name === "Request" ? parent : Request;
}

export async function installNodeFormData() {
  Object.assign(globalThis, {
    Blob: NodeBlob,
    File: NodeFile,
    FormData: await nodeFormData(),
    Request: nodeRequest(),
  });
}

export function installScrollStub() {
  Object.assign(globalThis, { scrollTo() {} });
}
