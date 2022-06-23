import {
  App,
  Editor,
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
} from 'obsidian';

export default class MyPlugin extends Plugin {
  async onload() {
    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: 'process-to-read-inbox',
      name: 'Process to read inbox',
      callback: () => {
        // TODO processInbox
      },
    });
  }

  onunload() {}
}
