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


import { 
    runGhdlAnalyze,
    runGhdlElaborate,
    runGhdlSimulate,
    runGhdlSynthesize,
    runGhdlCheckSyntax,
    runGhdlMakefile,
    runGhdlAll
} from '../../../../src/colibri/project_manager/tool/ghdl/tasks';
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
import { p_result } from '../../../../src/colibri/process/common';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Mock the executor module to avoid actual process execution
jest.mock('../../../../src/colibri/project_manager/tool/ghdl/executor', () => ({
    executeGhdlCommand: jest.fn(),
    executeCommand: jest.fn(),
    buildChainedCommand: jest.fn(),
    getBinary: jest.fn(() => 'ghdl'),
    quoteArgs: jest.fn((args) => args)
}));

// Mock the utils module
jest.mock('../../../../src/colibri/project_manager/tool/ghdl/utils', () => ({
    getTopLevel: jest.fn(),
    getVhdlFiles: jest.fn(),
    groupFilesByLibrary: jest.fn(),
    getRelativeFilePath: jest.fn()
}));

// Mock the commandBuilder module
jest.mock('../../../../src/colibri/project_manager/tool/ghdl/commandBuilder', () => ({
    buildGhdlArgs: jest.fn()
}));

import * as executor from '../../../../src/colibri/project_manager/tool/ghdl/executor';
import * as utils from '../../../../src/colibri/project_manager/tool/ghdl/utils';
import * as commandBuilder from '../../../../src/colibri/project_manager/tool/ghdl/commandBuilder';

