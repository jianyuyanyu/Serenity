import type { Column } from "../core/column";
import type { IGrid } from "../core/igrid";
import { triggerGridEvent } from "./event-utils";

export function columnSortHandler(this: Pick<IGrid, "getColumnFromNode" | "getEditorLock" | "getColumns" | "getInitialColumns" |
    "getInitialColumnIndex" | "getSortColumns" | "setSortColumns" | "onSort"> & {
        getOptions: () => { multiColumnSort: boolean }
    }, e: MouseEvent): void {
    var tgt = e.target as Element;
    if (tgt.classList.contains("slick-resizable-handle")) {
        return;
    }

    var colNode = tgt.closest(".slick-header-column");
    if (!colNode) {
        return;
    }

    var column = this.getColumnFromNode(colNode);
    if (column.sortable) {
        if (!this.getEditorLock().commitCurrentEdit()) {
            return;
        }

        let sortColumns = this.getSortColumns();

        var sortOpts = null;
        var i = 0;
        for (; i < sortColumns.length; i++) {
            if (sortColumns[i].columnId == column.id) {
                sortOpts = sortColumns[i];
                sortOpts.sortAsc = !sortOpts.sortAsc;
                break;
            }
        }

        const multiColumnSort = this.getOptions().multiColumnSort;
        if (e.metaKey && multiColumnSort) {
            if (sortOpts) {
                sortColumns.splice(i, 1);
            }
        }
        else {
            if ((!e.shiftKey && !e.metaKey) || !multiColumnSort) {
                sortColumns = [];
            }

            if (!sortOpts) {
                sortOpts = { columnId: column.id, sortAsc: column.defaultSortAsc };
                sortColumns.push(sortOpts);
            } else if (sortColumns.length == 0) {
                sortColumns.push(sortOpts);
            }
        }

        this.setSortColumns(sortColumns);

        if (!multiColumnSort) {
            triggerGridEvent.call(this as IGrid, this.onSort, {
                multiColumnSort: false,
                sortCol: column,
                sortAsc: sortOpts.sortAsc
            }, e);
        } else {
            var cols = this.getInitialColumns();
            triggerGridEvent.call(this as IGrid, this.onSort, {
                multiColumnSort: true,
                sortCols: this.getSortColumns().map(col => ({
                    sortCol:
                        cols[this.getInitialColumnIndex(col.columnId)],
                    sortAsc: col.sortAsc
                }))
            }, e);
        }
    }
};


/**
 * Helper to sort visible cols, while keeping invisible cols sticky to
 * the previous visible col. For example, if columns are currently in order
 * A, B, C, D, E, F, G, H and desired order is G, D, F (assuming A, B, C, E
 * were invisible) the result is A, B, G, H, D, E, F.
 */
export function sortToDesiredOrderAndKeepRest(columns: Column[], idOrder: string[]): Column[] {
    if (idOrder.length == 0)
        return columns;

    var orderById: { [key: string]: number } = {},
        colIdxById: { [key: string]: number } = {},
        result: Column[] = [];

    for (var i = 0; i < idOrder.length; i++)
        orderById[idOrder[i]] = i;

    for (i = 0; i < columns.length; i++)
        colIdxById[columns[i].id] = i;

    function takeFrom(i: number) {
        for (var j = i; j < columns.length; j++) {
            var c = columns[j];
            if (i != j && orderById[c.id] != null)
                break;
            result.push(c);
            colIdxById[c.id] = null;
        }
    }

    if (orderById[columns[0].id] == null)
        takeFrom(0);

    for (var id of idOrder) {
        i = colIdxById[id];
        if (i != null)
            takeFrom(i);
    }

    for (i = 0; i < columns.length; i++) {
        var c = columns[i];
        if (colIdxById[c.id] != null) {
            result.push(c);
            colIdxById[c.id] = null;
        }
    }

    return result;
}
