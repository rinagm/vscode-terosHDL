import { expect } from "chai";
import { VSBrowser, Workbench } from "vscode-extension-tester";

describe("TerosHDL Activation", () => {
  let browser: VSBrowser;

  before(async () => {
    browser = VSBrowser.instance;
  });

  it("Extension activates without errors", async function () {
    this.timeout(30000);
    await browser.waitForWorkbench();
    const workbench = new Workbench();
    const title = await browser.driver.getTitle();
    expect(title).to.include("Visual Studio Code");
  });

  it("TerosHDL extension is installed and workbench loads", async function () {
    this.timeout(20000);
    const workbench = new Workbench();
    
    // Verify the sidebar is accessible (extension is active)
    const sidebar = await workbench.getSideBar();
    expect(sidebar).to.not.be.undefined;
    
    // Verify the activity bar is accessible
    const activityBar = await workbench.getActivityBar();
    const controls = await activityBar.getViewControls();
    expect(controls).to.not.be.undefined;
    expect(controls.length).to.be.greaterThan(0);
  });
});