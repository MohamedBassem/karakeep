import path from "path";
import { execa, Options, ResultPromise } from "execa";

import serverConfig from "@karakeep/shared/config";
import logger from "@karakeep/shared/logger";

export interface SandboxedExecOptions {
  /**
   * Paths that the sandboxed process needs read/write access to.
   * These will be bind-mounted with write permissions.
   */
  writablePaths?: string[];
  /**
   * Additional paths that the sandboxed process needs read-only access to.
   */
  readOnlyPaths?: string[];
  /**
   * Whether the sandboxed process needs network access.
   * Defaults to true.
   */
  allowNetwork?: boolean;
  /**
   * Environment variables to pass to the sandboxed process.
   */
  env?: Record<string, string | undefined>;
  /**
   * Input to pipe to the process stdin.
   */
  input?: string;
  /**
   * Abort signal for cancellation.
   */
  cancelSignal?: AbortSignal;
}

/**
 * Builds the bubblewrap (bwrap) arguments for sandboxed execution.
 */
function buildBubblewrapArgs(
  command: string,
  args: string[],
  options: SandboxedExecOptions,
): string[] {
  const bwrapArgs: string[] = [
    // Unshare all namespaces for isolation
    "--unshare-all",
    // Die when parent process dies
    "--die-with-parent",
    // Start new session to prevent terminal access
    "--new-session",
  ];

  // Network access
  if (options.allowNetwork !== false) {
    bwrapArgs.push("--share-net");
  }

  // Basic filesystem setup
  // Read-only bind mounts for system directories
  const systemReadOnlyPaths = [
    "/usr",
    "/bin",
    "/sbin",
    "/lib",
    "/lib64",
    "/etc/ssl",
    "/etc/ca-certificates",
    "/etc/resolv.conf",
    "/etc/hosts",
    "/etc/nsswitch.conf",
    "/etc/passwd",
    "/etc/group",
  ];

  for (const p of systemReadOnlyPaths) {
    // Only bind paths that exist
    bwrapArgs.push("--ro-bind-try", p, p);
  }

  // Mount proc and dev
  bwrapArgs.push("--proc", "/proc");
  bwrapArgs.push("--dev", "/dev");

  // Tmpfs for /tmp
  bwrapArgs.push("--tmpfs", "/tmp");

  // Additional read-only paths
  if (options.readOnlyPaths) {
    for (const p of options.readOnlyPaths) {
      bwrapArgs.push("--ro-bind", p, p);
    }
  }

  // Writable paths - bind mount with write permissions
  if (options.writablePaths) {
    for (const p of options.writablePaths) {
      // Ensure parent directories exist and are accessible
      const parentDir = path.dirname(p);
      bwrapArgs.push("--bind", parentDir, parentDir);
    }
  }

  // Environment variables - explicitly pass them
  if (options.env) {
    for (const [key, value] of Object.entries(options.env)) {
      if (value !== undefined) {
        bwrapArgs.push("--setenv", key, value);
      }
    }
  }

  // Clear potentially dangerous environment variables
  bwrapArgs.push("--unsetenv", "LD_PRELOAD");
  bwrapArgs.push("--unsetenv", "LD_LIBRARY_PATH");

  // The command and its arguments come after --
  bwrapArgs.push("--", command, ...args);

  return bwrapArgs;
}

/**
 * Executes a command with optional bubblewrap sandboxing.
 *
 * When bubblewrap is enabled via SANDBOX_USE_BUBBLEWRAP=true, the command
 * will be executed inside a sandbox with:
 * - Isolated namespaces (PID, user, IPC, UTS, cgroup)
 * - Network access (optional, defaults to enabled)
 * - Read-only system directories
 * - Configurable writable paths for output
 *
 * @param command The command to execute
 * @param args Arguments for the command
 * @param options Sandbox and execution options
 * @returns The execa result promise
 */
export function sandboxedExec(
  command: string,
  args: string[],
  options: SandboxedExecOptions = {},
): ResultPromise {
  const useBubblewrap = serverConfig.sandbox.useBubblewrap;

  if (useBubblewrap) {
    logger.debug(
      `[Sandbox] Executing "${command}" with bubblewrap sandboxing`,
    );
    const bwrapArgs = buildBubblewrapArgs(command, args, options);

    // When using bubblewrap, env vars are passed via --setenv
    // Input is passed through execa
    const execaOptions: Options = {
      cancelSignal: options.cancelSignal,
      input: options.input,
    };

    return execa("bwrap", bwrapArgs, execaOptions);
  } else {
    // Direct execution without sandboxing
    logger.debug(`[Sandbox] Executing "${command}" without sandboxing`);
    const execaOptions: Options = {
      cancelSignal: options.cancelSignal,
      input: options.input,
      env: options.env,
    };
    return execa(command, args, execaOptions);
  }
}

/**
 * Executes a command with bubblewrap sandboxing using the execa template syntax.
 * This is a convenience function that mirrors the execa({ ...options })(command, args) pattern.
 *
 * @param options Sandbox and execution options
 * @returns A function that takes command and args
 */
export function sandboxedExecWithOptions(options: SandboxedExecOptions) {
  return (command: string, args: string[]): ResultPromise => {
    return sandboxedExec(command, args, options);
  };
}
