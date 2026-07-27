import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import type { ExecOpts, ExecResult, HostIO } from "@npmax/types";

export const nodeHost: HostIO = {
  async readFile(path: string) {
    return fs.readFile(path, "utf8");
  },
  async writeFile(path: string, content: string) {
    await fs.writeFile(path, content, "utf8");
  },
  async exists(path: string) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  },
  async readdir(path: string) {
    return fs.readdir(path);
  },
  async exec(cmd: string, args: string[], opts?: ExecOpts): Promise<ExecResult> {
    return new Promise((resolve) => {
      const child = spawn(cmd, args, {
        cwd: opts?.cwd,
        env: { ...process.env, ...opts?.env },
        shell: false,
      });
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => {
        child.kill();
        resolve({ stdout, stderr: stderr || "timeout", code: 124 });
      }, opts?.timeoutMs ?? 30_000);
      child.stdout.on("data", (d) => {
        stdout += String(d);
      });
      child.stderr.on("data", (d) => {
        stderr += String(d);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, code: code ?? 1 });
      });
    });
  },
};
