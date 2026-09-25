import { HttpHandler, HttpResponse, delay } from "msw";
import type { HttpResponseResolver } from "msw";
import { z } from "zod";
import { Currency, type ProblemDetails, type Scope } from "@/api/generated/model";
import { notFoundProblem } from "@/storybook/fixtures";

export type Body = Record<string, unknown>;

const PROBLEM_HEADERS = { "Content-Type": "application/problem+json" };

export const currencyCode = z.enum(Currency);

function isBody(value: unknown): value is Body {
  return typeof value === "object" && value !== null;
}

export async function readBody(request: Request): Promise<Body> {
  try {
    const body: unknown = await request.clone().json();
    return isBody(body) ? body : {};
  } catch {
    return {};
  }
}

export function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function problem(body: ProblemDetails) {
  return HttpResponse.json(body, { status: body.status, headers: PROBLEM_HEADERS });
}

export function notFound() {
  return problem(notFoundProblem);
}

export function found<T>(item: T | undefined): T {
  if (item === undefined) {
    throw notFound();
  }
  return item;
}

export function failWith(body: ProblemDetails) {
  return function fail(): never {
    throw problem(body);
  };
}

export function failWithStatus(status: number) {
  return function fail(): never {
    throw new HttpResponse(null, { status });
  };
}

export async function pending(): Promise<never> {
  await delay("infinite");
  throw new HttpResponse(null, { status: 204 });
}

export function withScope<T extends { householdId?: string | null }>(
  merged: T,
): T & { scope: Scope } {
  return { ...merged, scope: merged.householdId ? "shared" : "personal" };
}

export function onRouteOf(handler: HttpHandler, resolver: HttpResponseResolver): HttpHandler {
  return new HttpHandler(handler.info.method, handler.info.path, resolver);
}
