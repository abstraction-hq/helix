#!/usr/bin/env node
import { Command } from 'commander';
import cmds from './commands';

const program = new Command();

for (const cmd of cmds) {
  cmd(program);
}

program.parse(process.argv);
