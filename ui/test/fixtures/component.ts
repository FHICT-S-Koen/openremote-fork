import path from "node:path";

import type { Fixtures, PlaywrightTestArgs, Page, PlaywrightTestOptions, TestFixture } from "@playwright/test";
import { test, type TestType as ComponentTestType, type Locator } from "@playwright/experimental-ct-core";

type ComponentProps<Component extends HTMLElement> = Partial<Component>;
type ComponentSlot = number | string | ComponentSlot[];
type ComponentSlots = Record<string, ComponentSlot> & { default?: ComponentSlot };

type ComponentEvents = Record<string, Function>;

export interface MountOptions<HooksConfig, Component extends HTMLElement> {
  props?: ComponentProps<Component>;
  slots?: ComponentSlots;
  on?: ComponentEvents;
  hooksConfig?: HooksConfig;
}

export interface MountResult<Component extends HTMLElement> extends Locator {
  unmount(): Promise<void>;
  update(options: {
    props?: Partial<ComponentProps<Component>>;
    slots?: Partial<ComponentSlots>;
    on?: Partial<ComponentEvents>;
  }): Promise<void>;
}

class Shared {
  constructor(readonly page: Page) {}

  async fonts() {
    await this.page.route("**/shared/fonts/**", (route, request) => {
      route.fulfill({ path: this.urlPathToFsPath(request.url()) });
    });
  }

  async locales() {
    await this.page.route("**/shared/locales/**", (route, request) => {
      route.fulfill({ path: this.urlPathToFsPath(request.url()) });
    });
  }

  private urlPathToFsPath(url: string) {
    return path.resolve(__dirname, global.decodeURI(`../../app${new URL(url).pathname}`));
  }
}

function withLocators<R extends string, T extends string>(
  page: Page,
  root: R,
  ...internals: T[]
): Record<R & (typeof internals)[number], Locator> {
  const rootLocator = page.locator(root);
  return {
    [root]: rootLocator,
    ...(Object.fromEntries(internals.map((i) => [i, rootLocator.locator(i)])) as Record<
      (typeof internals)[number],
      Locator
    >),
  };
}

class Components {
  readonly collapsablePanel = this.getLocators({
    name: "or-collapsible-panel",
    header: "#header",
    content: "#content",
  });

  readonly jsonForms = this.getLocators("or-json-forms", (name) => ({
    collapsible: this.wrapLocators(this.collapsablePanel, name),
  }));

  constructor(readonly page: Page) {
    this.jsonForms.collapsible.nth;
  }

  // I kind of need more samples to know whether to make this abstraction in the first place... though it is a simple abstraction
  //
  // What about or-mwc-input? -> getInputByType
  // What about or-json-forms? -> walkForm

  // components: {
  //   collapsablePanel: {
  //     root: locator
  //     header: locator
  //     content: locator
  //   }
  //   jsonforms: {
  //     root: locator
  //     collapsable: wrapWithin(this.collapsablePanel, this.jsonforms.root)
  //   }
  // }

  // This must recursive then...
  // private wrapLocators<T extends string>(locators: CtTree<T>, root: string): CtTree<T> {
  //   for (const [key, locator] of Object.entries<Locator>(locators)) {
  //     locators[key as T] = this.page.locator(root).filter({ has: locator });
  //   }
  //   return locators;
  // }

  private getLocators<T extends string, K extends string>(
    root: T,
    internals: Record<K, string> | ((name: string) => Record<K, string>)
  ): { name: T; root: Locator } & {
    [V in K]: Locator;
  } {
    if (typeof internals === "function") {
      internals = internals(root);
    }
    return {
      name: root,
      root: this.page.locator(root),
      ...(Object.fromEntries(Object.entries<string>(internals).map(([k, v]) => [k, this.page.locator(v)])) as {
        [V in K]: Locator;
      }),
    };
  }
}

export interface ComponentFixtures {
  mount<HooksConfig, Component extends HTMLElement = HTMLElement>(
    component: new (...args: any[]) => Component,
    options?: MountOptions<HooksConfig, Component>
  ): Promise<MountResult<Component>>;
  shared: Shared;
  components: Components;
}

// TODO: Separate our component test fixtures from the default playwright component test fixtures
declare module "@playwright/experimental-ct-core" {
  const test: ComponentTestType<ComponentFixtures>;
}

function withPage<R>(component: Function): TestFixture<R, { page: Page }> {
  return async ({ page }, use) => await use(new (component.bind(null, page))());
}

export const componentFixtures: Fixtures<PlaywrightTestArgs & PlaywrightTestOptions & ComponentFixtures> = {
  shared: withPage(Shared),
  // Build the component tree using nested objects internally where the keys represent the well known internals and their values the corresponding locator.
  components: withPage(Components),
};

// async function walkForm(component: Locator, collapsible: any, schema: any) {
//   if (schema.type === "object" || schema.type === "array") {
//     await collapsible.root.click();
//     await expect();
//   }
// }

export { test as ct, ComponentTestType };

// interface BaseComponent<T extends string> {
//   readonly name: T;
// }

// export class OrCollapsiblePanel implements BaseComponent<"or-collapsible-panel"> {
//   readonly name = "or-collapsible-panel";

//   root = this.page.locator(this.name);
//   header = this.root.locator("#header");
//   content = this.root.locator("#content");

//   constructor(readonly page: Page) {}
// }

// export class OrJSONForms implements BaseComponent<"or-json-forms"> {
//   readonly name = "or-json-forms";

//   root = this.page.locator(this.name);
//   collapsible = OrCollapsiblePanel;

//   constructor(readonly page: Page) {}
// }

// export class Component<T extends Components> {
//   constructor(public readonly page: Page) {}

//   /**
//    * @param x coordinate of screen pixel
//    * @param y coordinate of screen pixel
//    */
// }
