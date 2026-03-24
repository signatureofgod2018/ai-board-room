#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("boardroom")
  .description("AI Board Room — Chat Tracker CLI")
  .version("0.1.0");

program
  .command("capture")
  .description("Start tracking the current session")
  .option("-n, --name <name>", "Instance name (e.g. Patrick)")
  .option("-p, --platform <platform>", "Platform: claude | copilot", "claude")
  .action(async (_opts) => {
    throw new Error("boardroom capture — not yet implemented");
  });

program
  .command("import")
  .description("Import a transcript file")
  .argument("<file>", "Path to transcript file")
  .option("-p, --platform <platform>", "Platform: claude | copilot")
  .action(async (_file, _opts) => {
    throw new Error("boardroom import — not yet implemented");
  });

program
  .command("checkpoint")
  .description("Record a formation checkpoint for a thread")
  .argument("<thread-id>", "Thread ID or slug")
  .action(async (_threadId) => {
    throw new Error("boardroom checkpoint — not yet implemented");
  });

program
  .command("export")
  .description("Export a thread as handoff MD or provenance JSON")
  .argument("<thread-id>", "Thread ID or slug")
  .option("-f, --format <format>", "Format: md | json", "md")
  .action(async (_threadId, _opts) => {
    throw new Error("boardroom export — not yet implemented");
  });

program
  .command("list")
  .description("List all tracked threads")
  .option("-p, --platform <platform>", "Filter by platform")
  .action(async (_opts) => {
    throw new Error("boardroom list — not yet implemented");
  });

program
  .command("search")
  .description("Semantic search across threads")
  .argument("<query>", "Search query")
  .option("-l, --limit <n>", "Max results", "10")
  .action(async (_query, _opts) => {
    throw new Error("boardroom search — not yet implemented");
  });

program.parse();
