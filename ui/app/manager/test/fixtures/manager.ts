import { test as base, type Page, type Locator, expect, type TestFixture } from "@playwright/test";
import rest, { RestApi } from "@openremote/rest";
import { users, Usernames } from "./data/users";
const { admin, smartcity } = users;

import { UserModel } from "../../src/pages/page-users";
import { Asset, Role } from "@openremote/model";
import { BasePage } from "./index";
import assets from "./data/assets";

class Manager {
  private readonly clientId = "openremote";
  private readonly managerHost: String;
  readonly axios: RestApi["_axiosInstance"];

  public realm?: string;
  public user?: UserModel;
  public role?: Role;
  public assets?: Asset[];

  constructor(readonly page: Page, readonly baseURL: string) {
    // TODO: parameterize
    this.managerHost = "http://localhost:8080";
    rest.initialise(`${this.managerHost}/api/master/`);
    this.axios = rest.axiosInstance;
  }

  async goToRealmStartPage(realm: string) {
    await this.page.goto(this.getAppUrl(realm));
  }

  /**
   * Navigate to a setting page inside the manager
   * for the setting list menu at the top right
   * @param setting Name of the setting menu item
   */
  async navigateToMenuItem(setting: string) {
    await this.page.waitForTimeout(500);
    await this.page.click('button[id="menu-btn-desktop"]');
    await this.page.waitForTimeout(500);
    const menu = this.page.locator("#menu > #list > li").filter({ hasText: setting });
    await menu.waitFor({ state: "visible" });
    await menu.click();
  }

  /**
   * Switch to a realm in the manager's realm picker
   * @param name Name of custom realm
   */
  async switchToRealmByRealmPicker(name: string) {
    await this.page.waitForTimeout(500);
    await this.page.click("#realm-picker");
    await this.page.waitForTimeout(500);
    await this.page.click(`li[role="menuitem"]:has-text("${name}")`);
  }

  /**
   * Navigate to a certain tab page
   * @param tab Tab name
   */
  async navigateToTab(tab: string) {
    await this.page.click(`#desktop-left a:has-text("${tab}")`);
  }

  /**
   * Login as user
   * @param user Username (admin or other)
   */
  async login(user: Usernames) {
    const username = this.page.getByRole("textbox", { name: "Username or email" });
    const password = this.page.getByRole("textbox", { name: "Password" });
    await username.waitFor();
    if ((await username.isVisible()) && (await password.isVisible())) {
      await username.fill(user);
      await password.fill(users[user].password);
      await this.page.keyboard.press("Enter");
    }
  }

  /**
   * Logout and delete login
   */
  async logout() {
    const isPanelVisibile = await this.page.isVisible('button:has-text("Cancel")');
    if (isPanelVisibile) {
      await this.page.click('button:has-text("Cancel")');
    }
    const isMenuBtnVisible = await this.page.isVisible("#menu-btn-desktop");
    if (isMenuBtnVisible) {
      await this.page.click("#menu-btn-desktop");
      await this.page.locator("#menu > #list > li").filter({ hasText: "Log out" }).click();
    }
    // Wait for navigation to login page to prevent simultaneous navigation
    await this.page.waitForURL("**/auth/realms/**");
  }

