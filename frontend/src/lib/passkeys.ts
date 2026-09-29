export type PasskeyFailure = "cancelled" | "alreadyRegistered" | "failed";

export type PasskeyResult =
  | { ok: true; credentialJson: string }
  | { ok: false; reason: PasskeyFailure };

interface WebAuthnGlobals {
  isSecureContext?: boolean;
  PublicKeyCredential?: Partial<typeof PublicKeyCredential>;
  navigator?: Partial<Navigator>;
}

export function passkeysSupported(): boolean {
  const {
    isSecureContext,
    PublicKeyCredential: credential,
    navigator: browser,
  } = globalThis as WebAuthnGlobals;
  return (
    isSecureContext === true &&
    typeof credential?.parseCreationOptionsFromJSON === "function" &&
    typeof credential.parseRequestOptionsFromJSON === "function" &&
    browser?.credentials !== undefined
  );
}

export function createPasskey(optionsJson: string): Promise<PasskeyResult> {
  return runCeremony(() =>
    navigator.credentials.create({
      publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(JSON.parse(optionsJson)),
    }),
  );
}

export function getPasskey(optionsJson: string): Promise<PasskeyResult> {
  return runCeremony(() =>
    navigator.credentials.get({
      publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(JSON.parse(optionsJson)),
    }),
  );
}

async function runCeremony(ceremony: () => Promise<Credential | null>): Promise<PasskeyResult> {
  try {
    const credential = await ceremony();
    if (!(credential instanceof PublicKeyCredential)) {
      return { ok: false, reason: "failed" };
    }
    return { ok: true, credentialJson: JSON.stringify(credential.toJSON()) };
  } catch (error) {
    return { ok: false, reason: failureOf(error) };
  }
}

function failureOf(error: unknown): PasskeyFailure {
  const name = error instanceof DOMException ? error.name : null;
  if (name === "NotAllowedError" || name === "AbortError") {
    return "cancelled";
  }
  return name === "InvalidStateError" ? "alreadyRegistered" : "failed";
}
