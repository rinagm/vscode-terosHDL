import * as path from 'path';
import * as file_utils from 'colibri/utils/file_utils';
import { t_loader_action_result } from '../common';
import { executeCommandWait } from './executor';
import { t_openfpgaloader_config } from './utils';

export type t_openfpgaloader_load_options = {
	cable?: string;
	verify?: boolean;
	reset?: boolean;
	freq?: number;
};

export async function loadBitstream(
	config: t_openfpgaloader_config,
	boardId: string,
	bitstreamPath: string,
	options: t_openfpgaloader_load_options = {}
): Promise<t_loader_action_result> {
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

	const args = ['-b', boardId.trim(), absoluteBitstreamPath];

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

	try {
		const result = await executeCommandWait(
			config,
			args,
			path.dirname(absoluteBitstreamPath)
		);

		return {
			successful: result.successful,
			msg: [result.stdout, result.stderr]
				.filter((message) => message !== '')
				.join('\n')
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