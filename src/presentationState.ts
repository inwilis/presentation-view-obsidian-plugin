export enum PresentationItemKind {
    LocalImage,
    RemoteImage
}

export class PresentationItem {
    title: string;
    path: string;
    kind: PresentationItemKind;
}

export interface PresentationState {
    items: PresentationItem[];
    layout: string;
}
