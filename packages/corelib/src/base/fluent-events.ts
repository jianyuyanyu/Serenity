/**
 * --------------------------------------------------------------------------
 * Adapted from: Bootstrap dom/event-handler.js
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
 * --------------------------------------------------------------------------
 */

import { addDisposingListener, onElementDisposing, removeDisposingListener } from "@serenity-is/sleekdom";
import { getjQuery } from "./environment";

const stripNameRegex = /\..*/
const stripUidRegex = /::\d+$/
let uidEvent = 1
const customEvents: Record<string, string> = {
    mouseenter: 'mouseover',
    mouseleave: 'mouseout'
}

function makeEventUid(prefix: string): string {
    return `${prefix}::${uidEvent++}`;
}

type EventHandler = Function & {
    callable: EventListenerOrEventListenerObject;
    delegationSelector?: string | Function;
    oneOff?: boolean;
    uidEvent?: string;
}

type EventHandlers = Record<string, EventHandler>;
type ElementEvents = Record<string, EventHandlers>;

const eventRegistrySymbol = Symbol.for("Serenity.eventRegistry");

export function getEventRegistry(): WeakMap<EventTarget, ElementEvents> {
    return (globalThis as any)[eventRegistrySymbol] ||= new WeakMap();
}

export function disposeDescendants(element: Element) {
    element.querySelectorAll("*").forEach(node => disposeElement(node));
}

export function disposeElement(element: EventTarget): void {
    if (!element)
        return;

    onElementDisposing(element);

    const eventRegistry = getEventRegistry();
    let events = eventRegistry.get(element);
    if (!events)
        return;

    eventRegistry.delete(element);

    const disposeHandlers = events["disposing"];
    if (disposeHandlers) {
        for (const [_, handler] of Object.entries(disposeHandlers)) {
            if (typeof handler.callable === "function") {
                try {
                    handler.callable.call(element, { target: element });
                }
                catch {
                }
            }
        }
    }
    for (const [typeEvent, handlers] of Object.entries(events)) {
        for (const [handlerKey, handler] of Object.entries(handlers)) {
            element.removeEventListener(typeEvent, handler as any, Boolean(handler.delegationSelector));
            delete handlers[handlerKey];
        }
    }
}

function getElementEvents(element: EventTarget): ElementEvents {
    const eventRegistry = getEventRegistry();
    let events = eventRegistry.get(element);
    if (!events)
        eventRegistry.set(element, events = {});
    return events;
}

function hydrateEvent(obj: Event, meta = {}) {
    for (const [key, value] of Object.entries(meta)) {
        if (key === 'bubbles' || key === 'cancelable') {
            // these should be set when the event is constructed
            continue;
        }
        try {
            (obj as any)[key] = value
        } catch {
            Object.defineProperty(obj, key, {
                configurable: true,
                get() {
                    return value
                }
            })
        }
    }

    return obj;
}

function baseHandler(element: EventTarget, fn: any) {
    return function handler(event: Event) {
        hydrateEvent(event, { delegateTarget: element })

        if ((handler as any).oneOff) {
            removeListener(element, event.type, fn)
        }

        return fn.apply(element, [event])
    }
}

function delegationHandler(element: EventTarget, selector: string, fn: Function) {
    return function handler(event: Event) {
        const domElements = (element as any).querySelectorAll(selector)

        for (let { target } = event; target && target !== this; target = (target as any).parentNode) {
            for (const domElement of (domElements as any)) {
                if (domElement !== target) {
                    continue
                }

                hydrateEvent(event, { delegateTarget: target })

                if ((handler as any).oneOff) {
                    removeListener(element, event.type, selector, fn)
                }

                return fn.apply(target, [event])
            }
        }
    }
}

function findHandler(handlers: EventHandlers, callable: Function, delegationSelector: any = null) {
    return Object.values(handlers)
        .find((event) => event.callable === callable && event.delegationSelector === delegationSelector)
}

function normalizeParameters(originalTypeEvent: string, handler: any, delegationFunction: any) {
    const isDelegated = typeof handler === 'string'
    const callable = isDelegated ? delegationFunction : (handler || delegationFunction);
    let typeEvent = getTypeEvent(originalTypeEvent)
    if (originalTypeEvent.indexOf(".bs.") >= 0)
        typeEvent = originalTypeEvent;
    return [isDelegated, callable, typeEvent]
}

export function addListener(element: EventTarget, originalTypeEvent: string, handler: Function | string, delegationFunction?: Function, oneOff?: boolean) {
    if (typeof originalTypeEvent !== 'string' || !element) {
        return;
    }

    if (originalTypeEvent === "disposing" && !delegationFunction && typeof handler === "function") {
        addDisposingListener(element, handler as () => void);
        return;
    }

    if (originalTypeEvent.startsWith("disposing.") && !delegationFunction && typeof handler === "function") {
        addDisposingListener(element, handler as () => void, originalTypeEvent.substring(9));
        return;
    }

    const $ = getjQuery();
    if ($) {
        if (typeof element === 'string')
            return;
        let $element = $(element);
        if (oneOff)
            $element.one(originalTypeEvent, handler, delegationFunction);
        else
            $element.on(originalTypeEvent, handler, delegationFunction);
        return;
    }

    let [isDelegated, callable, typeEvent] = normalizeParameters(originalTypeEvent, handler, delegationFunction);
    if (!callable)
        return;

    if (originalTypeEvent in customEvents) {
        const wrapFunction = (fn: Function) => {
            return function (event: Event & { relatedTarget?: any, delegateTarget: any }) {
                if (!event.relatedTarget || (event.relatedTarget !== event.delegateTarget && !event.delegateTarget.contains(event.relatedTarget))) {
                    return fn.call(this, event)
                }
            }
        }

        callable = wrapFunction(callable)
    }

    const events = getElementEvents(element);
    if (isPollutingKey(typeEvent))
        return;

    const handlers = events[typeEvent] || (events[typeEvent] = Object.create(null));
    const previousFunction = findHandler(handlers, callable, isDelegated ? handler : null);

    if (previousFunction) {
        (previousFunction as any).oneOff = (previousFunction as any).oneOff && oneOff
        return;
    }

    const dotIdx = originalTypeEvent.indexOf('.');
    const ns = dotIdx > -1 ? originalTypeEvent.substring(dotIdx + 1) : '';
    const uid = makeEventUid(ns)
    if (isPollutingKey(uid))
        return;
    const fn = (isDelegated ?
        delegationHandler(element, handler as string, callable) :
        baseHandler(element, callable)) as any as EventHandler;

    fn.delegationSelector = isDelegated ? handler : null;
    fn.callable = callable;
    fn.oneOff = oneOff;
    fn.uidEvent = uid;

    handlers[uid] = fn;
    element.addEventListener(typeEvent, fn as any, isDelegated);
}

