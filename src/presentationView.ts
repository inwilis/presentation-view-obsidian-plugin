import {ItemView, ViewStateResult, WorkspaceLeaf} from "obsidian";
import PresentationWindowPlugin from "./main";
import {PresentationItem, PresentationItemKind, PresentationState} from "./presentationState";

export const PRESENTATION_VIEW = 'presentation-view';

export default class PresentationView extends ItemView implements PresentationState {

    items: PresentationItem[];
    layout: string;

    private imageRoot: HTMLDivElement;

    constructor(readonly leaf: WorkspaceLeaf, readonly plugin: PresentationWindowPlugin) {
        super(leaf);
        this.navigation = false;

        this.items = [];
        this.layout = "";
    }

    getViewType(): string {
        return PRESENTATION_VIEW;
    }

    getDisplayText(): string {
        return "Presentation View";
    }

    async onOpen(): Promise<void> {
        return this.render();
    }

    private async render() {
        const container = this.containerEl.children[1]
        container.empty()

        const root = container.createDiv({cls: "presentation-view"});
        this.imageRoot = root.createDiv({cls: ["presentation-view-images", "layout"]});

        if (this.layout) {
            this.imageRoot.addClass(this.layout);
        }

        this.items.forEach((item: PresentationItem) => this.renderPresentationItem(item, this.imageRoot));
    }

    private renderPresentationItem(item: PresentationItem, root: HTMLDivElement) {
        if (item.kind == PresentationItemKind.LocalImage) {
            root.createEl("img", {
                attr: {src: this.app.vault.adapter.getResourcePath(item.path)},
                cls: "layout-item"
            });

        } else if (item.kind == PresentationItemKind.RemoteImage) {
            root.createEl("img", {
                attr: {src: item.path},
                cls: "layout-item"
            });
        }
    }

    getState(): PresentationState {
        return {items: [...this.items], layout: this.layout};
    }

    async setState(state: any, result: ViewStateResult): Promise<void> {
        if (state && state.layout) {
            this.layout = state.layout;
        }
        if (state && state.items) {
            this.items = [...state.items];
        }

        await this.render();

        return super.setState(state, result);
    }
}
