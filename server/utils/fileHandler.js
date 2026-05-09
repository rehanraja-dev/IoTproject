const fs = require('fs/promises');
const path = require('path');

async function ensureFile(filePath, defaultValue) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2));
  }
}

async function readJson(filePath, defaultValue) {
  await ensureFile(filePath, defaultValue);

  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    if (!fileContent.trim()) {
      return defaultValue;
    }
    return JSON.parse(fileContent);
  } catch (error) {
    return defaultValue;
  }
}

async function writeJson(filePath, data) {
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2));
  await fs.rename(tempPath, filePath);
}

module.exports = {
  ensureFile,
  readJson,
  writeJson,
};
