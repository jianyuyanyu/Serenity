import { type EventEmitter, type IEventData } from "../core/event";
import type { ArgsGrid } from "../core/eventargs";
import type { IGrid } from "../core/igrid";

export function triggerGridEvent<TArgs extends ArgsGrid, TEventData extends IEventData = IEventData>(this: IGrid,
    evt: EventEmitter<TArgs, TEventData>, args?: Omit<TArgs, "grid">, e?: TEventData, mergeArgs = true): any {
    args ??= {} as any;
    (args as TArgs).grid = this;
    if (!mergeArgs && e) {
        e ??= {} as TEventData;
        (e as any).grid = this;
    }

    return evt.notify(args as TArgs, e, this, mergeArgs);
}

export function addListener<K extends keyof HTMLElementEventMap>(this: {
    jQuery: (el: HTMLElement) => { on: (type: string, listener: any) => void },
    eventDisposer: AbortController,
    uid: string
}, el: HTMLElement, type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any, args?: { capture?: boolean, oneOff?: boolean, signal?: AbortSignal, passive?: boolean }): void {
    // can't use jQuery on with options, so we fallback to native addEventListener
    if (!args?.capture && !args?.signal && !args?.passive && this.jQuery) {
        this.jQuery(el).on(type + "." + this.uid, listener as any);
    }
    else {
        el.addEventListener(type, listener, {
            signal: this.eventDisposer?.signal,
            ...args
        });
    }
}

export function removeListener<K extends keyof HTMLElementEventMap>(this: {
    jQuery: (el: HTMLElement) => { off: (type: string, listener: any) => void },
    uid: string
}, el: HTMLElement, type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any, args?: { capture?: boolean }): void {
    // can't use jQuery off with options, so we fallback to native removeEventListener
    if (this.jQuery) {
        this.jQuery(el).off(type + "." + this.uid, listener as any);
    }
    else {
        el.removeEventListener(type, listener, !!args?.capture);
    }
};

