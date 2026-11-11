import * as path from 'path';
import { ChildProcess, spawn } from 'child_process';
import * as file_utils from 'colibri/utils/file_utils';
import { t_loader_action_result } from '../common';
import { executeCommandWait } from './executor';
import { t_openfpgaloader_config } from './utils';
import { getBinary } from './executor';

export type t_openfpgaloader_load_options = {
	cable?: string;
	verify?: boolean;
	reset?: boolean;
	freq?: number;
	timeoutSeconds?: number;
};

function mapLoadErrorMessage(rawOutput: string): string {
	const output = rawOutput.trim();
	const lower = output.toLowerCase();

	if (lower.includes('device busy') || lower.includes('resource busy') || lower.includes('in use')) {
		return 'Device busy. Another process is using the JTAG cable/device.';
	}

	if (lower.includes('permission denied') || lower.includes('access denied')) {
		return 'Permission denied while accessing the JTAG cable/device.';
	}

	if (lower.includes('timeout')) {
		return 'Bitstream load timed out.';
	}

	return output;
}

export function extractProgressPercent(line: string): number | undefined {
	const progressMatch = line.match(/\[.*\]\s*(\d+)%/);
	if (!progressMatch) {
		return undefined;
	}

	const percent = Number.parseInt(progressMatch[1], 10);
	if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
		return undefined;
	}

	return percent;
}

export function buildLoadArgs(
	boardId: string,
	bitstreamPath: string,
	options: t_openfpgaloader_load_options = {}
): string[] {
	const args = ['-b', boardId.trim(), bitstreamPath];

	if (options.cable !== undefined) {
		args.push('--cable', options.cable.trim());
	}

	if (options.verify) {
		args.push('--verify');
	}

	if (options.reset) {
		args.push('--reset');
	}

	if (options.freq !== undefined) {
		args.push('--freq', String(options.freq));
	}

	return args;
}

function validateLoadInputs(
	boardId: string,
	bitstreamPath: string,
	options: t_openfpgaloader_load_options
): t_loader_action_result | undefined {
	if (!boardId || boardId.trim() === '') {
		return {
			successful: false,
			msg: 'No board or device has been specified.'
		};
	}

	if (!bitstreamPath || bitstreamPath.trim() === '') {
		return {
			successful: false,
			msg: 'No bitstream file has been specified.'
		};
	}

	const absoluteBitstreamPath = path.resolve(bitstreamPath);
	if (!file_utils.check_if_path_exist(absoluteBitstreamPath)) {
		return {
			successful: false,
			msg: `Bitstream file not found: ${absoluteBitstreamPath}`
		};
	}

	if (
		options.freq !== undefined &&
		(!Number.isFinite(options.freq) || options.freq <= 0)
	) {
		return {
			successful: false,
			msg: 'JTAG frequency must be a positive number.'
		};
	}

	if (options.cable !== undefined && options.cable.trim() === '') {
		return {
			successful: false,
			msg: 'JTAG cable identifier cannot be empty.'
		};
	}

	if (
		options.timeoutSeconds !== undefined &&
		(!Number.isFinite(options.timeoutSeconds) || options.timeoutSeconds <= 0)
	) {
		return {
			successful: false,
			msg: 'Timeout must be a positive number of seconds.'
		};
	}

	return undefined;
}

export async function loadBitstream(
	config: t_openfpgaloader_config,
	boardId: string,
	bitstreamPath: string,
	options: t_openfpgaloader_load_options = {}
): Promise<t_loader_action_result> {
	const inputError = validateLoadInputs(boardId, bitstreamPath, options);
	if (inputError) {
		return inputError;
	}

	const absoluteBitstreamPath = path.resolve(bitstreamPath);
	const args = buildLoadArgs(boardId, absoluteBitstreamPath, options);

	try {
		const result = await executeCommandWait(
			config,
			args,
			path.dirname(absoluteBitstreamPath),
			options.timeoutSeconds
		);
		const rawMessage = [result.stdout, result.stderr]
			.filter((message) => message !== '')
			.join('\n');
		const message = result.successful ? rawMessage : mapLoadErrorMessage(rawMessage);

		return {
			successful: result.successful,
			msg: message
		};
	}
	catch (error) {
		return {
			successful: false,
			msg: error instanceof Error
				? error.message
				: 'Unknown error while executing OpenFPGALoader.'
		};
	}
}

export function loadBitstreamStream(
	config: t_openfpgaloader_config,
	boardId: string,
	bitstreamPath: string,
	options: t_openfpgaloader_load_options,
	onOutput: (chunk: string) => void,
	callback: (result: t_loader_action_result) => void,
	onProgress?: (percent: number) => void
): ChildProcess | undefined {
	const inputError = validateLoadInputs(boardId, bitstreamPath, options);
	if (inputError) {
		setTimeout(() => callback(inputError), 0);
		return undefined;
	}

	const absoluteBitstreamPath = path.resolve(bitstreamPath);
	const args = buildLoadArgs(boardId, absoluteBitstreamPath, options);
	const binary = getBinary(config);

	const child = spawn(binary, args, {
		cwd: path.dirname(absoluteBitstreamPath),
		shell: false
	});

	let stdout = '';
	let stderr = '';

	const handleChunk = (chunk: Buffer | string, isStdErr: boolean) => {
		const text = chunk.toString();
		if (isStdErr) {
			stderr += text;
		}
		else {
			stdout += text;
		}
		onOutput(text);

		if (onProgress) {
			for (const line of text.split(/\r?\n/)) {
				const percent = extractProgressPercent(line);
				if (percent !== undefined) {
					onProgress(percent);
				}
			}
		}
	};

	child.stdout?.on('data', (chunk) => handleChunk(chunk, false));
	child.stderr?.on('data', (chunk) => handleChunk(chunk, true));

	child.on('error', (error) => {
		callback({
			successful: false,
			msg: error.message
		});
	});

	child.on('close', (code) => {
		const successful = code === 0;
		const rawMessage = [stdout.trim(), stderr.trim()]
			.filter((message) => message !== '')
			.join('\n');
		callback({
			successful,
			msg: successful ? rawMessage : mapLoadErrorMessage(rawMessage)
		});
	});

	return child;
}