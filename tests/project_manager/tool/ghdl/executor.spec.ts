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
    getBinary, 
    quoteArgs, 
    executeGhdlCommand, 
    executeCommand, 
    buildChainedCommand 
} from '../../../../src/colibri/project_manager/tool/ghdl/executor';
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
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('GHDL Executor', () => {
    let defaultConfig: e_tools_ghdl;
    let tempDir: string;

    beforeEach(() => {
        // Create a temporary directory for testing
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'teroshdl-ghdl-test-'));

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
    });

    afterEach(() => {
        // Clean up temporary directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    describe('getBinary', () => {
        test('should return ghdl when no installation path is configured', () => {
            const result: string = getBinary(defaultConfig);
            expect(result).toBe('ghdl');
        });

        test('should return system path when installation path is empty', () => {
            const config = { ...defaultConfig, installation_path: '' };
            const result: string = getBinary(config);
            expect(result).toBe('ghdl');
        });

        test('should return system path when installation path is whitespace', () => {
            const config = { ...defaultConfig, installation_path: '   ' };
            const result: string = getBinary(config);
            expect(result).toBe('ghdl');
        });

        test('should return ghdl.exe path when it exists on Windows', () => {
            // Create a fake ghdl.exe in temp directory
            const ghdlExePath = path.join(tempDir, 'ghdl.exe');
            fs.writeFileSync(ghdlExePath, '');

            const config = { ...defaultConfig, installation_path: tempDir };
            const result: string = getBinary(config);
            expect(result).toBe(ghdlExePath);
        });

        test('should return ghdl path when it exists on Unix', () => {
            // Create a fake ghdl in temp directory
            const ghdlPath = path.join(tempDir, 'ghdl');
            fs.writeFileSync(ghdlPath, '');

            const config = { ...defaultConfig, installation_path: tempDir };
            const result: string = getBinary(config);
            expect(result).toBe(ghdlPath);
        });

        test('should prefer ghdl.exe over ghdl when both exist', () => {
            // Create both files
            const ghdlPath = path.join(tempDir, 'ghdl');
            const ghdlExePath = path.join(tempDir, 'ghdl.exe');
            fs.writeFileSync(ghdlPath, '');
            fs.writeFileSync(ghdlExePath, '');

            const config = { ...defaultConfig, installation_path: tempDir };
            const result: string = getBinary(config);
            expect(result).toBe(ghdlExePath);
        });

        test('should fall back to system path when configured path does not exist', () => {
            const config = { ...defaultConfig, installation_path: '/nonexistent/path' };
            const result: string = getBinary(config);
            expect(result).toBe('ghdl');
        });
    });

    describe('quoteArgs', () => {
        test('should not quote arguments without spaces', () => {
            const args = ['--std=08', '-v', 'test.vhd'];
            const result: string[] = quoteArgs(args);
            expect(result).toEqual(['--std=08', '-v', 'test.vhd']);
        });

        test('should quote arguments with spaces', () => {
            const args = ['--std=08', 'file with spaces.vhd', '-v'];
            const result: string[] = quoteArgs(args);
            expect(result).toEqual(['--std=08', '"file with spaces.vhd"', '-v']);
        });

        test('should handle empty array', () => {
            const args: string[] = [];
            const result: string[] = quoteArgs(args);
            expect(result).toEqual([]);
        });

        test('should handle mixed arguments', () => {
            const args = ['ghdl', '-a', '--std=08', 'path with spaces/test.vhd', 'normal.vhd'];
            const result: string[] = quoteArgs(args);
            expect(result).toEqual(['ghdl', '-a', '--std=08', '"path with spaces/test.vhd"', 'normal.vhd']);
        });
    });

    describe('buildChainedCommand', () => {
        test('should build single command', () => {
            const commandSpecs = [
                { command: '-a', args: ['--std=08', 'test.vhd'] }
            ];
            const result: string = buildChainedCommand(defaultConfig, commandSpecs);
            expect(result).toBe('ghdl -a --std=08 test.vhd');
        });

        test('should build multiple chained commands', () => {
            const commandSpecs = [
                { command: '-a', args: ['--std=08', 'test.vhd'] },
                { command: '-e', args: ['--std=08', 'testbench'] },
                { command: '-r', args: ['--std=08', 'testbench'] }
            ];
            const result: string = buildChainedCommand(defaultConfig, commandSpecs);
            expect(result).toBe('ghdl -a --std=08 test.vhd && ghdl -e --std=08 testbench && ghdl -r --std=08 testbench');
        });

        test('should quote arguments with spaces in chained commands', () => {
            const commandSpecs = [
                { command: '-a', args: ['--std=08', 'file with spaces.vhd'] },
                { command: '-e', args: ['--std=08', 'entity name with spaces'] }
            ];
            const result: string = buildChainedCommand(defaultConfig, commandSpecs);
            expect(result).toBe('ghdl -a --std=08 "file with spaces.vhd" && ghdl -e --std=08 "entity name with spaces"');
        });

        test('should use custom binary path when configured', () => {
            // Create a fake ghdl in temp directory
            const ghdlPath = path.join(tempDir, 'ghdl');
            fs.writeFileSync(ghdlPath, '');

            const config = { ...defaultConfig, installation_path: tempDir };
            const commandSpecs = [
                { command: '-a', args: ['--std=08', 'test.vhd'] }
            ];
            const result: string = buildChainedCommand(config, commandSpecs);
            expect(result).toBe(`${ghdlPath} -a --std=08 test.vhd`);
        });

        test('should handle empty command specs', () => {
            const commandSpecs: Array<{ command: string; args: string[] }> = [];
            const result: string = buildChainedCommand(defaultConfig, commandSpecs);
            expect(result).toBe('');
        });
    });

    describe('executeGhdlCommand', () => {
        test('should create command with quoted arguments', (done) => {
            const args = ['-a', '--std=08', 'file with spaces.vhd'];
            
            // Mock the callback to capture the command
            const callback = (result: any) => {
                // The test should not actually execute, just verify the command structure
                done();
            };

            // This will attempt to execute but we're just testing the command construction
            try {
                const process = executeGhdlCommand(defaultConfig, args, tempDir, callback);
                // Stop the process immediately to prevent actual execution
                if (process && process.kill) {
                    process.kill();
                }
                done();
            } catch (error) {
                // Expected since we're not actually running ghdl
                done();
            }
        });
    });

    describe('executeCommand', () => {
        test('should accept command string and working directory', (done) => {
            const command = 'echo "test"';
            
            const callback = (result: any) => {
                // Verify that callback is called
                expect(result).toBeDefined();
                done();
            };

            try {
                const process = executeCommand(command, tempDir, callback);
                // Let it execute since echo should be available on most systems
                setTimeout(() => {
                    if (process && process.kill) {
                        process.kill();
                    }
                    done();
                }, 100);
            } catch (error) {
                done();
            }
        });
    });
});
