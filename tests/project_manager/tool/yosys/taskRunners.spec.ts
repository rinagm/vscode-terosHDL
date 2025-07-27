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
// along with TerosHDL.  If not, see <https://www.gnu.org/licenses/>.

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ChildProcess } from 'child_process';
import { runTaskYosys } from '../../../../src/colibri/project_manager/tool/yosys/taskRunners';
import { e_taskType } from '../../../../src/colibri/project_manager/tool/common';
import { t_project_definition } from '../../../../src/colibri/project_manager/project_definition';
import { t_file, e_source_type, e_project_type } from '../../../../src/colibri/project_manager/common';
import { LANGUAGE, VERILOG_LANG_VERSION } from '../../../../src/colibri/common/general';
import { get_default_config } from '../../../../src/colibri/config/config_declaration';
import { File_manager } from '../../../../src/colibri/project_manager/list_manager/file';
import { Hook_manager } from '../../../../src/colibri/project_manager/list_manager/hook';
import { Parameter_manager } from '../../../../src/colibri/project_manager/list_manager/parameter';
import { Toplevel_path_manager } from '../../../../src/colibri/project_manager/list_manager/toplevel_path';
import { Watcher_manager } from '../../../../src/colibri/project_manager/list_manager/watcher';
import { p_result } from '../../../../src/colibri/process/common';
import { LoggerBase } from '../../../../src/colibri/logger/logger';

// Mock file_utils
jest.mock('../../../../src/colibri/utils/file_utils', (): any => ({
    check_if_path_exist: jest.fn((): boolean => true),
    create_directory: jest.fn(),
    check_default_version_for_filepath: jest.fn((filepath: string, version: any) => version)
}));

// Mock all the task functions
jest.mock('../../../../src/colibri/project_manager/tool/yosys/tasks', (): any => ({
    runYosysLoadFiles: jest.fn((
        project: any,
        logger: any,
        callback: (result: p_result) => void
    ): ChildProcess => {
        const mockResult: p_result = {
            command: 'yosys load files',
            stdout: 'Load files completed',
            stderr: '',
            return_value: 0,
            successful: true
        };
        setTimeout((): void => callback(mockResult), 0);
        return { pid: 12345 } as ChildProcess;
    }),
    runYosysAnalyze: jest.fn((
        project: any,
        logger: any,
        callback: (result: p_result) => void
    ): ChildProcess => {
        const mockResult: p_result = {
            command: 'yosys analyze',
            stdout: 'Analyze completed',
            stderr: '',
            return_value: 0,
            successful: true
        };
        setTimeout((): void => callback(mockResult), 0);
        return { pid: 12345 } as ChildProcess;
    }),
    runYosysElaborate: jest.fn((
        project: any,
        logger: any,
        callback: (result: p_result) => void
    ): ChildProcess => {
        const mockResult: p_result = {
            command: 'yosys elaborate',
            stdout: 'Elaborate completed',
            stderr: '',
            return_value: 0,
            successful: true
        };
        setTimeout((): void => callback(mockResult), 0);
        return { pid: 12345 } as ChildProcess;
    }),
    runYosysSynthesis: jest.fn((
        project: any,
        logger: any,
        callback: (result: p_result) => void
    ): ChildProcess => {
        const mockResult: p_result = {
            command: 'yosys synthesis',
            stdout: 'Synthesis completed',
            stderr: '',
            return_value: 0,
            successful: true
        };
        setTimeout((): void => callback(mockResult), 0);
        return { pid: 12345 } as ChildProcess;
    }),
    runYosysCompileAll: jest.fn((
        project: any,
        logger: any,
        callback: (result: p_result) => void
    ): ChildProcess => {
        const mockResult: p_result = {
            command: 'yosys compile all',
            stdout: 'Compile all completed',
            stderr: '',
            return_value: 0,
            successful: true
        };
        setTimeout((): void => callback(mockResult), 0);
        return { pid: 12345 } as ChildProcess;
    }),
    runYosysOpenProjectFolder: jest.fn((
        project: any,
        logger: any,
        callback: (result: p_result) => void
    ): ChildProcess => {
        const mockResult: p_result = {
            command: 'open project folder',
            stdout: 'Project folder opened',
            stderr: '',
            return_value: 0,
            successful: true
        };
        setTimeout((): void => callback(mockResult), 0);
        return { pid: 12345 } as ChildProcess;
    }),
    runYosysShow: jest.fn((
        project: any,
        logger: any,
        callback: (result: p_result) => void
    ): ChildProcess => {
        const mockResult: p_result = {
            command: 'yosys show',
            stdout: 'Show completed',
            stderr: '',
            return_value: 0,
            successful: true
        };
        setTimeout((): void => callback(mockResult), 0);
        return { pid: 12345 } as ChildProcess;
    }),
    runYosysResourceUtilization: jest.fn((
        project: any,
        logger: any,
        callback: (result: p_result) => void
    ): ChildProcess => {
        const mockResult: p_result = {
            command: 'yosys resource utilization',
            stdout: 'Resource utilization completed',
            stderr: '',
            return_value: 0,
            successful: true
        };
        setTimeout((): void => callback(mockResult), 0);
        return { pid: 12345 } as ChildProcess;
    })
}));

