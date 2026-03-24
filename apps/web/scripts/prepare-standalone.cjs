const fs = require("fs/promises");
const path = require("path");

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function replaceDir(source, destination) {
  if (!(await exists(source))) {
    return false;
  }

  await fs.rm(destination, { recursive: true, force: true });
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.cp(source, destination, { recursive: true, force: true });
  return true;
}

async function main() {
  const root = process.cwd();
  const standaloneAppRoot = path.join(root, ".next", "standalone", "apps", "web");

  const staticSource = path.join(root, ".next", "static");
  const staticDestination = path.join(standaloneAppRoot, ".next", "static");

  const publicSource = path.join(root, "public");
  const publicDestination = path.join(standaloneAppRoot, "public");

  const copiedStatic = await replaceDir(staticSource, staticDestination);
  const copiedPublic = await replaceDir(publicSource, publicDestination);

  if (!copiedStatic) {
    throw new Error(
      "Nao foi possivel localizar .next/static para preparar o standalone.",
    );
  }

  if (!copiedPublic) {
    console.warn("[prepare-standalone] Pasta public nao encontrada, seguindo sem copia.");
  }

  console.log("[prepare-standalone] Arquivos estaticos sincronizados no standalone.");
}

main().catch((error) => {
  console.error("[prepare-standalone] Falha:", error);
  process.exit(1);
});
