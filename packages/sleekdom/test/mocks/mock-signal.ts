import { SignalLike } from "../../src/types/signal-like";

export function mockSignal<T>(initialValue: T): SignalLike<T> & {
    unsubscribe: (callback: (value: T) => void) => void,
    listeners: Array<(value: T) => void>,
} {
    const signal = {
        currentValue: initialValue,
        listeners: [] as Array<(value: T) => void>,
        peek: vi.fn(() => signal.currentValue) as () => T,
        subscribe: vi.fn(function (listener) {
            signal.listeners.push(listener);
            const dispose = () => signal.unsubscribe(listener);
            listener.call({ dispose }, signal.currentValue);
            return dispose;
        }) as (callback: (value: T) => void) => () => void,
        unsubscribe: vi.fn(function (listener) {
            signal.listeners = signal.listeners.filter((x) => x !== listener);
        }) as (callback: (value: T) => void) => void,
        get value() { return signal.currentValue },
        set value(val: T) { if (signal.currentValue !== val) { signal.currentValue = val; signal.listeners.forEach(l => l(val)); } },
    };
    return signal;
}