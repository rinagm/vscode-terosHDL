import * as vscode from 'vscode';

import { Multi_project_manager } from 'colibri/project_manager/multi_project_manager';

import { detectDevices } from 'colibri/project_manager/tool/openfpgaloader/deviceDetector';
import { listBoards } from 'colibri/project_manager/tool/openfpgaloader/boardDetector';
import { loadBitstream } from 'colibri/project_manager/tool/openfpgaloader/bitstreamLoader';

import { OpenFPGALoaderManager } from '../../../../src/teroshdl/features/openfpgaloader/manager';

jest.mock('vscode', () => {
    const commandHandlers = new Map<string, (...args: unknown[]) => unknown>();

    return {
        commands: {
            registerCommand: jest.fn((command: string, callback: (...args: unknown[]) => unknown) => {
                commandHandlers.set(command, callback);
                return { dispose: jest.fn() };
            })
        },
        window: {
            showQuickPick: jest.fn(),
            showOpenDialog: jest.fn(),
            showErrorMessage: jest.fn(),
            showWarningMessage: jest.fn(),
            showInformationMessage: jest.fn()
        },
        commandHandlers
    };
}, { virtual: true });

jest.mock('colibri/project_manager/tool/openfpgaloader/deviceDetector', () => ({
    detectDevices: jest.fn()
}));

jest.mock('colibri/project_manager/tool/openfpgaloader/boardDetector', () => ({
    listBoards: jest.fn()
}));

jest.mock('colibri/project_manager/tool/openfpgaloader/bitstreamLoader', () => ({
    loadBitstream: jest.fn()
}));

jest.mock('../../../../src/teroshdl/logger', () => ({
    toolLogger: {
        appendLine: jest.fn(),
        show: jest.fn()
    }
}));

type VscodeMock = {
    commands: {
        registerCommand: jest.Mock;
    };
    window: {
        showQuickPick: jest.Mock;
        showOpenDialog: jest.Mock;
        showErrorMessage: jest.Mock;
        showWarningMessage: jest.Mock;
        showInformationMessage: jest.Mock;
    };
    commandHandlers: Map<string, (...args: unknown[]) => unknown>;
};

const vscodeMock = jest.requireMock('vscode') as VscodeMock;

const mockedDetectDevices = detectDevices as jest.MockedFunction<typeof detectDevices>;
const mockedListBoards = listBoards as jest.MockedFunction<typeof listBoards>;
const mockedLoadBitstream = loadBitstream as jest.MockedFunction<typeof loadBitstream>;

const COMMAND_DETECT = 'teroshdl.devices.detect';
const COMMAND_LOAD = 'teroshdl.devices.load_bitstream';
const SELECTED_DEVICE_KEY = 'openfpgaloader.selectedDevice';

const config = {
    installation_path: ''
};

const project = {
    get_config: jest.fn(() => ({
        tools: {
            openfpgaloader: config
        }
    })),
    projectDiskPath: '/workspace/project'
};

const projectManager = {
    get_selected_project: jest.fn(() => project)
};

const mockedGetSelectedProject = projectManager.get_selected_project;

const globalStateValues = new Map<string, unknown>();

const globalState = {
    get: jest.fn((key: string) => globalStateValues.get(key)),
    update: jest.fn(async (key: string, value: unknown) => {
        globalStateValues.set(key, value);
    })
};

const context = {
    subscriptions: [],
    globalState
};

const selectedDevice = {
    family: 'Xilinx',
    model: 'xc7a35t'
};

const selectedBoard = {
    name: 'arty',
    cable: 'digilent'
};

async function executeCommand(command: string): Promise<void> {
    const callback = vscodeMock.commandHandlers.get(command);

    if (!callback) {
        throw new Error(`Command not registered: ${command}`);
    }

    await callback();
}

function createManager(): OpenFPGALoaderManager {
    return new OpenFPGALoaderManager(
        context as unknown as vscode.ExtensionContext,
        projectManager as unknown as Multi_project_manager
    );
}

function registerCommandMock(): void {
    vscodeMock.commands.registerCommand.mockImplementation(
        (command: string, callback: (...args: unknown[]) => unknown) => {
            vscodeMock.commandHandlers.set(command, callback);
            return { dispose: jest.fn() };
        }
    );
}

