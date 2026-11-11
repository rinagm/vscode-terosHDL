import { parseDetectOutput, parseDetectionError } from '../../../../src/colibri/project_manager/tool/openfpgaloader/utils';

describe('openfpgaloader utils', () => {
    it('parses detected devices grouping models by family', () => {
        const stdout = [
            'found 2 devices',
            'index 0: idcode 0x10f4043',
            'manufacturer lattice',
            'family ice40',
            'model LP384-CM49',
            'irlength 8',
            '',
            'index 1: idcode 0x10f4044',
            'manufacturer lattice',
            'family CertusProNX',
            'model LFCPNX-100',
            'irlength 8'
        ].join('\n');

        const boards = parseDetectOutput(stdout);

        expect(boards).toEqual([
            { family: 'ice40', part_list: ['LP384-CM49'] },
            { family: 'CertusProNX', part_list: ['LFCPNX-100'] }
        ]);
    });

    it('deduplicates repeated models in the same family', () => {
        const stdout = [
            'index 0:',
            'family ice40',
            'model LP384-CM49',
            'index 1:',
            'family ice40',
            'model LP384-CM49'
        ].join('\n');

        const boards = parseDetectOutput(stdout);

        expect(boards).toEqual([{ family: 'ice40', part_list: ['LP384-CM49'] }]);
    });

    it('maps common permission errors to user friendly messages', () => {
        const message = parseDetectionError('usb_open() failed: Permission denied');
        expect(message).toContain('Permiso denegado');
    });

    it('maps binary-not-found errors to installation guidance', () => {
        const message = parseDetectionError('/bin/sh: 1: openFPGALoader: not found');
        expect(message).toContain('openFPGALoader no encontrado');
    });
});
