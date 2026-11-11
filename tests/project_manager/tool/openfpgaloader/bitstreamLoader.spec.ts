import * as path from 'path';
import * as file_utils from 'colibri/utils/file_utils';
import { executeCommandWait } from 'colibri/project_manager/tool/openfpgaloader/executor';
import { loadBitstream } from 'colibri/project_manager/tool/openfpgaloader/bitstreamLoader';
import { t_openfpgaloader_config } from 'colibri/project_manager/tool/openfpgaloader/utils';

jest.mock('colibri/utils/file_utils', () => ({
	check_if_path_exist: jest.fn()
}));

jest.mock('colibri/project_manager/tool/openfpgaloader/executor', () => ({
	executeCommandWait: jest.fn()
}));

describe('bitstreamLoader', () => {
	const config: t_openfpgaloader_config = {
		installation_path: ''
	};

	const boardId = 'icebreaker';
	const bitstreamPath = '/project/build/design.bit';
	const absoluteBitstreamPath = path.resolve(bitstreamPath);

	beforeEach(() => {
		jest.clearAllMocks();

		(file_utils.check_if_path_exist as jest.Mock).mockReturnValue(true);
		(executeCommandWait as jest.Mock).mockResolvedValue({
			successful: true,
			stdout: 'Programming completed successfully.',
			stderr: '',
			return_value: 0,
			error_code: null
		});
	});

	it('should return an error when no board is specified', async () => {
		const result = await loadBitstream(
			config,
			'',
			bitstreamPath
		);

		expect(result).toEqual({
			successful: false,
			msg: 'No board or device has been specified.'
		});

		expect(executeCommandWait).not.toHaveBeenCalled();
	});

	it('should return an error when no bitstream path is specified', async () => {
		const result = await loadBitstream(
			config,
			boardId,
			''
		);

		expect(result).toEqual({
			successful: false,
			msg: 'No bitstream file has been specified.'
		});

		expect(executeCommandWait).not.toHaveBeenCalled();
	});

	it('should return an error when the bitstream file does not exist', async () => {
		(file_utils.check_if_path_exist as jest.Mock).mockReturnValue(false);

		const result = await loadBitstream(
			config,
			boardId,
			bitstreamPath
		);

		expect(result).toEqual({
			successful: false,
			msg: `Bitstream file not found: ${absoluteBitstreamPath}`
		});

		expect(file_utils.check_if_path_exist).toHaveBeenCalledWith(
			absoluteBitstreamPath
		);
		expect(executeCommandWait).not.toHaveBeenCalled();
	});

	it('should return an error when the JTAG frequency is zero', async () => {
		const result = await loadBitstream(
			config,
			boardId,
			bitstreamPath,
			{ freq: 0 }
		);

		expect(result).toEqual({
			successful: false,
			msg: 'JTAG frequency must be a positive number.'
		});

		expect(executeCommandWait).not.toHaveBeenCalled();
	});

	it('should return an error when the JTAG frequency is negative', async () => {
		const result = await loadBitstream(
			config,
			boardId,
			bitstreamPath,
			{ freq: -1 }
		);

		expect(result).toEqual({
			successful: false,
			msg: 'JTAG frequency must be a positive number.'
		});

		expect(executeCommandWait).not.toHaveBeenCalled();
	});

	it('should return an error when the JTAG frequency is not finite', async () => {
		const result = await loadBitstream(
			config,
			boardId,
			bitstreamPath,
			{ freq: Number.NaN }
		);

		expect(result).toEqual({
			successful: false,
			msg: 'JTAG frequency must be a positive number.'
		});

		expect(executeCommandWait).not.toHaveBeenCalled();
	});

	it('should return an error when the cable identifier is empty', async () => {
		const result = await loadBitstream(
			config,
			boardId,
			bitstreamPath,
			{ cable: '   ' }
		);

		expect(result).toEqual({
			successful: false,
			msg: 'JTAG cable identifier cannot be empty.'
		});

		expect(executeCommandWait).not.toHaveBeenCalled();
	});

	it('should execute OpenFPGALoader with the required arguments', async () => {
		const result = await loadBitstream(
			config,
			` ${boardId} `,
			bitstreamPath
		);

		expect(result).toEqual({
			successful: true,
			msg: 'Programming completed successfully.'
		});

		expect(executeCommandWait).toHaveBeenCalledWith(
			config,
			['-b', boardId, absoluteBitstreamPath],
			path.dirname(absoluteBitstreamPath)
		);
	});

	it('should execute OpenFPGALoader with all optional arguments', async () => {
		const result = await loadBitstream(
			config,
			boardId,
			bitstreamPath,
			{
				cable: '  dirtyJtag  ',
				verify: true,
				reset: true,
				freq: 6000000
			}
		);

		expect(result.successful).toBe(true);

		expect(executeCommandWait).toHaveBeenCalledWith(
			config,
			[
				'-b',
				boardId,
				absoluteBitstreamPath,
				'--cable',
				'dirtyJtag',
				'--verify',
				'--reset',
				'--freq',
				'6000000'
			],
			path.dirname(absoluteBitstreamPath)
		);
	});

	it('should return the command output when execution fails', async () => {
		(executeCommandWait as jest.Mock).mockResolvedValue({
			successful: false,
			stdout: 'Programming started.',
			stderr: 'Device not responding.',
			return_value: 1,
			error_code: null
		});

		const result = await loadBitstream(
			config,
			boardId,
			bitstreamPath
		);

		expect(result).toEqual({
			successful: false,
			msg: 'Programming started.\nDevice not responding.'
		});
	});

	it('should return an empty message when the command succeeds without output', async () => {
		(executeCommandWait as jest.Mock).mockResolvedValue({
			successful: true,
			stdout: '',
			stderr: '',
			return_value: 0,
			error_code: null
		});

		const result = await loadBitstream(
			config,
			boardId,
			bitstreamPath
		);

		expect(result).toEqual({
			successful: true,
			msg: ''
		});
	});

	it('should handle an exception during command execution', async () => {
		(executeCommandWait as jest.Mock).mockRejectedValue(
			new Error('Process execution failed.')
		);

		const result = await loadBitstream(
			config,
			boardId,
			bitstreamPath
		);

		expect(result).toEqual({
			successful: false,
			msg: 'Process execution failed.'
		});
	});

	it('should handle an unknown exception during command execution', async () => {
		(executeCommandWait as jest.Mock).mockRejectedValue('Unexpected error');

		const result = await loadBitstream(
			config,
			boardId,
			bitstreamPath
		);

		expect(result).toEqual({
			successful: false,
			msg: 'Unknown error while executing OpenFPGALoader.'
		});
	});
});