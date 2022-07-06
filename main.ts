import {
  App,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
} from 'obsidian';
import { PluginSettings } from './src/constants';
import {
  processToReadInbox,
  processDictionaryItems,
  defineWord,
  updateCardCount,
} from './src/process';
import debounce from 'lodash.debounce';

const DEFAULT_SETTINGS: PluginSettings = {
  distFolder: 'toread',
  total: 0,
};

export default class ProcessInboxPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();
    this.settings.total = 0;

    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: 'process-to-read-inbox',
      name: 'Process to read inbox',
      callback: () => {
        console.log('processing inbox...');
        processToReadInbox(this.app, this.settings);
      },
    });

    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: 'process-dictionary-items',
      name: 'Process dictionary items',
      callback: () => {
        console.log('processing inbox...');
        processDictionaryItems(this.app, this.settings).then(
          (newWords) => {
            new Notice(
              `All done! added definitions for ${
                newWords ? newWords.length : 0
              } new words.`,
            );
          },
        );
      },
    });

    // // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: 'update-card-count',
      name: 'Update card count (force)',
      callback: () => {
        updateCardCount(this.app, this.settings, true);
      },
    });

    // This adds a simple command that can be triggered anywhere
    // this.addCommand({
    //   id: 'backfill counts',
    //   name: 'backfill counts (tmp)',
    //   callback: () => {
    //     console.log('updating card count');
    //     backfillCardCount(this.app);
    //   },
    // });

    // This adds a complex command that can check whether the current state of the app allows execution of the command
    this.addCommand({
      id: 'define-word',
      name: 'Define word by current file name',
      checkCallback: (checking: boolean) =>
        defineWord(this.app, this.settings, checking),
    });

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new ProcessInboxPluginTab(this.app, this));

    this.registerEvent(
      this.app.vault.on('modify', () => {
        updateCardCount(this.app, this.settings);
      }),
    );

    this.registerEvent(
      this.app.vault.on(
        'modify',
        debounce((file) => {
          if ('children' in file) return;
          if (file.path !== 'todo/read.md') return;
          processToReadInbox(this.app, this.settings);
        }, 5000, {
          leading: false,
          trailing: true,
        }),
      ),
    );
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
