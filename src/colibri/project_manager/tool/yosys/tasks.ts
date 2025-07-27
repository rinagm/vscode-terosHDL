import { p_result } from 'colibri/process/common';
import { ChildProcess } from 'child_process';
import { t_project_definition } from 'colibri/project_manager/project_definition';
import { 
    buildYosysArgs, 
    buildLoadCommands, 
    buildAnalyzeCommands, 
    buildElaborateCommands, 
    buildSynthesisCommands 
} from './commandBuilder';
import { executeYosysScript, executeCommand, getBinary } from './executor';
import { 
    getTopLevel, 
    getVerilogFiles, 
    checkStageFileExists, 
    getStageFileName, 
    getPreviousStage, 
    validateProjectFiles,
    getLatestStateFile,
    getShowSvgFileName
} from './utils';
import { toolLogger } from '../../../../teroshdl/logger';

/**
 * Individual Yosys task implementations
 */

/**
 * Create a standard error result for common error conditions
 * @param command Command name for the result
 * @param errorMessage Error message
 * @returns Error result object
 */
function createErrorResult(command: string, errorMessage: string): p_result {
    return {
        command: command,
        stdout: '',
        stderr: errorMessage,
        return_value: 1,
        successful: false
    };
}

/**
 * Executes Yosys load files task (step 1)
 * Loads Verilog/SystemVerilog files and saves to step1_raw.rtlil
 * @param projectDefinition Project definition containing files and configuration
 * @param callback Callback function to handle the result
 * @returns ChildProcess instance
 */
export function runYosysLoadFiles(
    projectDefinition: t_project_definition, 
    callback: (result: p_result) => void
): ChildProcess {
    toolLogger.appendLine(`[Yosys] Starting Load Files task`);
    
    const { verilogFiles, systemVerilogFiles } = getVerilogFiles(projectDefinition);
    const config = projectDefinition.config.tools.yosys;

    toolLogger.appendLine(`[Yosys] Found ${verilogFiles.length} Verilog files and ` +
               `${systemVerilogFiles.length} SystemVerilog files`);
    if (verilogFiles.length > 0) {
        toolLogger.appendLine(`[Yosys] Verilog files: ${verilogFiles.join(', ')}`);
    }
    if (systemVerilogFiles.length > 0) {
        toolLogger.appendLine(`[Yosys] SystemVerilog files: ${systemVerilogFiles.join(', ')}`);
    }

    if (verilogFiles.length === 0 && systemVerilogFiles.length === 0) {
        const result = createErrorResult('yosys load files', 'No Verilog or SystemVerilog files found in project');
        setTimeout(() => callback(result), 0);
        return {} as ChildProcess;
    }

    // Validate that all files exist
    const missingFiles = validateProjectFiles(projectDefinition);
    if (missingFiles.length > 0) {
        const result = createErrorResult('yosys load files', `Missing files: ${missingFiles.join(', ')}`);
        setTimeout(() => callback(result), 0);
        return {} as ChildProcess;
    }

    // Build load commands
    const loadCommands = buildLoadCommands(config, verilogFiles, systemVerilogFiles);
    
    // Add write_rtlil command to save the state
    const outputFile = getStageFileName('load');
    loadCommands.push(`write_rtlil ${outputFile}`);

    // Join commands with semicolons
    const script = loadCommands.join('; ');

    toolLogger.appendLine(`[Yosys] Load Files task completed, executing Yosys script`);
    return executeYosysScript(config, script, projectDefinition.project_disk_path, callback);
}

/**
 * Executes Yosys analyze task (step 2)
 * Reads step1_raw.rtlil, runs hierarchy, and saves to step2_hierarchy.rtlil
 * @param projectDefinition Project definition containing top level configuration
 * @param callback Callback function to handle the result
 * @returns ChildProcess instance
 */
export function runYosysAnalyze(
    projectDefinition: t_project_definition, 
    callback: (result: p_result) => void
): ChildProcess {
    toolLogger.appendLine(`[Yosys] Starting Analyze task`);
    
    const topLevel = getTopLevel(projectDefinition);
    const config = projectDefinition.config.tools.yosys;

    toolLogger.appendLine(`[Yosys] Top level module: ${topLevel}`);

    if (topLevel === null) {
        const result = createErrorResult('yosys analyze', 'No top level module specified');
        setTimeout(() => callback(result), 0);
        return {} as ChildProcess;
    }

    // Check if previous stage file exists
    const previousStage = getPreviousStage('analyze');
    if (previousStage && !checkStageFileExists(projectDefinition.project_disk_path, previousStage)) {
        toolLogger.appendLine(`[Yosys] Previous stage file missing: ${getStageFileName(previousStage)}`);
        const errorMsg = `Previous stage file missing. Please run "Load Files" first.`;
        const result = createErrorResult('yosys analyze', errorMsg);
        setTimeout(() => callback(result), 0);
        return {} as ChildProcess;
    } else if (previousStage) {
        toolLogger.appendLine(`[Yosys] Previous stage file found: ${getStageFileName(previousStage)}`);
    }

    const commands: string[] = [];
    
    // Read the previous stage RTLIL file
    const inputFile = getStageFileName('load');
    commands.push(`read_rtlil ${inputFile}`);
    
    // Build analyze commands
    const analyzeCommands = buildAnalyzeCommands(config, topLevel);
    commands.push(...analyzeCommands);
    
    // Save the state
    const outputFile = getStageFileName('analyze');
    commands.push(`write_rtlil ${outputFile}`);

    // Join commands with semicolons
    const script = commands.join('; ');

    return executeYosysScript(config, script, projectDefinition.project_disk_path, callback);
}

