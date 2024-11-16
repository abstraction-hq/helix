export interface Command {
  name: string;
  description: string;
  handler: (args: string[]) => void;
}
