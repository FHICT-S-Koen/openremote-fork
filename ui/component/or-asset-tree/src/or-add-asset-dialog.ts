import {css, html, LitElement, unsafeCSS} from "lit";
import {customElement, property, query} from "lit/decorators.js";
import {AgentDescriptor, Asset, AssetDescriptor, AttributeDescriptor, AssetModelUtil} from "@openremote/model";
import "@openremote/or-mwc-components/or-mwc-input";
import {AssetTreeConfig, OrAssetTreeSelectionEvent} from "./index";
import {
    createListGroup,
    ListGroupItem,
    ListItem,
    OrMwcList,
    OrMwcListChangedEvent
} from "@openremote/or-mwc-components/or-mwc-list";
import {i18next} from "@openremote/or-translate";
import {DefaultColor3, DefaultColor5, Util} from "@openremote/core";
import {InputType, OrMwcInput, OrInputChangedEvent} from "@openremote/or-mwc-components/or-mwc-input";
import "@openremote/or-components/or-ace-editor";
import { OrAceEditor, OrAceEditorChangedEvent } from "@openremote/or-components/or-ace-editor";

type CustomDescriptor = { descriptorType: 'custom'
    name?: string;
    value: { name: string };
    icon?: string;
    colour?: string;
 };
type Descriptors = AssetDescriptor | AgentDescriptor | CustomDescriptor

export type OrAddAssetDetail = {
    name: string | undefined;
    descriptor: Descriptors | undefined;
};

export class OrAddChangedEvent extends CustomEvent<OrAddAssetDetail> {

    public static readonly NAME = "or-add-asset-changed";

    constructor(addAssetDetail: OrAddAssetDetail) {
        super(OrAddChangedEvent.NAME, {
            bubbles: true,
            composed: true,
            detail: addAssetDetail
        });
    }
}

declare global {
    export interface HTMLElementEventMap {
        [OrAddChangedEvent.NAME]: OrAddChangedEvent;
    }
}

@customElement("or-add-asset-dialog")
export class OrAddAssetDialog extends LitElement {

    @property({attribute: false})
    public config!: AssetTreeConfig;

    @property({attribute: false})
    public agentTypes!: AgentDescriptor[];

    @property({attribute: false})
    public assetTypes!: AssetDescriptor[];

    @property({attribute: false})
    public customAssetTypes: CustomDescriptor[] = [];

    @property({attribute: false})
    public parent?: Asset;

    @property({attribute: false})
    public selectedType?: Descriptors;

    @property({attribute: false})
    public selectedAttributes: AttributeDescriptor[] = [];

    @property({attribute: false})
    protected showParentAssetSelector: boolean = false;

    @property({attribute: false})
    selectedChildAssetType: string = "";

    public name: string = "New Asset";

    @query("#name-input")
    protected nameInput!: OrMwcInput;

    @query("#agent-list")
    protected agentList?: OrMwcList;

    @query("#asset-list")
    protected assetList?: OrMwcList;

    @query("#parent-asset-list")
    protected parentAssetList?: OrMwcList;

    public static get styles() {
        // language=CSS
        return css`
            #name-wrapper {
                display: flex;
                flex-direction: column;
                margin-top: 12px;
            }

            #toggle-parent-selector,
            #remove-parent {
                flex: 0 0 50px;
                margin: 4px 0 0 5px;
            }

            #name-input,
            #parent-wrapper {
                margin: 10px 0;
            }

            #parent-wrapper {
                display: flex;
            }

            #parent {
                flex: 1 1 auto;
            }
            
            #parent-selector {
                max-width: 250px;
                border-left: 1px solid var(--or-app-color5, ${unsafeCSS(DefaultColor5)})
            }
            
            #mdc-dialog-form-add {
                display: flex;
                height: 600px;
                width: 1000px;
                border-style: solid;
                border-color: var(--or-app-color5, ${unsafeCSS(DefaultColor5)});
                border-width: 1px 0;
            }

            .msg {
                display: flex;
                justify-content: center;
                align-items: center;
                text-align: center;
                height: 100%;
                font-family: "Segoe UI", Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol";
                font-size: 14px;
            }

            #asset-type-option-container {
                padding: 15px;
                flex: 1 1 auto;
                overflow: auto;
                max-width: 100%;
                font-size: 16px;
            }

            #type-list {
                width: 260px;
                overflow: auto;
                text-transform: capitalize;
                border-right: 1px solid var(--or-app-color5, ${unsafeCSS(DefaultColor5)});
            }

            #type-title {
                display: flex;
                align-items: center;
                margin: 9px 4px;
            }

            #type-description {
                text-transform: capitalize;
                color: var(--or-app-color3, ${unsafeCSS(DefaultColor3)});
                margin-left: 10px;
                font-size: 18px;
                font-weight: bold;
                font-family: "Segoe UI", Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol";
            }

            #add-custom-asset {
                display: flex;
                justify-content: center;
                align-items: center;
                text-align: center;
                font-family: "Segoe UI", Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol";
                font-size: 14px;
                width: 100%;
                height: 48px;
                color: var(--or-app-color3, ${unsafeCSS(DefaultColor3)});
                transition: opacity 15ms linear, background-color 15ms linear;
                user-select: none;
            }
            #add-custom-asset:hover {
                background-color: var(--mdc-ripple-color, #000);
                cursor: pointer;
            }

            .heading,
            .mdc-list-group__subheader {
                text-transform: uppercase;
                font-family: "Segoe UI", Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol";
                font-weight: bolder;
                line-height: 1em;
                color: var(--or-app-color3, ${unsafeCSS(DefaultColor3)});
                letter-spacing: 0.025em;
                font-size: 14px;
                margin: 20px 0 10px;
            }

            .mdc-list-group__subheader {
                margin: 20px 0 0 16px;
            }
        `;
    }
    

