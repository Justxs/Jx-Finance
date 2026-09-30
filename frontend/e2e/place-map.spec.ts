import { createAccount, expect, setFeature, test, today, unique } from "./support";

test("the map of spending by place draws from the tile file without leaving the origin", async ({
  page,
  baseURL,
}) => {
  const origin = new URL(baseURL ?? "http://localhost:8089").origin;
  const requested: string[] = [];
  page.on("request", (request) => requested.push(request.url()));
  const place = unique("E2E bakery");

  try {
    await setFeature(page.request, "locations", true);
    const accountId = await createAccount(page.request, unique("Map account"));
    const recorded = await page.request.post("/api/transactions", {
      data: {
        accountId,
        type: "expense",
        amount: "4.20",
        date: today(),
        description: "Bread",
        place,
        latitude: 54.68705,
        longitude: 25.27961,
      },
    });
    expect(recorded.status(), await recorded.text()).toBe(201);

    const tiles = page.waitForResponse(
      (response) => response.url().endsWith("/maps/lithuania.pmtiles") && response.status() === 206,
    );
    await page.goto("/reports");
    await page.getByRole("radio", { name: "Map" }).click();

    await expect(
      page.getByRole("img", { name: new RegExp(`^Map of spending by place: .*${place}`, "u") }),
    ).toBeVisible();
    await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();
    await tiles;

    const foreign = requested.filter((url) => {
      const parsed = new URL(url);
      return parsed.protocol.startsWith("http") && parsed.origin !== origin;
    });
    expect(foreign).toEqual([]);
  } finally {
    await setFeature(page.request, "locations", false);
  }
});
