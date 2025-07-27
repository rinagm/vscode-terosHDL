// Copyright 2023
// Carlos Alberto Ruiz Naranjo [carlosruiznaranjo@gmail.com]
// Ismael Perez Rojo [ismaelprojo@gmail.com]
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

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Create and show a webview panel to display SVG content
 * @param svgPath Full path to the SVG file
 * @param context VS Code extension context
 */
export function showSvgInWebview(svgPath: string, context: vscode.ExtensionContext): void {
    // Create and show a new webview
    const panel = vscode.window.createWebviewPanel(
        'yosysShow', // Identifies the type of the webview. Used internally
        'Yosys Show - Circuit Diagram', // Title of the panel displayed to the user
        vscode.ViewColumn.One, // Editor column to show the new webview panel in.
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.file(path.dirname(svgPath))]
        }
    );

    // Check if SVG file exists
    if (!fs.existsSync(svgPath)) {
        panel.webview.html = getErrorHtml('SVG file not found: ' + svgPath);
        return;
    }

    try {
        // Read SVG content
        const svgContent = fs.readFileSync(svgPath, 'utf8');
        
        // Set HTML content for the webview
        panel.webview.html = getSvgHtml(svgContent, path.basename(svgPath));
        
    } catch (error) {
        panel.webview.html = getErrorHtml('Error reading SVG file: ' + error);
    }
}

/**
 * Generate HTML content to display SVG
 * @param svgContent SVG file content
 * @param fileName SVG file name for title
 * @returns HTML string
 */
function getSvgHtml(svgContent: string, fileName: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yosys Show - ${fileName}</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-font-family);
            overflow: auto;
        }
        
        .container {
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
        }
        
        .header {
            margin-bottom: 20px;
            text-align: center;
        }
        
        .svg-container {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            min-height: 400px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            background-color: white;
            padding: 10px;
            box-sizing: border-box;
            overflow: auto;
        }
        
        svg {
            max-width: 100%;
            height: auto;
        }
        
        .controls {
            margin-top: 20px;
            display: flex;
            gap: 10px;
            align-items: center;
        }
        
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 14px;
            border-radius: 2px;
            cursor: pointer;
            font-size: 13px;
        }
        
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .zoom-info {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Circuit Diagram</h2>
        </div>
        
        <div class="svg-container" id="svgContainer">
            ${svgContent}
        </div>
        
        <div class="controls">
            <button onclick="zoomIn()">Zoom In</button>
            <button onclick="zoomOut()">Zoom Out</button>
            <button onclick="resetZoom()">Reset Zoom</button>
            <button onclick="fitToWidth()">Fit Width</button>
            <span class="zoom-info" id="zoomInfo">100%</span>
        </div>
    </div>

    <script>
        let currentZoom = 1;
        const zoomStep = 0.1;
        const minZoom = 0.1;
        const maxZoom = 5;
        
        const svgContainer = document.getElementById('svgContainer');
        const svg = svgContainer.querySelector('svg');
        const zoomInfo = document.getElementById('zoomInfo');
        
        function updateZoom() {
            if (svg) {
                svg.style.transform = \`scale(\${currentZoom})\`;
                svg.style.transformOrigin = 'center center';
                zoomInfo.textContent = Math.round(currentZoom * 100) + '%';
            }
        }
        
        function zoomIn() {
            currentZoom = Math.min(maxZoom, currentZoom + zoomStep);
            updateZoom();
        }
        
        function zoomOut() {
            currentZoom = Math.max(minZoom, currentZoom - zoomStep);
            updateZoom();
        }
        
        function resetZoom() {
            currentZoom = 1;
            updateZoom();
        }
        
        function fitToWidth() {
            if (svg) {
                const containerWidth = svgContainer.clientWidth - 20; // Account for padding
                const svgWidth = svg.getBBox().width;
                currentZoom = Math.min(containerWidth / svgWidth, 1);
                updateZoom();
            }
        }
        
        // Add wheel zoom support
        svgContainer.addEventListener('wheel', function(e) {
            e.preventDefault();
            if (e.deltaY < 0) {
                zoomIn();
            } else {
                zoomOut();
            }
        });
        
        // Initial setup
        updateZoom();
    </script>
</body>
</html>`;
}

/**
 * Generate error HTML content
 * @param errorMessage Error message to display
 * @returns HTML string
 */
function getErrorHtml(errorMessage: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yosys Show - Error</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-font-family);
            text-align: center;
        }
        
        .error {
            background-color: var(--vscode-errorBackground);
            color: var(--vscode-errorForeground);
            padding: 20px;
            border-radius: 4px;
            border: 1px solid var(--vscode-errorBorder);
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <h2>Yosys Show - Error</h2>
    <div class="error">
        <p>${errorMessage}</p>
    </div>
    <p>Please check that the SVG file was generated correctly and try again.</p>
</body>
</html>`;
}
