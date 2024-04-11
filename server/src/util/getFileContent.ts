const fs = require('fs');

export function getFileContent(filePath) {
	try {
		// Read the file content
		const fileContent = fs.readFileSync(filePath, 'utf8');
		return fileContent;
	} catch (error) {
		console.warn('Error reading file:', error);
		return null;
	}
}
