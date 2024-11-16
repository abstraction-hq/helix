#!/usr/bin/env node
import chalk from "chalk";

export enum FormatType {
  DEFAULT = "DEFAULT",
  INFO = "INFO",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
  WARNING = "WARNING",
  DEBUG = "DEBUG",
}

export class FormatEngine {
  constructor() {}

  format(message: string, formatType: FormatType = FormatType.DEFAULT, bold: boolean = false): string {
    let styledMessage: string;

    switch (formatType) {
      case FormatType.INFO:
        styledMessage = chalk.blue(message);
        break;
      case FormatType.SUCCESS:
        styledMessage = chalk.green(message);
        break;
      case FormatType.ERROR:
        styledMessage = chalk.red(message);
        break;
      case FormatType.WARNING:
        styledMessage = chalk.yellow(message);
        break;
      case FormatType.DEBUG:
        styledMessage = chalk.magenta(message);
        break;
      case FormatType.DEFAULT:
      default:
        styledMessage = message; // Default log (no styling)
    }

    // Apply bold style if requested
    if (bold) {
      styledMessage = chalk.bold(styledMessage);
    }

    return styledMessage;
  }
}
