import { 
    e_tools_yosys, 
    e_tools_yosys_debug_level, 
    e_tools_yosys_synthesis_target 
} from 'colibri/config/config_declaration';

/**
 * Command argument building utilities for Yosys
 */

export type YosysCommandType = 'load' | 'analyze' | 'elaborate';

export interface YosysCommandArgs {
    baseArgs: string[];
}

/**
 * Helper function to build Yosys command arguments from configuration
 * @param config Yosys configuration
 * @param commandType Type of command (load, analyze, elaborate)
 * @param additionalArgs Additional arguments specific to the command
 * @returns Object with baseArgs
 */
export function buildYosysArgs(
    config: e_tools_yosys, 
    commandType: YosysCommandType, 
    additionalArgs: string[] = []
): YosysCommandArgs {
    const baseArgs: string[] = [];

    // Add verbose flag if enabled
    if (config.verbose) {
        baseArgs.push('-v');
    }

    // Add debug level
    if (config.debug_level && config.debug_level !== e_tools_yosys_debug_level.none) {
        switch (config.debug_level) {
            case e_tools_yosys_debug_level.basic:
                baseArgs.push('-d1');
                break;
            case e_tools_yosys_debug_level.detailed:
                baseArgs.push('-d2');
                break;
            case e_tools_yosys_debug_level.verbose:
                baseArgs.push('-d3');
                break;
        }
    }

    // Add log file if specified
    if (config.log_file && config.log_file.trim() !== '') {
        baseArgs.push(`-l`, config.log_file);
    }

    // Add extra custom flags
    if (config.extra_flags && config.extra_flags.length > 0) {
        baseArgs.push(...config.extra_flags);
    }

    // Add additional command-specific arguments
    baseArgs.push(...additionalArgs);

    return { baseArgs };
}

/**
 * Build Yosys script commands for loading files
 * @param config Yosys configuration
 * @param verilogFiles Array of Verilog file paths
 * @param systemVerilogFiles Array of SystemVerilog file paths
 * @returns Array of Yosys script commands
 */
export function buildLoadCommands(
    config: e_tools_yosys,
    verilogFiles: string[],
    systemVerilogFiles: string[] = []
): string[] {
    const commands: string[] = [];

    // Add custom load commands first
    if (config.custom_load_commands && config.custom_load_commands.length > 0) {
        commands.push(...config.custom_load_commands);
    }

    // Read Verilog files
    if (verilogFiles.length > 0) {
        const readVerilogOptions = config.read_verilog_options ? config.read_verilog_options.join(' ') : '';
        const verilogFilesStr = verilogFiles.join(' ');
        commands.push(`read_verilog ${readVerilogOptions} ${verilogFilesStr}`.trim());
    }

    // Read SystemVerilog files using read_verilog with -sv flag
    if (systemVerilogFiles.length > 0) {
        const readSVOptions = config.read_systemverilog_options ? config.read_systemverilog_options.join(' ') : '';
        const svFilesStr = systemVerilogFiles.join(' ');
        commands.push(`read_verilog -sv ${readSVOptions} ${svFilesStr}`.trim());
    }

    return commands;
}

/**
 * Build Yosys script commands for analysis phase
 * @param config Yosys configuration
 * @param topModule Top module name
 * @returns Array of Yosys script commands
 */
export function buildAnalyzeCommands(
    config: e_tools_yosys,
    topModule: string
): string[] {
    const commands: string[] = [];

    // Add custom analyze commands first
    if (config.custom_analyze_commands && config.custom_analyze_commands.length > 0) {
        commands.push(...config.custom_analyze_commands);
    }

    // Hierarchy command with top module
    const hierarchyOptions = config.hierarchy_options ? config.hierarchy_options.join(' ') : '';
    commands.push(`hierarchy -top ${topModule} ${hierarchyOptions}`.trim());

    // Check command if enabled
    if (config.check_enabled) {
        const checkOptions = config.check_options ? config.check_options.join(' ') : '';
        commands.push(`check ${checkOptions}`.trim());
    }

    // Statistics if enabled
    if (config.stat_enabled) {
        const statOptions = config.stat_options ? config.stat_options.join(' ') : '';
        commands.push(`stat ${statOptions}`.trim());
    }

    return commands;
}

