import path from 'path';
import fs from 'fs';

export class FileService {
	static ROOT = path.join(path.dirname(require.main.filename), '..');
	static CONFIG_DIR = path.join(this.ROOT, 'config');
	static DATA_DIR = path.join(this.ROOT, 'data');

	static getDataFile = (filePath: string) => {
		return this.getFileContent(path.join(this.DATA_DIR, filePath));
	};

	static getConfigFile = (filePath: string) => {
		return this.getFileContent(path.join(this.CONFIG_DIR, filePath));
	};

	static getFileContent = (filePath: string) => {
		try {
			if (!fs.existsSync(filePath)) {
				return null;
			}
			const fileContent = fs.readFileSync(filePath, 'utf8');
			return fileContent;
		} catch (error) {
			console.warn('Error reading file:', filePath);
			return null;
		}
	};

	static findInDataDir = (dir: string, id: string) => {
		const files = this.getDataDirContents(dir);
		const fileNames = files.filter(
			(file) => path.extname(file) !== '.DS_Store'
		);
		const matchedFile = fileNames.find((file) => {
			return file.includes(id);
		});
		if (matchedFile) {
			return this.getFileContent(path.join(this.DATA_DIR, dir, matchedFile));
		}
	};

	static getDataDirContents = (dir: string) => {
		return fs.readdirSync(path.join(this.DATA_DIR, dir));
	};

	static checkDataPathExists = (dataPath: string) => {
		return fs.existsSync(path.join(this.DATA_DIR, dataPath));
	};

	static appendToDataFile = (filePath: string, content: string) => {
		try {
			fs.appendFileSync(path.join(this.DATA_DIR, filePath), content);
		} catch (error) {
			console.warn('Failed to append to file:', path);
		}
	};

	static writeToDataFile = (filePath: string, content: string) => {
		try {
			fs.writeFileSync(path.join(this.DATA_DIR, filePath), content);
		} catch (error) {
			console.warn('Failed to write to file:', filePath, error);
		}
	};

	static deleteDataFile = (filePath: string) => {
		try {
			fs.rmSync(path.join(this.DATA_DIR, filePath));
		} catch (error) {
			console.warn('Failed to delete file:', filePath, error);
		}
	};

	static deleteDataDir = (filePath: string) => {
		try {
			fs.rmdirSync(path.join(this.DATA_DIR, filePath), {
				recursive: true,
			});
		} catch (error) {
			console.warn('Failed to delete file:', filePath, error);
		}
	};

	static cpDataFiles = (src: string, dest: string) => {
		try {
			fs.cpSync(path.join(this.DATA_DIR, src), path.join(this.DATA_DIR, dest), {
				recursive: true,
			});
		} catch (error) {
			console.warn('Failed to copy:', error);
		}
	};

	static mkDataDir = (name: string) => {
		try {
			fs.mkdirSync(path.join(this.DATA_DIR, name), { recursive: true });
		} catch (error) {
			console.warn('Failed to create dir:', error);
		}
	};

	static watchDataFile = (
		filePath: string,
		onChange: (changes: string) => void
	) => {
		const absPath = path.join(this.DATA_DIR, filePath);
		if (!fs.existsSync(absPath)) {
			this.writeToDataFile(filePath, '');
		}
		const watcher = fs.watch(absPath, () => {
			const newContent = this.getDataFile(filePath).trim();
			return onChange(newContent);
		});
		return watcher;
	};
}
