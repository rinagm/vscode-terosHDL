import { expect } from "chai";
import { VSBrowser, ActivityBar } from "vscode-extension-tester";

describe("TerosHDL Sidebar", () => {
  let browser: VSBrowser;

  before(async () => {
    browser = VSBrowser.instance;
    await browser.waitForWorkbench();
  });

  it("TerosHDL view control is visible in Activity Bar", async function () {
    this.timeout(15000);
    const activityBar = new ActivityBar();
    const controls = await activityBar.getViewControls();
    expect(controls.length).to.be.greaterThan(0);

    const teroshdlControl = await activityBar.getViewControl("TerosHDL");
    expect(teroshdlControl).to.not.be.undefined;
  });

  it("Opening TerosHDL sidebar shows project views", async function () {
    this.timeout(20000);
    const activityBar = new ActivityBar();
    const teroshdlControl = await activityBar.getViewControl("TerosHDL");
    if (!teroshdlControl) {
      throw new Error("TerosHDL view control not found");
    }
    const sidebar = await teroshdlControl.openView();
    // La sidebar contiene vistas: Projects, Files, Hierarchy, etc.
    const content = await sidebar.getContent();
    const sections = await content.getSections();
    expect(sections.length).to.be.greaterThan(0);
    // Al menos debería existir la sección de Projects
    const titles = await Promise.all(sections.map((s) => s.getTitle()));
    expect(titles).to.include("Projects");
  });
});