  async getAccessToken(realm: string, username: Usernames, password: string) {
    const data = new URLSearchParams();
    data.append("client_id", this.clientId);
    data.append("username", username);
    data.append("password", password);
    data.append("grant_type", "password");
    const { access_token } = (
      await this.axios.post(`${this.managerHost}/auth/realms/${realm}/protocol/openid-connect/token`, data, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      })
    ).data;
    return access_token;
  }

  /**
   * setup the testing environment by giving the realm name and additional parameters
   * @param realm Realm to create
   * @param user Realm user to create
   * @param user Role to create
   * @param user Assets to create
   */
  async setup(realm: string, { user, role, assets }: { user?: UserModel; role?: Role; assets?: Asset[] } = {}) {
    const access_token = await this.getAccessToken("master", admin.username, admin.password);
    const config = { headers: { Authorization: `Bearer ${access_token}` } };

    // Add realm
    try {
      const response = await rest.api.RealmResource.create(
        // TODO: use a normalize function
        { name: realm.toLowerCase(), displayName: realm, enabled: true },
        config
      );
      expect(response.status).toBe(204);
      this.realm = realm;
    } catch (e) {
      console.error("Failed to create realm", e.response.status);
    }

    // Add role
    if (role) {
      let roles: Role[] = [];
      try {
        const response = await rest.api.UserResource.getClientRoles(realm, this.clientId, config);
        expect(response.status).toBe(200);
        roles = response.data;
        if (role.compositeRoleIds) {
          role.compositeRoleIds = role.compositeRoleIds
            .map((name) => roles.find((r) => r.name === name)?.id)
            .filter(Boolean) as string[];
        }
        roles.push(role);
        try {
          const response = await rest.api.UserResource.updateRoles(realm, roles, config);
          expect(response.status).toBe(204);
          this.role = role;
        } catch (e) {
          console.error("Failed to create role", e.response.status);
        }
      } catch (e) {
        console.error("Failed to get roles", e.response.status);
      }
    }

    // Add user
    if (user) {
      try {
        const response = await rest.api.UserResource.create(realm, user, config);
        expect(response.status).toBe(200);
        this.user = response.data;
        // Add users' roles
        try {
          const response = await rest.api.UserResource.updateUserClientRoles(
            realm,
            this.user!.id!,
            this.clientId,
            user.roles!,
            config
          );
          expect(response.status).toBe(204);
          // Reset users' password
          try {
            const response = await rest.api.UserResource.resetPassword(
              realm,
              this.user!.id!,
              { value: smartcity.password },
              config
            );
            expect(response.status).toBe(204);
          } catch (e) {
            console.error("Failed to reset user password", e.response.status);
          }
        } catch (e) {
          console.error("Failed to update users' roles", e.response.status);
        }
      } catch (e) {
        console.error("Failed to create user", e.response.status);
      }
    }

    if (assets) {
      // Add assets
      this.assets = [];
      for (const asset of assets) {
        await rest.api.AssetResource.create(asset, config)
          .then((response) => {
            expect(response.status).toBe(200);
            this.assets!.push(response.data);
          })
          .catch((e) => {
            expect(e.response.status, { message: "Failed to create asset" }).toBe(409);
          });
      }
    }
  }

  /**
   *  Clean up the environment
   */
  async cleanUp() {
    console.info("cleanup", this.realm, this.user, this.assets);

    const access_token = await this.getAccessToken("master", "admin", users.admin.password!);
    const config = { headers: { Authorization: `Bearer ${access_token}` } };

    let realm;
    if (this.realm) {
      realm = this.realm;
      try {
        const response = await rest.api.RealmResource.delete(this.realm, config);
        expect(response.status).toBe(204);
        delete this.realm;
      } catch (e) {
        console.warn("Could not delete realm: ", this.realm);
      }
    }

    if (this.user) {
      try {
        const response = await rest.api.UserResource.delete(this.user.realm!, this.user.id!, config);
        expect(response.status).toBe(204);
        delete this.user;
      } catch (e) {
        console.warn("Could not delete user: ", this.user);
      }
    }

    if (this.role && realm) {
      let roles;
      try {
        const response = await rest.api.UserResource.getClientRoles(realm, this.clientId, config);
        roles = response.data.filter((r) => r.id === this.role!.id);
        try {
          const response = await rest.api.UserResource.updateRoles(realm, roles, config);
          expect(response.status).toBe(204);
          delete this.role;
        } catch (e) {
          console.warn("Could not update roles: ", this.role);
        }
      } catch (e) {
        console.warn("Could not get roles: ", this.user);
      }
    }

    if (this.assets) {
      const assetIds = this.assets.map(({ id }) => id!);
      try {
        const response = await rest.api.AssetResource.delete({ assetId: assetIds }, config);
        expect(response.status).toBe(204);
        delete this.assets;
      } catch (e) {
        console.warn("Could not delete asset(s): ", assetIds);
      }
    }
  }

  /**
   *  Click the save button
   */
  async save() {
    await this.page.waitForTimeout(200);
    await this.page.click("#edit-container");
    await this.page.waitForTimeout(200); // wait for button to enabled
    const isSaveBtnVisible = await this.page.isVisible('button:has-text("Save")');
    if (isSaveBtnVisible) {
      await this.page.click('button:has-text("Save")');
    }
    await this.page.waitForTimeout(200);
    const isDisabled = await this.page.locator('button:has-text("Save")').isDisabled();
    //asset modify
    const ifModifyMode = await this.page.isVisible('button:has-text("OK")');
    if (ifModifyMode) {
      await this.page.click('button:has-text("OK")');
    }
    if (!isDisabled) {
      await this.page.click('button:has-text("Save")');
      await this.page.waitForTimeout(200);
    }
    await expect(this.page.locator('button:has-text("Save")')).toBeDisabled();
  }

  protected getAppUrl(realm: string) {
    const appUrl = this.baseURL + "manager/?realm=";
    return appUrl + realm;
  }
}

