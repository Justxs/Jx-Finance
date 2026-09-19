import { HttpHandler, HttpResponse, delay } from "msw";
import type { HttpResponseResolver } from "msw";
import type { ProblemDetails } from "@/api/generated/model";
import { notFoundProblem } from "@/storybook/fixtures";

export type Body = Record<string, unknown>;

const PROBLEM_HEADERS = { "Content-Type": "application/problem+json" };

export async function readBody(request: Request): Promise<Body> {
  try {
    const body: unknown = await request.clone().json();
    return typeof body === "object" && body !== null ? (body as Body) : {};
  } catch {
    return {};
  }
}

export function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function problem(body: ProblemDetails, status: number) {
  return HttpResponse.json(body, { status, headers: PROBLEM_HEADERS });
}

export function notFound() {
  return problem(notFoundProblem, 404);
}

export function found<T>(item: T | undefined): T {
  if (item === undefined) {
    throw notFound();
  }
  return item;
}

export function failWith(body: ProblemDetails, status: number) {
  return function fail(): never {
    throw problem(body, status);
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

export function onRouteOf(handler: HttpHandler, resolver: HttpResponseResolver): HttpHandler {
  return new HttpHandler(handler.info.method, handler.info.path, resolver);
}
