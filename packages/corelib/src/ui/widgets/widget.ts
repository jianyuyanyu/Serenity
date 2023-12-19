﻿import sQuery from "@optionaldeps/squery";
import { Config, JQueryLike, getGlobalObject, getInstanceType, getTypeFullName, getTypeShortName, isAssignableFrom, isJQueryLike, notifyError, stringFormat, toggleClass } from "@serenity-is/base";
import { Decorators, ElementAttribute } from "../../decorators";
import { jQueryPatch } from "../../patch/jquerypatch";
import { ArgumentNullException, Exception, addValidationRule as addValRule, getAttributes, replaceAll } from "../../q";
import { EditorUtils } from "../editors/editorutils";

export type NoInfer<T> = [T][T extends any ? 0 : never];

export type WidgetNode = JQueryLike | HTMLElement;

export type WidgetProps<P> = {
    id?: string;
    class?: string;
    nodeRef?: (el: HTMLElement) => void;
    replaceNode?: HTMLElement;
} & NoInfer<P>

export type WidgetNodeOrProps<P> = WidgetNode | WidgetProps<P>;

export type EditorProps<T> = WidgetProps<T> & {
    initialValue?: any;
    maxLength?: number;
    name?: string;
    placeholder?: string;
    required?: boolean;
    readOnly?: boolean;
}

export interface CreateWidgetParams<TWidget extends Widget<P>, P> {
    type?: (new (node: WidgetNode, options?: P) => TWidget) | (new (props?: P) => TWidget);
    options?: WidgetProps<P>;
    container?: WidgetNode;
    element?: (e: JQuery) => void;
    init?: (w: TWidget) => void;
}

@Decorators.registerClass('Serenity.Widget')
export class Widget<P = {}> {
    private static nextWidgetNumber = 0;
    protected options: WidgetProps<P>;
    protected widgetName: string;
    protected uniqueName: string;
    declare public readonly idPrefix: string;
    public readonly node: HTMLElement;

    public get element(): JQuery {
        return jQuery(this.node);
    }

    constructor(node: WidgetNode, opt?: WidgetProps<P>);
    constructor(props?: WidgetProps<P>);
    constructor(props?: any, opt?: any) {
        if (isJQueryLike(props)) {
            this.node = props.get(0);
            this.options = opt ?? {};
        }
        else if (props instanceof HTMLElement) {
            this.node = props;
            this.options = opt ?? {};
        }
        else {
            this.options = opt ?? props ?? {};
            this.node = this.options.replaceNode ?? getInstanceType(this).createNode();
        }
        delete this.options.replaceNode;

        Widget.setElementProps(this.node, this.options);

        this.widgetName = Widget.getWidgetName(getInstanceType(this));
        this.uniqueName = this.widgetName + (Widget.nextWidgetNumber++).toString();

        if (!jQuery.isMock) {
            if (jQuery(this.node).data(this.widgetName))
                throw new Exception(stringFormat("The element already has widget '{0}'!", this.widgetName));

            jQuery(this.node).on('remove.' + this.widgetName, e => {
                if (e.bubbles || e.cancelable) {
                    return;
                }
                this.destroy();
            }).data(this.widgetName, this);
        }

        this.addCssClass();
        this.idPrefix = this.uniqueName + '_';
        this.renderContents();
    }

    public destroy(): void {
        if (this.node) {
            toggleClass(this.node, this.getCssClass(), false);
            !jQuery.isMock && jQuery(this.node).off('.' + this.widgetName).off('.' + this.uniqueName).removeData(this.widgetName);
            delete (this as any).node;
        }
    }

    static createNode(): HTMLElement {
        var elementAttr = getAttributes(this, ElementAttribute, true);
        if (elementAttr.length) {
            if (!jQuery.isMock)
                return jQuery(elementAttr[0].value).get(0);
            var el = document.createElement("div");
            el.innerHTML = elementAttr[0].value;
            return el.children[0] as HTMLElement ?? document.createElement("input");
        }
        else {
            return document.createElement("input");
        }
    }

    protected addCssClass(): void {
        toggleClass(this.node, this.getCssClass(), true);
    }

    protected getCssClass(): string {
        var type = getInstanceType(this);
        var classList: string[] = [];
        var fullClass = replaceAll(getTypeFullName(type), '.', '-');
        classList.push(fullClass);

        for (let k of Config.rootNamespaces) {
            if (fullClass.startsWith(k + '-')) {
                classList.push(fullClass.substring(k.length + 1));
                break;
            }
        }

        classList.push(getTypeShortName(type));
        return classList
            .filter((v, i, a) => a.indexOf(v) === i)
            .map(s => 's-' + s)
            .join(" ");
    }

    public static getWidgetName(type: Function): string {
        return replaceAll(getTypeFullName(type), '.', '_');
    }

    public static elementFor<TWidget>(editorType: { new(...args: any[]): TWidget }): JQuery {
        return $((editorType as any).createNode());
    }

    public addValidationRule(eventClass: string, rule: (p1: JQuery) => string): JQuery {
        return addValRule(sQuery(this.node), eventClass, rule);
    }

    public getGridField(): JQuery {
        return sQuery(this.node).closest('.field');
    }

    public change(handler: (e: Event) => void) {
        sQuery(this.node).on('change.' + this.uniqueName, handler);
    };

    public changeSelect2(handler: (e: Event) => void) {
        sQuery(this.node).on('change.' + this.uniqueName, function (e, valueSet) {
            if (valueSet !== true)
                handler(e as any);
        });
    };

