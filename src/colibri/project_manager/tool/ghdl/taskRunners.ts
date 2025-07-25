import { p_result } from 'colibri/process/common';
import { e_taskType } from '../common';
import { ChildProcess } from 'child_process';
import { t_project_definition } from 'colibri/project_manager/project_definition';
import {
    runGhdlAnalyze,
    runGhdlElaborate,
    runGhdlSimulate,
    runGhdlAll,
    runGhdlSynthesize,
    runGhdlCheckSyntax,
    runGhdlMakefile
} from './tasks';
import * as file_utils from 'colibri/utils/file_utils';

/**
 * Main entry point for GHDL task execution
 */

/**
 * Main function to run GHDL tasks based on task type
 * @param taskType Type of GHDL task to execute
 * @param projectDefinition Project definition containing files and configuration
 * @param callback Callback function to handle the result
 * @returns ChildProcess instance
 */
export function runTaskGHDL(
    taskType: e_taskType,
    projectDefinition: t_project_definition,
    callback: (result: p_result) => void
): ChildProcess {
    if (!file_utils.check_if_path_exist(projectDefinition.project_disk_path)) {
        file_utils.create_directory(projectDefinition.project_disk_path);
    }

    switch (taskType) {
        case e_taskType.GHDL_ANALYZE:
            return runGhdlAnalyze(projectDefinition, callback);

        case e_taskType.GHDL_ELABORATE:
            return runGhdlElaborate(projectDefinition, callback);

        case e_taskType.GHDL_SIMULATE:
            return runGhdlSimulate(projectDefinition, callback);

        case e_taskType.GHDL_RUN_ALL:
            return runGhdlAll(projectDefinition, callback);

        case e_taskType.GHDL_SYNTHESIZE:
            return runGhdlSynthesize(projectDefinition, callback);

        case e_taskType.GHDL_CHECK_SYNTAX:
            return runGhdlCheckSyntax(projectDefinition, callback);

        case e_taskType.GHDL_MAKEFILE:
            return runGhdlMakefile(projectDefinition, callback);

        default:
            const result: p_result = {
                command: '',
                stdout: '',
                stderr: `Unsupported GHDL task type: ${taskType}`,
                return_value: 1,
                successful: false
            };
            setTimeout(() => callback(result), 0);
            return {} as ChildProcess;
    }
}

// Re-export utilities for external use if needed
export { buildGhdlArgs, GhdlCommandType, GhdlCommandArgs } from './commandBuilder';
export { getBinary, executeGhdlCommand, executeCommand } from './executor';
export { getTopLevel, getVhdlFiles, groupFilesByLibrary } from './utils';
