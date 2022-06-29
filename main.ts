import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { PluginSettings } from './src/constants';
import { processToReadInbox } from './src/process';

const DEFAULT_SETTINGS: PluginSettings = {
  distFolder: 'toread',
};

export default class ProcessInboxPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();

    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: 'process-to-read-inbox',
      name: 'Process to read inbox',
      callback: () => {
        console.log('processing inbox...');
        processToReadInbox(this.app, this.settings);
      },
    });

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new ProcessInboxPluginTab(this.app, this));
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.loadData(),
    );
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class ProcessInboxPluginTab extends PluginSettingTab {
  plugin: ProcessInboxPlugin;

  constructor(app: App, plugin: ProcessInboxPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h2', {
      text: 'Process to read inbox settings',
    });

    new Setting(containerEl)
      .setName('Destination folder')
      .setDesc("e.g. 'toread' or 'inbox'")
      .addText((text) =>
        text
          .setPlaceholder('toread')
          .setValue(this.plugin.settings.distFolder)
          .onChange(async (value) => {
            console.log('Secret: ' + value);
            this.plugin.settings.distFolder = value;
            await this.plugin.saveSettings();
          }),
      );
  }
}