/**
 * Build Yosys script commands for elaboration phase
 * @param config Yosys configuration
 * @returns Array of Yosys script commands
 */
export function buildElaborateCommands(
    config: e_tools_yosys
): string[] {
    const commands: string[] = [];

    // Add custom elaborate commands first
    if (config.custom_elaborate_commands && config.custom_elaborate_commands.length > 0) {
        commands.push(...config.custom_elaborate_commands);
    }

    // Process conversion
    const procOptions = config.proc_options ? config.proc_options.join(' ') : '';
    commands.push(`proc ${procOptions}`.trim());

    // Optimization
    const optOptions = config.opt_options ? config.opt_options.join(' ') : '';
    commands.push(`opt ${optOptions}`.trim());

    // Flatten if enabled
    if (config.flatten_enabled) {
        const flattenOptions = config.flatten_options ? config.flatten_options.join(' ') : '';
        commands.push(`flatten ${flattenOptions}`.trim());
        // Run optimization again after flatten
        commands.push(`opt ${optOptions}`.trim());
    }

    // Memory commands
    if (config.memory_options && config.memory_options.length > 0) {
        const memoryOptions = config.memory_options.join(' ');
        commands.push(`memory ${memoryOptions}`);
    }

    // FSM extraction and optimization if enabled
    if (config.fsm_enabled) {
        const fsmOptions = config.fsm_options ? config.fsm_options.join(' ') : '';
        commands.push(`fsm ${fsmOptions}`.trim());
    }

    // Technology mapping if enabled
    if (config.techmap_enabled) {
        const techmapOptions = config.techmap_options ? config.techmap_options.join(' ') : '';
        commands.push(`techmap ${techmapOptions}`.trim());
    }

    // ABC optimization if enabled
    if (config.abc_enabled) {
        const abcOptions = config.abc_options ? config.abc_options.join(' ') : '';
        commands.push(`abc ${abcOptions}`.trim());
    }

    return commands;
}

/**
 * Build Yosys script commands for synthesis phase
 * @param config Yosys configuration (assuming synthesis config will be added)
 * @param topModule Top module name
 * @returns Array of Yosys script commands
 */
export function buildSynthesisCommands(
    config: e_tools_yosys,
    topModule: string
): string[] {
    const commands: string[] = [];

    // Determine synthesis target
    const target = config.synthesis_target || e_tools_yosys_synthesis_target.ice40;
    
    if (target === e_tools_yosys_synthesis_target.ice40) {
        commands.push(...buildIce40SynthesisCommands(config, topModule));
    } else if (target === e_tools_yosys_synthesis_target.ecp5) {
        commands.push(...buildEcp5SynthesisCommands(config, topModule));
    }

    return commands;
}

/**
 * Build iCE40 synthesis commands
 * @param config Yosys configuration
 * @param topModule Top module name
 * @returns Array of Yosys script commands
 */
