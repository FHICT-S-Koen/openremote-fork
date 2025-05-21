import { OrTranslate } from "@openremote/or-translate";

import { test, expect } from "@openremote/test";

test("or-translate", async ({ mount, page }) => {
  await page.waitForTimeout(5000)
  const component = await mount(OrTranslate, {
    props: {
      value: "test",
    },
  });

  await expect(component).toContainText("test");
});
