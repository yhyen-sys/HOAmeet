const fs = require('fs');
const path = require('path');

const directoryPath = 'd:\\website\\HOAmeet\\frontend\\src';

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    content = content.replace(/indigo-/g, 'amber-');
    content = content.replace(/purple-/g, 'amber-');
    content = content.replace(/fuchsia-/g, 'amber-');
    content = content.replace(/emerald-/g, 'amber-');
    content = content.replace(/teal-/g, 'amber-');
    content = content.replace(/rose-/g, 'red-');

    content = content.replace(/slate-/g, 'stone-');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.jsx')) {
            replaceInFile(fullPath);
        }
    }
}

walkDir(directoryPath);
console.log("Done replacing classes.");
