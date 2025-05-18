import { test, expect } from "@openremote/test";

import { OrMwcInput } from "@openremote/or-mwc-components/or-mwc-input";

test("or-mwc-input", async ({ mount }) => {
  const component = await mount(OrMwcInput, {
    props: {
      type: "button",
      raised: true,
      label: "test",
    },
  });

  await expect(component).toContainText("test");
});
