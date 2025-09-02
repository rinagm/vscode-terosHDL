import * as vscode from 'vscode';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { logger } from '../utils/logger';

/**
 * Executes a TerosHDL command in VS Code
 * @param commandId The TerosHDL command ID to execute
 * @returns Promise that resolves with the command result if any
 */
export async function executeTerosHDLCommand(commandId: string): Promise<any> {
    try {
        logger.info(`[TerosHDL Tools] Executing command: ${commandId}`);
        const result = await vscode.commands.executeCommand(commandId);
        logger.info(`[TerosHDL Tools] Command executed successfully: ${commandId}`);
        return result;
    } catch (error) {
        logger.error(`[TerosHDL Tools] Error executing command ${commandId}: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }
}

/**
 * Registers MCP TerosHDL-related tools with the server
 * @param server MCP server instance
 */
export function registerTerosHDLTools(server: McpServer): void {
    // Add teroshdl run tool
    server.tool(
        'teroshdl_run_command_code',
        `Execute TerosHDL's run command to compile and synthesize HDL projects. 
        This tool invokes the TerosHDL run command to execute projects built with Vivado or other HDL tools.
        
        WHEN TO USE: Use this to run simulation, synthesis, or implementation on HDL projects.

        Returns: The result of the run command execution.
        `,
        {
            // No parameters needed for this tool
        },
        async (params: Record<string, never>): Promise<CallToolResult> => {
            try {
                const result = await executeTerosHDLCommand('teroshdl.view.runs.run_all');
                
                const resultText = result ? String(result) : 'Command executed successfully.';
                
                const response: CallToolResult = {
                    content: [
                        {
                            type: 'text',
                            text: resultText
                        }
                    ]
                };
                return response;
            } catch (error) {
                console.error('[teroshdl_run_command_code] Error in tool:', error);
                throw error;
            }
        }
    );

    // Add teroshdl list project files tool
    server.tool(
        'teroshdl_list_project_files_code',
        `List all files in the current TerosHDL project.
        
        This tool retrieves the list of all files included in the currently selected TerosHDL project.
        
        WHEN TO USE: Use this to get information about source files, constraints, and other files in the HDL project.

        Returns: A list of all files in the project.
        `,
        {
            // No parameters needed for this tool
        },
        async (params: Record<string, never>): Promise<CallToolResult> => {
            try {
                const result = await executeTerosHDLCommand('teroshdl.view.tasks.listProjectFiles');
                
                let responseText: string;
                
                if (Array.isArray(result)) {
                    const filesCount = result.length;
                    responseText = `Found ${filesCount} files in the project:\n\n`;
                    responseText += result.map((file, index) => `${index + 1}. ${file}`).join('\n');
                } else {
                    responseText = 'No files found in the project or project is not loaded.';
                }
                
                const response: CallToolResult = {
                    content: [
                        {
                            type: 'text',
                            text: responseText
                        }
                    ]
                };
                return response;
            } catch (error) {
                console.error('[teroshdl_list_project_files_code] Error in tool:', error);
                throw error;
            }
        }
    );
}
