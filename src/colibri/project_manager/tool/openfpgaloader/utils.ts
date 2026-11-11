import { t_board_list } from '../common';
import { e_tools_openfpgaloader } from '../../../config/config_declaration';

export type t_openfpgaloader_config = e_tools_openfpgaloader;

export function quoteArgs(args: string[]): string {
    return args
        .map((arg) => `'${String(arg).replace(/'/g, `'\\''`)}'`)
        .join(' ');
}

export function parseDetectOutput(stdout: string): t_board_list[] {
    const boardsByFamily = new Map<string, Set<string>>();
    const lines = stdout.split(/\r?\n/);

    let currentFamily = '';
    let currentModel = '';

    const flushCurrent = () => {
        if (currentFamily === '' || currentModel === '') {
            return;
        }
        if (!boardsByFamily.has(currentFamily)) {
            boardsByFamily.set(currentFamily, new Set<string>());
        }
        boardsByFamily.get(currentFamily)?.add(currentModel);
    };

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (line === '') {
            flushCurrent();
            currentFamily = '';
            currentModel = '';
            continue;
        }

        if (/^index\s+\d+:/i.test(line)) {
            flushCurrent();
            currentFamily = '';
            currentModel = '';
            continue;
        }

        const familyMatch = line.match(/^family\s+(.+)$/i);
        if (familyMatch) {
            currentFamily = familyMatch[1].trim();
        }

        const modelMatch = line.match(/^model\s+(.+)$/i);
        if (modelMatch) {
            currentModel = modelMatch[1].trim();
        }

        flushCurrent();
    }

    flushCurrent();

    return Array.from(boardsByFamily.entries()).map(([family, models]) => ({
        family,
        part_list: Array.from(models)
    }));
}

export function parseDetectionError(stderr: string): string {
    const message = (stderr || '').trim();
    const lower = message.toLowerCase();

    const binaryMissing =
        (lower.includes('openfpgaloader') && lower.includes('not found')) ||
        lower.includes('command not found') ||
        lower.includes('not recognized as an internal');
    if (binaryMissing) {
        return 'openFPGALoader no encontrado. Verifique installation_path o instale la herramienta.';
    }

    if (
        lower.includes('libftdi') ||
        lower.includes('libusb') ||
        lower.includes('ftdi library') ||
        lower.includes('usb library') ||
        lower.includes('no backend available') ||
        lower.includes('backend not found') ||
        lower.includes('backend unavailable') ||
        lower.includes('driver not found') ||
        lower.includes('no driver')
    ) {
        return 'No se encuentra el backend o driver USB/JTAG necesario. Instale las dependencias de libusb/libftdi y compruebe la configuración de OpenFPGALoader.';
    }

    if (lower.includes('permission denied') || lower.includes('access denied')) {
        return 'Permiso denegado. Configure las reglas udev para su cable JTAG.';
    }

    if (lower.includes('timeout')) {
        return 'Timeout en la detección de dispositivos. Compruebe cable y drivers.';
    }

    if (
        lower.includes('no device') ||
        lower.includes('device not found') ||
        lower.includes('no cable') ||
        lower.includes('unable to open ftdi device')
    ) {
        return 'No se encuentra el dispositivo o cable JTAG. Compruebe la conexión USB, la alimentación y que el cable sea compatible.';
    }

    if (lower.includes('not found')) {
        return 'No se encontró el recurso solicitado. Compruebe la instalación y configuración de OpenFPGALoader.';
    }

    if (message === '') {
        return 'No se pudieron detectar dispositivos con openFPGALoader.';
    }

    return message;
}