class AssetsPage extends BasePage {
  // private readonly inputBox: Locator;
  // private readonly todoItems: Locator;

  constructor(readonly page: Page, private readonly manager: Manager) {
    super(page);
  }

  async goto() {
    this.manager.navigateToMenuItem("Assets");
  }

  /**
   * Switch between modify mode and view mode
   * @param targetMode view or modify
   */
  async switchMode(targetMode: string) {
    await this.page.waitForTimeout(400);
    const atModifyMode = await this.page.isVisible('button:has-text("View")');
    const atViewMode = await this.page.isVisible('button:has-text("Modify")');

    if (atModifyMode && targetMode == "view") {
      await this.page.click('button:has-text("View")');
    }
    if (atViewMode && targetMode == "modify") {
      await this.page.click('button:has-text("Modify")');
    }
  }

  /**
   * create new empty assets
   * @param update for checking if updating values is needed
   */
  async addAssets(update: boolean, configOrLoction) {
    await this.page.waitForTimeout(500);

    // Goes to assets page
    await this.page.click("#desktop-left a:nth-child(2)");

    // select conosle first to enter into the modify mode
    await this.page.click(`#list-container >> text="Consoles"`);
    await this.switchMode("modify");
    await this.unselect();

    // create assets accroding to assets array
    for (let asset of assets) {
      // setStepStartTime();
      let isAssetVisible = await this.page.isVisible(`#list-container >> text=${asset.name}`);
      try {
        if (!isAssetVisible) {
          await this.page.click(".mdi-plus");
          await this.page.click(`text=${asset.asset}`);
          await this.page.fill('#name-input input[type="text"]', asset.name);
          await this.page.click("#add-btn");
          await this.page.waitForTimeout(500);
          // check if at modify mode
          // if yes we should see the save button then save
          const isSaveBtnVisible = await this.page.isVisible('button:has-text("Save")');
          if (isSaveBtnVisible) {
            await this.page.click('button:has-text("Save")');
          }
          await this.switchMode("modify");
          // await this.page.unselect()
          // await this.page.click(`#list-container >> text=${asset.name}`)
          if (update) {
            // switch to modify mode if at view mode

            // update in modify mode
            if (configOrLoction == "location") {
              await this.updateLocation(asset.location_x, asset.location_y);
            } else if (configOrLoction == "config") {
              await this.setConfigItem(
                asset.config_item_1,
                asset.config_item_2,
                asset.config_attr_1,
                asset.config_attr_2
              );
            } else {
              await this.updateLocation(asset.location_x, asset.location_y);
              await this.setConfigItem(
                asset.config_item_1,
                asset.config_item_2,
                asset.config_attr_1,
                asset.config_attr_2
              );
            }

            await this.updateInModify(asset.attr_1, asset.a1_type, asset.v1);
            await this.updateInModify(asset.attr_2, asset.a2_type, asset.v2);

            await this.manager.save();

            //switch to view mode
            await this.switchMode("view");
            // update value in view mode
            await this.updateAssets(asset.attr_3, asset.a3_type, asset.v3);
            await this.page.waitForTimeout(500);

            //switch to modify mode
            await this.switchMode("modify");
          }
          await this.unselect();
        }
      } catch (error) {
        console.error("error" + error);
      }
    }
  }

