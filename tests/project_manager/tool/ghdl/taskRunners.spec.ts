// Copyright 2025
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


import { runTaskGHDL } from '../../../../src/colibri/project_manager/tool/ghdl/taskRunners';
import { e_taskType } from '../../../../src/colibri/project_manager/tool/common';
import { t_project_definition } from '../../../../src/colibri/project_manager/project_definition';
import { 
    e_tools_ghdl,
    e_tools_ghdl_vhdl_standard,
    e_tools_ghdl_debug_level,
    e_tools_ghdl_ieee_library,
    e_tools_ghdl_assert_level,
    e_tools_ghdl_waveform_format,
    e_tools_ghdl_backtrace_severity,
    e_tools_ghdl_ieee_asserts,
    e_tools_ghdl_asserts_policy,
    e_tools_ghdl_disp_tree
} from '../../../../src/colibri/config/config_declaration';
import { LANGUAGE } from '../../../../src/colibri/common/general';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Mock the tasks module to avoid actual GHDL execution
jest.mock('../../../../src/colibri/project_manager/tool/ghdl/tasks', () => ({
    runGhdlAnalyze: jest.fn(),
    runGhdlElaborate: jest.fn(),
    runGhdlSimulate: jest.fn(),
    runGhdlAll: jest.fn(),
    runGhdlSynthesize: jest.fn(),
    runGhdlCheckSyntax: jest.fn(),
    runGhdlMakefile: jest.fn()
}));

import * as tasks from '../../../../src/colibri/project_manager/tool/ghdl/tasks';

