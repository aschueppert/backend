import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface SaveDoc extends BaseDoc {
  author: ObjectId
  name: String
  items: Array<ObjectId>
} 


/**
 * concept: Posting [Author]
 */
export default class SaveConcept {
    public readonly saved: DocCollection<SaveDoc>;
    constructor(collectionName: string) {
        this.saved = new DocCollection<SaveDoc>(collectionName);
      }
    
    async create(author: ObjectId, name:String) {
      const items = new Array<ObjectId>
      const _id = await this.saved.createOne({ author, name, items });
      return { msg: `Save ${name} successfully created!`, save: await this.saved.readOne({ _id }) };
    }

    async save(_id:ObjectId, item:ObjectId) {
      let save = await this.saved.readOne({ _id })
      if (!save) {
        throw new NotFoundError(`Save ${_id} does not exist!`);
      }
      save.items.push(item)
      let items=save.items
      await this.saved.partialUpdateOne({ _id }, { items });
      return { msg: await this.saved.readOne({_id}) };

    }


    async getByAuthor(author: ObjectId) {
      return await this.saved.readMany({ author});
    }


    async getSaved() {
      return await this.saved.readMany({}, { sort: { _id: -1 } });
    }

    async getSave(author: ObjectId,name:String) {
      let save= await this.saved.readOne({author,name})
      if (!save) {
        throw new NotFoundError(`Save  does not exist!`);
      }

      return save;
    }

    
    async assertAuthorIsUser(_id: ObjectId, user: ObjectId) {
      const save = await this.saved.readOne({ _id });
      if (!save) {
        throw new NotFoundError(`Save ${_id} does not exist!`);
      }
      if (save.author.toString() !== user.toString()) {
        throw new SaveAuthorNotMatchError(user, _id);
      }
    }
  }
  
  export class SaveAuthorNotMatchError extends NotAllowedError {
    constructor(
      public readonly author: ObjectId,
      public readonly _id: ObjectId,
    ) {
      super("{0} is not the author of save group {1}!", author, _id);
    }
  }
  