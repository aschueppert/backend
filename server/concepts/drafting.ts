import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";



export interface DraftDoc extends BaseDoc {
  members: Array<ObjectId>;
  contentSet: Array<String>;
  selectedSet: Array<String>;

} 


export default class DraftingConcept {
  public readonly drafts: DocCollection<DraftDoc>;

  /**
   * Make an instance of Drafting.
   */
  constructor(collectionName: string) {
    this.drafts = new DocCollection<DraftDoc>(collectionName);
  }

  async create(author: ObjectId, content: string) {

    const members = new Array<ObjectId>();
    const contentSet = new Array<String>();
    const selectedSet = new Array<String>();

    members.push(author);
    contentSet.push(content)
    const _id = await this.drafts.createOne({members, contentSet, selectedSet});
    return { msg: "Draft successfully created!", draft: await this.drafts.readOne({ _id }) };

  }
  
  async getDrafts() {
    // Returns all Draft! You might want to page for better client performance
    return await this.drafts.readMany({}, { sort: { _id: -1 } });
  }

  async getByMember(member: ObjectId) {
    return await this.drafts.readMany({members:member})
  }

  async addMember(_id: ObjectId, user: ObjectId) {
    let draft = await this.drafts.readOne({ _id })
    if (!draft) {
      throw new NotFoundError(`Draft ${_id} does not exist!`);
    }
    draft.members.push(user)
    let members=draft.members
    await this.drafts.partialUpdateOne({ _id }, {members});
    return { msg: "User successfully added!" };

  }

  async addContent(_id: ObjectId, content: string) {
    let draft = await this.drafts.readOne({ _id })
    if (!draft) {
        throw new NotFoundError(`Draft ${_id} does not exist!`);
      }
  
    if (draft.contentSet.includes(content)) {
        throw new NotAllowedError(`Content ${content} already in draft`);
    }

    let contentSet=draft.contentSet
    contentSet.push(content)
    await this.drafts.partialUpdateOne({ _id }, {contentSet});
    return { msg: `Content set successfully updated to ${String(contentSet)}!` };
  }

  async select(_id: ObjectId, content: string) {
    let draft = await this.drafts.readOne({ _id })
    if (!draft) {
        throw new NotFoundError(`Draft ${_id} does not exist!`);
      }
  
    if (!draft.contentSet.includes(content)) {
        throw new NotFoundError(`Content ${content} not in draft`);
    }

    if (!draft.selectedSet.includes(content)) {
      draft.selectedSet.push(content)
    }
      
    let selectedSet=draft.selectedSet
    await this.drafts.partialUpdateOne({ _id }, {selectedSet});
    return { msg: `Selected set successfully updated to ${String(selectedSet)}!` };
  }

  async deselect(_id: ObjectId, content: string) {
    let draft = await this.drafts.readOne({ _id })
    if (!draft) {
        throw new NotFoundError(`Draft ${_id} does not exist!`);
      }
  
    if (!draft.selectedSet.includes(content)) {
        throw new NotFoundError(`Content ${content} not selected`);
    }


    const selectedSet = draft.selectedSet.filter(function (item) {return item != content;});
    await this.drafts.partialUpdateOne({ _id }, {selectedSet});
    return { msg: `Selected set successfully updated to ${String(selectedSet)}!` };
  }

  async getContent(_id: ObjectId) {
    let draft = await this.drafts.readOne({ _id })
    if (!draft) {
        throw new NotFoundError(`Draft ${_id} does not exist!`);
      }
    return draft.selectedSet;
  }

  async getMembers(_id: ObjectId) {
    let draft = await this.drafts.readOne({ _id })
    if (!draft) {
        throw new NotFoundError(`Draft ${_id} does not exist!`);
      }
    return draft.members;
  }

  async delete(_id: ObjectId) {
    await this.drafts.deleteOne({ _id });
    return { msg: "Draft deleted successfully!" };
  }

  async assertUserIsMember(_id: ObjectId, user: ObjectId) {
    const draft = await this.drafts.readOne({ _id });
    if (!draft) {
      throw new NotFoundError(`Draft ${_id} does not exist!`);
    }

    if (!draft.members.map(String).includes(String(user))) {
      throw new NotFoundError(`User not in draft`);
    }
  }

}

