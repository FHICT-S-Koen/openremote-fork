import { OrJSONForms } from "@openremote/or-json-forms";

import { test, expect } from "@openremote/test";

test("or-json-forms", async ({ mount }) => {
  const component = await mount(OrJSONForms, {
    props: {},
  });

  await expect(component).toContainText("test");
});
