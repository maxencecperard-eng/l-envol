import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const tempIndex = path.resolve(rootDir, '.git', 'gh-pages-index');

console.log('📦 Building project...');
execSync('npm run build', { stdio: 'inherit', cwd: rootDir });

console.log('🌿 Staging distribution files to gh-pages...');
execSync(`GIT_WORK_TREE="${distDir}" GIT_INDEX_FILE="${tempIndex}" git add -A`, { cwd: rootDir });
const tree = execSync(`GIT_INDEX_FILE="${tempIndex}" git write-tree`, { cwd: rootDir }).toString().trim();
const commit = execSync(`git commit-tree ${tree} -m "deploy: update GitHub Pages build"`, { cwd: rootDir }).toString().trim();
execSync(`git branch -f gh-pages ${commit}`, { cwd: rootDir });

if (fs.existsSync(tempIndex)) {
  fs.unlinkSync(tempIndex);
}

console.log('🚀 Pushing to origin/gh-pages...');
execSync('git push -f origin gh-pages', { stdio: 'inherit', cwd: rootDir });
console.log('✅ Successfully published to GitHub Pages (gh-pages branch)!');
