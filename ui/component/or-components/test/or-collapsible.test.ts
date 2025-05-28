import { ct, expect } from "@openremote/test";

import { OrCollapsiblePanel } from "@openremote/or-components/or-collapsible-panel";

ct("Should show collapsible header and title", async ({ mount, page, components }) => {
  const component = await mount(OrCollapsiblePanel, {
    props: {},
    slots: {
      header: "<div>Header<div>", // slot="" is optional
      content: "<div>Main Content<div>",
    },
  });

  components["or-collapsible-panel"];
  // or-collapsible-panel
  // locator("or-collapsible-panel").locator("#header")
  // locator("or-collapsible-panel").locator("content")
  // await expect(component.getByText("Test")).toBeVisible();
  // await component.click();
  // const addItemBtn = component.getByRole("button", { name: "addItem" });
  // await expect(addItemBtn).toBeVisible();
  // await addItemBtn.click();
  // await expect(addItemBtn).toBeVisible();

  // await expect(component.getByRole("textbox").nth(0)).toBeVisible();

  await page.waitForTimeout(100);
});
