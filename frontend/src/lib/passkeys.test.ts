import { describe, expect, it, vi } from "vitest";
import { createPasskey, getPasskey, passkeysSupported } from "./passkeys";

class FakePublicKeyCredential {
  static parseCreationOptionsFromJSON(options: unknown) {
    return { parsed: options };
  }

  static parseRequestOptionsFromJSON(options: unknown) {
    return { parsed: options };
  }

  toJSON() {
    return { id: "abc", type: "public-key" };
  }
}

function fakeBrowser(outcome: () => Promise<unknown>) {
  const create = vi.fn(outcome);
  const get = vi.fn(outcome);
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("PublicKeyCredential", FakePublicKeyCredential);
  vi.stubGlobal("navigator", { credentials: { create, get } });
  return { create, get };
}

describe("passkeys", () => {
  it("is supported only in a secure context with the JSON helpers", () => {
    fakeBrowser(() => Promise.resolve(new FakePublicKeyCredential()));
    expect(passkeysSupported()).toBe(true);

    vi.stubGlobal("isSecureContext", false);
    expect(passkeysSupported()).toBe(false);

    vi.stubGlobal("isSecureContext", true);
    vi.stubGlobal("PublicKeyCredential", { parseCreationOptionsFromJSON: "missing" });
    expect(passkeysSupported()).toBe(false);

    vi.stubGlobal("PublicKeyCredential", undefined);
    expect(passkeysSupported()).toBe(false);
  });

  it("parses the server options and returns the credential as JSON text", async () => {
    const { create, get } = fakeBrowser(() => Promise.resolve(new FakePublicKeyCredential()));

    const created = await createPasskey('{"challenge":"c1"}');
    const asserted = await getPasskey('{"challenge":"c2"}');

    expect(create).toHaveBeenCalledWith({ publicKey: { parsed: { challenge: "c1" } } });
    expect(get).toHaveBeenCalledWith({ publicKey: { parsed: { challenge: "c2" } } });
    expect(created).toEqual({ ok: true, credentialJson: '{"id":"abc","type":"public-key"}' });
    expect(asserted).toEqual(created);
  });

  it.each([
    ["NotAllowedError", "cancelled"],
    ["AbortError", "cancelled"],
    ["InvalidStateError", "alreadyRegistered"],
    ["SecurityError", "failed"],
  ])("maps %s to %s", async (name, reason) => {
    fakeBrowser(() => Promise.reject(new DOMException("browser said no", name)));

    await expect(createPasskey("{}")).resolves.toEqual({ ok: false, reason });
  });

  it("treats a missing credential or an unexpected error as a failure", async () => {
    fakeBrowser(() => Promise.resolve(null));
    await expect(getPasskey("{}")).resolves.toEqual({ ok: false, reason: "failed" });

    fakeBrowser(() => Promise.reject(new TypeError("broken")));
    await expect(getPasskey("{}")).resolves.toEqual({ ok: false, reason: "failed" });
  });
});
