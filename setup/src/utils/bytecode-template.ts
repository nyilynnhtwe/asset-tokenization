// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { BCS, getRustConfig, BcsReader, BcsWriter } from '@mysten/bcs';
const bcs = new BCS(getRustConfig());

/**
 * Rust representation of the compiled module; generated by the
 * `deserialize` call in the Wasm module.
 */
export interface MoveCompiledModule {
    version: number;
    self_module_handle_idx: number;
    module_handles: {
        address: number;
        name: number;
    }[];
    struct_handles: {
        name: number;
    }[];
    function_handles: {
        module: number;
        name: number;
        parameters: number;
        return_: number;
        type_parameters: number[];
    }[];
    field_handles: {
        name: number;
        // more fields
    };
    friend_decls: []; // TODO!
    struct_def_instantiations: []; // TODO!
    function_instantiations: {
        handle: number;
        type_parameters: number;
    }[];
    field_instantiations: []; // TODO!
    signatures: []; // TODO!
    /**
     * The list of the identifiers in the bytecode.
     * Is referenced by:
     * - module_handles
     * - field_handles
     * - function_handles
     * - struct_handles
     *
     * Identifiers must be sorted by the char code or the resulting
     * bytecode won't be usable on chain as a dependency.
     */
    identifiers: string[];
    address_identifiers: string[];
    constant_pool: {
        type_: string,
        data: number[]
    }[];
    metadata: []; // TODO!
    struct_defs: {
        struct_handle: number;
        field_information: {
            Declared: {
                name: number;
                signature: {
                    Struct: number;
                };
            }[];
        };
    }[];
    function_defs: {
        function: number;
        visibility: 'Private' | 'Public';
        is_entry: boolean;
        acquires_global_resources: [];
        code: {
            locals: number;
            code: any[]; // TODO!
        }[];
    };
}

/**
 * Helper class which wraps the underlying JSON structure.
 * Provides a way to change the identifiers and update the identifier indexes.
 */
export class CompiledModule {
    constructor(public inner: MoveCompiledModule) {}

    /**
     * Quite dangerous method which updates a constant in the constant pool. To make sure
     * that the index is set correctly, the `expectedValue` and `expectedType` must be provided
     * - this way we at least try to minimize the risk of updating a wrong constant.
     */
    updateConstant(idx: number, value: string, expectedValue: string, expectedType: string) {
        if (idx >= this.inner.constant_pool.length) {
            throw new Error('Invalid constant index; no constant exists at this index');
        }

        let { type_, data } = this.inner.constant_pool[idx];
        type_ = JSON.stringify(type_) == JSON.stringify({ Vector: "U8" }) ? "string" : type_;

        if (expectedType.toLowerCase() !== type_.toLowerCase()) {
            throw new Error(`Invalid constant type; expected ${expectedType}, got ${type_}`);
        }

        let oldValue = bcs.de(type_.toLowerCase(), new Uint8Array(data)).toString();

        if (oldValue !== expectedValue) {
            throw new Error(`Invalid constant value; expected ${expectedValue}, got ${oldValue}`);
        }

        this.inner.constant_pool[idx].data = [...bcs.ser(type_.toLowerCase(), value).toBytes()];

        return this;
    }

    /**
     * Update `identifiers`: provide the changeset where keys are the old
     * identifiers and values are the new identifiers.
     */
    changeIdentifiers(identMap: Record<string, string>): CompiledModule {
        // first apply patches - they don't affect indexes; but we need to keep
        // them to compare agains the new sorting order later.
        let identifiers = Object.freeze(
            [...this.inner.identifiers].map((ident) =>
                ident in identMap ? identMap[ident] : ident,
            ),
        );

        // sort the identifiers - indexes are changed.
        this.inner.identifiers = [...identifiers].sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));

        // console.log(this.inner.identifiers, identifiers);

        let indexUpdates = new Map();
        for (let ident of identifiers) {
            let oldIdx = identifiers.indexOf(ident);
            let newIdx = this.inner.identifiers.indexOf(ident);
            indexUpdates.set(oldIdx, newIdx);
        }

        const keys = ['module_handles', 'struct_handles', 'function_handles', 'field_handles'];

        // update each of the storages with the new index.
        for (let innerKey of keys) {
            // @ts-ignore
            this.inner[innerKey] = this.inner[innerKey].map((handle) => {
                return indexUpdates.has(handle.name)
                    ? { ...handle, name: indexUpdates.get(handle.name) }
                    : handle;
            });
        }

        // separately patch struct defs
        this.inner.struct_defs = this.inner.struct_defs.map((struct) => {
            let decl = struct.field_information.Declared.map((decl) => ({
                ...decl,
                name: indexUpdates.get(decl.name),
            }));

            return {
                ...struct,
                field_information: { Declared: decl },
            };
        });

        return this;
    }

    toJSON() {
        return this.inner;
    }
}

/**
 * Return the tempate bytecode.
 *
 * Can be acquired by compiling the `template` package and then fetching
 * via the command:
 * ```
 * xxd -c 0 -p build/template/bytecode_modules/template.mv | head -n 1
 * ```
 *
 * Should not be modified manually.
 * Depends on the `Collectible` package and must be rebuilt if the
 * `Collectible` has been republished on the network.
 */
export function getBytecode() {
    return 'a11ceb0b060000000a010010021026033637046d0a05776e07e501e90108ce036006ae043e0aec04050cf10455001400090107010e01130215021602170004020001000c01000101010c01000102030700030207010000040307000605020007060700000a000100010b0a0b01020213030400030d010701000312080701000418030500050f0801010c05101001010c06110d0e00070c030600030604060109060c070f02080007080600070b040108070b010108000b0201080008050b0401080708050803010a02010803010805010807010b04010900010900010800080900030803080508050b0401080701070806020b010109000b02010900010b02010800010608060105010b01010800020900050841737365744361700d41737365744d65746164617461064f7074696f6e06537472696e670854454d504c415445095478436f6e746578740355726c0561736369690b64756d6d795f6669656c640c666e66745f666163746f727904696e6974096e65775f6173736574156e65775f756e736166655f66726f6d5f6279746573046e6f6e65066f7074696f6e137075626c69635f73686172655f6f626a6563740f7075626c69635f7472616e736665720673656e64657204736f6d6506737472696e670874656d706c617465087472616e736665720a74785f636f6e746578740375726c0475746638000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002030864000000000000000a02070653796d626f6c0a0205044e616d650a020c0b4465736372697074696f6e0a02090869636f6e5f75726c0101010a0201000002010801000000000229070111020c08070211050c07070311050c050704070621041038000c0205140704110938010c020b020c060b0007000b080b070b050b0607050a0138020c040c030b0438030b030b012e110838040200';
}
