import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface PostOptions {
  backgroundColor?: string;
}

export interface PostDoc extends BaseDoc {
  approvers: Array<ObjectId>;
  content: Array<String>;
  approved:Array<ObjectId>
  status:String
  options?: PostOptions;
}

/**
 * concept: Posting [Author]
 */
export default class PostingConcept {
  public readonly posts: DocCollection<PostDoc>;

  /**
   * Make an instance of Posting.
   */
  constructor(collectionName: string) {
    this.posts = new DocCollection<PostDoc>(collectionName);
  }

  async create(approvers: Array<ObjectId>, content: Array<String>) {
    const approved=new Array<ObjectId>()
    const _id = await this.posts.createOne({ approvers, content, approved,status:"Not Approved"});
    return { msg: "Post successfully created!", post: await this.posts.readOne({ _id }) };
  }

  async getPosts() {
    // Returns all posts! You might want to page for better client performance
    return await this.posts.readMany({}, { sort: { _id: -1 } });
  }

  async approvePost(u:ObjectId, post_id:ObjectId){
    const post=await this.posts.readOne({ post_id }) 
    if (!post) {
      throw new NotFoundError(`Post ${post_id} does not exist!`);
    }
    post.approved.push(u)
    let approved=post.approved
    let status=post.status
    if (post.approved.length==post.approvers.length){
        status="Approved"
    }
    await this.posts.partialUpdateOne({ post_id }, {approved, status});
  }

  async getByAuthor(author: ObjectId) {
    return await this.posts.readMany({approvers: author});
  }


  async delete(_id: ObjectId) {
    await this.posts.deleteOne({ _id });
    return { msg: "Post deleted successfully!" };
  }

  async assertUserIsApprover(_id: ObjectId, user: ObjectId) {
    const post = await this.posts.readOne({ _id });
    if (!post) {
      throw new NotFoundError(`Post ${_id} does not exist!`);
    }

    if (!post.approvers.map(String).includes(String(user))) {
      throw new NotFoundError(`User not in post`);
    }
  }
}

export class PostAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of post {1}!", author, _id);
  }
}
