/**
 * Created by ivandnistrian on 21.01.2021.
 */

import { api, LightningElement } from "lwc";

export default class DocxsyModalWindow extends LightningElement {
  @api headerText;
  @api bodyText;
  @api displayFooter;
  @api confirmButtonLabel;
  @api confirmButtonVariant;

  get submitLabel() {
    return this.confirmButtonLabel || 'Submit'
  }

  get submitVariant() {
    return this.confirmButtonVariant || 'brand'
  }

  handleActions(event){
    let action = event.currentTarget.dataset.action;
    event.preventDefault();
    const selectedEvent = new CustomEvent("modalaction", { detail: { "action": action }});
    this.dispatchEvent(selectedEvent);
  }
}