describe('GHDL Tasks', () => {
    let defaultConfig: e_tools_ghdl;
    let tempDir: string;
    let mockProjectDefinition: t_project_definition;
    let mockCallback: jest.Mock;

    beforeEach(() => {
        // Create a temporary directory for testing
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'teroshdl-ghdl-tasks-test-'));

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

    describe('runGhdlAnalyze', () => {
        test('should return error when no VHDL files are found', (done) => {
            (utils.getVhdlFiles as jest.Mock).mockReturnValue([]);

            runGhdlAnalyze(mockProjectDefinition, (result) => {
                expect(result.successful).toBe(false);
                expect(result.stderr).toContain('No VHDL files found in project');
                expect(result.command).toBe('ghdl analyze');
                done();
            });
        });

        test('should call executeCommand when VHDL files exist', () => {
            const mockVhdlFiles = [
                { name: 'test1.vhd', file_type: LANGUAGE.VHDL, logical_name: 'work' }
            ];
            const mockLibraryGroups = new Map([['work', ['test1.vhd']]]);
            const mockProcess = {} as any;

            (utils.getVhdlFiles as jest.Mock).mockReturnValue(mockVhdlFiles);
            (utils.groupFilesByLibrary as jest.Mock).mockReturnValue(mockLibraryGroups);
            (commandBuilder.buildGhdlArgs as jest.Mock).mockReturnValue({ baseArgs: ['--std=08'] });
            (executor.buildChainedCommand as jest.Mock).mockReturnValue('ghdl -a --std=08 --work=work test1.vhd');
            (executor.executeCommand as jest.Mock).mockReturnValue(mockProcess);

            const result = runGhdlAnalyze(mockProjectDefinition, mockCallback);

            expect(executor.executeCommand).toHaveBeenCalledWith(
                'ghdl -a --std=08 --work=work test1.vhd',
                tempDir,
                mockCallback
            );
            expect(result).toBe(mockProcess);
        });
    });

    describe('runGhdlElaborate', () => {
        test('should return error when no top level entity is specified', (done) => {
            (utils.getTopLevel as jest.Mock).mockReturnValue(null);

            runGhdlElaborate(mockProjectDefinition, (result) => {
                expect(result.successful).toBe(false);
                expect(result.stderr).toContain('No top level entity specified');
                expect(result.command).toBe('ghdl elaborate');
                done();
            });
        });

        test('should call executeGhdlCommand when top level entity exists', () => {
            const mockTopLevel = 'testbench';
            const mockProcess = {} as any;

            (utils.getTopLevel as jest.Mock).mockReturnValue(mockTopLevel);
            (commandBuilder.buildGhdlArgs as jest.Mock).mockReturnValue({ baseArgs: ['--std=08'] });
            (executor.executeGhdlCommand as jest.Mock).mockReturnValue(mockProcess);

            const result = runGhdlElaborate(mockProjectDefinition, mockCallback);

            expect(executor.executeGhdlCommand).toHaveBeenCalledWith(
                defaultConfig,
                ['-e', '--std=08', 'testbench'],
                tempDir,
                mockCallback
            );
            expect(result).toBe(mockProcess);
        });
    });

    describe('runGhdlSimulate', () => {
        test('should return error when no top level entity is specified', (done) => {
            (utils.getTopLevel as jest.Mock).mockReturnValue(null);

            runGhdlSimulate(mockProjectDefinition, (result) => {
                expect(result.successful).toBe(false);
                expect(result.stderr).toContain('No top level entity specified');
                expect(result.command).toBe('ghdl simulate');
                done();
            });
        });

        test('should call executeGhdlCommand when top level entity exists', () => {
            const mockTopLevel = 'testbench';
            const mockProcess = {} as any;

            (utils.getTopLevel as jest.Mock).mockReturnValue(mockTopLevel);
            (commandBuilder.buildGhdlArgs as jest.Mock).mockReturnValue({ 
                baseArgs: ['--std=08'], 
                runArgs: ['--stop-time=1us'] 
            });
            (executor.executeGhdlCommand as jest.Mock).mockReturnValue(mockProcess);

            const result = runGhdlSimulate(mockProjectDefinition, mockCallback);

            expect(executor.executeGhdlCommand).toHaveBeenCalledWith(
                defaultConfig,
                ['-r', '--std=08', 'testbench', '--stop-time=1us'],
                tempDir,
                mockCallback
            );
            expect(result).toBe(mockProcess);
        });
    });

    describe('runGhdlSynthesize', () => {
        test('should return error when no top level entity is specified', (done) => {
            (utils.getTopLevel as jest.Mock).mockReturnValue(null);

            runGhdlSynthesize(mockProjectDefinition, (result) => {
                expect(result.successful).toBe(false);
                expect(result.stderr).toContain('No top level entity specified');
                expect(result.command).toBe('ghdl synthesize');
                done();
            });
        });

        test('should call executeGhdlCommand when top level entity exists', () => {
            const mockTopLevel = 'testbench';
            const mockProcess = {} as any;

            (utils.getTopLevel as jest.Mock).mockReturnValue(mockTopLevel);
            (commandBuilder.buildGhdlArgs as jest.Mock).mockReturnValue({ baseArgs: ['--std=08'] });
            (executor.executeGhdlCommand as jest.Mock).mockReturnValue(mockProcess);

            const result = runGhdlSynthesize(mockProjectDefinition, mockCallback);

            expect(executor.executeGhdlCommand).toHaveBeenCalledWith(
                defaultConfig,
                ['--synth', '--std=08', 'testbench'],
                tempDir,
                mockCallback
            );
            expect(result).toBe(mockProcess);
        });
    });

    describe('runGhdlCheckSyntax', () => {
        test('should return error when no VHDL files are found', (done) => {
            (utils.getVhdlFiles as jest.Mock).mockReturnValue([]);

            runGhdlCheckSyntax(mockProjectDefinition, (result) => {
                expect(result.successful).toBe(false);
                expect(result.stderr).toContain('No VHDL files found in project');
                expect(result.command).toBe('ghdl check syntax');
                done();
            });
        });

        test('should call executeCommand when VHDL files exist', () => {
            const mockVhdlFiles = [
                { name: 'test1.vhd', file_type: LANGUAGE.VHDL, logical_name: 'work' }
            ];
            const mockLibraryGroups = new Map([['work', ['test1.vhd']]]);
            const mockProcess = {} as any;

            (utils.getVhdlFiles as jest.Mock).mockReturnValue(mockVhdlFiles);
            (utils.groupFilesByLibrary as jest.Mock).mockReturnValue(mockLibraryGroups);
            (commandBuilder.buildGhdlArgs as jest.Mock).mockReturnValue({ baseArgs: ['--std=08'] });
            (executor.getBinary as jest.Mock).mockReturnValue('ghdl');
            (executor.quoteArgs as jest.Mock).mockImplementation((args) => args);
            (executor.executeCommand as jest.Mock).mockReturnValue(mockProcess);

            const result = runGhdlCheckSyntax(mockProjectDefinition, mockCallback);

            expect(executor.executeCommand).toHaveBeenCalled();
            expect(result).toBe(mockProcess);
        });
    });

    describe('runGhdlMakefile', () => {
        test('should return error when no top level entity is specified', (done) => {
            (utils.getTopLevel as jest.Mock).mockReturnValue(null);

            runGhdlMakefile(mockProjectDefinition, (result) => {
                expect(result.successful).toBe(false);
                expect(result.stderr).toContain('No top level entity specified');
                expect(result.command).toBe('ghdl makefile');
                done();
            });
        });

        test('should call executeGhdlCommand when top level entity exists', () => {
            const mockTopLevel = 'testbench';
            const mockProcess = {} as any;

            (utils.getTopLevel as jest.Mock).mockReturnValue(mockTopLevel);
            (commandBuilder.buildGhdlArgs as jest.Mock).mockReturnValue({ baseArgs: ['--std=08'] });
            (executor.executeGhdlCommand as jest.Mock).mockReturnValue(mockProcess);

            const result = runGhdlMakefile(mockProjectDefinition, mockCallback);

            expect(executor.executeGhdlCommand).toHaveBeenCalledWith(
                defaultConfig,
                ['--gen-makefile', '--std=08', 'testbench'],
                tempDir,
                mockCallback
            );
            expect(result).toBe(mockProcess);
        });
    });

    describe('runGhdlAll', () => {
        test('should return error when no VHDL files are found', (done) => {
            (utils.getVhdlFiles as jest.Mock).mockReturnValue([]);

            runGhdlAll(mockProjectDefinition, (result) => {
                expect(result.successful).toBe(false);
                expect(result.stderr).toContain('No VHDL files found in project');
                expect(result.command).toBe('ghdl run all');
                done();
            });
        });

        test('should return error when no top level entity is specified', (done) => {
            const mockVhdlFiles = [
                { name: 'test1.vhd', file_type: LANGUAGE.VHDL, logical_name: 'work' }
            ];

            (utils.getVhdlFiles as jest.Mock).mockReturnValue(mockVhdlFiles);
            (utils.getTopLevel as jest.Mock).mockReturnValue(null);

            runGhdlAll(mockProjectDefinition, (result) => {
                expect(result.successful).toBe(false);
                expect(result.stderr).toContain('No top level entity specified');
                expect(result.command).toBe('ghdl run all');
                done();
            });
        });

        test('should call executeCommand when files and top level exist', () => {
            const mockVhdlFiles = [
                { name: 'test1.vhd', file_type: LANGUAGE.VHDL, logical_name: 'work' }
            ];
            const mockLibraryGroups = new Map([['work', ['test1.vhd']]]);
            const mockTopLevel = 'testbench';
            const mockProcess = {} as any;

            (utils.getVhdlFiles as jest.Mock).mockReturnValue(mockVhdlFiles);
            (utils.getTopLevel as jest.Mock).mockReturnValue(mockTopLevel);
            (utils.groupFilesByLibrary as jest.Mock).mockReturnValue(mockLibraryGroups);
            (commandBuilder.buildGhdlArgs as jest.Mock).mockReturnValue({ 
                baseArgs: ['--std=08'], 
                runArgs: ['--stop-time=1us'] 
            });
            (executor.getBinary as jest.Mock).mockReturnValue('ghdl');
            (executor.quoteArgs as jest.Mock).mockImplementation((args) => args);
            (executor.executeCommand as jest.Mock).mockReturnValue(mockProcess);

            const result = runGhdlAll(mockProjectDefinition, mockCallback);

            expect(executor.executeCommand).toHaveBeenCalled();
            expect(result).toBe(mockProcess);
        });
    });
});
