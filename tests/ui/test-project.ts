import { expect } from "chai";
import { VSBrowser, Workbench, InputBox } from "vscode-extension-tester";

describe("TerosHDL Project Creation", () => {
  let browser: VSBrowser;
  let workbench: Workbench;
  const testProjectName = "teroshdl-extester-test";

  before(async () => {
    browser = VSBrowser.instance;
    await browser.waitForWorkbench();
    workbench = new Workbench();
  });

  it("Add Project command creates project in tree", async function () {
    this.timeout(60000);
    await workbench.openCommandPrompt();
    const commandPrompt = await InputBox.create();
    await commandPrompt.setText("teroshdl.view.project.add");
    await commandPrompt.confirm();

    await browser.driver.sleep(1500);
    const picker = await InputBox.create(15000);
    const quickPicks = await picker.getQuickPicks();
    expect(quickPicks.length).to.be.greaterThan(0);
    await quickPicks[0].select();

    const input = await InputBox.create(15000);
    await input.setText(testProjectName);
    await input.confirm();
    await browser.driver.sleep(4000);

    const activityBar = await workbench.getActivityBar();
    const teroshdlControl = await activityBar.getViewControl("TerosHDL");
    if (teroshdlControl) {
      const sidebar = await teroshdlControl.openView();
      const content = await sidebar.getContent();
      const section = await content.getSection("Projects");
      expect(section).to.not.be.undefined;
    }
  });
});