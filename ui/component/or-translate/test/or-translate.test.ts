import { OrTranslate } from "../src/index";

import { test, expect } from "@openremote/test";

test("Should show text", async ({ mount }) => {
  const component = await mount(OrTranslate, {
    props: {
      value: "test",
    },
  });

  await expect(component).toContainText("test");
});

// import { i18next, OrTranslate } from "@openremote/or-translate";

// import { test, expect } from "@openremote/test";

// test("Change language", async ({ mount }) => {
//   await i18next.init();
//   i18next.addResource("en", "or", "thing", "Thing");
//   i18next.addResource("nl", "or", "thing", "Ding");

//   const component = await mount(OrTranslate, {
//     props: {
//       value: "gateway.limit_sharing_is_custom_error",
//     },
//   });
//   await expect(component).toContainText("test");

//   i18next.changeLanguage("nl");
//   await expect(component).toContainText("test");
// });