/**
 * Executes Yosys elaborate task (step 3)
 * Reads step2_hierarchy.rtlil, runs elaboration steps, and saves to step3_elaborated.rtlil
 * @param projectDefinition Project definition containing configuration
 * @param callback Callback function to handle the result
 * @returns ChildProcess instance
 */
export function runYosysElaborate(
    projectDefinition: t_project_definition, 
    callback: (result: p_result) => void
): ChildProcess {
    toolLogger.appendLine(`[Yosys] Starting Elaborate task`);
    
    const config = projectDefinition.config.tools.yosys;

    // Check if previous stage file exists
    const previousStage = getPreviousStage('elaborate');
    if (previousStage && !checkStageFileExists(projectDefinition.project_disk_path, previousStage)) {
        toolLogger.appendLine(`[Yosys] Previous stage file missing: ${getStageFileName(previousStage)}`);
        const result = createErrorResult('yosys elaborate', `Previous stage file missing. Please run "Analyze" first.`);
        setTimeout(() => callback(result), 0);
        return {} as ChildProcess;
    } else if (previousStage) {
        toolLogger.appendLine(`[Yosys] Previous stage file found: ${getStageFileName(previousStage)}`);
    }

    const commands: string[] = [];
    
    // Read the previous stage RTLIL file
    const inputFile = getStageFileName('analyze');
    commands.push(`read_rtlil ${inputFile}`);
    
    // Build elaborate commands
    const elaborateCommands = buildElaborateCommands(config);
    commands.push(...elaborateCommands);
    
    // Save the state
    const outputFile = getStageFileName('elaborate');
    commands.push(`write_rtlil ${outputFile}`);

    // Join commands with semicolons
    const script = commands.join('; ');

    return executeYosysScript(config, script, projectDefinition.project_disk_path, callback);
}

/**
 * Executes Yosys synthesis task (step 4)
 * Runs synthesis for specific FPGA target (iCE40 or ECP5) and saves to step4_synthesis.rtlil
 * @param projectDefinition Project definition containing files and configuration
 * @param callback Callback function to handle the result
 * @returns ChildProcess instance
 */
export function runYosysSynthesis(
    projectDefinition: t_project_definition, 
    callback: (result: p_result) => void
): ChildProcess {
    toolLogger.appendLine(`[Yosys] Starting Synthesis task`);
    
    const topLevel = getTopLevel(projectDefinition);
    const config = projectDefinition.config.tools.yosys;

    if (topLevel === null) {
        const result = createErrorResult('yosys synthesis', 'No top level module specified');
        setTimeout(() => callback(result), 0);
        return {} as ChildProcess;
    }

    // Check if previous stage file exists
    const previousStage = getPreviousStage('synthesis');
    if (previousStage && !checkStageFileExists(projectDefinition.project_disk_path, previousStage)) {
        toolLogger.appendLine(`[Yosys] Previous stage file missing: ${getStageFileName(previousStage)}`);
        const result = createErrorResult('yosys synthesis', 
            `Previous stage file missing. Please run "Elaborate" first.`);
        setTimeout(() => callback(result), 0);
        return {} as ChildProcess;
    } else if (previousStage) {
        toolLogger.appendLine(`[Yosys] Previous stage file found: ${getStageFileName(previousStage)}`);
    }

    const commands: string[] = [];
    
    // Read the previous stage RTLIL file
    const inputFile = getStageFileName('elaborate');
    commands.push(`read_rtlil ${inputFile}`);
    
    // Build synthesis commands
    const synthesisCommands = buildSynthesisCommands(config, topLevel);
    commands.push(...synthesisCommands);
    
    // Save the state
    const outputFile = getStageFileName('synthesis');
    commands.push(`write_rtlil ${outputFile}`);

    // Join commands with semicolons
    const script = commands.join('; ');

    return executeYosysScript(config, script, projectDefinition.project_disk_path, callback);
}