describe('OpenFPGALoaderManager', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        vscodeMock.commandHandlers.clear();
        globalStateValues.clear();
        context.subscriptions.length = 0;

        registerCommandMock();
    });

    describe('command registration', () => {
        it('registers the detect and load bitstream commands', () => {
            createManager();

            expect(vscodeMock.commands.registerCommand).toHaveBeenCalledTimes(2);
            expect(vscodeMock.commands.registerCommand).toHaveBeenCalledWith(
                COMMAND_DETECT,
                expect.any(Function)
            );
            expect(vscodeMock.commands.registerCommand).toHaveBeenCalledWith(
                COMMAND_LOAD,
                expect.any(Function)
            );
            expect(context.subscriptions).toHaveLength(2);
        });
    });

    describe('detect', () => {
        it('detects devices and stores the selected device', async () => {
            createManager();

            mockedDetectDevices.mockResolvedValueOnce({
                board_list: [
                    {
                        family: 'Xilinx',
                        part_list: ['xc7a35t']
                    }
                ],
                successful: true,
                msg: ''
            });

            vscodeMock.window.showQuickPick.mockResolvedValueOnce({
                label: 'Xilinx — xc7a35t',
                family: selectedDevice.family,
                model: selectedDevice.model
            });

            await executeCommand(COMMAND_DETECT);

            expect(mockedDetectDevices).toHaveBeenCalledWith(
                config,
                project.projectDiskPath
            );
            expect(vscodeMock.window.showQuickPick).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        label: 'Xilinx — xc7a35t',
                        family: 'Xilinx',
                        model: 'xc7a35t'
                    })
                ]),
                expect.any(Object)
            );
            expect(globalState.update).toHaveBeenCalledWith(
                SELECTED_DEVICE_KEY,
                selectedDevice
            );
        });

        it('shows an information message when no devices are found', async () => {
            createManager();

            mockedDetectDevices.mockResolvedValueOnce({
                board_list: [],
                successful: true,
                msg: ''
            });

            await executeCommand(COMMAND_DETECT);

            expect(vscodeMock.window.showInformationMessage).toHaveBeenCalledWith(
                'OpenFPGALoader: no devices were found.'
            );
            expect(vscodeMock.window.showQuickPick).not.toHaveBeenCalled();
            expect(globalState.update).not.toHaveBeenCalled();
        });

        it('shows an error when device detection fails', async () => {
            createManager();

            mockedDetectDevices.mockResolvedValueOnce({
                board_list: [],
                successful: false,
                msg: 'OpenFPGALoader not found'
            });

            await executeCommand(COMMAND_DETECT);

            expect(vscodeMock.window.showErrorMessage).toHaveBeenCalledWith(
                'OpenFPGALoader: OpenFPGALoader not found'
            );
            expect(vscodeMock.window.showQuickPick).not.toHaveBeenCalled();
        });

        it('does not store a device when the QuickPick is cancelled', async () => {
            createManager();

            mockedDetectDevices.mockResolvedValueOnce({
                board_list: [
                    {
                        family: 'Xilinx',
                        part_list: ['xc7a35t']
                    }
                ],
                successful: true,
                msg: ''
            });

            vscodeMock.window.showQuickPick.mockResolvedValueOnce(undefined);

            await executeCommand(COMMAND_DETECT);

            expect(globalState.update).not.toHaveBeenCalled();
        });
    });

    describe('bitstream loading', () => {
        it('shows a warning when no device is selected', async () => {
            createManager();

            await executeCommand(COMMAND_LOAD);

            expect(vscodeMock.window.showWarningMessage).toHaveBeenCalledWith(
                'OpenFPGALoader: first detect a device before loading a bitstream.'
            );
            expect(mockedListBoards).not.toHaveBeenCalled();
            expect(mockedLoadBitstream).not.toHaveBeenCalled();
        });

        it('shows an error when listing supported boards fails', async () => {
            createManager();

            globalStateValues.set(SELECTED_DEVICE_KEY, selectedDevice);

            mockedListBoards.mockResolvedValueOnce({
                board_list: [],
                successful: false,
                msg: 'Unable to list boards'
            });

            await executeCommand(COMMAND_LOAD);

            expect(mockedListBoards).toHaveBeenCalledWith(
                config,
                project.projectDiskPath
            );
            expect(vscodeMock.window.showErrorMessage).toHaveBeenCalledWith(
                'OpenFPGALoader: Unable to list boards'
            );
            expect(mockedLoadBitstream).not.toHaveBeenCalled();
        });

        it('shows a warning when no supported boards are found', async () => {
            createManager();

            globalStateValues.set(SELECTED_DEVICE_KEY, selectedDevice);

            mockedListBoards.mockResolvedValueOnce({
                board_list: [],
                successful: true,
                msg: ''
            });

            await executeCommand(COMMAND_LOAD);

            expect(vscodeMock.window.showWarningMessage).toHaveBeenCalledWith(
                'OpenFPGALoader: no supported boards were found.'
            );
            expect(vscodeMock.window.showQuickPick).not.toHaveBeenCalled();
        });

        it('loads the bitstream using the selected board name', async () => {
            createManager();

            globalStateValues.set(SELECTED_DEVICE_KEY, selectedDevice);

            mockedListBoards.mockResolvedValueOnce({
                board_list: [selectedBoard],
                successful: true,
                msg: ''
            });

            vscodeMock.window.showQuickPick.mockResolvedValueOnce({
                label: selectedBoard.name,
                description: 'Cable: digilent',
                board: selectedBoard
            });

            vscodeMock.window.showOpenDialog.mockResolvedValueOnce([
                {
                    fsPath: '/workspace/project/design.bit'
                }
            ]);

            mockedLoadBitstream.mockResolvedValueOnce({
                successful: true,
                msg: ''
            });

            await executeCommand(COMMAND_LOAD);

            expect(mockedLoadBitstream).toHaveBeenCalledWith(
                config,
                'arty',
                '/workspace/project/design.bit',
                {
                    verify: true,
                    reset: false
                }
            );
            expect(vscodeMock.window.showInformationMessage).toHaveBeenCalledWith(
                'OpenFPGALoader: bitstream loaded to arty'
            );
        });

        it('does not open the file dialog when board selection is cancelled', async () => {
            createManager();

            globalStateValues.set(SELECTED_DEVICE_KEY, selectedDevice);

            mockedListBoards.mockResolvedValueOnce({
                board_list: [selectedBoard],
                successful: true,
                msg: ''
            });

            vscodeMock.window.showQuickPick.mockResolvedValueOnce(undefined);

            await executeCommand(COMMAND_LOAD);

            expect(vscodeMock.window.showOpenDialog).not.toHaveBeenCalled();
            expect(mockedLoadBitstream).not.toHaveBeenCalled();
        });

        it('does not load a bitstream when file selection is cancelled', async () => {
            createManager();

            globalStateValues.set(SELECTED_DEVICE_KEY, selectedDevice);

            mockedListBoards.mockResolvedValueOnce({
                board_list: [selectedBoard],
                successful: true,
                msg: ''
            });

            vscodeMock.window.showQuickPick.mockResolvedValueOnce({
                label: selectedBoard.name,
                description: 'Cable: digilent',
                board: selectedBoard
            });

            vscodeMock.window.showOpenDialog.mockResolvedValueOnce(undefined);

            await executeCommand(COMMAND_LOAD);

            expect(mockedLoadBitstream).not.toHaveBeenCalled();
        });

        it('rejects unsupported bitstream file extensions', async () => {
            createManager();

            globalStateValues.set(SELECTED_DEVICE_KEY, selectedDevice);

            mockedListBoards.mockResolvedValueOnce({
                board_list: [selectedBoard],
                successful: true,
                msg: ''
            });

            vscodeMock.window.showQuickPick.mockResolvedValueOnce({
                label: selectedBoard.name,
                description: 'Cable: digilent',
                board: selectedBoard
            });

            vscodeMock.window.showOpenDialog.mockResolvedValueOnce([
                {
                    fsPath: '/workspace/project/design.txt'
                }
            ]);

            await executeCommand(COMMAND_LOAD);

            expect(vscodeMock.window.showErrorMessage).toHaveBeenCalledWith(
                'OpenFPGALoader: unsupported bitstream file extension.'
            );
            expect(mockedLoadBitstream).not.toHaveBeenCalled();
        });

        it('shows an error when bitstream loading fails', async () => {
            createManager();

            globalStateValues.set(SELECTED_DEVICE_KEY, selectedDevice);

            mockedListBoards.mockResolvedValueOnce({
                board_list: [selectedBoard],
                successful: true,
                msg: ''
            });

            vscodeMock.window.showQuickPick.mockResolvedValueOnce({
                label: selectedBoard.name,
                description: 'Cable: digilent',
                board: selectedBoard
            });

            vscodeMock.window.showOpenDialog.mockResolvedValueOnce([
                {
                    fsPath: '/workspace/project/design.bit'
                }
            ]);

            mockedLoadBitstream.mockResolvedValueOnce({
                successful: false,
                msg: 'Programming failed'
            });

            await executeCommand(COMMAND_LOAD);

            expect(vscodeMock.window.showErrorMessage).toHaveBeenCalledWith(
                'OpenFPGALoader: Programming failed'
            );
        });
    });

    describe('project validation', () => {
        it('shows a warning when detect is called without a selected project', async () => {
            createManager();

            mockedGetSelectedProject.mockImplementationOnce(() => {
                throw Object.assign(new Error('No project selected'), {
                    name: 'ProjectOperationError'
                });
            });

            await executeCommand(COMMAND_DETECT);

            expect(vscodeMock.window.showWarningMessage).toHaveBeenCalledWith(
                'OpenFPGALoader: you must first select a project.'
            );
            expect(mockedDetectDevices).not.toHaveBeenCalled();
        });

        it('shows a warning when load bitstream is called without a selected project', async () => {
            createManager();

            mockedGetSelectedProject.mockImplementationOnce(() => {
                throw Object.assign(new Error('No project selected'), {
                    name: 'ProjectOperationError'
                });
            });

            await executeCommand(COMMAND_LOAD);

            expect(vscodeMock.window.showWarningMessage).toHaveBeenCalledWith(
                'OpenFPGALoader: you must first select a project.'
            );
            expect(mockedListBoards).not.toHaveBeenCalled();
            expect(mockedLoadBitstream).not.toHaveBeenCalled();
        });
    });
});
