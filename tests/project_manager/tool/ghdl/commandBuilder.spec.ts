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

import { buildGhdlArgs, GhdlCommandType, GhdlCommandArgs } from '../../../../src/colibri/project_manager/tool/ghdl/commandBuilder';
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

describe('GHDL Command Builder', () => {
    let defaultConfig: e_tools_ghdl;

    beforeEach(() => {
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

    describe('buildGhdlArgs', () => {
        test('should build basic analyze command args', () => {
            const result: GhdlCommandArgs = buildGhdlArgs(defaultConfig, 'analyze');
            
            expect(result.baseArgs).toContain('--std=08');
            expect(result.runArgs).toEqual([]);
        });

        test('should include verbose flag when enabled', () => {
            const config = { ...defaultConfig, verbose: true };
            const result: GhdlCommandArgs = buildGhdlArgs(config, 'analyze');
            
            expect(result.baseArgs).toContain('-v');
        });

        test('should map VHDL standards correctly', () => {
            const standards = [
                { config: e_tools_ghdl_vhdl_standard.vhdl87, expected: '--std=87' },
                { config: e_tools_ghdl_vhdl_standard.vhdl93, expected: '--std=93' },
                { config: e_tools_ghdl_vhdl_standard.vhdl02, expected: '--std=02' },
                { config: e_tools_ghdl_vhdl_standard.vhdl08, expected: '--std=08' },
                { config: e_tools_ghdl_vhdl_standard.vhdl19, expected: '--std=19' }
            ];

            standards.forEach(({ config: std, expected }) => {
                const config = { ...defaultConfig, vhdl_standard: std };
                const result: GhdlCommandArgs = buildGhdlArgs(config, 'analyze');
                expect(result.baseArgs).toContain(expected);
            });
        });

        test('should handle debug levels correctly', () => {
            const debugLevels = [
                { level: e_tools_ghdl_debug_level.minimal, expected: ['-g'] },
                { level: e_tools_ghdl_debug_level.full, expected: ['-g', '--debug'] },
                { level: e_tools_ghdl_debug_level.none, expected: [] }
            ];

            debugLevels.forEach(({ level, expected }) => {
                const config = { ...defaultConfig, debug_level: level };
                const result: GhdlCommandArgs = buildGhdlArgs(config, 'analyze');
                
                expected.forEach(flag => {
                    expect(result.baseArgs).toContain(flag);
                });
            });
        });

        test('should handle IEEE library configuration', () => {
            const config = { ...defaultConfig, ieee_library: e_tools_ghdl_ieee_library.synopsys };
            const result: GhdlCommandArgs = buildGhdlArgs(config, 'analyze');
            
            expect(result.baseArgs).toContain('--ieee=synopsys');
        });

        test('should handle library paths', () => {
            const config = { ...defaultConfig, library_paths: ['/path/lib1', '/path/lib2'] };
            const result: GhdlCommandArgs = buildGhdlArgs(config, 'analyze');
            
            expect(result.baseArgs).toContain('-P/path/lib1');
            expect(result.baseArgs).toContain('-P/path/lib2');
        });

        test('should handle assert levels', () => {
            const assertLevels = [
                { level: e_tools_ghdl_assert_level.none, expected: '--assert-level=none' },
                { level: e_tools_ghdl_assert_level.warning, expected: '--assert-level=warning' },
                { level: e_tools_ghdl_assert_level.error, expected: [] } // default, no flag added
            ];

            assertLevels.forEach(({ level, expected }) => {
                const config = { ...defaultConfig, assert_level: level };
                const result: GhdlCommandArgs = buildGhdlArgs(config, 'analyze');
                
                if (expected.length > 0) {
                    expect(result.baseArgs).toContain(expected);
                }
            });
        });

        test('should handle relaxed rules and parsing', () => {
            const config = { 
                ...defaultConfig, 
                relaxed_rules: true, 
                relaxed_parsing: true 
            };
            const result: GhdlCommandArgs = buildGhdlArgs(config, 'analyze');
            
            expect(result.baseArgs).toContain('--mb-comments');
            expect(result.baseArgs).toContain('--relaxed');
        });

        test('should handle PSL and Unicode support', () => {
            const config = { 
                ...defaultConfig, 
                psl_enabled: true, 
                unicode_support: true 
            };
            const result: GhdlCommandArgs = buildGhdlArgs(config, 'analyze');
            
            expect(result.baseArgs).toContain('--psl');
            expect(result.baseArgs).toContain('--unicode');
        });

        test('should handle bind and VITAL checks', () => {
            const config = { 
                ...defaultConfig, 
                bind_checks: false, 
                vital_checks: true 
            };
            const result: GhdlCommandArgs = buildGhdlArgs(config, 'analyze');
            
            expect(result.baseArgs).toContain('--no-bind-checks');
            expect(result.baseArgs).toContain('--vital-checks');
        });

        test('should handle warnings configuration', () => {
            const config = { 
                ...defaultConfig, 
                warnings_as_errors: true,
                suppress_warnings: ['binding', 'shared']
            };
            const result: GhdlCommandArgs = buildGhdlArgs(config, 'analyze');
            
            expect(result.baseArgs).toContain('-Werror');
            expect(result.baseArgs).toContain('-Wno-binding');
            expect(result.baseArgs).toContain('-Wno-shared');
        });

        test('should handle time resolution limit', () => {
            const config = { ...defaultConfig, resolution_limit: '1ps' };
            const result: GhdlCommandArgs = buildGhdlArgs(config, 'analyze');
            
            expect(result.baseArgs).toContain('--time-resolution=1ps');
        });

        test('should include command-specific options', () => {
            const config = { 
                ...defaultConfig, 
                analyze_options: ['--analyze-opt1'],
                elaborate_options: ['--elaborate-opt1'],
                run_options: ['--run-opt1'],
                synthesis_options: ['--synth-opt1']
            };

            const analyzeResult: GhdlCommandArgs = buildGhdlArgs(config, 'analyze');
            expect(analyzeResult.baseArgs).toContain('--analyze-opt1');

            const elaborateResult: GhdlCommandArgs = buildGhdlArgs(config, 'elaborate');
            expect(elaborateResult.baseArgs).toContain('--elaborate-opt1');

            const runResult: GhdlCommandArgs = buildGhdlArgs(config, 'run');
            expect(runResult.runArgs).toContain('--run-opt1');

            const synthResult: GhdlCommandArgs = buildGhdlArgs(config, 'synth');
            expect(synthResult.baseArgs).toContain('--synth-opt1');
        });

        test('should handle extra flags', () => {
            const config = { ...defaultConfig, extra_flags: ['--custom-flag', '--another-flag'] };
            const result: GhdlCommandArgs = buildGhdlArgs(config, 'analyze');
            
            expect(result.baseArgs).toContain('--custom-flag');
            expect(result.baseArgs).toContain('--another-flag');
        });

        test('should handle simulation arguments for run command', () => {
            const config = { 
                ...defaultConfig, 
                waveform_enabled: true,
                waveform_format: e_tools_ghdl_waveform_format.vcd,
                simulation_time: '1us',
                display_time: true,
                unbuffered_output: true
            };
            const result: GhdlCommandArgs = buildGhdlArgs(config, 'run');
            
            expect(result.runArgs).toContain('--vcd=wave.vcd');
            expect(result.runArgs).toContain('--stop-time=1us');
            expect(result.runArgs).toContain('--disp-time');
            expect(result.runArgs).toContain('--unbuffered');
        });

        test('should handle additional arguments', () => {
            const additionalArgs = ['--extra-arg1', '--extra-arg2'];
            const result: GhdlCommandArgs = buildGhdlArgs(defaultConfig, 'analyze', additionalArgs);
            
            expect(result.baseArgs).toContain('--extra-arg1');
            expect(result.baseArgs).toContain('--extra-arg2');
        });
    });
});
