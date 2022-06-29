import { Plugin } from 'obsidian';
import { processToReadInbox } from './src/process';

export default class MyPlugin extends Plugin {
  async onload() {
    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: 'process-to-read-inbox',
      name: 'Process to read inbox',
      callback: () => processToReadInbox(this.app),
    });
  }

  onunload() {}
}
