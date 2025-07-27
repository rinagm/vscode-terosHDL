import { p_result } from 'colibri/process/common';
import { e_taskType } from '../common';
import { ChildProcess } from 'child_process';
import { t_project_definition } from 'colibri/project_manager/project_definition';
import {
    runYosysLoadFiles,
    runYosysAnalyze,
    runYosysElaborate,
    runYosysSynthesis,
    runYosysCompileAll,
    runYosysOpenProjectFolder,
    runYosysShow,
    runYosysResourceUtilization
} from './tasks';
import * as file_utils from 'colibri/utils/file_utils';
import { LoggerBase } from 'colibri/logger/logger';

/**
 * Main entry point for Yosys task execution
 */

/**
 * Main function to run Yosys tasks based on task type
 * @param taskType Type of Yosys task to execute
 * @param projectDefinition Project definition containing files and configuration
 * @param callback Callback function to handle the result
 * @returns ChildProcess instance
 */
export function runTaskYosys(
    taskType: e_taskType,
    projectDefinition: t_project_definition,
    toolLogger: LoggerBase,
    callback: (result: p_result) => void
): ChildProcess {
    if (!file_utils.check_if_path_exist(projectDefinition.project_disk_path)) {
        file_utils.create_directory(projectDefinition.project_disk_path);
    }

    switch (taskType) {
        case e_taskType.YOSYS_LOAD_FILES:
            return runYosysLoadFiles(projectDefinition, toolLogger, callback);

        case e_taskType.YOSYS_ANALYZE:
            return runYosysAnalyze(projectDefinition, toolLogger, callback);

        case e_taskType.YOSYS_ELABORATE:
            return runYosysElaborate(projectDefinition, toolLogger, callback);

        case e_taskType.YOSYS_SYNTHESIS:
            return runYosysSynthesis(projectDefinition, toolLogger, callback);

        case e_taskType.YOSYS_COMPILE_ALL:
            return runYosysCompileAll(projectDefinition, toolLogger, callback);

        case e_taskType.YOSYS_SHOW:
            return runYosysShow(projectDefinition, toolLogger, callback);

        case e_taskType.YOSYS_RESOURCE_UTILIZATION:
            return runYosysResourceUtilization(projectDefinition, toolLogger, callback);

        case e_taskType.OPENFOLDER:
            return runYosysOpenProjectFolder(projectDefinition, toolLogger, callback);

        default:
            const result: p_result = {
                command: '',
                stdout: '',
                stderr: `Unsupported Yosys task type: ${taskType}`,
                return_value: 1,
                successful: false
            };
            setTimeout(() => callback(result), 0);
            return {} as ChildProcess;
    }
}

// Re-export utilities for external use if needed
export { buildYosysArgs, YosysCommandType, YosysCommandArgs } from './commandBuilder';
export { getBinary, executeYosysCommand, executeCommand } from './executor';
export { getTopLevel, getVerilogFiles, checkStageFileExists } from './utils';