describe('GHDL Task Runners', () => {
    let defaultConfig: e_tools_ghdl;
    let tempDir: string;
    let mockProjectDefinition: t_project_definition;
    let mockCallback: jest.Mock;

    beforeEach(() => {
        // Create a temporary directory for testing
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'teroshdl-ghdl-taskrunners-test-'));

        // Create a minimal default configuration
        defaultConfig = {
            installation_path: '',
            vhdl_standard: e_tools_ghdl_vhdl_standard.vhdl08,
            verbose: false,
            debug_level: e_tools_ghdl_debug_level.none,
            ieee_library: e_tools_ghdl_ieee_library.standard,
            library_paths: [],
            assert_level: e_tools_ghdl_assert_level.error,
            relaxed_rules: false,
            relaxed_parsing: false,
            psl_enabled: false,
            unicode_support: false,
            bind_checks: true,
            vital_checks: false,
            warnings_as_errors: false,
            suppress_warnings: [],
            resolution_limit: '',
            analyze_options: [],
            elaborate_options: [],
            run_options: [],
            synthesis_options: [],
            check_syntax_options: [],
            extra_flags: [],
            work_library: 'work',
            waveform_enabled: false,
            waveform_format: e_tools_ghdl_waveform_format.ghw,
            waveform_options: [],
            simulation_time: '',
            stack_size: '',
            stop_delta_cycles: 0,
            display_time: false,
            unbuffered_output: false,
            max_stack_alloc: 0,
            backtrace_severity: e_tools_ghdl_backtrace_severity.error,
            ieee_asserts: e_tools_ghdl_ieee_asserts.enable,
            asserts_policy: e_tools_ghdl_asserts_policy.enable,
            sdf_file: '',
            vpi_modules: [],
            vhpi_modules: [],
            vpi_trace_file: '',
            vhpi_trace_file: '',
            psl_report_file: '',
            psl_report_uncovered: false,
            disp_tree: e_tools_ghdl_disp_tree.none,
            wave_start_time: '',
            vcd_4states: false,
            vcd_nodate: false,
            read_wave_opt: '',
            write_wave_opt: '',
            no_run: false
        };

        // Create a mock project definition
        mockProjectDefinition = {
            project_disk_path: tempDir,
            config: {
                tools: {
                    ghdl: defaultConfig
                }
            },
            toplevel_path_manager: {
                get: jest.fn().mockReturnValue([])
            },
            file_manager: {
                get: jest.fn().mockReturnValue([])
            }
        } as any;

        mockCallback = jest.fn();
    });

    afterEach(() => {
        // Clean up temporary directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        jest.clearAllMocks();
    });

    describe('runTaskGHDL', () => {
        test('should create project directory if it does not exist', () => {
            // Remove the temp directory to test creation
            fs.rmSync(tempDir, { recursive: true, force: true });
            expect(fs.existsSync(tempDir)).toBe(false);

            const mockProcess = {} as any;
            (tasks.runGhdlAnalyze as jest.Mock).mockReturnValue(mockProcess);

            runTaskGHDL(e_taskType.GHDL_ANALYZE, mockProjectDefinition, mockCallback);

            expect(fs.existsSync(tempDir)).toBe(true);
        });

        test('should call runGhdlAnalyze for GHDL_ANALYZE task', () => {
            const mockProcess = {} as any;
            (tasks.runGhdlAnalyze as jest.Mock).mockReturnValue(mockProcess);

            const result = runTaskGHDL(e_taskType.GHDL_ANALYZE, mockProjectDefinition, mockCallback);

            expect(tasks.runGhdlAnalyze).toHaveBeenCalledWith(mockProjectDefinition, mockCallback);
            expect(result).toBe(mockProcess);
        });

        test('should call runGhdlElaborate for GHDL_ELABORATE task', () => {
            const mockProcess = {} as any;
            (tasks.runGhdlElaborate as jest.Mock).mockReturnValue(mockProcess);

            const result = runTaskGHDL(e_taskType.GHDL_ELABORATE, mockProjectDefinition, mockCallback);

            expect(tasks.runGhdlElaborate).toHaveBeenCalledWith(mockProjectDefinition, mockCallback);
            expect(result).toBe(mockProcess);
        });

        test('should call runGhdlSimulate for GHDL_SIMULATE task', () => {
            const mockProcess = {} as any;
            (tasks.runGhdlSimulate as jest.Mock).mockReturnValue(mockProcess);

            const result = runTaskGHDL(e_taskType.GHDL_SIMULATE, mockProjectDefinition, mockCallback);

            expect(tasks.runGhdlSimulate).toHaveBeenCalledWith(mockProjectDefinition, mockCallback);
            expect(result).toBe(mockProcess);
        });

        test('should call runGhdlAll for GHDL_RUN_ALL task', () => {
            const mockProcess = {} as any;
            (tasks.runGhdlAll as jest.Mock).mockReturnValue(mockProcess);

            const result = runTaskGHDL(e_taskType.GHDL_RUN_ALL, mockProjectDefinition, mockCallback);

            expect(tasks.runGhdlAll).toHaveBeenCalledWith(mockProjectDefinition, mockCallback);
            expect(result).toBe(mockProcess);
        });

        test('should call runGhdlSynthesize for GHDL_SYNTHESIZE task', () => {
            const mockProcess = {} as any;
            (tasks.runGhdlSynthesize as jest.Mock).mockReturnValue(mockProcess);

            const result = runTaskGHDL(e_taskType.GHDL_SYNTHESIZE, mockProjectDefinition, mockCallback);

            expect(tasks.runGhdlSynthesize).toHaveBeenCalledWith(mockProjectDefinition, mockCallback);
            expect(result).toBe(mockProcess);
        });

        test('should call runGhdlCheckSyntax for GHDL_CHECK_SYNTAX task', () => {
            const mockProcess = {} as any;
            (tasks.runGhdlCheckSyntax as jest.Mock).mockReturnValue(mockProcess);

            const result = runTaskGHDL(e_taskType.GHDL_CHECK_SYNTAX, mockProjectDefinition, mockCallback);

            expect(tasks.runGhdlCheckSyntax).toHaveBeenCalledWith(mockProjectDefinition, mockCallback);
            expect(result).toBe(mockProcess);
        });

        test('should call runGhdlMakefile for GHDL_MAKEFILE task', () => {
            const mockProcess = {} as any;
            (tasks.runGhdlMakefile as jest.Mock).mockReturnValue(mockProcess);

            const result = runTaskGHDL(e_taskType.GHDL_MAKEFILE, mockProjectDefinition, mockCallback);

            expect(tasks.runGhdlMakefile).toHaveBeenCalledWith(mockProjectDefinition, mockCallback);
            expect(result).toBe(mockProcess);
        });

        test('should handle unsupported task type with error result', (done) => {
            const unsupportedTaskType = 'UNSUPPORTED_TASK' as any;

            const result = runTaskGHDL(unsupportedTaskType, mockProjectDefinition, (result) => {
                expect(result.successful).toBe(false);
                expect(result.return_value).toBe(1);
                expect(result.stderr).toContain('Unsupported GHDL task type');
                expect(result.command).toBe('');
                expect(result.stdout).toBe('');
                done();
            });

            // Should return an empty object as ChildProcess
            expect(result).toEqual({});
        });

        test('should not create directory if it already exists', () => {
            // Directory already exists from beforeEach
            expect(fs.existsSync(tempDir)).toBe(true);

            const mockProcess = {} as any;
            (tasks.runGhdlAnalyze as jest.Mock).mockReturnValue(mockProcess);

            runTaskGHDL(e_taskType.GHDL_ANALYZE, mockProjectDefinition, mockCallback);

            // Directory should still exist and no error should occur
            expect(fs.existsSync(tempDir)).toBe(true);
            expect(tasks.runGhdlAnalyze).toHaveBeenCalled();
        });
    });
});
