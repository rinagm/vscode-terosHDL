// Copyright 2024
// Carlos Alberto Ruiz Naranjo [carlosruiznaranjo@gmail.com]
//
// This file is part of TerosHDL
//
// Colibri is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Colibri is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Colibri.  If not, see <https://www.gnu.org/licenses/>.

import { ChildProcess } from 'child_process';
import { LoggerBase } from '../../../../src/colibri/logger/logger';
import { p_result } from '../../../../src/colibri/process/common';
import { e_tools_yosys_synthesis_target } from '../../../../src/colibri/config/config_declaration';
import {
    executeYosysScript,
    executeYosysScriptFile,
    executeYosysCommand,
    executeCommand,
    getBinary,
    quoteArgs
} from '../../../../src/colibri/project_manager/tool/yosys/executor';

// Mock dependencies
jest.mock('../../../../src/colibri/process/process');
jest.mock('../../../../src/colibri/project_manager/tool/yosys/commandBuilder');
jest.mock('../../../../src/colibri/utils/file_utils', () => ({
    check_if_path_exist: jest.fn()
}));
jest.mock('fs');

describe('Yosys Executor', (): void => {
    let mockLogger: LoggerBase;
    let mockCallback: (result: p_result) => void;

    beforeEach((): void => {
        // Create mock logger
        mockLogger = {
            appendLine: jest.fn(),
            log: jest.fn(),
            trace: jest.fn()
        } as unknown as LoggerBase;

        // Create mock callback
        mockCallback = jest.fn();

        // Clear all mocks before each test
        jest.clearAllMocks();

        // Mock Process class
        const mockProcess = jest.requireMock('../../../../src/colibri/process/process').Process;
        mockProcess.mockImplementation(() => ({
            exec: jest.fn((command: string, options: any, callback: (result: p_result) => void): ChildProcess => {
                const mockResult: p_result = {
                    command: command,
                    stdout: 'Execution successful',
                    stderr: '',
                    return_value: 0,
                    successful: true
                };
                setTimeout(() => callback(mockResult), 0);
                return { pid: 12345 } as ChildProcess;
            })
        }));

        // Mock file_utils with default return value
        const { check_if_path_exist } = jest.requireMock('../../../../src/colibri/utils/file_utils');
        check_if_path_exist.mockImplementation(() => false);

        // Mock commandBuilder
        const mockCommandBuilder = jest.requireMock('../../../../src/colibri/project_manager/tool/yosys/commandBuilder');
        mockCommandBuilder.buildYosysArgs = jest.fn(() => ({
            baseArgs: ['-q', '-T']
        }));
    });

    describe('quoteArgs', (): void => {
        it('should quote arguments that contain spaces', (): void => {
            const args = ['arg1', 'arg with spaces', 'another_arg', 'path with spaces/file.txt'];
            const result = quoteArgs(args);
            
            expect(result).toEqual(['arg1', '"arg with spaces"', 'another_arg', '"path with spaces/file.txt"']);
        });

        it('should not quote arguments without spaces', (): void => {
            const args = ['arg1', 'arg2', 'arg3'];
            const result = quoteArgs(args);
            
            expect(result).toEqual(['arg1', 'arg2', 'arg3']);
        });

        it('should handle empty array', (): void => {
            const args: string[] = [];
            const result = quoteArgs(args);
            
            expect(result).toEqual([]);
        });
    });

    describe('getBinary', (): void => {
        beforeEach((): void => {
            // Clear all mock calls before each test
            jest.clearAllMocks();
        });

        it('should return the correct binary path from config when specified', (): void => {
            const config = {
                installation_path: '/custom/path/to/yosys',
                synthesis_target: e_tools_yosys_synthesis_target.ice40
            } as any;

            // Mock file_utils to return false for yosys.exe and true for yosys
            const { check_if_path_exist } = jest.requireMock('../../../../src/colibri/utils/file_utils');
            check_if_path_exist
                .mockImplementationOnce(() => false) // First call: yosys.exe
                .mockImplementationOnce(() => true);  // Second call: yosys

            const binary = getBinary(config);
            expect(binary).toBe('/custom/path/to/yosys/yosys');
            expect(check_if_path_exist).toHaveBeenCalledTimes(2);
            expect(check_if_path_exist).toHaveBeenNthCalledWith(1, '/custom/path/to/yosys/yosys.exe');
            expect(check_if_path_exist).toHaveBeenNthCalledWith(2, '/custom/path/to/yosys/yosys');
        });

        it('should return the exe path when yosys.exe exists', (): void => {
            const config = {
                installation_path: '/custom/path/to/yosys',
                synthesis_target: e_tools_yosys_synthesis_target.ice40
            } as any;

            // Mock file_utils to return true for yosys.exe
            const { check_if_path_exist } = jest.requireMock('../../../../src/colibri/utils/file_utils');
            check_if_path_exist.mockImplementationOnce(() => true);

            const binary = getBinary(config);
            expect(binary).toBe('/custom/path/to/yosys/yosys.exe');
            expect(check_if_path_exist).toHaveBeenCalledTimes(1);
            expect(check_if_path_exist).toHaveBeenCalledWith('/custom/path/to/yosys/yosys.exe');
        });

        it('should return default binary name when no installation path is specified', (): void => {
            const config = {
                installation_path: '',
                synthesis_target: e_tools_yosys_synthesis_target.ice40
            } as any;

            const { check_if_path_exist } = jest.requireMock('../../../../src/colibri/utils/file_utils');

            const binary = getBinary(config);
            expect(binary).toBe('yosys');
            // Should not call file_utils when installation_path is empty
            expect(check_if_path_exist).not.toHaveBeenCalled();
        });

        it('should fall back to default when installation path does not exist', (): void => {
            const config = {
                installation_path: '/nonexistent/path',
                synthesis_target: e_tools_yosys_synthesis_target.ice40
            } as any;

            // Mock file_utils to return false for both paths
            const { check_if_path_exist } = jest.requireMock('../../../../src/colibri/utils/file_utils');
            check_if_path_exist.mockImplementation(() => false);

            const binary = getBinary(config);
            expect(binary).toBe('yosys');
            expect(check_if_path_exist).toHaveBeenCalledTimes(2);
            expect(check_if_path_exist).toHaveBeenNthCalledWith(1, '/nonexistent/path/yosys.exe');
            expect(check_if_path_exist).toHaveBeenNthCalledWith(2, '/nonexistent/path/yosys');
        });
    });

    describe('executeYosysScript', (): void => {
        it('should execute yosys script with correct parameters', (done): void => {
            const config = {
                installation_path: '',
                synthesis_target: e_tools_yosys_synthesis_target.ice40
            } as any;
            const script = 'read_verilog test.v; hierarchy -top top_module';
            const cwd = '/test/project/path';

            const result = executeYosysScript(config, script, cwd, mockLogger, (result: p_result): void => {
                expect(result).toBeDefined();
                expect(result.successful).toBe(true);
                expect(result.stdout).toContain('Execution successful');
                expect(mockLogger.appendLine).toHaveBeenCalledWith(`[Yosys] Executing script: ${script}`);
                done();
            });

            expect(result).toBeDefined();
            expect(result.pid).toBe(12345);
        });

        it('should handle empty script', (done): void => {
            const config = {
                installation_path: '',
                synthesis_target: e_tools_yosys_synthesis_target.ice40
            } as any;
            const script = '';
            const cwd = '/test/project/path';

            const result = executeYosysScript(config, script, cwd, mockLogger, (result: p_result): void => {
                expect(result).toBeDefined();
                expect(result.successful).toBe(true);
                expect(mockLogger.appendLine).toHaveBeenCalledWith('[Yosys] Executing script: ');
                done();
            });

            expect(result).toBeDefined();
        });
    });

    describe('executeYosysScriptFile', (): void => {
        it('should execute yosys script file with correct parameters', (done): void => {
            const config = {
                installation_path: '',
                synthesis_target: e_tools_yosys_synthesis_target.ice40
            } as any;
            const scriptPath = '/test/script.ys';
            const cwd = '/test/project/path';

            const result = executeYosysScriptFile(config, scriptPath, cwd, mockLogger, (result: p_result): void => {
                expect(result).toBeDefined();
                expect(result.successful).toBe(true);
                expect(mockLogger.appendLine).toHaveBeenCalledWith(`[Yosys] Executing script file: ${scriptPath}`);
                done();
            });

            expect(result).toBeDefined();
            expect(result.pid).toBe(12345);
        });
    });

    describe('executeYosysCommand', (): void => {
        it('should execute yosys command with correct parameters', (done): void => {
            const config = {
                installation_path: '',
                synthesis_target: e_tools_yosys_synthesis_target.ice40
            } as any;
            const args = ['-p', 'hierarchy -top test'];
            const cwd = '/test/project/path';

            const result = executeYosysCommand(config, args, cwd, mockLogger, (result: p_result): void => {
                expect(result).toBeDefined();
                expect(result.successful).toBe(true);
                expect(mockLogger.appendLine).toHaveBeenCalledWith(expect.stringContaining('[Yosys] Executing command:'));
                done();
            });

            expect(result).toBeDefined();
            expect(result.pid).toBe(12345);
        });

        it('should properly quote arguments with spaces', (done): void => {
            const config = {
                installation_path: '',
                synthesis_target: e_tools_yosys_synthesis_target.ice40
            } as any;
            const args = ['-p', 'read_verilog "/path with spaces/test.v"'];
            const cwd = '/test/project/path';

            executeYosysCommand(config, args, cwd, mockLogger, (result: p_result): void => {
                expect(result).toBeDefined();
                expect(result.successful).toBe(true);
                done();
            });
        });
    });

    describe('executeCommand', (): void => {
        it('should execute command with correct parameters', (done): void => {
            const command = 'xdg-open /test/project/path';
            const cwd = '/test/project/path';

            const result = executeCommand(command, cwd, mockLogger, (result: p_result): void => {
                expect(result).toBeDefined();
                expect(result.successful).toBe(true);
                expect(mockLogger.appendLine).toHaveBeenCalledWith(`[Yosys] Executing command: ${command}`);
                done();
            });

            expect(result).toBeDefined();
            expect(result.pid).toBe(12345);
        });

        it('should handle command with spaces', (done): void => {
            const command = 'explorer "C:\\Program Files\\Project"';
            const cwd = '/test/project/path';

            const result = executeCommand(command, cwd, mockLogger, (result: p_result): void => {
                expect(result).toBeDefined();
                expect(result.successful).toBe(true);
                expect(mockLogger.appendLine).toHaveBeenCalledWith(`[Yosys] Executing command: ${command}`);
                done();
            });

            expect(result).toBeDefined();
        });
    });

    describe('Error Handling', (): void => {
        it('should handle process execution errors gracefully', (done): void => {
            // Mock Process to throw an error
            const mockProcess = jest.requireMock('../../../../src/colibri/process/process').Process;
            mockProcess.mockImplementationOnce(() => ({
                exec: jest.fn((command: string, options: any, callback: (result: p_result) => void): ChildProcess => {
                    const errorResult: p_result = {
                        command: command,
                        stdout: '',
                        stderr: 'Process execution failed',
                        return_value: 1,
                        successful: false
                    };
                    setTimeout(() => callback(errorResult), 0);
                    return { pid: 12345 } as ChildProcess;
                })
            }));

            const config = {
                installation_path: '',
                synthesis_target: e_tools_yosys_synthesis_target.ice40
            } as any;

            executeYosysScript(config, 'test script', '/test/path', mockLogger, (result: p_result): void => {
                expect(result).toBeDefined();
                expect(result.successful).toBe(false);
                expect(result.stderr).toContain('Process execution failed');
                done();
            });
        });

        it('should handle Process class instantiation errors', (): void => {
            // Mock Process constructor to throw an error
            const mockProcess = jest.requireMock('../../../../src/colibri/process/process').Process;
            mockProcess.mockImplementationOnce((): never => {
                throw new Error('Process creation failed');
            });

            const config = {
                installation_path: '',
                synthesis_target: e_tools_yosys_synthesis_target.ice40
            } as any;

            expect((): void => {
                executeYosysScript(config, 'test script', '/test/path', mockLogger, mockCallback);
            }).toThrow('Process creation failed');
        });
    });
});
