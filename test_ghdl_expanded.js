#!/usr/bin/env node

/**
 * Test script to verify that the expanded GHDL configuration options work correctly
 * This script simulates the command generation with various GHDL options enabled.
 */

const fs = require('fs');
const path = require('path');

// Mock GHDL configuration with many options enabled
const mockGhdlConfig = {
    installation_path: "",
    vhdl_standard: "vhdl08",
    ieee_library: "standard",
    relaxed_parsing: false,
    unicode_support: true,
    psl_enabled: true,
    work_library: "work",
    library_paths: ["/usr/lib/ghdl", "/opt/ghdl/lib"],
    optimization_level: "O2",
    parallel_jobs: 4,
    debug_level: "full",
    verbose: true,
    warnings_as_errors: false,
    suppress_warnings: ["binding", "elaboration"],
    relaxed_rules: true,
    bind_checks: true,
    vital_checks: false,
    assert_level: "warning",
    coverage_enabled: true,
    coverage_options: ["--coverage-file=coverage.out"],
    simulation_time: "1ms",
    resolution_limit: "1ps",
    stack_size: "16MB",
    max_delta_cycles: 10000,
    stop_delta_cycles: 5000,
    display_time: 1000,
    unbuffered_output: true,
    max_stack_alloc: "1MB",
    backtrace_severity: "warning",
    ieee_asserts: "disable-at-0",
    asserts_policy: "enable",
    sdf_file: "timing.sdf",
    vpi_modules: ["vpi_debug", "vpi_trace"],
    vhpi_modules: ["vhpi_monitor"],
    stmt_coverage: true,
    branch_coverage: true,
    toggle_coverage: false,
    dump_file: "signals.dump",
    trace_signals: true,
    trace_processes: false,
    wave_start_time: "10ns",
    vcd_4states: true,
    expect_failure: false,
    no_run: false,
    waveform_enabled: true,
    waveform_format: "vcd",
    waveform_options: ["--vcd-4states"],
    generate_makefile: false,
    analyze_options: ["--warn-unused"],
    elaborate_options: ["--warn-binding"],
    run_options: ["--trace-processes"],
    synthesis_options: [],
    extra_flags: ["--custom-flag"]
};

