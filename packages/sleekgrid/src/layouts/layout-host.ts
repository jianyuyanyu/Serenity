import type { GridPluginHost } from "../core/grid-plugin";
import type { GridSignals } from "../core/grid-signals";
import type { IGrid } from "../core/igrid";
import { ViewportInfo } from "../core/viewportinfo";
import type { GridLayoutRefs } from "./layout-refs";

export interface LayoutHost extends Pick<IGrid, "getColumns" | "getInitialColumns" | "getOptions" |
    "getContainerNode" | "getDataLength" |"onAfterInit">, GridPluginHost {
    getSignals(): GridSignals;
    getViewportInfo(): ViewportInfo;
    removeNode(node: HTMLElement): void;
    readonly refs: GridLayoutRefs;
}
