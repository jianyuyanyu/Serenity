export type EffectDisposer = (() => void) | null;

export interface SignalLike<T> {
	value: T;
	peek(): T;
	subscribe(fn: (value: T) => void): EffectDisposer;
}

export type SignalOrValue<T> = T | SignalLike<T>;
