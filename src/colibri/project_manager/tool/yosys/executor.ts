import { p_result } from '../../../process/common';
import { ChildProcess } from 'child_process';
import { e_tools_yosys } from '../../../config/config_declaration';
import { Process } from '../../../process/process';
import { buildYosysArgs } from './commandBuilder';
import * as path from 'path';
import * as file_utils from '../../../utils/file_utils';
import { LoggerBase } from '../../../logger/logger';

/**
 * Command execution utilities for Yosys
 */

/**
 * Get Yosys binary path from project configuration
 * Uses installation_path if configured, otherwise falls back to system path
 * @param config Yosys configuration from project
 * @returns Yosys binary path
 */
export function getBinary(config: e_tools_yosys): string {
    if (config.installation_path && config.installation_path.trim() !== '') {
        const yosysPath = path.join(config.installation_path, 'yosys');
        const yosysExePath = path.join(config.installation_path, 'yosys.exe');
        if (file_utils.check_if_path_exist(yosysExePath)) {
            return yosysExePath;
        }
        if (file_utils.check_if_path_exist(yosysPath)) {
            return yosysPath;
        }
    }
    // Fall back to system path
    return 'yosys';
}

/**
 * Helper function to properly quote arguments that contain spaces
 * @param args Command arguments array
 * @returns Array of quoted arguments
 */
export function quoteArgs(args: string[]): string[] {
    return args.map((arg) => {
        if (arg.includes(' ')) {
            return `"${arg}"`;
        }
        return arg;
    });
}

/**
 * Helper function to execute a Yosys command using Process class
 * @param config Yosys configuration
 * @param args Command arguments array
 * @param cwd Working directory
 * @param callback Callback function to handle the result
 * @returns ChildProcess instance
 */
export function executeYosysCommand(
    config: e_tools_yosys, 
    args: string[], 
    cwd: string, 
    toolLogger: LoggerBase,
    callback: (result: p_result) => void
): ChildProcess {
    // Properly quote arguments that contain spaces
    const quotedArgs = quoteArgs(args);

    const yosysExecutable = getBinary(config);
    const command = `${yosysExecutable} ${quotedArgs.join(' ')}`;
    
    // Log the command being executed
    toolLogger.appendLine(`[Yosys] Executing command: ${command}`);
    
    const process = new Process();
    const options = {
        cwd: cwd
    };

    return process.exec(command, options, callback);
}

/**
 * Helper function to execute a command using Process class (fallback for complex commands)
 * @param command Command to execute
 * @param cwd Working directory
 * @param callback Callback function to handle the result
 * @returns ChildProcess instance
 */
export function executeCommand(command: string, cwd: string, toolLogger: LoggerBase,
    callback: (result: p_result) => void): ChildProcess {
    // Log the command being executed
    toolLogger.appendLine(`[Yosys] Executing command: ${command}`);
    
    const process = new Process();
    const options = {
        cwd: cwd
    };

    return process.exec(command, options, callback);
}

/**
 * Execute Yosys with a script provided as a string
 * @param config Yosys configuration
 * @param script Yosys script content
 * @param cwd Working directory
 * @param callback Callback function to handle the result
 * @returns ChildProcess instance
 */
export function executeYosysScript(
    config: e_tools_yosys,
    script: string,
    cwd: string,
    toolLogger: LoggerBase,
    callback: (result: p_result) => void
): ChildProcess {
    const yosysExecutable = getBinary(config);
    const { baseArgs } = buildYosysArgs(config, 'load');
    
    // Log the Yosys script being executed
    toolLogger.appendLine(`[Yosys] Executing script: ${script}`);
    
    // Build command with script passed via -p option
    const quotedScript = `"${script.replace(/"/g, '\\"')}"`;
    const command = `${yosysExecutable} ${baseArgs.join(' ')} -p ${quotedScript}`;
    
    // Log the full command
    toolLogger.appendLine(`[Yosys] Full command: ${command}`);
    
    return executeCommand(command, cwd, toolLogger, callback);
}

/**
 * Execute Yosys with a script file
 * @param config Yosys configuration  
 * @param scriptPath Path to the script file
 * @param cwd Working directory
 * @param callback Callback function to handle the result
 * @returns ChildProcess instance
 */
export function executeYosysScriptFile(
    config: e_tools_yosys,
    scriptPath: string,
    cwd: string,
    toolLogger: LoggerBase,
    callback: (result: p_result) => void
): ChildProcess {
    const yosysExecutable = getBinary(config);
    const { baseArgs } = buildYosysArgs(config, 'load');
    
    // Log the script file being executed
    toolLogger.appendLine(`[Yosys] Executing script file: ${scriptPath}`);
    
    const command = `${yosysExecutable} ${baseArgs.join(' ')} -s "${scriptPath}"`;

    return executeCommand(command, cwd, toolLogger, callback);
}
