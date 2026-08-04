import { readdirSync } from "fs";
import { extname, join } from "path";
import { spawnSync } from "child_process";

const ignoredDirectories = new Set(["node_modules", "logs", "uploads"]);

function findJavaScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : findJavaScriptFiles(path);
    }

    return extname(entry.name) === ".js" ? [path] : [];
  });
}

const files = findJavaScriptFiles(process.cwd());
let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    failed = true;
    process.stderr.write(result.stderr || `Syntax check failed: ${file}\n`);
  }
}

if (failed) process.exit(1);
console.log(`Syntax checked ${files.length} backend files.`);