/**
 * Executes complete Yosys flow: load files, analyze, and elaborate
 * @param projectDefinition Project definition containing files and configuration
 * @param callback Callback function to handle the result
 * @returns ChildProcess instance
 */
export function runYosysCompileAll(
    projectDefinition: t_project_definition, 
    callback: (result: p_result) => void
): ChildProcess {
    toolLogger.appendLine(`[Yosys] Starting Compile All task`);
    
    const { verilogFiles, systemVerilogFiles } = getVerilogFiles(projectDefinition);
    const topLevel = getTopLevel(projectDefinition);
    const config = projectDefinition.config.tools.yosys;

    toolLogger.appendLine(`[Yosys] Top level module: ${topLevel}`);
    toolLogger.appendLine(`[Yosys] Found ${verilogFiles.length} Verilog files and ` +
               `${systemVerilogFiles.length} SystemVerilog files`);

    if (verilogFiles.length === 0 && systemVerilogFiles.length === 0) {
        const result = createErrorResult('yosys compile all', 'No Verilog or SystemVerilog files found in project');
        setTimeout(() => callback(result), 0);
        return {} as ChildProcess;
    }

    if (topLevel === null) {
        const result = createErrorResult('yosys compile all', 'No top level module specified');
        setTimeout(() => callback(result), 0);
        return {} as ChildProcess;
    }

    // Validate that all files exist
    const missingFiles = validateProjectFiles(projectDefinition);
    if (missingFiles.length > 0) {
        const result = createErrorResult('yosys compile all', `Missing files: ${missingFiles.join(', ')}`);
        setTimeout(() => callback(result), 0);
        return {} as ChildProcess;
    }

    const commands: string[] = [];
    
    // Step 1: Load files
    const loadCommands = buildLoadCommands(config, verilogFiles, systemVerilogFiles);
    commands.push(...loadCommands);
    commands.push(`write_rtlil ${getStageFileName('load')}`);
    
    // Step 2: Analyze (hierarchy)
    const analyzeCommands = buildAnalyzeCommands(config, topLevel);
    commands.push(...analyzeCommands);
    commands.push(`write_rtlil ${getStageFileName('analyze')}`);
    
    // Step 3: Elaborate 
    const elaborateCommands = buildElaborateCommands(config);
    commands.push(...elaborateCommands);
    commands.push(`write_rtlil ${getStageFileName('elaborate')}`);

    // Join commands with semicolons
    const script = commands.join('; ');

    return executeYosysScript(config, script, projectDefinition.project_disk_path, callback);
}

/**
 * Opens the project folder in the file explorer
 * @param projectDefinition Project definition containing the project path
 * @param callback Callback function to handle the result
 * @returns ChildProcess instance
 */
export function runYosysOpenProjectFolder(
    projectDefinition: t_project_definition, 
    callback: (result: p_result) => void
): ChildProcess {
    toolLogger.appendLine(`[Yosys] Opening project folder: ${projectDefinition.project_disk_path}`);
    
    const projectPath = projectDefinition.project_disk_path;
    
    // Determine the command based on the platform
    let command: string;
    switch (process.platform) {
        case 'win32':
            command = `explorer "${projectPath}"`;
            break;
        case 'darwin':
            command = `open "${projectPath}"`;
            break;
        default: // Linux and others
            command = `xdg-open "${projectPath}"`;
            break;
    }

    return executeCommand(command, projectPath, callback);
}

/**
 * Executes Yosys show task to generate an SVG diagram
 * Loads the latest state file and runs yosys show to generate SVG visualization
 * @param projectDefinition Project definition containing configuration
 * @param callback Callback function to handle the result
 * @returns ChildProcess instance
 */
export function runYosysShow(
    projectDefinition: t_project_definition, 
    callback: (result: p_result) => void
): ChildProcess {
    toolLogger.appendLine(`[Yosys] Starting Show task`);
    
    const config = projectDefinition.config.tools.yosys;

    // Find the latest available state file
    const latestStateFile = getLatestStateFile(projectDefinition.project_disk_path);
    if (!latestStateFile) {
        toolLogger.appendLine(`[Yosys] No state files found. Please run compilation stages first.`);
        const result = createErrorResult('yosys show', 'No state files found. Please run compilation stages first.');
        setTimeout(() => callback(result), 0);
        return {} as ChildProcess;
    }

    toolLogger.appendLine(`[Yosys] Using state file: ${latestStateFile}`);

    const commands: string[] = [];
    
    // Read the latest state RTLIL file
    commands.push(`read_rtlil ${latestStateFile}`);
    
    // Generate SVG with show command
    const svgFileName = getShowSvgFileName();
    commands.push(`show -colors 2 -width -stretch -format svg -prefix ${svgFileName.replace('.svg', '')}`);

    // Join commands with semicolons
    const script = commands.join('; ');

    return executeYosysScript(config, script, projectDefinition.project_disk_path, callback);
}