    editCustomAsset(assetName: string) {
        const asset = this.customAssetTypes.find(item => item.name === assetName);
        if (asset) {
            this.nameInput.value = asset.name!;
            this.selectedType = asset;
        }
    }

    deleteCustomAsset(assetName: string) {
        this.customAssetTypes = this.customAssetTypes.filter(asset => asset.name !== assetName);
        this.requestUpdate("customAssetTypes");
    }



    constructor() {
        super();
        this.addEventListener(OrAssetTreeSelectionEvent.NAME, (event: OrAssetTreeSelectionEvent) => {
            this.parent = event.detail.newNodes[0].asset;
        });
    }

    protected render() {

        const mapDescriptors: (descriptors: Descriptors[]) => ListItem[] =
            (descriptors) =>
                descriptors.map((descriptor) => {
                    return {
                        styleMap: {
                            "--or-icon-fill": descriptor.colour ? "#" + descriptor.colour : "unset"
                        },
                        icon: descriptor.icon,
                        text: Util.getAssetTypeLabel(descriptor as any),
                        value: descriptor.name!,
                        data: descriptor
                    }
                }).sort(Util.sortByString((listItem) => listItem.text));

        const agentItems = mapDescriptors(this.agentTypes);
        const assetItems = mapDescriptors(this.assetTypes);
        const customAssetItems = mapDescriptors(this.customAssetTypes);
        const lists: ListGroupItem[] = [];
        if (agentItems.length > 0) {
            lists.push(
                {
                    heading: i18next.t("agents"),
                    list: html`<or-mwc-list @or-mwc-list-changed="${(evt: OrMwcListChangedEvent) => {if (evt.detail.length === 1) this.onTypeChanged(true, evt.detail[0] as ListItem); }}" .listItems="${agentItems}" id="agent-list"></or-mwc-list>`
                }
            );
        }
        if (assetItems.length > 0) {
            lists.push(
                {
                    heading: i18next.t("assets"),
                    list: html`<or-mwc-list @or-mwc-list-changed="${(evt: OrMwcListChangedEvent) => {if (evt.detail.length === 1) this.onTypeChanged(false, evt.detail[0] as ListItem); }}" .listItems="${assetItems}" id="asset-list"></or-mwc-list>`
                }
            );
        }
        console.log(assetItems[1])
        console.log(this.assetTypes[1])
        if (customAssetItems.length > 0) {
            lists.push(
                {
                    heading: i18next.t("custom_assets"),
                    list: html`${customAssetItems.map(
                        (item) =>
                            html`
                                <or-mwc-list
                                    @or-mwc-list-changed="${(evt: OrMwcListChangedEvent) => {
                                        if (evt.detail.length === 1) this.onTypeChanged(false, evt.detail[0] as ListItem); }}"
                                    .listItems="${customAssetItems}"
                                    id="asset-list">
                                </or-mwc-list>
                            `
                    )}`
                }
            );
        }
        
