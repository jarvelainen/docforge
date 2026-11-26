import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = process.argv[2];
if (!project || !/^[a-z][a-z0-9-]*$/.test(project)) {
  console.error('Usage: npm run scaffold -- <project-name>');
  process.exitCode = 1;
} else {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const destination = path.join(root, 'projects', project);
  await mkdir(path.join(root, 'projects'), { recursive: true });
  await cp(path.join(root, 'packages', 'starter'), destination, { recursive: true, errorOnExist: true });
  const manifestPath = path.join(destination, 'project.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.id = project;
  manifest.languages.en.title = project.replaceAll('-', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const contentPath = path.join(destination, 'content', 'en', 'starter.md');
  const content = await readFile(contentPath, 'utf8');
  await writeFile(contentPath, content.replace('# DocForge Starter Publication', `# ${manifest.languages.en.title}`), 'utf8');
  console.log(`Created DocForge project at ${destination}`);
}
