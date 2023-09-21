export class PresentationItem {
    title: string;
    path: string;
}

export interface PresentationState {
    items: PresentationItem[];
    layout: string;
}