//                                 <div style="display: flex; align-items: center; justify-content: space-between; margin: 8px 0;">
//                                     <span>${item.text}</span>
//                                     <div>
//                                         <button @click="${() => this.editCustomAsset(item.value)}">Edit</button>
//                                         <button @click="${() => this.deleteCustomAsset(item.value)}" style="margin-left: 8px;">Delete</button>
//                                     </div>
//                                 </div>

        const parentStr = this.parent ? this.parent.name + " (" + this.parent.id + ")" : i18next.t("none");

        return html`
            <div class="col">
                <form id="mdc-dialog-form-add" class="row">
                    <div id="type-list" class="col">
                        ${createListGroup(lists)}
                        <or-mwc-input type="${InputType.TEXT}" iconColor="black" icon="mdi-plus" placeholder="New or Edit Custom Asset"
                            @or-mwc-input-changed="${(e: CustomEvent) => { 
                                const el = e.target as HTMLInputElement;

                                if (this.selectedType && this.selectedType.descriptorType === 'custom') {
                                    this.selectedType.name = el.value;
                                    this.selectedType.value.name = el.value;
                                    this.requestUpdate("customAssetTypes");
                                } else {
                                    if (!this.customAssetTypes.some(({ name }) => name === el.value)) {
                                        this.customAssetTypes.push({ descriptorType: 'custom', name: el.value, value: { name: el.value } });
                                        this.requestUpdate("customAssetTypes");
                                    }
                                }
                            }}" 
                        />
                    </div>
                    <div id="asset-type-option-container" class="col">
                        ${!this.selectedType 
                        ? html`<div class="msg"><or-translate value="noAssetTypeSelected"></or-translate></div>`
                        : this.getTypeTemplate(this.selectedType, parentStr)}
                    </div>
                    ${!this.showParentAssetSelector
                        ? html``
                        : html`<or-asset-tree id="parent-selector" class="col" .showDeselectBtn="${false}" .showSortBtn="${false}" selectedNodes readonly></or-asset-tree>`
                    }
                </form>
            </div>
        `;
    }

    protected getTypeTemplate(descriptor: Descriptors, parentStr: string) {

        if (!descriptor.name) {
            return false;
        }
        
        const assetTypeInfo = AssetModelUtil.getAssetTypeInfo(descriptor.name),
            attributes: AttributeDescriptor[] | undefined = assetTypeInfo?.attributeDescriptors?.filter(e => !e.optional),
            optionalAttributes: AttributeDescriptor[] | undefined = assetTypeInfo?.attributeDescriptors?.filter(e => !!e.optional);

        if (descriptor.descriptorType === 'custom') {
            return html`<or-ace-editor 
                    .value="${descriptor.value}"
                    @or-ace-editor-changed="${(ev: OrAceEditorChangedEvent) => {
                    }}"
                ></or-ace-editor>`
        }

        return html`
            <div id="type-title">
                <or-icon style="--or-icon-fill: ${descriptor.colour ? "#" + descriptor.colour : "unset"}" id="type-icon" .icon="${descriptor.icon}"></or-icon>
                <or-translate id="type-description" .value="${Util.getAssetTypeLabel(descriptor)}"></or-translate>
            </div>
            <div id="name-wrapper">
                <or-mwc-input id="name-input" .type="${InputType.TEXT}" min="1" max="1023" required .label="${i18next.t("name")}" .value="${this.name}" @or-mwc-input-changed="${(e: OrInputChangedEvent) => this.onNameChanged(e.detail.value)}"></or-mwc-input>
                <div id="parent-wrapper">
                    <or-mwc-input id="parent" .type="${InputType.TEXT}" readonly .label="${i18next.t("parent")}" .value="${parentStr}" @click="${() => this._onToggleParentAssetSelector()}"></or-mwc-input>
                    <or-mwc-input id="remove-parent" ?disabled="${!this.parent}" type="${InputType.BUTTON}" icon="close" @or-mwc-input-changed="${() => this._onDeselectClicked()}"></or-mwc-input>
                    <or-mwc-input id="toggle-parent-selector" icon="${this.showParentAssetSelector ? "pencil-off" : "pencil"}" type="${InputType.BUTTON}" @or-mwc-input-changed="${() => this._onToggleParentAssetSelector()}"></or-mwc-input>
                </div>
            </div>
            
            ${!attributes
                ? html``
                : html`
                    <div>
                        <div class="heading">${i18next.t("attribute_plural")}</div>
                        <div style="display: grid">
                            ${attributes.sort(Util.sortByString((attribute) => attribute.name!))
                                .map(attribute => html`
                                    <or-mwc-input .type="${InputType.CHECKBOX}" .label="${Util.getAttributeLabel(undefined, attribute, undefined, true)}"
                                                  .disabled="${true}" .value="${true}"></or-mwc-input>
                            `)}
                        </div>
                    `}

            ${!optionalAttributes
                ? html``
                : html`
                    <div>
                        <div class="heading">${i18next.t("optional_attributes")}</div>
                        <div style="display: grid">
                            ${optionalAttributes.sort(Util.sortByString((attribute) => attribute.name!))
                                .map(attribute => html`
                                    <or-mwc-input .type="${InputType.CHECKBOX}" .label="${Util.getAttributeLabel(undefined, attribute, undefined, true)}"
                                                  .value="${this.selectedAttributes.find((selected) => selected === attribute)}"
                                                  @or-mwc-input-changed="${(evt: OrInputChangedEvent) => evt.detail.value ? this.selectedAttributes.push(attribute) : this.selectedAttributes.splice(this.selectedAttributes.findIndex((s) => s === attribute), 1)}"></or-mwc-input>
                            `)}
                        </div>
                    </div>
                `} 
        `;
    }

    protected onNameChanged(name: string) {
        this.name = name;
        this.onModified();
    }

    protected async onTypeChanged(isAgent: boolean, listItem: ListItem) {
        await this.updateComplete;

        this.selectedAttributes = [];
        this.selectedType = listItem.data as Descriptors;

        // Deselect other list selection
        const otherList = isAgent ? this.assetList : this.agentList;
        if (otherList) {
            otherList.values = undefined;
        }
        this.onModified();
    };

    protected onModified() {
        this.dispatchEvent(new OrAddChangedEvent({
            name: this.name,
            descriptor: this.selectedType
        }));
    }

    protected _onToggleParentAssetSelector(): void {
        this.showParentAssetSelector = !this.showParentAssetSelector; 
    }

    protected _onDeselectClicked() {
        this.parent = undefined;
    }
}