function isPollutingKey(key: string | null | undefined): boolean {
    return key === '__proto__' || key === 'constructor' || key === 'prototype';
}

function removeHandler(element: EventTarget, events: ElementEvents, typeEvent: string, handler: any, delegationSelector: string | Function) {
    const fn = findHandler(events[typeEvent], handler, delegationSelector)

    if (!fn) {
        return
    }

    element.removeEventListener(typeEvent, fn as any, Boolean(delegationSelector))
    if (!isPollutingKey(typeEvent) && !isPollutingKey((fn as any).uidEvent))
        delete events[typeEvent][(fn as any).uidEvent]
}

function removeNamespacedHandlers(element: EventTarget, events: ElementEvents, typeEvent: string, namespace: string) {
    const handlers = events[typeEvent] || {};

    for (const [handlerKey, handler] of Object.entries(handlers)) {
        if (handlerKey.includes(namespace)) {
            removeHandler(element, events, typeEvent, handler.callable, handler.delegationSelector);
        }
    }
}

function getTypeEvent(event: string) {
    // allow to get the native events from namespaced events ('click.bs.button' --> 'click')
    event = event.replace(stripNameRegex, '')
    return customEvents[event] || event
}

export function removeListener(element: EventTarget, originalTypeEvent: string, handler?: any, delegationHandler?: Function): void {
    if (typeof originalTypeEvent !== 'string' || !element) {
        return;
    }

    if (originalTypeEvent === "disposing" && !delegationHandler && typeof handler === "function") {
        removeDisposingListener(element, handler as () => void);
        return;
    }

    if (originalTypeEvent.startsWith("disposing.") && !delegationHandler && typeof handler === "function") {
        removeDisposingListener(element, handler as () => void, originalTypeEvent.substring(9));
        return;
    }

    if (originalTypeEvent.startsWith(".")) {
        removeDisposingListener(element, null, originalTypeEvent.substring(1));
        // continue to remove other event handlers in the namespace
    }

    const $ = getjQuery();
    if ($) {
        if (typeof element !== "string") {
            $(element).off(originalTypeEvent, handler, delegationHandler);
        }
        return;
    }

    const [isDelegated, callable, typeEvent] = normalizeParameters(originalTypeEvent, handler, delegationHandler);
    const inNamespace = typeEvent !== originalTypeEvent;
    const events = getElementEvents(element);
    const handlers = events[typeEvent] || {};
    const isNamespace = originalTypeEvent.startsWith('.');

    if (typeof callable !== 'undefined') {
        if (!Object.keys(handlers).length) {
            return;
        }

        removeHandler(element, events, typeEvent, callable, isDelegated ? handler : null);
        return
    }

    if (isNamespace) {
        for (const elementEvent of Object.keys(events)) {
            removeNamespacedHandlers(element, events, elementEvent, originalTypeEvent.slice(1));
        }
    }

    for (const [keyHandlers, handler] of Object.entries(handlers)) {
        const handlerKey = keyHandlers.replace(stripUidRegex, '');

        if (!inNamespace || originalTypeEvent.includes(handlerKey)) {
            removeHandler(element, events, typeEvent, handler.callable, handler.delegationSelector);
        }
    }
}

export function triggerEvent(element: EventTarget, type: string, args?: any): Event & { isDefaultPrevented?(): boolean } {
    if (typeof type !== 'string' || !element) {
        return null;
    }

    const $ = getjQuery();
    const typeEvent = getTypeEvent(type);
    const inNamespace = type !== typeEvent;

    let jQueryEvent = null;
    let bubbles = args?.bubbles ?? true;
    let nativeDispatch = true;
    let defaultPrevented = false;

    if (inNamespace && $) {
        jQueryEvent = $.Event(type, args);
        typeof element !== "string" && $(element).trigger(jQueryEvent);
        bubbles = bubbles && !jQueryEvent.isPropagationStopped();
        nativeDispatch = !jQueryEvent.isImmediatePropagationStopped();
        defaultPrevented = jQueryEvent.isDefaultPrevented();
    }

    const evt = hydrateEvent(new Event(type, { bubbles, cancelable: args?.cancelable ?? true }), args);

    if (defaultPrevented) {
        evt.preventDefault();
    }

    if (nativeDispatch) {
        element.dispatchEvent(evt);
    }

    if (evt.defaultPrevented && jQueryEvent) {
        jQueryEvent.preventDefault();
    }

    return evt
}