  /**
   * unselect the asset
   */
  async unselect() {
    await this.page.waitForTimeout(500);
    const isCloseVisible = await this.page.isVisible(".mdi-close >> nth=0");

    // leave modify mode
    // if (isViewVisible) {
    //     await page.click('button:has-text("View")')
    //     let btnDisgard = await page.isVisible('button:has-text("Disgard")')
    //     if (btnDisgard) {
    //         await page.click('button:has-text("Disgard")')
    //         console.log("didn't save successfully")
    //     }
    // }

    // unselect the asset
    if (isCloseVisible) {
      //await page.page?.locator('.mdi-close').first().click()
      await this.page.click(".mdi-close >> nth=0");
    }

    await this.page.waitForTimeout(500);
  }

  /**
   * update asset in the general panel
   * @param attr attribute's name
   * @param type attribute's input type
   * @param value input value
   */
  async updateAssets(attr: string, type: string, value: string) {
    await this.page.fill(`#field-${attr} input[type="${type}"]`, value);
    await this.page.click(`#field-${attr} #send-btn span`);
  }

  /**
   * update the data in the modify mode
   * @param attr attribute's name
   * @param type attribute's input type
   * @param value input value
   */
  async updateInModify(attr: string, type: string, value: string) {
    await this.page.fill(`text=${attr} ${type} >> input[type="number"]`, value);
  }

  /**
   * update location so we can see in the map
   * @param location_x horizental coordinator (start from left edge)
   * @param location_y vertail coordinator (start from top edge)
   */
  async updateLocation(x: number, y: number) {
    await this.page.click("text=location GEO JSON point >> button span");
    await this.page.mouse.click(x, y, { delay: 1000 });
    await this.page.click('button:has-text("OK")');
  }

  /**
   * select two config items for an attribute
   * @param item_1 the first config item
   * @param item_2 the second config item
   * @param attr attribute's name
   */
  async configItem(item_1: string, item_2: string, attr: string) {
    await this.page.waitForTimeout(500);
    await this.page.click(`td:has-text("${attr} ") >> nth=0`);
    await this.page.waitForTimeout(500);
    await this.page.click(".attribute-meta-row.expanded td .meta-item-container div .item-add or-mwc-input #component");
    await this.page.click(`li[role="checkbox"]:has-text("${item_1}")`);
    await this.page.click(`li[role="checkbox"]:has-text("${item_2}")`);
    await this.page.click('div[role="alertdialog"] button:has-text("Add")');
    await this.page.waitForTimeout(500);

    // close attribute menu
    await this.page.click(`td:has-text("${attr}") >> nth=0`);
  }

  /**
   * set config item for rule and insight to use
   * @param item1 the first config item
   * @param item2 the second config item
   * @param attr1 attribute's name
   * @param attr2 attribute's name
   */
  async setConfigItem(item_1: string, item_2: string, attr_1: string, attr_2: string) {
    await this.configItem(item_1, item_2, attr_1);
    await this.page.waitForTimeout(500);
    await this.configItem(item_1, item_2, attr_2);
    await this.page.waitForTimeout(500);
  }

  /**
   * Delete a certain asset by its name
   * @param asset asset's name
   */
  async deleteSelectedAsset(asset: string) {
    await this.manager.navigateToTab("Assets");
    let assetSelected = await this.page.locator(`text=${asset}`).count();
    if (assetSelected > 0) {
      await this.page.click(`text=${asset}`);
      await this.page.click(".mdi-delete");
      await this.page.click('button:has-text("Delete")');
      await this.page.waitForTimeout(1500);
      expect(await this.page.locator(`text=${asset}`).count()).toBeFalsy();
    }
  }

  // async addToDo(text: string) {
  //   await this.inputBox.fill(text);
  //   await this.inputBox.press("Enter");
  // }

  // async remove(text: string) {
  //   const todo = this.todoItems.filter({ hasText: text });
  //   await todo.hover();
  //   await todo.getByLabel("Delete").click();
  // }

  // async removeAll() {
  //   while ((await this.todoItems.count()) > 0) {
  //     await this.todoItems.first().hover();
  //     await this.todoItems.getByLabel("Delete").first().click();
  //   }
  // }
}

// class InsightsPage extends BasePage { }

// class MapPage extends BasePage { }

class RealmsPage extends BasePage {
  constructor(readonly page: Page, private readonly manager: Manager) {
    super(page);
  }

  async goto() {
    this.manager.navigateToMenuItem("Realms");
  }

