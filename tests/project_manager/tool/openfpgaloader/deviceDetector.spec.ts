import { detectDevices } from '../../../../src/colibri/project_manager/tool/openfpgaloader/deviceDetector';
import { executeCommandWait } from '../../../../src/colibri/project_manager/tool/openfpgaloader/executor';
import { p_result } from '../../../../src/colibri/process/common';

jest.mock('../../../../src/colibri/project_manager/tool/openfpgaloader/executor', () => ({
    executeCommandWait: jest.fn()
}));

const mockedExecuteCommandWait = executeCommandWait as jest.MockedFunction<typeof executeCommandWait>;

function createResult(
    stdout: string,
    stderr = '',
    successful = true
): p_result {
    return {
        command: 'openFPGALoader',
        stdout,
        stderr,
        return_value: successful ? 0 : -1,
        successful
    };
}

describe('openfpgaloader deviceDetector', () => {
    const config = {
        installation_path: ''
    };

    const cwd = '/tmp';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('detects devices using JSON output', async () => {
        const jsonOutput = JSON.stringify({
            devices: [
                {
                    family: 'ice40',
                    model: 'LP384-CM49'
                },
                {
                    family: 'CertusProNX',
                    model: 'LFCPNX-100'
                }
            ]
        });

        mockedExecuteCommandWait.mockResolvedValueOnce(
            createResult(jsonOutput)
        );

        const result = await detectDevices(config, cwd);

        expect(mockedExecuteCommandWait).toHaveBeenCalledTimes(1);
        expect(mockedExecuteCommandWait).toHaveBeenCalledWith(
            config,
            ['--detect', '--json'],
            cwd
        );

        expect(result).toEqual({
            board_list: [
                {
                    family: 'ice40',
                    part_list: ['LP384-CM49']
                },
                {
                    family: 'CertusProNX',
                    part_list: ['LFCPNX-100']
                }
            ],
            successful: true,
            msg: ''
        });
    });

    it('falls back to text detection when JSON execution fails', async () => {
        const textOutput = [
            'found 1 devices',
            'index 0: idcode 0x10f4043',
            'manufacturer lattice',
            'family ice40',
            'model LP384-CM49',
            'irlength 8'
        ].join('\n');

        mockedExecuteCommandWait
            .mockResolvedValueOnce(
                createResult('', 'Unknown option: --json', false)
            )
            .mockResolvedValueOnce(
                createResult(textOutput)
            );

        const result = await detectDevices(config, cwd);

        expect(mockedExecuteCommandWait).toHaveBeenCalledTimes(2);

        expect(mockedExecuteCommandWait).toHaveBeenNthCalledWith(
            1,
            config,
            ['--detect', '--json'],
            cwd
        );

        expect(mockedExecuteCommandWait).toHaveBeenNthCalledWith(
            2,
            config,
            ['--detect'],
            cwd
        );

        expect(result).toEqual({
            board_list: [
                {
                    family: 'ice40',
                    part_list: ['LP384-CM49']
                }
            ],
            successful: true,
            msg: ''
        });
    });

    it('falls back to text detection when JSON output cannot be parsed', async () => {
        const textOutput = [
            'found 1 devices',
            'index 0: idcode 0x10f4043',
            'family ice40',
            'model LP384-CM49'
        ].join('\n');

        mockedExecuteCommandWait
            .mockResolvedValueOnce(
                createResult('Invalid JSON')
            )
            .mockResolvedValueOnce(
                createResult(textOutput)
            );

        const result = await detectDevices(config, cwd);

        expect(mockedExecuteCommandWait).toHaveBeenCalledTimes(2);
        expect(result.successful).toBe(true);
        expect(result.board_list).toEqual([
            {
                family: 'ice40',
                part_list: ['LP384-CM49']
            }
        ]);
    });

    it('returns an error when text detection fails', async () => {
        mockedExecuteCommandWait
            .mockResolvedValueOnce(
                createResult('', 'Unknown option: --json', false)
            )
            .mockResolvedValueOnce(
                createResult('', 'usb_open() failed: Permission denied', false)
            );

        const result = await detectDevices(config, cwd);

        expect(result).toEqual({
            board_list: [],
            successful: false,
            msg: 'Permiso denegado. Configure las reglas udev para su cable JTAG.'
        });
    });

    it('returns an empty board list when no devices are detected', async () => {
        mockedExecuteCommandWait.mockResolvedValueOnce(
            createResult(JSON.stringify({ devices: [] }))
        );

        const result = await detectDevices(config, cwd);

        expect(result).toEqual({
            board_list: [],
            successful: true,
            msg: 'No se encontraron dispositivos'
        });
    });

    it('handles JSON output with a root array', async () => {
        const jsonOutput = JSON.stringify([
            {
                family: 'ice40',
                model: 'LP384-CM49'
            }
        ]);

        mockedExecuteCommandWait.mockResolvedValueOnce(
            createResult(jsonOutput)
        );

        const result = await detectDevices(config, cwd);

        expect(result.successful).toBe(true);
        expect(result.board_list).toEqual([
            {
                family: 'ice40',
                part_list: ['LP384-CM49']
            }
        ]);
    });
});