export function buildIce40SynthesisCommands(
    config: e_tools_yosys,
    topModule: string
): string[] {
    const args: string[] = [];

    // Device type
    if (config.ice40_device) {
        args.push(`-device ${config.ice40_device}`);
    }

    // Top module (use provided if config doesn't specify)
    const top = config.ice40_top_module || topModule;
    if (top) {
        args.push(`-top ${top}`);
    }

    // Output files
    if (config.ice40_output_blif && config.ice40_output_blif.trim() !== '') {
        args.push(`-blif ${config.ice40_output_blif}`);
    }
    if (config.ice40_output_edif && config.ice40_output_edif.trim() !== '') {
        args.push(`-edif ${config.ice40_output_edif}`);
    }
    if (config.ice40_output_json && config.ice40_output_json.trim() !== '') {
        args.push(`-json ${config.ice40_output_json}`);
    }

    // Boolean options
    if (config.ice40_noflatten) { args.push('-noflatten'); }
    if (config.ice40_dff) { args.push('-dff'); }
    if (config.ice40_retime) { args.push('-retime'); }
    if (config.ice40_nocarry) { args.push('-nocarry'); }
    if (config.ice40_nodffe) { args.push('-nodffe'); }
    if (config.ice40_nobram) { args.push('-nobram'); }
    if (config.ice40_spram) { args.push('-spram'); }
    if (config.ice40_dsp) { args.push('-dsp'); }
    if (config.ice40_noabc) { args.push('-noabc'); }
    if (config.ice40_abc2) { args.push('-abc2'); }
    if (config.ice40_vpr) { args.push('-vpr'); }
    if (config.ice40_noabc9) { args.push('-noabc9'); }
    if (config.ice40_flowmap) { args.push('-flowmap'); }
    if (config.ice40_no_rw_check) { args.push('-no-rw-check'); }

    // dffe_min_ce_use option
    if (config.ice40_dffe_min_ce_use && config.ice40_dffe_min_ce_use > 0) {
        args.push(`-dffe_min_ce_use ${config.ice40_dffe_min_ce_use}`);
    }

    return [`synth_ice40 ${args.join(' ')}`];
}

/**
 * Build ECP5 synthesis commands
 * @param config Yosys configuration
 * @param topModule Top module name
 * @returns Array of Yosys script commands
 */
export function buildEcp5SynthesisCommands(
    config: e_tools_yosys,
    topModule: string
): string[] {
    const args: string[] = [];

    // Top module (use provided if config doesn't specify)
    const top = config.ecp5_top_module || topModule;
    if (top) {
        args.push(`-top ${top}`);
    }

    // Output files
    if (config.ecp5_output_blif && config.ecp5_output_blif.trim() !== '') {
        args.push(`-blif ${config.ecp5_output_blif}`);
    }
    if (config.ecp5_output_edif && config.ecp5_output_edif.trim() !== '') {
        args.push(`-edif ${config.ecp5_output_edif}`);
    }
    if (config.ecp5_output_json && config.ecp5_output_json.trim() !== '') {
        args.push(`-json ${config.ecp5_output_json}`);
    }

    // Boolean options
    if (config.ecp5_noflatten) { args.push('-noflatten'); }
    if (config.ecp5_dff) { args.push('-dff'); }
    if (config.ecp5_retime) { args.push('-retime'); }
    if (config.ecp5_noccu2) { args.push('-noccu2'); }
    if (config.ecp5_nodffe) { args.push('-nodffe'); }
    if (config.ecp5_nobram) { args.push('-nobram'); }
    if (config.ecp5_nolutram) { args.push('-nolutram'); }
    if (config.ecp5_nowidelut) { args.push('-nowidelut'); }
    if (config.ecp5_asyncprld) { args.push('-asyncprld'); }
    if (config.ecp5_abc2) { args.push('-abc2'); }
    if (config.ecp5_noabc9) { args.push('-noabc9'); }
    if (config.ecp5_vpr) { args.push('-vpr'); }
    if (config.ecp5_iopad) { args.push('-iopad'); }
    if (config.ecp5_nodsp) { args.push('-nodsp'); }
    if (config.ecp5_no_rw_check) { args.push('-no-rw-check'); }

    return [`synth_ecp5 ${args.join(' ')}`];
}

/**
 * Get the appropriate file extension for intermediate files based on stage
 * @param stage Stage name (load, analyze, elaborate)
 * @returns File extension with leading dot
 */
export function getStageFileExtension(stage: string): string {
    switch (stage) {
        case 'load':
            return '_raw.rtlil';
        case 'analyze':
            return '_hierarchy.rtlil';
        case 'elaborate':
            return '_elaborated.rtlil';
        default:
            return '.rtlil';
    }
}

/**
 * Get the step number for the stage
 * @param stage Stage name (load, analyze, elaborate)
 * @returns Step number
 */
export function getStageStepNumber(stage: string): number {
    switch (stage) {
        case 'load':
            return 1;
        case 'analyze':
            return 2;
        case 'elaborate':
            return 3;
        default:
            return 0;
    }
}