  /**
   * Create Realm with name
   * @param name realm name
   */
  async addRealm(name: string) {
    const isVisible = await this.page.isVisible(`[aria-label="attribute list"] span:has-text("${name}")`);
    if (!isVisible) {
      await this.page.click("text=Add Realm");
      await this.page.locator("#realm-row-1 label").filter({ hasText: "Realm" }).fill(name);
      await this.page.locator("#realm-row-1 label").filter({ hasText: "Friendly name" }).fill(name);
      await this.page.click('button:has-text("create")');

      // Set realm so it will be cleaned up
      this.manager.realm = name;
      // await page.wait(first == true ? 15000 : 10000);
      // const count = await page.count(`[aria-label="attribute list"] span:has-text("${name}")`)
      // await expect(count).toEqual(1)
    }
  }

  /**
   * Delete a certain realm by its name
   * @param name Realm's name
   */
  async deleteRealm(realm: string) {
    await this.page.getByRole("cell", { name: realm }).first().click();
    await this.page.click('button:has-text("Delete")');
    await this.page.fill('div[role="alertdialog"] input[type="text"]', realm);
    await this.page.click('button:has-text("OK")');

    const realmList = this.page.locator('[aria-label="attribute list"] span:has-text("smartcity")');
    await expect(realmList).toHaveCount(0);
    await this.manager.goToRealmStartPage("master");
    await expect(this.page.locator("#desktop-right #realm-picker")).not.toBeVisible();
  }
}

class RolesPage extends BasePage {
  constructor(readonly page: Page, private readonly manager: Manager) {
    super(page);
  }

  async goto() {
    this.manager.navigateToMenuItem("Roles");
  }
}

class RulesPage extends BasePage {
  constructor(readonly page: Page, private readonly manager: Manager) {
    super(page);
  }

  async goto() {
    this.manager.navigateToTab("Rules");
  }
}

class UsersPage extends BasePage {
  constructor(readonly page: Page, private readonly manager: Manager) {
    super(page);
  }

  /**
   * Create user
   * @param username
   * @param password
   */
  async addUser(username: string, password: string) {
    await this.page
      .locator("#content")
      .filter({ hasText: "Regular users" })
      .getByRole("button", { name: "Add User" })
      .click();
    await this.page.locator("label").filter({ hasText: "Username" }).fill(username);
    await this.page
      .locator("label")
      .filter({ hasText: /Password/ })
      .fill(password);
    await this.page.locator("label").filter({ hasText: "Repeat password" }).fill(password);
    // select permissions
    await this.page.getByRole("button", { name: "Realm roles" }).click();
    await this.page.click('div[role="button"]:has-text("Manager Roles")');
    await this.page.click('li[role="menuitem"]:has-text("Read")');
    await this.page.click('li[role="menuitem"]:has-text("Write")');
    await this.page.click('div[role="button"]:has-text("Manager Roles")');
    // await this.page.route(`user/${this.manager.realm}/users`, async (route, request) => {
    //   const response = await request.response()
    //   console.log(response)
    //   // Set realm so it will be cleaned up
    //   this.manager.user = await response?.json();
    // }, { times: 1 });
    // create user
    await this.page.click('button:has-text("create")');
  }
}

function withManager<R>(managerPage: Function): TestFixture<R, { page: Page; manager: Manager }> {
  return async ({ page: basePage, manager }, use) => {
    // TODO: TEST THIS
    // Check that the manager has been initialized
    expect(manager).toBeInstanceOf(Manager);
    await use(new (managerPage.bind(null, basePage, manager) as VoidFunction)());
  };
}

interface Fixtures {
  manager: Manager;
  assetsPage: AssetsPage;
  realmsPage: RealmsPage;
  rolesPage: RolesPage;
  rulesPage: RulesPage;
  usersPage: UsersPage;
}

export const test = base.extend<Fixtures>({
  // TODO: handle baseURL
  manager: async ({ page, baseURL }, use) => await use(new Manager(page, baseURL!)),
  assetsPage: withManager(AssetsPage),
  realmsPage: withManager(RealmsPage),
  rolesPage: withManager(RolesPage),
  rulesPage: withManager(RulesPage),
  usersPage: withManager(UsersPage),
});
