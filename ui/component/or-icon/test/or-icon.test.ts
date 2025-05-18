import { test, expect } from "@openremote/test";

import { OrIcon } from "@openremote/or-icon";

test("or-icon", async ({ mount }) => {
  const component = await mount(OrIcon, {
    props: {
      icon: "state-machine",
    },
  });

  await expect(component).toContainText("test");
});
