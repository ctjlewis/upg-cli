#!/usr/bin/env node
/* eslint-disable no-console */
import { Command, program } from "commander";
import { readFile } from "fs/promises";
import { env } from "process";
import { oraPromise } from "ora";

import { chalk, SUBSCRIPTION_LOCK } from "./globs/shared";
import { AUTH0_CLIENT } from "./globs/node";

import { withFormatting } from "./utils/formatting";
import { error, log, success } from "./utils/log";
import { checkSubscription } from "./utils/checkSubscription";

import { loadCommand } from "./commands/load";
import { newCommand } from "./commands/new";
import { loginCommand } from "./commands/login";
import { logoutCommand } from "./commands/logout";
import { explainCommand } from "./commands/explain";
import { updateCommand } from "./commands/update";
import { getPackageJsonValue } from "./packageJson";

program
  .name("upg")
  .description("Generate programs for any language or platform.");

program
  .command("new", { isDefault: true })
  .description("Create a new program.")
  .argument("[target]", "The target to generate the script for.\nDefaults to Bash for Linux, ZSH for Mac, and Windows Shell for Windows.")
  .argument("[description]", "A description of the command to generate.")
  .option("-n, --non-interactive", "Run without interactivity.")
  .action(withFormatting(newCommand));

program
  .command("load")
  .description("Load a program from a file.")
  .argument("<file>", "The file to load.")
  .action(withFormatting(loadCommand));

program
  .command("explain")
  .description("Explain a program by pasting it or loading from file.\n\n")
  // .option("-f, --file [file]", "The file to explain.")
  .action(withFormatting(explainCommand));


program
  .command("login")
  .description("Log in to your account.")
  .action(withFormatting(loginCommand));

program
  .command("logout")
  .description("Log out of your account.")
  .action(withFormatting(logoutCommand));

program
  .command("update")
  .description("Update the CLI to the latest version.\n\n")
  .action(withFormatting(updateCommand));

program
  .command("version")
  .description("Check the current version of UPG.")
  .action(async () => {
    const version = await getPackageJsonValue("version");
    log(`UPG version: ${chalk.underline(version)}.`);
  });

/**
 * Display logo.
 */
const logoFile = new URL("./header.txt", import.meta.url);
const taglinesFile = new URL("./taglines.txt", import.meta.url);

const logo = await readFile(logoFile, "utf8");
const taglines = await readFile(taglinesFile, "utf8").then((data) => data.split("\n"));

if (env.NODE_ENV !== "test") {
  log(chalk.dim(logo.replace(
    "Not competent enough to render a tagline!",
    taglines[Math.floor(Math.random() * taglines.length)]
  )));
}

/**
 * Add padding to the help text.
 */
const helpInformation = Command.prototype.helpInformation;
Command.prototype.helpInformation = function () {
  return helpInformation.call(this).replace(/^/gm, "   ") + "\n\n";
};

/**
 * Warn if a user is trying to access non-auth commands without being logged in.
 */
const whitelist = ["help", "--help", "login", "logout", "update"];
if (
  env.NODE_ENV !== "test" &&
  !whitelist.includes(process.argv.slice(2)[0])
) {
  const user = await AUTH0_CLIENT.getUser();
  if (!user) {
    error(
      chalk.dim("You are logged out."),
      "Run \"upg login\" to log in."
    );

    process.exit(1);
  }

  // console.log(user);
  success("Logged in.");

  if (SUBSCRIPTION_LOCK) {
    await oraPromise(
      withFormatting(checkSubscription),
      {
        text: "Checking subscription...\n",
        indent: 4,
      }
    );
  }
}

program.parse(process.argv);