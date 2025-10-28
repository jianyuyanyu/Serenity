import { computed, signal } from "@serenity-is/signals";
import { invokeDisposingListeners } from "@serenity-is/sleekdom";
import { type GridSignals } from "../core";
import type { GridLayoutRefs } from "../layouts/layout-refs";

export function simpleArrayEquals(arr1: number[], arr2: number[]) {
    if (!Array.isArray(arr1) || !Array.isArray(arr2) || arr1.length !== arr2.length)
        return false;
    arr1 = arr1.slice().sort();
    arr2 = arr2.slice().sort();
    for (var i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i])
            return false;
    }
    return true;
}

export interface CachedRow {
    rowNodeS: HTMLElement,
    rowNodeC: HTMLElement,
    rowNodeE: HTMLElement,
    // ColSpans of rendered cells (by column idx).
    // Can also be used for checking whether a cell has been rendered.
    cellColSpans: number[],

    // Cell nodes (by column idx).  Lazy-populated by ensureCellNodesInRowsCache().
    cellNodesByColumnIdx: { [key: number]: HTMLElement },

    // Column indices of cell nodes that have been rendered, but not yet indexed in
    // cellNodesByColumnIdx.  These are in the same order as cell nodes added at the
    // end of the row.
    cellRenderQueue: number[];

    // Elements returned from formatters for cells in cellRenderQueue.
    cellRenderContent: (Element | DocumentFragment)[];
}

export interface GoToResult {
    row: number;
    cell: number;
    posX: number;
}

export interface PostProcessCleanupEntry {
    groupId: number,
    cellNode?: HTMLElement,
    columnIdx?: number,
    rowNodeS?: HTMLElement;
    rowNodeC?: HTMLElement;
    rowNodeE?: HTMLElement;
    rowIdx?: number;
}

export const defaultRemoveNode = (node: HTMLElement) => {
    if (!node)
        return;
    invokeDisposingListeners(node, { descendants: true });
    node.remove();
}

export const defaultEmptyNode = (node: HTMLElement) => {
    if (!node)
        return;
    invokeDisposingListeners(node, { descendants: true, excludeSelf: true });
    node.innerHTML = "";
}

export function defaultJQueryEmptyNode(this: { (node: HTMLElement): { empty: () => void }, fn: any }, node: HTMLElement) {
    if (!node)
        return;
    if (!this || this.fn)
        defaultEmptyNode(node);
    else
        this(node).empty();
}

export function defaultJQueryRemoveNode(this: { (node: HTMLElement): { remove: () => void }, fn: any }, node: HTMLElement) {
    if (!node)
        return;
    if (!this || this.fn)
        defaultRemoveNode(node);
    else
        this(node).remove();
}

export function bindPrototypeMethods(instance: any, filter?: (key: string | symbol, func: Function) => boolean) {
    // adapted from https://github.com/sindresorhus/auto-bind
    let object = instance.constructor.prototype;
    do {
        for (const key of Reflect.ownKeys(object)) {
            if (key === 'constructor' || Reflect.hasOwnProperty(key))
                continue;

            const descriptor = Reflect.getOwnPropertyDescriptor(object, key);
            if (descriptor && typeof descriptor.value === 'function' &&
                !Reflect.getOwnPropertyDescriptor(instance, key)) {
                const func = instance[key];
                if (filter && !filter(key, func))
                    continue;
                instance[key] = func.bind(instance);
            }
        }
    } while ((object = Reflect.getPrototypeOf(object)) && object !== Object.prototype);
}
