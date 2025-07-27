import * as vscode from 'vscode';

/**
 * Interface for Yosys stat JSON output
 */
interface YosysStatModule {
    num_wires: number;
    num_wire_bits: number;
    num_pub_wires: number;
    num_pub_wire_bits: number;
    num_ports: number;
    num_port_bits: number;
    num_memories: number;
    num_memory_bits: number;
    num_processes: number;
    num_cells: number;
    num_cells_by_type: Record<string, number>;
}

interface YosysStatJson {
    creator: string;
    invocation: string;
    modules: Record<string, YosysStatModule>;
    design: YosysStatModule;
}

/**
 * Extract JSON from Yosys output
 * @param yosysOutput Raw output from Yosys stat command
 * @returns Parsed JSON object or null if extraction fails
 */
function extractJsonFromYosysOutput(yosysOutput: string): YosysStatJson | null {
    try {
        // Find the JSON part in the output
        const lines = yosysOutput.split('\n');
        let jsonStart = -1;
        let jsonEnd = -1;
        let braceCount = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('{') && jsonStart === -1) {
                jsonStart = i;
                braceCount = 1;
            } else if (jsonStart !== -1) {
                for (const char of line) {
                    if (char === '{') {
                        braceCount++;
                    }
                    if (char === '}') {
                        braceCount--;
                    }
                }
                if (braceCount === 0) {
                    jsonEnd = i;
                    break;
                }
            }
        }

        if (jsonStart === -1 || jsonEnd === -1) {
            return null;
        }

        const jsonLines = lines.slice(jsonStart, jsonEnd + 1);
        const jsonString = jsonLines.join('\n');
        return JSON.parse(jsonString) as YosysStatJson;
    } catch (error) {
        return null;
    }
}

/**
 * Create and show a webview panel to display resource utilization statistics
 * @param yosysOutput Raw output from Yosys stat command containing JSON
 * @param context VS Code extension context
 */
export function showResourceUtilizationWebview(yosysOutput: string, context: vscode.ExtensionContext): void {
    // Extract JSON from Yosys output
    const statData = extractJsonFromYosysOutput(yosysOutput);
    if (!statData) {
        vscode.window.showInformationMessage(
            'No resource utilization data found in Yosys output. Please ensure the design was synthesized properly.'
        );
        return;
    }

    // Check if the JSON data contains meaningful information
    if (!statData.design || !statData.modules) {
        vscode.window.showInformationMessage(
            'Resource utilization data is incomplete. No statistics to display.'
        );
        return;
    }

    // Check if the design has any meaningful data
    const designHasData = statData.design.num_wires > 0 || 
                         statData.design.num_cells > 0 || 
                         Object.keys(statData.modules).length > 0;
    
    if (!designHasData) {
        vscode.window.showInformationMessage(
            'Design appears to be empty. No resource utilization data to display.'
        );
        return;
    }

    // Create and show a new webview
    const panel = vscode.window.createWebviewPanel(
        'yosysResourceUtilization',
        'Yosys Resource Utilization',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true
        }
    );

    // Set HTML content for the webview
    panel.webview.html = getResourceUtilizationHtml(statData);
    
    // Show success message
    vscode.window.showInformationMessage('Resource utilization report generated and displayed.');
}

/**
 * Generate HTML content to display resource utilization statistics
 * @param statData Parsed Yosys stat JSON data
 * @returns HTML string
 */
function getResourceUtilizationHtml(statData: YosysStatJson): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yosys Resource Utilization</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-font-family);
            font-size: 13px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        h1, h2 {
            color: var(--vscode-foreground);
            margin-top: 0;
        }
        
        .info-section {
            margin-bottom: 30px;
            padding: 15px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
            border: 1px solid var(--vscode-panel-border);
        }
        
        .table-container {
            margin-bottom: 30px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
        }
        
        th, td {
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        th {
            background-color: var(--vscode-list-hoverBackground);
            color: var(--vscode-foreground);
            font-weight: 600;
            position: sticky;
            top: 0;
        }
        
        tr:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        
        .numeric {
            text-align: right;
            font-family: monospace;
        }
        
        .module-name {
            font-family: monospace;
            color: var(--vscode-symbolIcon-moduleForeground);
        }
        
        .cells-by-type {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }
        
        .design-table {
            border: 2px solid var(--vscode-focusBorder);
        }
        
        .design-table th {
            background-color: var(--vscode-focusBorder);
            color: var(--vscode-editor-background);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Resource Utilization Report</h1>
        
        <div class="info-section">
            <p><strong>Creator:</strong> ${statData.creator}</p>
            <p><strong>Command:</strong> ${statData.invocation}</p>
        </div>

        <!-- Design Overview Table -->
        <div class="table-container">
            <h2>📊 Design Overview</h2>
            <table class="design-table">
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Count</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Wires</td>
                        <td class="numeric">${statData.design.num_wires.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td>Wire Bits</td>
                        <td class="numeric">${statData.design.num_wire_bits.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td>Public Wires</td>
                        <td class="numeric">${statData.design.num_pub_wires.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td>Public Wire Bits</td>
                        <td class="numeric">${statData.design.num_pub_wire_bits.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td>Ports</td>
                        <td class="numeric">${statData.design.num_ports.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td>Port Bits</td>
                        <td class="numeric">${statData.design.num_port_bits.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td>Memories</td>
                        <td class="numeric">${statData.design.num_memories.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td>Memory Bits</td>
                        <td class="numeric">${statData.design.num_memory_bits.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td>Processes</td>
                        <td class="numeric">${statData.design.num_processes.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td>Cells</td>
                        <td class="numeric">${statData.design.num_cells.toLocaleString()}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Design Cell Types -->
        ${Object.keys(statData.design.num_cells_by_type).length > 0 ? `
        <div class="table-container">
            <h2>🧩 Design Cell Types</h2>
            <table>
                <thead>
                    <tr>
                        <th>Cell Type</th>
                        <th>Count</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(statData.design.num_cells_by_type)
                        .map(([type, count]) => `
                    <tr>
                        <td class="module-name">${type}</td>
                        <td class="numeric">${count.toLocaleString()}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        <!-- Modules Table -->
        <div class="table-container">
            <h2>📋 Modules</h2>
            <table>
                <thead>
                    <tr>
                        <th>Module</th>
                        <th>Wires</th>
                        <th>Wire Bits</th>
                        <th>Ports</th>
                        <th>Port Bits</th>
                        <th>Memories</th>
                        <th>Memory Bits</th>
                        <th>Processes</th>
                        <th>Cells</th>
                        <th>Cell Types</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(statData.modules).map(([moduleName, moduleData]) => `
                    <tr>
                        <td class="module-name">${moduleName}</td>
                        <td class="numeric">${moduleData.num_wires.toLocaleString()}</td>
                        <td class="numeric">${moduleData.num_wire_bits.toLocaleString()}</td>
                        <td class="numeric">${moduleData.num_ports.toLocaleString()}</td>
                        <td class="numeric">${moduleData.num_port_bits.toLocaleString()}</td>
                        <td class="numeric">${moduleData.num_memories.toLocaleString()}</td>
                        <td class="numeric">${moduleData.num_memory_bits.toLocaleString()}</td>
                        <td class="numeric">${moduleData.num_processes.toLocaleString()}</td>
                        <td class="numeric">${moduleData.num_cells.toLocaleString()}</td>
                        <td class="cells-by-type">
                            ${Object.entries(moduleData.num_cells_by_type)
                                .map(([type, count]) => `${type}: ${count}`)
                                .join('<br>')}
                        </td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>`;
}
