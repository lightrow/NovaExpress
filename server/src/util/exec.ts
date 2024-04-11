import subProcess from 'child_process';

export const exec = (cmd: string) => {
	try {
		subProcess.exec(cmd, (err, stdout, stderr) => {
			if (err) {
				console.warn('Cmd exec error:', err);
			} else {
				console.log(`The stdout: ${stdout.toString()}`);
				console.log(`The stderr: ${stderr.toString()}`);
			}
		});
	} catch (error) {
		console.log('exec failed:', error);
	}
};