    public static create<TWidget extends Widget<P>, P>(params: CreateWidgetParams<TWidget, P>) {
        let opt: WidgetProps<P> = params.options ?? ({} as any);
        
        var container = params.container;
        var element = params.element;

        function processNode(node: HTMLElement) {
            if (!node)
                return;

            if (container) {
                if (isJQueryLike(container))
                    (container as JQuery).append(node);
                else
                    container.appendChild(node);
                container = null;
            }

            if (element) {
                element(sQuery(node));
                element = null;
            }
        }

        if (opt.replaceNode)
            processNode(opt.replaceNode);
        else if (container || element) {
            var oldRef = opt.nodeRef;
            opt.nodeRef = node => {
                oldRef?.(node);
                processNode(node);
                delete opt.nodeRef;
            };
        }

        let widget = new params.type(opt as any);
        if (widget.node && opt.nodeRef)
            opt.nodeRef(widget.node);

        if (opt !== widget.options) {
            // widget might have a constructor that does not accept options
            Widget.setElementProps(widget.node, opt);
            var x = opt as EditorProps<{}>;
            typeof x.required !== "undefined" && ((widget.props as any).required ??= x.required);
            typeof x.readOnly !== "undefined" && ((widget.props as any).readOnly ??= x.readOnly);
            typeof x.initialValue !== "undefined" && ((widget.props as any).initialValue ??= x.initialValue);
            typeof (x as any).ref !== "undefined" && ((widget.props as any).ref ??= (x as any).ref);
        }

        widget.init();
        params.init && params.init(widget);

        return widget;
    }

    static setElementProps(el: HTMLElement, props: any): void {
        if (!el || !props)
            return;

        if (typeof props.nodeRef === "function") {
            props.nodeRef(el);
            delete props.nodeRef;
        }

        if (props.id != null)
            el.id = props.id;

        if (props.name != null)
            el.setAttribute('name', props.name);

        if (props.placeholder != null)
            el.setAttribute("placeholder", props.placeholder);

        if (props.class != null)
            el.className = props.class;

        if (props.maxLength != null)
            el.setAttribute("maxLength", (props.maxLength || 0).toString());
        else if ((props as any).maxlength != null)
            el.setAttribute("maxLength", ((props as any).maxlength || 0).toString());
    }

    protected initialized: boolean;

    protected initialize(): void {
        if (this.initialized)
            return;

        let props = this.props as EditorProps<any>;
        if (props.required != null)
            EditorUtils.setRequired(this, props.required);

        if (props.readOnly !== null)
            EditorUtils.setReadOnly(this, props.readOnly);

        if (props.initialValue != undefined)
            EditorUtils.setValue(this, props.initialValue);

        if (typeof (props as any).ref === "function") {
            (props as any).ref(this);
        }
    }

    public init(): this {
        if (!this.initialized) {
            try {
                this.initialize();
            }
            finally {
                this.initialized = true;
            }
        }
        return this;
    }

    public render(): HTMLElement {
        return this.init().node;
    }

    protected renderContents(): void {
    }

    public get props(): WidgetProps<P> {
        return this.options;
    }

    static isWidgetComponent: boolean;
}

Object.defineProperties(Widget.prototype, { isReactComponent: { value: true } });

export declare interface Widget<P> {
    change(handler: (e: Event) => void): void;
    changeSelect2(handler: (e: Event) => void): void;
}

export class WidgetComponent<P> extends Widget<P> {
    constructor(props?: WidgetProps<P>) {
        super(props);
    }

    static override isWidgetComponent: true = true;
}

export class EditorComponent<P> extends Widget<EditorProps<P>> {
    constructor(props?: EditorProps<P>) {
        super(props);
    }

    static override isWidgetComponent: true = true;
}

export declare interface Widget<P> {
    change(handler: (e: Event) => void): void;
    changeSelect2(handler: (e: Event) => void): void;
}

sQuery.fn.tryGetWidget = function (this: JQuery, type?: any) {
    var element = this;
    var w;
    type ??= Widget;
    if (isAssignableFrom(Widget, type)) {
        var widgetName = Widget.getWidgetName(type);
        w = element.data(widgetName);
        if (w != null && !isAssignableFrom(type, getInstanceType(w))) {
            w = null;
        }
        if (w != null) {
            return w;
        }
    }

    var data = element.data();
    if (data == null) {
        return null;
    }

    for (var key of Object.keys(data)) {
        w = data[key];
        if (w != null && isAssignableFrom(type, getInstanceType(w))) {
            return w;
        }
    }

    return null;
};

sQuery.fn.getWidget = function <TWidget>(this: JQuery, type: { new(...args: any[]): TWidget }) {
    if (this == null) {
        throw new ArgumentNullException('element');
    }
    if (this.length === 0) {
        throw new Exception(stringFormat("Searching for widget of type '{0}' on a non-existent element! ({1})",
            getTypeFullName(type), (this as any).selector));
    }

    var w = (this as any).tryGetWidget(type);
    if (w == null) {
        var message = stringFormat("Element has no widget of type '{0}'! If you have recently changed " +
            "editor type of a property in a form class, or changed data type in row (which also changes " +
            "editor type) your script side Form definition might be out of date. Make sure your project " +
            "builds successfully and transform T4 templates", getTypeFullName(type));
        notifyError(message, '', null);
        throw new Exception(message);
    }
    return w;
};

!sQuery.isMock && jQueryPatch(sQuery);

export function reactPatch() {
    let global = getGlobalObject();
    if (!global.React) {
        if (global.preact) {
            global.React = global.ReactDOM = global.preact;
            global.React.Fragment = global.Fragment ?? "x-fragment";
        }
        else {
            global.React = {
                Component: function () { },
                Fragment: "x-fragment",
                createElement: function () { return { _reactNotLoaded: true }; }
            }
            global.ReactDOM = {
                render: function () { throw Error("To use React, it should be included before Serenity.CoreLib.js"); }
            }
        }
    }
}

reactPatch();
