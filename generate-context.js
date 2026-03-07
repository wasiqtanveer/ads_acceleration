import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputFile = path.join(__dirname, 'project-context.md');

const directoriesToScan = ['src'];
const extensionsToInclude = ['.jsx', '.js', '.css'];
const filesToInclude = ['package.json'];

let context = `# Amazon Agency Project Context\n\n`;
context += `This document contains the source code and configuration for the Amazon Agency React application.\n\n`;

function scanDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            scanDirectory(filePath);
        } else {
            const ext = path.extname(file);
            if (extensionsToInclude.includes(ext)) {
                appendFileToContext(filePath);
            }
        }
    }
}

function appendFileToContext(filePath) {
    const relativePath = path.relative(__dirname, filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath).substring(1) || 'text';

    context += `## File: ${relativePath}\n`;
    context += `\`\`\`${ext === 'jsx' ? 'javascript' : ext}\n`;
    context += content;
    context += `\n\`\`\`\n\n`;
}

// Add root files
for (const file of filesToInclude) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        appendFileToContext(filePath);
    }
}

// Add src files
for (const dir of directoriesToScan) {
    const dirPath = path.join(__dirname, dir);
    if (fs.existsSync(dirPath)) {
        scanDirectory(dirPath);
    }
}

fs.writeFileSync(outputFile, context);
console.log(`Context file generated at: ${outputFile}`);
