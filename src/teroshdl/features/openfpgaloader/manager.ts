import * as vscode from 'vscode';

import { Multi_project_manager } from 'colibri/project_manager/multi_project_manager';
import { detectDevices } from 'colibri/project_manager/tool/openfpgaloader/deviceDetector';
import { toolLogger } from '../../logger';

const SELECTED_DEVICE_KEY = 'openfpgaloader.selectedDevice';

type SelectedDevice = {
    family: string;
    model: string;
};

type DeviceQuickPickItem = vscode.QuickPickItem & SelectedDevice;

export class OpenFPGALoaderManager {
    constructor(
        private context: vscode.ExtensionContext,
        private manager: Multi_project_manager
    ) {
        this.registerCommands();
    }

    private registerCommands(): void {
        const detectCommand = vscode.commands.registerCommand(
            'teroshdl.devices.detect',
            () => this.detect()
        );

        this.context.subscriptions.push(detectCommand);
    }

    private async detect(): Promise<void> {
        try {
            const project = this.manager.get_selected_project();
            if (!project) {
                vscode.window.showWarningMessage(
                    'OpenFPGALoader: you must first select a project.'
                );
                return;
            }

            const config = project.get_config().tools.openfpgaloader;
            const cwd = project.projectDiskPath;

            toolLogger.appendLine('OpenFPGALoader: detectando dispositivos...');
            toolLogger.show();

            const result = await detectDevices(config, cwd);

            if (!result.successful) {
                toolLogger.appendLine(`Error: ${result.msg}`);
                vscode.window.showErrorMessage(`OpenFPGALoader: ${result.msg}`);
                return;
            }

            if (result.board_list.length === 0) {
                vscode.window.showInformationMessage(
                    'OpenFPGALoader: no se encontraron dispositivos.'
                );
                return;
            }

            const items: DeviceQuickPickItem[] = [];

            for (const board of result.board_list) {
                for (const model of board.part_list) {
                    items.push({
                        label: `${board.family} — ${model}`,
                        description: 'Dispositivo detectado',
                        family: board.family,
                        model
                    });
                }
            }

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Selecciona el dispositivo detectado'
            });

            if (!selected) {
                return;
            }

            const device: SelectedDevice = {
                family: selected.family,
                model: selected.model
            };

            await this.context.globalState.update(
                SELECTED_DEVICE_KEY,
                device
            );

            vscode.window.showInformationMessage(
                `Dispositivo seleccionado: ${selected.family} — ${selected.model}`
            );

            toolLogger.appendLine(
                `Dispositivo seleccionado: ${selected.family} — ${selected.model}`
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            if (error instanceof Error && error.name === 'ProjectOperationError') {
                vscode.window.showWarningMessage(
                    'OpenFPGALoader: you must first select a project.'
                );
                return;
            }

            toolLogger.appendLine(`Error: ${message}`);
            vscode.window.showErrorMessage(`OpenFPGALoader: ${message}`);
        }
    }
}
