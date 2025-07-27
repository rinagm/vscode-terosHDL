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

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
    buildYosysArgs,
    buildLoadCommands,
    buildAnalyzeCommands,
    buildElaborateCommands,
    buildSynthesisCommands,
    buildIce40SynthesisCommands,
    buildEcp5SynthesisCommands,
    YosysCommandType,
    YosysCommandArgs
} from '../../../../src/colibri/project_manager/tool/yosys/commandBuilder';
import {
    e_tools_yosys,
    e_tools_yosys_debug_level,
    e_tools_yosys_synthesis_target,
    e_tools_yosys_ice40_device,
    get_default_config
} from '../../../../src/colibri/config/config_declaration';

describe('Yosys Command Builder', (): void => {
    let mockConfig: e_tools_yosys;

    beforeEach((): void => {
        mockConfig = get_default_config().tools.yosys;
    });

    describe('buildYosysArgs', (): void => {
        it('should build basic args with default config', (): void => {
            const result: YosysCommandArgs = buildYosysArgs(mockConfig, 'load');
            
            expect(result).toBeDefined();
            expect(result.baseArgs).toBeInstanceOf(Array);
        });

        it('should add verbose flag when enabled', (): void => {
            mockConfig.verbose = true;
            const result: YosysCommandArgs = buildYosysArgs(mockConfig, 'load');
            
            expect(result.baseArgs).toContain('-v');
        });

        it('should add debug flags based on level', (): void => {
            mockConfig.debug_level = e_tools_yosys_debug_level.basic;
            const result: YosysCommandArgs = buildYosysArgs(mockConfig, 'load');
            expect(result.baseArgs).toContain('-d1');

            mockConfig.debug_level = e_tools_yosys_debug_level.detailed;
            const result2: YosysCommandArgs = buildYosysArgs(mockConfig, 'load');
            expect(result2.baseArgs).toContain('-d2');

            mockConfig.debug_level = e_tools_yosys_debug_level.verbose;
            const result3: YosysCommandArgs = buildYosysArgs(mockConfig, 'load');
            expect(result3.baseArgs).toContain('-d3');
        });

        it('should not add debug flags for none level', (): void => {
            mockConfig.debug_level = e_tools_yosys_debug_level.none;
            const result: YosysCommandArgs = buildYosysArgs(mockConfig, 'load');
            
            expect(result.baseArgs).not.toContain('-d1');
            expect(result.baseArgs).not.toContain('-d2');
            expect(result.baseArgs).not.toContain('-d3');
        });

        it('should handle additional args', (): void => {
            const additionalArgs: string[] = ['--custom', '--flag'];
            const result: YosysCommandArgs = buildYosysArgs(mockConfig, 'load', additionalArgs);
            
            expect(result.baseArgs).toEqual(expect.arrayContaining(additionalArgs));
        });

        it('should handle different command types', (): void => {
            const commandTypes: YosysCommandType[] = ['load', 'analyze', 'elaborate'];
            
            commandTypes.forEach((type: YosysCommandType): void => {
                const result: YosysCommandArgs = buildYosysArgs(mockConfig, type);
                expect(result).toBeDefined();
                expect(result.baseArgs).toBeInstanceOf(Array);
            });
        });
    });

    describe('buildLoadCommands', (): void => {
        it('should build load commands for Verilog files', (): void => {
            const verilogFiles: string[] = ['test1.v', 'test2.v'];
            const result: string[] = buildLoadCommands(mockConfig, verilogFiles);
            
            expect(result).toBeInstanceOf(Array);
            expect(result.length).toBeGreaterThan(0);
            expect(result.some((cmd: string): boolean => cmd.includes('read_verilog'))).toBe(true);
            expect(result.some((cmd: string): boolean => cmd.includes('test1.v'))).toBe(true);
        });

        it('should build load commands for SystemVerilog files', (): void => {
            const verilogFiles: string[] = [];
            const systemVerilogFiles: string[] = ['test1.sv', 'test2.sv'];
            const result: string[] = buildLoadCommands(mockConfig, verilogFiles, systemVerilogFiles);
            
            expect(result).toBeInstanceOf(Array);
            expect(result.some((cmd: string): boolean => cmd.includes('read_verilog -sv'))).toBe(true);
            expect(result.some((cmd: string): boolean => cmd.includes('test1.sv'))).toBe(true);
        });

        it('should handle both Verilog and SystemVerilog files', (): void => {
            const verilogFiles: string[] = ['test.v'];
            const systemVerilogFiles: string[] = ['test.sv'];
            const result: string[] = buildLoadCommands(mockConfig, verilogFiles, systemVerilogFiles);
            
            expect(result.length).toBeGreaterThanOrEqual(2);
            expect(result.some((cmd: string): boolean => cmd.includes('read_verilog') && !cmd.includes('-sv'))).toBe(true);
            expect(result.some((cmd: string): boolean => cmd.includes('read_verilog -sv'))).toBe(true);
        });

        it('should include custom load commands', (): void => {
            mockConfig.custom_load_commands = ['custom_load_cmd1', 'custom_load_cmd2'];
            const result: string[] = buildLoadCommands(mockConfig, ['test.v']);
            
            expect(result).toContain('custom_load_cmd1');
            expect(result).toContain('custom_load_cmd2');
        });

        it('should handle read_verilog options', (): void => {
            mockConfig.read_verilog_options = ['-defer', '-sv2005'];
            const result: string[] = buildLoadCommands(mockConfig, ['test.v']);
            
            // Find the verilog command (should contain read_verilog and not be systemverilog command)
            const verilogCommand: string | undefined = result.find((cmd: string): boolean => 
                cmd.includes('read_verilog') && !cmd.includes('read_verilog -sv ')
            );
            expect(verilogCommand).toBeDefined();
            expect(verilogCommand).toContain('-defer');
            expect(verilogCommand).toContain('-sv2005');
            expect(verilogCommand).toContain('test.v');
        });

        it('should handle read_systemverilog options', (): void => {
            mockConfig.read_systemverilog_options = ['-formal', '-assert'];
            const result: string[] = buildLoadCommands(mockConfig, [], ['test.sv']);
            
            const svCommand: string | undefined = result.find((cmd: string): boolean => cmd.includes('read_verilog -sv'));
            expect(svCommand).toContain('-formal');
            expect(svCommand).toContain('-assert');
        });

        it('should handle empty file arrays', (): void => {
            const result: string[] = buildLoadCommands(mockConfig, [], []);
            
            expect(result).toBeInstanceOf(Array);
            // Should only contain custom commands if any
            if (mockConfig.custom_load_commands) {
                expect(result).toEqual(mockConfig.custom_load_commands);
            } else {
                expect(result).toEqual([]);
            }
        });
    });

    describe('buildAnalyzeCommands', (): void => {
        it('should build analyze commands with top module', (): void => {
            const topModule: string = 'top_module';
            const result: string[] = buildAnalyzeCommands(mockConfig, topModule);
            
            expect(result).toBeInstanceOf(Array);
            expect(result.length).toBeGreaterThan(0);
            expect(result.some((cmd: string): boolean => cmd.includes('hierarchy'))).toBe(true);
            expect(result.some((cmd: string): boolean => cmd.includes(topModule))).toBe(true);
        });

        it('should include custom analyze commands', (): void => {
            mockConfig.custom_analyze_commands = ['custom_analyze_cmd'];
            const result: string[] = buildAnalyzeCommands(mockConfig, 'top');
            
            expect(result).toContain('custom_analyze_cmd');
        });

        it('should handle hierarchy options', (): void => {
            mockConfig.hierarchy_options = ['-check', '-purge_lib'];
            const result: string[] = buildAnalyzeCommands(mockConfig, 'top');
            
            const hierarchyCommand: string | undefined = result.find((cmd: string): boolean => cmd.includes('hierarchy'));
            expect(hierarchyCommand).toContain('-check');
            expect(hierarchyCommand).toContain('-purge_lib');
        });

        it('should include check command when enabled', (): void => {
            mockConfig.check_enabled = true;
            const result: string[] = buildAnalyzeCommands(mockConfig, 'top');
            
            expect(result.some((cmd: string): boolean => cmd.includes('check'))).toBe(true);
        });

        it('should include stat command when enabled', (): void => {
            mockConfig.stat_enabled = true;
            const result: string[] = buildAnalyzeCommands(mockConfig, 'top');
            
            expect(result.some((cmd: string): boolean => cmd.includes('stat'))).toBe(true);
        });
    });

    describe('buildElaborateCommands', (): void => {
        it('should build elaborate commands', (): void => {
            const result: string[] = buildElaborateCommands(mockConfig);
            
            expect(result).toBeInstanceOf(Array);
            expect(result.length).toBeGreaterThan(0);
            expect(result.some((cmd: string): boolean => cmd.includes('proc'))).toBe(true);
        });

        it('should include custom elaborate commands', (): void => {
            mockConfig.custom_elaborate_commands = ['custom_elaborate_cmd'];
            const result: string[] = buildElaborateCommands(mockConfig);
            
            expect(result).toContain('custom_elaborate_cmd');
        });

        it('should handle proc options', (): void => {
            mockConfig.proc_options = ['-noopt', '-ifx'];
            const result: string[] = buildElaborateCommands(mockConfig);
            
            const procCommand: string | undefined = result.find((cmd: string): boolean => cmd.includes('proc'));
            expect(procCommand).toContain('-noopt');
            expect(procCommand).toContain('-ifx');
        });

        it('should include opt command', (): void => {
            const result: string[] = buildElaborateCommands(mockConfig);
            
            expect(result.some((cmd: string): boolean => cmd.includes('opt'))).toBe(true);
        });

        it('should handle flatten when enabled', (): void => {
            mockConfig.flatten_enabled = true;
            const result: string[] = buildElaborateCommands(mockConfig);
            
            expect(result.some((cmd: string): boolean => cmd.includes('flatten'))).toBe(true);
        });
    });

    describe('buildSynthesisCommands', (): void => {
        it('should build synthesis commands for ice40 target', (): void => {
            mockConfig.synthesis_target = e_tools_yosys_synthesis_target.ice40;
            const result: string[] = buildSynthesisCommands(mockConfig, 'top_module');
            
            expect(result).toBeInstanceOf(Array);
            expect(result.length).toBeGreaterThan(0);
        });

        it('should build synthesis commands for ecp5 target', (): void => {
            mockConfig.synthesis_target = e_tools_yosys_synthesis_target.ecp5;
            const result: string[] = buildSynthesisCommands(mockConfig, 'top_module');
            
            expect(result).toBeInstanceOf(Array);
            expect(result.length).toBeGreaterThan(0);
        });

        it('should default to ice40 if no target specified', (): void => {
            mockConfig.synthesis_target = undefined as any;
            const result: string[] = buildSynthesisCommands(mockConfig, 'top_module');
            
            expect(result).toBeInstanceOf(Array);
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('buildIce40SynthesisCommands', (): void => {
        it('should build ice40 synthesis commands', (): void => {
            const result: string[] = buildIce40SynthesisCommands(mockConfig, 'top_module');
            
            expect(result).toBeInstanceOf(Array);
            expect(result.length).toBeGreaterThan(0);
            expect(result.some((cmd: string): boolean => cmd.includes('synth_ice40'))).toBe(true);
        });

        it('should include top module in synthesis command', (): void => {
            const topModule: string = 'my_top_module';
            const result: string[] = buildIce40SynthesisCommands(mockConfig, topModule);
            
            expect(result.some((cmd: string): boolean => cmd.includes(topModule))).toBe(true);
        });

        it('should handle ice40 synthesis options', (): void => {
            mockConfig.ice40_dsp = true;
            mockConfig.ice40_nocarry = true;
            const result: string[] = buildIce40SynthesisCommands(mockConfig, 'top');
            
            expect(result).toBeInstanceOf(Array);
            expect(result.length).toBeGreaterThan(0);
        });

        it('should include device option when configured', (): void => {
            mockConfig.ice40_device = e_tools_yosys_ice40_device.hx;
            const result: string[] = buildIce40SynthesisCommands(mockConfig, 'top');
            
            expect(result.some((cmd: string): boolean => cmd.includes('-device hx'))).toBe(true);
        });

        it('should include output options when configured', (): void => {
            mockConfig.ice40_output_json = 'output.json';
            const result: string[] = buildIce40SynthesisCommands(mockConfig, 'top');
            
            expect(result.some((cmd: string): boolean => cmd.includes('-json output.json'))).toBe(true);
        });
    });

    describe('buildEcp5SynthesisCommands', (): void => {
        it('should build ecp5 synthesis commands', (): void => {
            const result: string[] = buildEcp5SynthesisCommands(mockConfig, 'top_module');
            
            expect(result).toBeInstanceOf(Array);
            expect(result.length).toBeGreaterThan(0);
            expect(result.some((cmd: string): boolean => cmd.includes('synth_ecp5'))).toBe(true);
        });

        it('should include top module in synthesis command', (): void => {
            const topModule: string = 'my_top_module';
            const result: string[] = buildEcp5SynthesisCommands(mockConfig, topModule);
            
            expect(result.some((cmd: string): boolean => cmd.includes(topModule))).toBe(true);
        });

        it('should handle ecp5 synthesis options', (): void => {
            mockConfig.ecp5_nowidelut = true;
            mockConfig.ecp5_noabc9 = true;
            const result: string[] = buildEcp5SynthesisCommands(mockConfig, 'top');
            
            expect(result).toBeInstanceOf(Array);
            expect(result.length).toBeGreaterThan(0);
        });

        it('should include output options when configured', (): void => {
            mockConfig.ecp5_output_edif = 'output.edif';
            const result: string[] = buildEcp5SynthesisCommands(mockConfig, 'top');
            
            expect(result.some((cmd: string): boolean => cmd.includes('-edif output.edif'))).toBe(true);
        });

        it('should handle boolean flags', (): void => {
            mockConfig.ecp5_nowidelut = true;
            mockConfig.ecp5_noabc9 = true;
            const result: string[] = buildEcp5SynthesisCommands(mockConfig, 'top');
            
            const synthCommand: string | undefined = result.find((cmd: string): boolean => cmd.includes('synth_ecp5'));
            expect(synthCommand).toContain('-nowidelut');
            expect(synthCommand).toContain('-noabc9');
        });
    });

    describe('Edge Cases and Error Handling', (): void => {
        it('should handle null/undefined config gracefully', (): void => {
            const emptyConfig: e_tools_yosys = {} as any;
            
            expect((): void => {
                buildYosysArgs(emptyConfig, 'load');
            }).not.toThrow();
        });

        it('should handle empty custom commands arrays', (): void => {
            mockConfig.custom_load_commands = [];
            mockConfig.custom_analyze_commands = [];
            mockConfig.custom_elaborate_commands = [];
            
            const loadResult: string[] = buildLoadCommands(mockConfig, ['test.v']);
            const analyzeResult: string[] = buildAnalyzeCommands(mockConfig, 'top');
            const elaborateResult: string[] = buildElaborateCommands(mockConfig);
            
            expect(loadResult.length).toBeGreaterThan(0);
            expect(analyzeResult.length).toBeGreaterThan(0);
            expect(elaborateResult.length).toBeGreaterThan(0);
        });

        it('should handle files with spaces in names', (): void => {
            const filesWithSpaces: string[] = ['test file.v', 'another test.sv'];
            const result: string[] = buildLoadCommands(mockConfig, filesWithSpaces, []);
            
            expect(result.some((cmd: string): boolean => cmd.includes('test file.v'))).toBe(true);
        });

        it('should handle special characters in file names', (): void => {
            const specialFiles: string[] = ['test-file_1.v', 'test[0].sv'];
            const result: string[] = buildLoadCommands(mockConfig, specialFiles, []);
            
            expect(result.some((cmd: string): boolean => cmd.includes('test-file_1.v'))).toBe(true);
            expect(result.some((cmd: string): boolean => cmd.includes('test[0].sv'))).toBe(true);
        });
    });
});
