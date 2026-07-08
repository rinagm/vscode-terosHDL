import { expect } from "chai";
import { VSBrowser, InputBox, Workbench } from "vscode-extension-tester";

describe("TerosHDL Commands", () => {
  let browser: VSBrowser;

  before(async () => {
    browser = VSBrowser.instance;
  });

  it("TerosHDL commands appear in Command Palette", async function () {
    this.timeout(20000);
    await browser.waitForWorkbench();
    const workbench = new Workbench();
    
    await workbench.openCommandPrompt();
    const input = await InputBox.create();
    await input.setText(">TerosHDL");
    await browser.driver.sleep(1000);

    const quickPicks = await input.getQuickPicks();
    expect(quickPicks.length).to.be.greaterThan(0);
    const texts = await Promise.all(quickPicks.map((p) => p.getLabel()));
    const hasTerosCommand = texts.some(
      (t) => t.includes("TerosHDL") || t.includes("teroshdl")
    );
    expect(hasTerosCommand).to.be.true;

    await input.cancel();
  });
});