import {ItemView, setIcon, setTooltip, TFile, ViewStateResult, WorkspaceLeaf} from "obsidian";
import PresentationWindowPlugin from "./main";
import {PRESENTATION_VIEW} from "./presentationView";
import {PresentationItem, PresentationItemKind, PresentationState} from "./presentationState";
import Sortable = require("sortablejs");

export const CONTROL_VIEW = 'presentation-control-view';

export default class ControlView extends ItemView implements PresentationState {

    private readonly layouts: Map<number, string[]> = new Map<number, string[]>([
        [1, [""]],
        [2, ["a", "b"]],
        [3, ["a", "b", "c", "d"]],
        [4, [""]],
        [5, ["a", "b"]],
        [6, [""]]
    ])

    items: PresentationItem[];
    layout: string;

    private layoutsRoot: HTMLDivElement;
    private listRoot: HTMLDivElement;
    private toolsRoot: HTMLDivElement;

    private itemsSortable: Sortable;

    private draggedFile: TFile | null;

    constructor(readonly leaf: WorkspaceLeaf, readonly plugin: PresentationWindowPlugin) {
        super(leaf);
        this.navigation = false;

        this.items = [];
        this.layout = "";
    }

    getViewType(): string {
        return CONTROL_VIEW;
    }

    getDisplayText(): string {
        return "Presentation Control";
    }

    async onOpen(): Promise<void> {
        return this.render();
    }

    handleDrop(event: DragEvent, file: any, x: unknown) {
        if (file?.file instanceof TFile) {
            this.draggedFile = file.file;
        }
    }

    private async render() {

        this.itemsSortable?.destroy();

        const container = this.containerEl.children[1]
        container.empty()

        const root = container.createDiv({cls: "control-view"});
        this.layoutsRoot = root.createDiv({cls: "control-view-layouts"});
        this.listRoot = root.createDiv({cls: "control-view-items"});
        this.toolsRoot = root.createDiv({cls: "control-view-tools"});

        this.renderTools();
        this.renderLayouts();
        this.items.forEach(item => this.renderItem(item))

        this.itemsSortable = new Sortable(this.listRoot, {
            draggable: ".control-view-item",
            sort: true,
            dataIdAttr: "data-image-path",

            onEnd: async (e: Sortable.SortableEvent) => {
                return this.itemsReordered(e);
            }
        });
    }

    renderLayouts() {
        const layoutVariants = this.layouts.get(this.items.length) || [];

        this.layoutsRoot.empty();

        layoutVariants.forEach(layoutVariant =>
            this.layoutsRoot.createDiv({cls: ["layout-button", "layout", this.getLayoutClass(layoutVariant)]}, button => {

                for (let i = 0; i < this.items.length; i++) {
                    button.createDiv({cls: "layout-item", text: (i + 1).toString()})
                }

                button.addEventListener("click", async () => {
                    this.layout = this.getLayoutClass(layoutVariant);
                    return this.refreshPresentationView();
                });
            }))
    }

    private renderItem(presentationItem: PresentationItem) {
        this.listRoot.createDiv({
            cls: "control-view-item", attr: {"data-image-path": presentationItem.path}
        }, controlViewItem => {

            controlViewItem.createDiv({cls: "control-view-item-number"},
                number => number.createSpan({cls: "control-view-item-number-text"}));

            controlViewItem.createDiv({cls: "control-view-item-title", text: presentationItem.title});

            controlViewItem.createDiv({cls: "control-view-item-panel"}, panel => {
                panel.createDiv({cls: ["clickable-icon"]}, icon => {
                    setIcon(icon, "x");
                    setTooltip(icon, "Remove from Presentation view")
                    icon.addEventListener("click", async () => {
                        return this.removeItem(controlViewItem, presentationItem);
                    })
                })
            })
        });
    }

    renderTools() {
        const row = this.toolsRoot.createDiv({cls: "control-view-tools-row"});

        row.createDiv({cls: "control-view-tools-button"}, btn => {
            btn.createDiv({cls: "clickable-icon"}, icon => {
                setIcon(icon, "clipboard-paste");
                setTooltip(icon, "Paste image url");
                icon.addEventListener("click", async () => {
                    return window.navigator.clipboard.readText().then(s => this.addUrl(s));
                })
            });
        });

        row.createDiv({cls: "control-view-tools-drop-area"}, area => {
            area.createSpan({cls: "", text: "Drag image here"});
            area.addEventListener("drop", async ev => {
                ev.preventDefault()
                if (this.draggedFile != null) {
                    const promise = this.addFile(this.draggedFile);
                    this.draggedFile = null;
                    return promise;
                }
            });
            area.addEventListener("dragover", ev => {
                ev.preventDefault()
                if (this.draggedFile != null && ev.dataTransfer) {
                    ev.dataTransfer.dropEffect = "copy";
                }
            });
        });

        row.createDiv({cls: "control-view-tools-right-spacer"});
    }

    private getLayoutClass(layoutVariant: string) {
        return "layout-" + this.items.length + layoutVariant;
    }

    async addFile(file: TFile) {
        let presentationItem = this.createPresentationItem(file);
        this.items.push(presentationItem)
        this.renderItem(presentationItem);

        return this.itemsChanged();
    }

    addUrl(url: string) {
        let presentationItem = this.createPresentationItemFromUrl(url);
        this.items.push(presentationItem)
        this.renderItem(presentationItem);

        return this.itemsChanged();
    }

    private async removeItem(item: HTMLElement, presentationItem: PresentationItem) {
        this.listRoot.removeChild(item);
        this.items.remove(presentationItem)

        return this.itemsChanged();
    }

    private async itemsReordered(event: Sortable.SortableEvent) {
        const paths = this.itemsSortable.toArray();
        const newItems: PresentationItem[] = [];

        paths.forEach(p => newItems.push(this.items[this.items.findIndex((i: PresentationItem) => i.path == p)]))

        this.items = [...newItems];
        return this.itemsChanged();
    }

    private async itemsChanged() {
        this.layout = "layout-" + this.items.length + (this.layouts.get(this.items.length) || []).first() || "";
        this.renderLayouts();
        this.app.workspace.requestSaveLayout();
        return this.refreshPresentationView();
    }


    private createPresentationItem(file: TFile) {
        const presentationItem = new PresentationItem();
        presentationItem.title = file.name;
        presentationItem.path = file.path;
        presentationItem.kind = PresentationItemKind.LocalImage;

        return presentationItem;
    }

    private createPresentationItemFromUrl(link: string) {
        const url = new URL(link);
        const presentationItem = new PresentationItem();
        presentationItem.title = `${url.protocol}//${url.host}${url.pathname}`;
        presentationItem.path = link;
        presentationItem.kind = PresentationItemKind.RemoteImage;

        return presentationItem;
    }

    async refreshPresentationView() {
        return this.plugin.showAndGetView(PRESENTATION_VIEW, {items: [...this.items], layout: this.layout});
    }

    getState(): PresentationState {
        return {items: [...this.items], layout: this.layout};
    }

    async setState(state: PresentationState, result: ViewStateResult): Promise<void> {
        if (state && state.layout) {
            this.layout = state.layout;
        }
        if (state && state.items) {
            this.items = [...state.items];
        }
        await this.render()

        return super.setState(state, result);
    }
}