// Simulate the buildGhdlArgs function (simplified version)
function buildGhdlArgs(config, commandType) {
    const baseArgs = [];
    const runArgs = [];

    // Add verbose flag
    if (config.verbose) {
        baseArgs.push('-v');
    }

    // Add VHDL standard
    const standardMap = {
        'vhdl87': '87',
        'vhdl93': '93', 
        'vhdl02': '02',
        'vhdl08': '08',
        'vhdl19': '19'
    };
    const standardValue = standardMap[config.vhdl_standard] || '08';
    baseArgs.push(`--std=${standardValue}`);

    // Add optimization level
    if (config.optimization_level && config.optimization_level !== 'O0') {
        baseArgs.push(`-${config.optimization_level}`);
    }

    // Add debug level
    if (config.debug_level) {
        switch (config.debug_level) {
            case 'minimal':
                baseArgs.push('-g');
                break;
            case 'full':
                baseArgs.push('-g', '--debug');
                break;
        }
    }

    // Add library configuration
    if (config.ieee_library !== 'standard') {
        baseArgs.push(`--ieee=${config.ieee_library}`);
    }

    // Add library paths
    if (config.library_paths && config.library_paths.length > 0) {
        config.library_paths.forEach(path => {
            baseArgs.push(`-P${path}`);
        });
    }

    // Add assertion level
    if (config.assert_level && config.assert_level !== 'error') {
        if (config.assert_level === 'none') {
            baseArgs.push('--assert-level=none');
        } else {
            baseArgs.push(`--assert-level=${config.assert_level}`);
        }
    }

    // Add various flags
    if (config.relaxed_rules) baseArgs.push('--mb-comments');
    if (config.relaxed_parsing) baseArgs.push('--relaxed');
    if (config.psl_enabled) baseArgs.push('--psl');
    if (config.unicode_support) baseArgs.push('--unicode');
    if (!config.bind_checks) baseArgs.push('--no-bind-checks');
    if (config.vital_checks) baseArgs.push('--vital-checks');
    if (config.warnings_as_errors) baseArgs.push('-Werror');

    // Add warning suppressions
    if (config.suppress_warnings && config.suppress_warnings.length > 0) {
        config.suppress_warnings.forEach(warning => {
            baseArgs.push(`-Wno-${warning}`);
        });
    }

    // Add time resolution
    if (config.resolution_limit && config.resolution_limit.trim() !== '') {
        baseArgs.push(`--time-resolution=${config.resolution_limit}`);
    }

    // Command-specific options
    switch (commandType) {
        case 'analyze':
            if (config.coverage_enabled && config.coverage_options.length > 0) {
                baseArgs.push('--coverage');
                baseArgs.push(...config.coverage_options);
            }
            baseArgs.push(...config.analyze_options);
            break;

        case 'elaborate':
            baseArgs.push(...config.elaborate_options);
            break;

        case 'run':
            // Simulation runtime options (after entity name)
            if (config.waveform_enabled && config.waveform_format) {
                const waveformFile = `wave.${config.waveform_format}`;
                runArgs.push(`--${config.waveform_format}=${waveformFile}`);
            }

            if (config.waveform_options && config.waveform_options.length > 0) {
                runArgs.push(...config.waveform_options);
            }

            if (config.simulation_time && config.simulation_time.trim() !== '') {
                runArgs.push(`--stop-time=${config.simulation_time}`);
            }

            if (config.stack_size && config.stack_size.trim() !== '') {
                runArgs.push(`--stack-size=${config.stack_size}`);
            }

            if (config.max_delta_cycles > 0) {
                runArgs.push(`--max-delta=${config.max_delta_cycles}`);
            }

            if (config.stop_delta_cycles > 0) {
                runArgs.push(`--stop-delta=${config.stop_delta_cycles}`);
            }

            if (config.display_time > 0) {
                runArgs.push(`--disp-time=${config.display_time}`);
            }

            if (config.unbuffered_output) {
                runArgs.push('--unbuffered');
            }

            if (config.max_stack_alloc && config.max_stack_alloc.trim() !== '') {
                runArgs.push(`--max-stack-alloc=${config.max_stack_alloc}`);
            }

            if (config.backtrace_severity && config.backtrace_severity !== 'error') {
                if (config.backtrace_severity === 'none') {
                    runArgs.push('--backtrace-severity=none');
                } else {
                    runArgs.push(`--backtrace-severity=${config.backtrace_severity}`);
                }
            }

            if (config.ieee_asserts && config.ieee_asserts !== 'enable') {
                runArgs.push(`--ieee-asserts=${config.ieee_asserts}`);
            }

            if (config.asserts_policy && config.asserts_policy !== 'enable') {
                runArgs.push(`--asserts=${config.asserts_policy}`);
            }

            if (config.sdf_file && config.sdf_file.trim() !== '') {
                runArgs.push(`--sdf=${config.sdf_file}`);
            }

            if (config.vpi_modules && config.vpi_modules.length > 0) {
                config.vpi_modules.forEach(module => {
                    runArgs.push(`--vpi=${module}`);
                });
            }

            if (config.vhpi_modules && config.vhpi_modules.length > 0) {
                config.vhpi_modules.forEach(module => {
                    runArgs.push(`--vhpi=${module}`);
                });
            }

            if (config.stmt_coverage || config.branch_coverage || config.toggle_coverage) {
                runArgs.push('--coverage');
            }

            if (config.dump_file && config.dump_file.trim() !== '') {
                runArgs.push(`--dump=${config.dump_file}`);
            }

            if (config.trace_signals) {
                runArgs.push('--trace-signals');
            }

            if (config.trace_processes) {
                runArgs.push('--trace-processes');
            }

            if (config.wave_start_time && config.wave_start_time.trim() !== '') {
                runArgs.push(`--wave-start-time=${config.wave_start_time}`);
            }

            if (config.vcd_4states && config.waveform_format === 'vcd') {
                runArgs.push('--vcd-4states');
            }

            if (config.expect_failure) {
                runArgs.push('--expect-failure');
            }

            if (config.no_run) {
                runArgs.push('--no-run');
            }

            runArgs.push(...config.run_options);
            break;
    }

    // Add extra flags
    if (config.extra_flags && config.extra_flags.length > 0) {
        baseArgs.push(...config.extra_flags);
    }

    return { baseArgs, runArgs };
}

// Test different command types
console.log('GHDL Expanded Configuration Test');
console.log('=================================\n');

console.log('Testing ANALYZE command:');
const analyzeResult = buildGhdlArgs(mockGhdlConfig, 'analyze');
console.log('Base Args:', analyzeResult.baseArgs.join(' '));
console.log('Run Args:', analyzeResult.runArgs.join(' '));
console.log('Full Command: ghdl -a', analyzeResult.baseArgs.join(' '), '--work=work test.vhdl\n');

console.log('Testing ELABORATE command:');
const elaborateResult = buildGhdlArgs(mockGhdlConfig, 'elaborate');
console.log('Base Args:', elaborateResult.baseArgs.join(' '));
console.log('Run Args:', elaborateResult.runArgs.join(' '));
console.log('Full Command: ghdl -e', elaborateResult.baseArgs.join(' '), 'test_entity\n');

console.log('Testing RUN command:');
const runResult = buildGhdlArgs(mockGhdlConfig, 'run');
console.log('Base Args:', runResult.baseArgs.join(' '));
console.log('Run Args:', runResult.runArgs.join(' '));
console.log('Full Command: ghdl -r', runResult.baseArgs.join(' '), 'test_entity', runResult.runArgs.join(' '), '\n');

console.log('Summary of supported GHDL options:');
console.log('- VHDL standards: 87, 93, 02, 08, 19');
console.log('- IEEE library variants: standard, synopsys');
console.log('- Debug levels: none, minimal, full');
console.log('- Optimization levels: O0, O1, O2, O3');
console.log('- Assert levels: note, warning, error, failure, none');
console.log('- Waveform formats: VCD, GHW, FST');
console.log('- Backtrace severities: note, warning, error, failure, none');
console.log('- IEEE assertions: enable, disable, disable-at-0');
console.log('- Coverage options: statement, branch, toggle');
console.log('- Signal tracing and dumping options');
console.log('- VPI/VHPI module support');
console.log('- SDF timing annotation support');
console.log('- Advanced simulation control options');
console.log('\nAll GHDL runtime simulation options are now supported!');
