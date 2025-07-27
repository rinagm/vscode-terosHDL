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

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import {
    getTopLevel,
    getVerilogFiles,
    getRelativeFilePath,
    checkStageFileExists,
    getStageFileName,
    getPreviousStage,
    cleanupIntermediateFiles,
    validateProjectFiles,
    getLatestStateFile,
    getShowSvgFileName,
    getShowSvgFilePath,
    FileTypeGroup
} from '../../../../src/colibri/project_manager/tool/yosys/utils';
import { t_project_definition } from '../../../../src/colibri/project_manager/project_definition';
import { t_file, e_source_type, e_project_type } from '../../../../src/colibri/project_manager/common';
import { LANGUAGE, VERILOG_LANG_VERSION } from '../../../../src/colibri/common/general';
import { get_default_config } from '../../../../src/colibri/config/config_declaration';
import { File_manager } from '../../../../src/colibri/project_manager/list_manager/file';
import { Hook_manager } from '../../../../src/colibri/project_manager/list_manager/hook';
import { Parameter_manager } from '../../../../src/colibri/project_manager/list_manager/parameter';
import { Toplevel_path_manager } from '../../../../src/colibri/project_manager/list_manager/toplevel_path';
import { Watcher_manager } from '../../../../src/colibri/project_manager/list_manager/watcher';

