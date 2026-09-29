type BrowserOutcome = "created" | "cancelled" | "alreadyRegistered";

class FakePublicKeyCredential {
  static parseCreationOptionsFromJSON(options: unknown) {
    return options;
  }

  static parseRequestOptionsFromJSON(options: unknown) {
    return options;
  }

  toJSON() {
    return { id: "c3RvcnktY3JlZGVudGlhbA", type: "public-key", response: {} };
  }
}

function answer(outcome: BrowserOutcome) {
  if (outcome === "cancelled") {
    return Promise.reject(
      new DOMException("The operation either timed out or was not allowed.", "NotAllowedError"),
    );
  }
  if (outcome === "alreadyRegistered") {
    return Promise.reject(
      new DOMException("The authenticator was previously registered.", "InvalidStateError"),
    );
  }
  return Promise.resolve(new FakePublicKeyCredential());
}

function override(target: object, key: string, value: unknown) {
  const original = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, { value, configurable: true, writable: true });
  return function restore() {
    if (original) {
      Object.defineProperty(target, key, original);
    } else {
      Reflect.deleteProperty(target, key);
    }
  };
}

function install(values: { secure: boolean; credential: unknown; credentials: unknown }) {
  const restores = [
    override(globalThis, "isSecureContext", values.secure),
    override(globalThis, "PublicKeyCredential", values.credential),
    override(navigator, "credentials", values.credentials),
  ];
  return function restoreAll() {
    for (const restore of restores.toReversed()) {
      restore();
    }
  };
}

export function fakePasskeyBrowser(outcome: BrowserOutcome = "created") {
  return function beforeEach() {
    return install({
      secure: true,
      credential: FakePublicKeyCredential,
      credentials: { create: () => answer(outcome), get: () => answer(outcome) },
    });
  };
}

export function browserWithoutPasskeys() {
  return install({ secure: true, credential: undefined, credentials: undefined });
}