describe('Yosys Task Runners', (): void => {
    let testProject: t_project_definition;
    let mockLogger: LoggerBase;

    beforeEach((): void => {
        testProject = createTestProject();
        mockLogger = createMockLogger();
        jest.clearAllMocks();
    });

    function createTestProject(): t_project_definition {
        const fileManager = new File_manager();
        const hookManager = new Hook_manager();
        const parameterManager = new Parameter_manager();
        const toplevelPathManager = new Toplevel_path_manager();
        const watcherManager = new Watcher_manager((): void => {}, undefined);
        
        const config = get_default_config();

        // Add test files
        const verilogFile: t_file = {
            name: '/project/test.v',
            is_include_file: false,
            include_path: '',
            logical_name: '',
            is_manual: false,
            file_type: LANGUAGE.VERILOG,
            file_version: VERILOG_LANG_VERSION.v2000,
            source_type: e_source_type.NONE
        };

        fileManager.add(verilogFile);
        toplevelPathManager.add('test_top');

        return {
            name: 'Test Project',
            project_disk_path: '/project',
            project_type: e_project_type.GENERIC,
            file_manager: fileManager,
            hook_manager: hookManager,
            parameter_manager: parameterManager,
            toplevel_path_manager: toplevelPathManager,
            watcher_manager: watcherManager,
            config: config
        };
    }

    function createMockLogger(): LoggerBase {
        return {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        } as any;
    }

    describe('runTaskYosys', (): void => {
        it('should route YOSYS_LOAD_FILES task correctly', (done): void => {
            runTaskYosys(e_taskType.YOSYS_LOAD_FILES, testProject, mockLogger, (result: p_result): void => {
                expect(result).toBeDefined();
                expect(result.successful).toBe(true);
                expect(result.command).toBe('yosys load files');
                expect(result.stdout).toBe('Load files completed');
                done();
            });
        });

        it('should route YOSYS_ANALYZE task correctly', (done): void => {
            runTaskYosys(e_taskType.YOSYS_ANALYZE, testProject, mockLogger, (result: p_result): void => {
                expect(result).toBeDefined();
                expect(result.successful).toBe(true);
                expect(result.command).toBe('yosys analyze');
                expect(result.stdout).toBe('Analyze completed');
                done();
            });
        });

        it('should route YOSYS_ELABORATE task correctly', (done): void => {
            runTaskYosys(e_taskType.YOSYS_ELABORATE, testProject, mockLogger, (result: p_result): void => {
                expect(result).toBeDefined();
                expect(result.successful).toBe(true);
                expect(result.command).toBe('yosys elaborate');
                expect(result.stdout).toBe('Elaborate completed');
                done();
            });
        });

        it('should route YOSYS_SYNTHESIS task correctly', (done): void => {
            runTaskYosys(e_taskType.YOSYS_SYNTHESIS, testProject, mockLogger, (result: p_result): void => {
                expect(result).toBeDefined();
                expect(result.successful).toBe(true);
                expect(result.command).toBe('yosys synthesis');
                expect(result.stdout).toBe('Synthesis completed');
                done();
            });
        });

        it('should route YOSYS_COMPILE_ALL task correctly', (done): void => {
            runTaskYosys(e_taskType.YOSYS_COMPILE_ALL, testProject, mockLogger, (result: p_result): void => {
                expect(result).toBeDefined();
                expect(result.successful).toBe(true);
                expect(result.command).toBe('yosys compile all');
                expect(result.stdout).toBe('Compile all completed');
                done();
            });
        });

        it('should route OPENFOLDER task correctly', (done): void => {
            runTaskYosys(e_taskType.OPENFOLDER, testProject, mockLogger, (result: p_result): void => {
                expect(result).toBeDefined();
                expect(result.successful).toBe(true);
                expect(result.command).toBe('open project folder');
                expect(result.stdout).toBe('Project folder opened');
                done();
            });
        });

        it('should route YOSYS_SHOW task correctly', (done): void => {
            runTaskYosys(e_taskType.YOSYS_SHOW, testProject, mockLogger, (result: p_result): void => {
                expect(result).toBeDefined();
                expect(result.successful).toBe(true);
                expect(result.command).toBe('yosys show');
                expect(result.stdout).toBe('Show completed');
                done();
            });
        });

        it('should route YOSYS_RESOURCE_UTILIZATION task correctly', (done): void => {
            runTaskYosys(e_taskType.YOSYS_RESOURCE_UTILIZATION, testProject, mockLogger, (result: p_result): void => {
                expect(result).toBeDefined();
                expect(result.successful).toBe(true);
                expect(result.command).toBe('yosys resource utilization');
                expect(result.stdout).toBe('Resource utilization completed');
                done();
            });
        });

        it('should handle unknown task types gracefully', (done): void => {
            const unknownTaskType = 'UNKNOWN_TASK' as e_taskType;
            
            runTaskYosys(unknownTaskType, testProject, mockLogger, (result: p_result): void => {
                expect(result).toBeDefined();
                expect(result.successful).toBe(false);
                expect(result.stderr).toContain('Unsupported Yosys task type');
                done();
            });
        });

        it('should create project directory if it does not exist', (done): void => {
            const mockFileUtils = jest.requireMock('../../../../src/colibri/utils/file_utils') as any;
            mockFileUtils.check_if_path_exist.mockReturnValueOnce(false);
            
            runTaskYosys(e_taskType.YOSYS_LOAD_FILES, testProject, mockLogger, (result: p_result): void => {
                expect(mockFileUtils.create_directory).toHaveBeenCalledWith(testProject.project_disk_path);
                expect(result).toBeDefined();
                done();
            });
        });

        it('should not create directory if it already exists', (done): void => {
            const mockFileUtils = jest.requireMock('../../../../src/colibri/utils/file_utils') as any;
            mockFileUtils.check_if_path_exist.mockReturnValueOnce(true);
            
            runTaskYosys(e_taskType.YOSYS_LOAD_FILES, testProject, mockLogger, (result: p_result): void => {
                expect(mockFileUtils.create_directory).not.toHaveBeenCalled();
                expect(result).toBeDefined();
                done();
            });
        });
    });

    describe('Task Execution Flow', (): void => {
        it('should execute multiple tasks in sequence', (done): void => {
            let tasksCompleted: number = 0;
            const totalTasks: number = 3;
            
            const checkCompletion = (result: p_result): void => {
                expect(result.successful).toBe(true);
                tasksCompleted++;
                
                if (tasksCompleted === totalTasks) {
                    done();
                }
            };
            
            runTaskYosys(e_taskType.YOSYS_LOAD_FILES, testProject, mockLogger, checkCompletion);
            runTaskYosys(e_taskType.YOSYS_ANALYZE, testProject, mockLogger, checkCompletion);
            runTaskYosys(e_taskType.YOSYS_ELABORATE, testProject, mockLogger, checkCompletion);
        });

        it('should pass through task execution results correctly', (done): void => {
            const mockTasks = jest.requireMock('../../../../src/colibri/project_manager/tool/yosys/tasks') as any;
            
            // Mock a failing task
            mockTasks.runYosysLoadFiles.mockImplementationOnce((
                project: any,
                logger: any,
                callback: (result: p_result) => void
            ): ChildProcess => {
                const failResult: p_result = {
                    command: 'yosys load files',
                    stdout: '',
                    stderr: 'Mock error occurred',
                    return_value: 1,
                    successful: false
                };
                setTimeout((): void => callback(failResult), 0);
                return { pid: 12345 } as ChildProcess;
            });
            
            runTaskYosys(e_taskType.YOSYS_LOAD_FILES, testProject, mockLogger, (result: p_result): void => {
                expect(result).toBeDefined();
                expect(result.successful).toBe(false);
                expect(result.stderr).toBe('Mock error occurred');
                done();
            });
        });

        it('should handle task execution timeouts gracefully', (done): void => {
            const mockTasks = jest.requireMock('../../../../src/colibri/project_manager/tool/yosys/tasks') as any;
            
            // Mock a task that takes longer to complete
            mockTasks.runYosysLoadFiles.mockImplementationOnce((
                project: any,
                logger: any,
                callback: (result: p_result) => void
            ): ChildProcess => {
                const slowResult: p_result = {
                    command: 'yosys load files',
                    stdout: 'Slow task completed',
                    stderr: '',
                    return_value: 0,
                    successful: true
                };
                setTimeout((): void => callback(slowResult), 100); // Longer delay
                return { pid: 12345 } as ChildProcess;
            });
            
            runTaskYosys(e_taskType.YOSYS_LOAD_FILES, testProject, mockLogger, (result: p_result): void => {
                expect(result).toBeDefined();
                expect(result.successful).toBe(true);
                expect(result.stdout).toBe('Slow task completed');
                done();
            });
        });
    });

    describe('Error Handling and Edge Cases', (): void => {
        it('should handle project with missing configuration', (done): void => {
            const invalidProject: t_project_definition = { ...testProject };
            (invalidProject as any).config = undefined;
            
            runTaskYosys(e_taskType.YOSYS_LOAD_FILES, invalidProject, mockLogger, (result: p_result): void => {
                expect(result).toBeDefined();
                // The specific task implementation should handle missing config
                done();
            });
        });

        it('should handle project with invalid disk path', (done): void => {
            const invalidProject: t_project_definition = { ...testProject };
            invalidProject.project_disk_path = '';
            
            runTaskYosys(e_taskType.YOSYS_LOAD_FILES, invalidProject, mockLogger, (result: p_result): void => {
                expect(result).toBeDefined();
                // The specific task implementation should handle invalid paths
                done();
            });
        });

        it('should pass logger to task implementations', (done): void => {
            const mockTasks = jest.requireMock('../../../../src/colibri/project_manager/tool/yosys/tasks') as any;
            
            runTaskYosys(e_taskType.YOSYS_LOAD_FILES, testProject, mockLogger, (result: p_result): void => {
                expect(mockTasks.runYosysLoadFiles).toHaveBeenCalledWith(
                    testProject,
                    mockLogger,
                    expect.any(Function)
                );
                done();
            });
        });

        it('should return ChildProcess from task execution', (): void => {
            const childProcess: ChildProcess = runTaskYosys(
                e_taskType.YOSYS_LOAD_FILES,
                testProject,
                mockLogger,
                (): void => {}
            );
            
            expect(childProcess).toBeDefined();
            expect(childProcess.pid).toBe(12345);
        });

        it('should handle concurrent task executions', (): void => {
            let completedTasks: number = 0;
            const totalTasks: number = 5;
            
            const taskTypes: e_taskType[] = [
                e_taskType.YOSYS_LOAD_FILES,
                e_taskType.YOSYS_ANALYZE,
                e_taskType.YOSYS_ELABORATE,
                e_taskType.YOSYS_SYNTHESIS,
                e_taskType.YOSYS_SHOW
            ];
            
            taskTypes.forEach((taskType: e_taskType): void => {
                const childProcess: ChildProcess = runTaskYosys(
                    taskType,
                    testProject,
                    mockLogger,
                    (result: p_result): void => {
                        completedTasks++;
                        expect(result.successful).toBe(true);
                    }
                );
                expect(childProcess).toBeDefined();
            });
        });

        it('should handle tasks with special characters in project path', (done): void => {
            const specialProject: t_project_definition = { ...testProject };
            specialProject.project_disk_path = '/path with spaces/project (test)';
            
            runTaskYosys(e_taskType.YOSYS_LOAD_FILES, specialProject, mockLogger, (result: p_result): void => {
                expect(result).toBeDefined();
                done();
            });
        });

        it('should handle tasks with Unicode characters in project path', (done): void => {
            const unicodeProject: t_project_definition = { ...testProject };
            unicodeProject.project_disk_path = '/проект/测试/ñoño';
            
            runTaskYosys(e_taskType.YOSYS_LOAD_FILES, unicodeProject, mockLogger, (result: p_result): void => {
                expect(result).toBeDefined();
                done();
            });
        });
    });
});
