const util = require("util");
const exec = util.promisify(require("child_process").exec);

export const globalPackages = async () => {
  let yarn = await yarnPackages();
  let npm = await npmPackages();
  let pnpm = await pnpmPackages();
  return {
    yarn,
    npm,
    pnpm,
  };
};

export const yarnPackages = async () => {
  try {
    const { stdout } = await exec("yarn -v");
    return stdout;
  } catch (err) {
    return false;
  }
};

export const npmPackages = async () => {
  try {
    const { stdout } = await exec("npm -v");
    return stdout;
  } catch (err) {
    return false;
  }
};

export const pnpmPackages = async () => {
  try {
    const { stdout } = await exec("pnpm -v");
    return stdout;
  } catch (err) {
    return false;
  }
};
