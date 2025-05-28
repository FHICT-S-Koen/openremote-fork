import { Locator, MountResult, ct, expect } from "@openremote/test";

import { OrJSONForms, StandardRenderers } from "@openremote/or-json-forms";

// <or-json-forms .renderers="${jsonFormsAttributeRenderers}" ${ref(jsonForms)}
//                .disabled="${disabled}" .readonly="${readonly}" .label="${label}"
//                .schema="${schema}" label="Agent link" .uischema="${uiSchema}" .onChange="${onAgentLinkChanged}"></or-json-forms>

// cells: ,
// config: ,
// uischemas: ,

// ct("Should render form for: Array", async ({ mount, page }) => {
//   const component = await mount(OrJSONForms, {
//     props: {
//       uischema: { type: "Control", scope: "#" } as any,
//       schema: {
//         $schema: "http://json-schema.org/draft-07/schema#",
//         title: "Strings",
//         type: "array",
//         items: {
//           title: "String",
//           type: "string",
//         },
//       },
//       data: [],
//       renderers: StandardRenderers,
//       onChange: () => null,
//       // cells: ,
//       // config: ,
//       // uischemas: ,
//       readonly: false,
//       label: "Test",
//       required: false,
//     },
//     on: {},
//   });
//   // or-collapsible-panel
//   // locator("or-collapsible-panel").locator("#header")
//   // locator("or-collapsible-panel").locator("content")
//   await expect(component.getByText("Test")).toBeVisible();
//   await component.click();
//   const addItemBtn = component.getByRole("button", { name: "addItem" });
//   await expect(addItemBtn).toBeVisible();
//   await addItemBtn.click();
//   await expect(addItemBtn).toBeVisible();

//   await expect(component.getByRole("textbox").nth(0)).toBeVisible();

//   await page.waitForTimeout(10000);
// });

const schemas = [
  {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "String",
    type: "string",
  },
  {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Object",
    type: "object",
    properties: {
      value: { type: "string" },
    },
  },
  {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Array",
    type: "array",
    items: {
      title: "String",
      type: "string",
    },
  },
  {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "3 Dimensional Array",
    type: "array",
    items: {
      title: "2 Dimensional Array",
      type: "array",
      items: {
        title: "Array",
        type: "array",
        items: {
          title: "String",
          type: "string",
        },
      },
    },
  },
];

// type typeValues = "array" | "object" | "number" | "string";

const typeValueMap = new Map()
  .set("array", [])
  .set("boolean", false)
  .set("object", {})
  .set("number", 0)
  .set("integer", 0)
  .set("string", "");

ct.beforeEach(async ({ shared }) => {
  await shared.fonts();
  await shared.locales();
});

for (const schema of schemas) {
  ct(`Should render form for: ${schema.title}`, async ({ page, mount, components }) => {
    const component = await mount(OrJSONForms, {
      props: {
        uischema: { type: "Control", scope: "#" } as any,
        schema,
        data: typeValueMap.get(schema.type),
        renderers: StandardRenderers,
        onChange: () => null,
        readonly: false,
        label: schema.title,
        required: false,
      },
      on: {},
    });
    await component.waitFor();

    if (schema.type === "object" || schema.type === "array") {
      await component.locator("or-collapsible-panel").click();
    }
    if (schema.type === "array") {
      await component.getByRole("button", { name: "addItem" }).click();
      await component.locator("or-collapsible-panel").locator("or-collapsible-panel").click();
      await component
        .locator("or-collapsible-panel")
        .locator("or-collapsible-panel")
        .getByRole("button", { name: "addItem" })
        .click();
      await component
        .locator("or-collapsible-panel")
        .locator("or-collapsible-panel")
        .locator("or-collapsible-panel")
        .click();
    }
    if (schema.type === "object") {
      await component.getByRole("button", { name: "addParameter" }).click();
    }
    await page.waitForTimeout(100);
  });
}

// Need to walk the schema

// The POC tests general usage of the or-json-forms component

// 1. Given you have a POJO of type Object, Array, String, Number, Integer, Boolean, etc.
// 2. When I render it using the or-json-forms component.
// 3. Then it should show the right or-mwc-input component variant and nested structure.

// Note: double check every possible input method and how they link to different JSON Schema types.
