import { FIXTURE_TODAY } from "./fixtures/base";

export function pinClockToFixtureToday() {
  const RealDate = Date;
  const offset = RealDate.parse(`${FIXTURE_TODAY}T12:00:00Z`) - RealDate.now();

  function now() {
    return RealDate.now() + offset;
  }

  globalThis.Date = new Proxy(RealDate, {
    construct(target, args, newTarget) {
      return Reflect.construct(target, args.length === 0 ? [now()] : args, newTarget);
    },
    apply() {
      return new RealDate(now()).toString();
    },
    get(target, key, receiver) {
      return key === "now" ? now : Reflect.get(target, key, receiver);
    },
  });
}