describe('Yosys Utils', (): void => {
    let testProject: t_project_definition;
    let tempDir: string;

    beforeEach((): void => {
        tempDir = path.join(__dirname, 'temp_test_' + Date.now());
        fs.mkdirSync(tempDir, { recursive: true });

        // Create test project
        testProject = createTestProject(tempDir);
    });

    afterEach((): void => {
        // Cleanup temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    function createTestProject(projectPath: string): t_project_definition {
        const fileManager = new File_manager();
        const hookManager = new Hook_manager();
        const parameterManager = new Parameter_manager();
        const toplevelPathManager = new Toplevel_path_manager();
        const watcherManager = new Watcher_manager((): void => {}, undefined);
        
        const config = get_default_config();

        return {
            name: 'Test Project',
            project_disk_path: projectPath,
            project_type: e_project_type.GENERIC,
            file_manager: fileManager,
            hook_manager: hookManager,
            parameter_manager: parameterManager,
            toplevel_path_manager: toplevelPathManager,
            watcher_manager: watcherManager,
            config: config
        };
    }

    function addTestFiles(project: t_project_definition): void {
        const verilogFile: t_file = {
            name: path.join(project.project_disk_path, 'test.v'),
            is_include_file: false,
            include_path: '',
            logical_name: '',
            is_manual: false,
            file_type: LANGUAGE.VERILOG,
            file_version: VERILOG_LANG_VERSION.v2000,
            source_type: e_source_type.NONE
        };

        const systemVerilogFile: t_file = {
            name: path.join(project.project_disk_path, 'test.sv'),
            is_include_file: false,
            include_path: '',
            logical_name: '',
            is_manual: false,
            file_type: LANGUAGE.SYSTEMVERILOG,
            file_version: VERILOG_LANG_VERSION.v2005,
            source_type: e_source_type.NONE
        };

        const vhdlFile: t_file = {
            name: path.join(project.project_disk_path, 'test.vhd'),
            is_include_file: false,
            include_path: '',
            logical_name: '',
            is_manual: false,
            file_type: LANGUAGE.VHDL,
            file_version: undefined,
            source_type: e_source_type.NONE
        };

        project.file_manager.add(verilogFile);
        project.file_manager.add(systemVerilogFile);
        project.file_manager.add(vhdlFile);

        // Create the actual files for validation tests
        fs.writeFileSync(verilogFile.name, '// Verilog test file');
        fs.writeFileSync(systemVerilogFile.name, '// SystemVerilog test file');
        fs.writeFileSync(vhdlFile.name, '-- VHDL test file');
    }

    describe('getTopLevel', (): void => {
        it('should return null when no top level is defined', (): void => {
            const result: string | null = getTopLevel(testProject);
            expect(result).toBeNull();
        });

        it('should return top level module name when defined', (): void => {
            // Create a test HDL file with a module
            const testFilePath: string = path.join(testProject.project_disk_path, 'counter_top.v');
            fs.writeFileSync(testFilePath, `
module counter_top (
    input clk,
    output reg [3:0] count
);
    always @(posedge clk) begin
        count <= count + 1;
    end
endmodule
`);
            testProject.toplevel_path_manager.add(testFilePath);
            const result: string | null = getTopLevel(testProject);
            expect(result).toBe('counter_top');
        });

        it('should return first top level when multiple are defined', (): void => {
            // Create test HDL files with modules
            const testFile1: string = path.join(testProject.project_disk_path, 'module1.v');
            const testFile2: string = path.join(testProject.project_disk_path, 'module2.v');
            fs.writeFileSync(testFile1, `
module module1 (
    input clk
);
endmodule
`);
            fs.writeFileSync(testFile2, `
module module2 (
    input clk
);
endmodule
`);
            testProject.toplevel_path_manager.add(testFile1);
            testProject.toplevel_path_manager.add(testFile2);
            const result: string | null = getTopLevel(testProject);
            expect(result).toBe('module1');
        });

        it('should handle top level paths with directory separators', (): void => {
            // Create subdirectory and test HDL file
            const subDir: string = path.join(testProject.project_disk_path, 'src');
            fs.mkdirSync(subDir, { recursive: true });
            const testFilePath: string = path.join(subDir, 'counter_top.v');
            fs.writeFileSync(testFilePath, `
module counter_top (
    input clk,
    output reg [3:0] count
);
    always @(posedge clk) begin
        count <= count + 1;
    end
endmodule
`);
            testProject.toplevel_path_manager.add(testFilePath);
            const result: string | null = getTopLevel(testProject);
            expect(result).toBe('counter_top');
        });
    });

    describe('getVerilogFiles', (): void => {
        it('should return empty arrays when no files are present', (): void => {
            const result: FileTypeGroup = getVerilogFiles(testProject);
            
            expect(result.verilogFiles).toEqual([]);
            expect(result.systemVerilogFiles).toEqual([]);
        });

        it('should categorize Verilog and SystemVerilog files correctly', (): void => {
            addTestFiles(testProject);
            const result: FileTypeGroup = getVerilogFiles(testProject);
            
            expect(result.verilogFiles).toHaveLength(1);
            expect(result.systemVerilogFiles).toHaveLength(1);
            expect(result.verilogFiles[0]).toContain('test.v');
            expect(result.systemVerilogFiles[0]).toContain('test.sv');
        });

        it('should exclude non-Verilog files', (): void => {
            addTestFiles(testProject);
            const result: FileTypeGroup = getVerilogFiles(testProject);
            
            // Should not include VHDL files
            const allFiles: string[] = [...result.verilogFiles, ...result.systemVerilogFiles];
            expect(allFiles.some((file: string): boolean => file.includes('test.vhd'))).toBe(false);
        });

        it('should handle files outside project directory', (): void => {
            const externalFile: t_file = {
                name: '/external/path/external.v',
                is_include_file: false,
                include_path: '',
                logical_name: '',
                is_manual: false,
                file_type: LANGUAGE.VERILOG,
                file_version: VERILOG_LANG_VERSION.v2000,
                source_type: e_source_type.NONE
            };
            
            testProject.file_manager.add(externalFile);
            const result: FileTypeGroup = getVerilogFiles(testProject);
            
            expect(result.verilogFiles).toHaveLength(1);
            expect(result.verilogFiles[0]).toBe('/external/path/external.v');
        });
    });

    describe('getRelativeFilePath', (): void => {
        it('should return relative path for files within project', (): void => {
            const filePath: string = path.join(testProject.project_disk_path, 'src', 'test.v');
            const result: string = getRelativeFilePath(testProject, filePath);
            
            expect(result).toBe(path.join('src', 'test.v'));
        });

        it('should return absolute path for files outside project', (): void => {
            const filePath: string = '/external/path/test.v';
            const result: string = getRelativeFilePath(testProject, filePath);
            
            expect(result).toBe('/external/path/test.v');
        });

        it('should handle files in project root', (): void => {
            const filePath: string = path.join(testProject.project_disk_path, 'test.v');
            const result: string = getRelativeFilePath(testProject, filePath);
            
            expect(result).toBe('test.v');
        });
    });

    describe('getStageFileName', (): void => {
        it('should return correct file names for each stage', (): void => {
            expect(getStageFileName('load')).toBe('step1_raw.rtlil');
            expect(getStageFileName('analyze')).toBe('step2_hierarchy.rtlil');
            expect(getStageFileName('elaborate')).toBe('step3_elaborated.rtlil');
            expect(getStageFileName('synthesis')).toBe('step4_synthesis.rtlil');
        });

        it('should handle unknown stage names', (): void => {
            const result: string = getStageFileName('unknown');
            expect(result).toBe('step_unknown.rtlil');
        });

        it('should handle empty stage name', (): void => {
            const result: string = getStageFileName('');
            expect(result).toBe('step_.rtlil');
        });
    });

    describe('getPreviousStage', (): void => {
        it('should return correct previous stages', (): void => {
            expect(getPreviousStage('analyze')).toBe('load');
            expect(getPreviousStage('elaborate')).toBe('analyze');
            expect(getPreviousStage('synthesis')).toBe('elaborate');
        });

        it('should return null for first stage', (): void => {
            expect(getPreviousStage('load')).toBeNull();
        });

        it('should return null for unknown stages', (): void => {
            expect(getPreviousStage('unknown')).toBeNull();
            expect(getPreviousStage('')).toBeNull();
        });
    });

    describe('checkStageFileExists', (): void => {
        it('should return false for non-existent files', (): void => {
            const result: boolean = checkStageFileExists(tempDir, 'load');
            expect(result).toBe(false);
        });

        it('should return true for existing stage files', (): void => {
            const stageFile: string = path.join(tempDir, 'step1_raw.rtlil');
            fs.writeFileSync(stageFile, 'test content');
            
            const result: boolean = checkStageFileExists(tempDir, 'load');
            expect(result).toBe(true);
        });

        it('should handle non-existent project directory', (): void => {
            const result: boolean = checkStageFileExists('/non/existent/path', 'load');
            expect(result).toBe(false);
        });
    });

    describe('validateProjectFiles', (): void => {
        it('should return empty array when all files exist', (): void => {
            addTestFiles(testProject);
            const result: string[] = validateProjectFiles(testProject);
            
            expect(result).toEqual([]);
        });

        it('should return missing files', (): void => {
            const missingFile: t_file = {
                name: path.join(testProject.project_disk_path, 'missing.v'),
                is_include_file: false,
                include_path: '',
                logical_name: '',
                is_manual: false,
                file_type: LANGUAGE.VERILOG,
                file_version: VERILOG_LANG_VERSION.v2000,
                source_type: e_source_type.NONE
            };
            
            testProject.file_manager.add(missingFile);
            const result: string[] = validateProjectFiles(testProject);
            
            expect(result).toHaveLength(1);
            expect(result[0]).toContain('missing.v');
        });

        it('should handle empty file list', (): void => {
            const result: string[] = validateProjectFiles(testProject);
            expect(result).toEqual([]);
        });
    });

    describe('getLatestStateFile', (): void => {
        it('should return null when no stage files exist', (): void => {
            const result: string | null = getLatestStateFile(tempDir);
            expect(result).toBeNull();
        });

        it('should return synthesis file when it exists', (): void => {
            fs.writeFileSync(path.join(tempDir, 'step4_synthesis.rtlil'), 'content');
            const result: string | null = getLatestStateFile(tempDir);
            expect(result).toBe('step4_synthesis.rtlil');
        });

        it('should return elaborate file when synthesis does not exist', (): void => {
            fs.writeFileSync(path.join(tempDir, 'step3_elaborated.rtlil'), 'content');
            const result: string | null = getLatestStateFile(tempDir);
            expect(result).toBe('step3_elaborated.rtlil');
        });

        it('should return analyze file when later stages do not exist', (): void => {
            fs.writeFileSync(path.join(tempDir, 'step2_hierarchy.rtlil'), 'content');
            const result: string | null = getLatestStateFile(tempDir);
            expect(result).toBe('step2_hierarchy.rtlil');
        });

        it('should return load file when only it exists', (): void => {
            fs.writeFileSync(path.join(tempDir, 'step1_raw.rtlil'), 'content');
            const result: string | null = getLatestStateFile(tempDir);
            expect(result).toBe('step1_raw.rtlil');
        });

        it('should prioritize later stages over earlier ones', (): void => {
            fs.writeFileSync(path.join(tempDir, 'step1_raw.rtlil'), 'content');
            fs.writeFileSync(path.join(tempDir, 'step2_hierarchy.rtlil'), 'content');
            fs.writeFileSync(path.join(tempDir, 'step4_synthesis.rtlil'), 'content');
            
            const result: string | null = getLatestStateFile(tempDir);
            expect(result).toBe('step4_synthesis.rtlil');
        });
    });

    describe('cleanupIntermediateFiles', (): void => {
        it('should remove existing intermediate files', (): void => {
            const files: string[] = [
                'step1_raw.rtlil',
                'step2_hierarchy.rtlil',
                'step3_elaborated.rtlil',
                'step4_synthesis.rtlil'
            ];
            
            // Create test files
            files.forEach((file: string): void => {
                fs.writeFileSync(path.join(tempDir, file), 'test content');
            });
            
            // Verify files exist before cleanup
            files.forEach((file: string): void => {
                expect(fs.existsSync(path.join(tempDir, file))).toBe(true);
            });
            
            cleanupIntermediateFiles(tempDir);
            
            // Verify files are removed after cleanup
            files.forEach((file: string): void => {
                expect(fs.existsSync(path.join(tempDir, file))).toBe(false);
            });
        });

        it('should handle non-existent files gracefully', (): void => {
            expect((): void => {
                cleanupIntermediateFiles(tempDir);
            }).not.toThrow();
        });

        it('should handle non-existent directory gracefully', (): void => {
            expect((): void => {
                cleanupIntermediateFiles('/non/existent/path');
            }).not.toThrow();
        });

        it('should not remove other files', (): void => {
            const otherFile: string = path.join(tempDir, 'other_file.txt');
            fs.writeFileSync(otherFile, 'content');
            fs.writeFileSync(path.join(tempDir, 'step1_raw.rtlil'), 'content');
            
            cleanupIntermediateFiles(tempDir);
            
            expect(fs.existsSync(otherFile)).toBe(true);
            expect(fs.existsSync(path.join(tempDir, 'step1_raw.rtlil'))).toBe(false);
        });
    });

    describe('getShowSvgFileName', (): void => {
        it('should return consistent SVG filename', (): void => {
            const result: string = getShowSvgFileName();
            expect(result).toBe('show_output.svg');
        });
    });

    describe('getShowSvgFilePath', (): void => {
        it('should return correct full path to SVG file', (): void => {
            const result: string = getShowSvgFilePath(tempDir);
            const expected: string = path.join(tempDir, 'show_output.svg');
            expect(result).toBe(expected);
        });

        it('should handle different project paths', (): void => {
            const testPaths: string[] = [
                '/project/path',
                '/another/project',
                'relative/path'
            ];
            
            testPaths.forEach((projectPath: string): void => {
                const result: string = getShowSvgFilePath(projectPath);
                expect(result).toBe(path.join(projectPath, 'show_output.svg'));
            });
        });
    });

    describe('Edge Cases and Error Handling', (): void => {
        it('should handle project with mixed file types correctly', (): void => {
            // Add files of different types
            const files: t_file[] = [
                {
                    name: 'test.v',
                    is_include_file: false,
                    include_path: '',
                    logical_name: '',
                    is_manual: false,
                    file_type: LANGUAGE.VERILOG,
                    file_version: VERILOG_LANG_VERSION.v2000,
                    source_type: e_source_type.SYNTHESIS
                },
                {
                    name: 'test.sv',
                    is_include_file: false,
                    include_path: '',
                    logical_name: '',
                    is_manual: false,
                    file_type: LANGUAGE.SYSTEMVERILOG,
                    file_version: VERILOG_LANG_VERSION.v2005,
                    source_type: e_source_type.SIMULATION
                },
                {
                    name: 'test.vhd',
                    is_include_file: false,
                    include_path: '',
                    logical_name: '',
                    is_manual: false,
                    file_type: LANGUAGE.VHDL,
                    file_version: undefined,
                    source_type: e_source_type.NONE
                }
            ];
            
            files.forEach((file: t_file): void => {
                testProject.file_manager.add(file);
            });
            
            const result: FileTypeGroup = getVerilogFiles(testProject);
            
            expect(result.verilogFiles).toHaveLength(1);
            expect(result.systemVerilogFiles).toHaveLength(1);
            expect(result.verilogFiles[0]).toBe('test.v');
            expect(result.systemVerilogFiles[0]).toBe('test.sv');
        });

        it('should handle very long file paths', (): void => {
            const longPath: string = 'a'.repeat(200) + '.v';
            const file: t_file = {
                name: longPath,
                is_include_file: false,
                include_path: '',
                logical_name: '',
                is_manual: false,
                file_type: LANGUAGE.VERILOG,
                file_version: VERILOG_LANG_VERSION.v2000,
                source_type: e_source_type.NONE
            };
            
            testProject.file_manager.add(file);
            const result: FileTypeGroup = getVerilogFiles(testProject);
            
            expect(result.verilogFiles).toHaveLength(1);
            expect(result.verilogFiles[0]).toBe(longPath);
        });

        it('should handle Unicode characters in file paths', (): void => {
            const unicodeFile: t_file = {
                name: 'test_ñoño_测试.v',
                is_include_file: false,
                include_path: '',
                logical_name: '',
                is_manual: false,
                file_type: LANGUAGE.VERILOG,
                file_version: VERILOG_LANG_VERSION.v2000,
                source_type: e_source_type.NONE
            };
            
            testProject.file_manager.add(unicodeFile);
            const result: FileTypeGroup = getVerilogFiles(testProject);
            
            expect(result.verilogFiles).toHaveLength(1);
            expect(result.verilogFiles[0]).toBe('test_ñoño_测试.v');
        });
    });
});
