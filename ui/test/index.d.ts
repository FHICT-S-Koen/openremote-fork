import type { TestType, Locator } from "@playwright/experimental-ct-core";
import { Project } from "playwright/test";

export { Project };

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

export const test: TestType<{
  mount<HooksConfig, Component extends HTMLElement = HTMLElement>(
    component: new (...args: any[]) => Component,
    options?: MountOptions<HooksConfig, Component>
  ): Promise<MountResult<Component>>;
}>;

export { defineConfig, PlaywrightTestConfig, expect, devices } from "@playwright/experimental-ct-core";

export const createAppSetupAndTeardown: (app: string) => Project[];
export * from "./fixtures/page";
