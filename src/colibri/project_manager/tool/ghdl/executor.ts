import { p_result } from 'colibri/process/common';
import { ChildProcess } from 'child_process';
import { e_tools_ghdl } from 'colibri/config/config_declaration';
import { Process } from 'colibri/process/process';
import * as path from 'path';
import * as file_utils from 'colibri/utils/file_utils';

/**
 * Command execution utilities for GHDL
 */

/**
 * Get GHDL binary path from project configuration
 * Uses installation_path if configured, otherwise falls back to system path
 * @param config GHDL configuration from project
 * @returns GHDL binary path
 */
export function getBinary(config: e_tools_ghdl): string {
    if (config.installation_path && config.installation_path.trim() !== '') {
        const ghdlPath = path.join(config.installation_path, 'ghdl');
        const ghdlExePath = path.join(config.installation_path, 'ghdl.exe');
        if (file_utils.check_if_path_exist(ghdlExePath)) {
            return ghdlExePath;
        }
        if (file_utils.check_if_path_exist(ghdlPath)) {
            return ghdlPath;
        }
    }
    // Fall back to system path
    return 'ghdl';
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
 * Helper function to execute a GHDL command using Process class
 * @param config GHDL configuration
 * @param args Command arguments array
 * @param cwd Working directory
 * @param callback Callback function to handle the result
 * @returns ChildProcess instance
 */
export function executeGhdlCommand(
    config: e_tools_ghdl, 
    args: string[], 
    cwd: string, 
    callback: (result: p_result) => void
): ChildProcess {
    // Properly quote arguments that contain spaces
    const quotedArgs = quoteArgs(args);

    const ghdlExecutable = getBinary(config);
    const command = `${ghdlExecutable} ${quotedArgs.join(' ')}`;
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
export function executeCommand(command: string, cwd: string, callback: (result: p_result) => void): ChildProcess {
    const process = new Process();
    const options = {
        cwd: cwd
    };

    return process.exec(command, options, callback);
}

/**
 * Build a chained command string from multiple GHDL commands
 * @param config GHDL configuration
 * @param commandSpecs Array of command specifications
 * @returns Complete command string
 */
export function buildChainedCommand(
    config: e_tools_ghdl,
    commandSpecs: Array<{ command: string; args: string[] }>
): string {
    const ghdlExecutable = getBinary(config);
    
    const commands = commandSpecs.map((spec) => {
        const quotedArgs = quoteArgs([spec.command, ...spec.args]);
        return `${ghdlExecutable} ${quotedArgs.join(' ')}`;
    });

    return commands.join(' && ');
}
