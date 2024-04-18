import {FileSystemAdapter, Plugin, TFile, WorkspaceLeaf} from 'obsidian';
import PresentationView, {PRESENTATION_VIEW} from "./presentationView";
import ControlView, {CONTROL_VIEW} from "./controlView";

export default class PresentationWindowPlugin extends Plugin {

    private readonly viewSplit: Map<string, string> = new Map<string, string>([
        [PRESENTATION_VIEW, "root"], [CONTROL_VIEW, "right"]])

    async onload() {
        this.registerView(PRESENTATION_VIEW, (leaf: WorkspaceLeaf) => new PresentationView(leaf, this));
        this.registerView(CONTROL_VIEW, (leaf: WorkspaceLeaf) => new ControlView(leaf, this));

        this.registerEvent(
            this.app.workspace.on("file-menu", (menu, file) => {
                if ((this.app.vault.adapter instanceof FileSystemAdapter) && (file instanceof TFile)) {

                    menu.addItem((item) => {
                        item.setTitle("Add to Presentation View")
                            .setIcon("open-elsewhere-glyph")
                            .onClick(async () =>
                                this.getControlView().then(view => view.addFile(file))
                            );
                    });
                }
            }));
        this.registerEvent(
            this.app.workspace.on("url-menu", (menu, url) =>
                menu.addItem((item) => {
                    item.setTitle("Add to Presentation View")
                        .setIcon("open-elsewhere-glyph")
                        .onClick(async () =>
                            this.getControlView().then(view => view.addUrl(url))
                        );
                })
            ));
    }

    onunload() {

    }

    async showAndGetView(viewId: string, state?: any) {
        const views = this.app.workspace.getLeavesOfType(viewId)

        let leaf: WorkspaceLeaf;

        if (views && views.length > 0) {
            leaf = views[0];

        } else {
            leaf = (this.viewSplit.get(viewId) == "root"
                ? this.app.workspace.getLeaf(true)
                : this.app.workspace.getRightLeaf(false))
        }

        if (state) {
            await leaf.setViewState({
                type: viewId,
                active: leaf.getViewState().active,
                state: state
            }).then(() => this.app.workspace.revealLeaf(leaf))
        } else {
            await leaf.setViewState({
                type: viewId,
                active: leaf.getViewState().active
            }).then(() => this.app.workspace.revealLeaf(leaf))
        }

        return leaf
    }

    async getControlView() {
        return this.showAndGetView(CONTROL_VIEW).then(leaf => leaf.view as ControlView);
    }

    async getPresentationView() {
        return this.showAndGetView(PRESENTATION_VIEW).then(leaf => leaf.view as PresentationView);
    }

}

