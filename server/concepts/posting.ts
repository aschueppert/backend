import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface PostOptions {
  backgroundColor?: string;
}

const themes = [
  "event",
  "news",
  "music",
  "theatre",
  "art",
  "sports",
  "food",
  "fashion",
  "technology",
  "politics",
  "science",
  "health",
  "education",
  "travel",
  "lifestyle",
  "television",
  "film",
  "literature",
  "comics",
  "games",
  "hobbies",
  "crafts",
  "pets",
  "gardening",
  "sports",
];

export interface PostDoc extends BaseDoc {
  approvers: Array<ObjectId>;
  content: Array<String>;
  approved: Array<ObjectId>;
  status: String;
  theme: String;
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
    const approved = new Array<ObjectId>();
    const theme = "none";
    const _id = await this.posts.createOne({ approvers, content, approved, status: "Not Approved", theme });
    return { msg: "Post successfully created!", post: await this.posts.readOne({ _id }) };
  }

  async getPosts() {
    // Returns all posts! You might want to page for better client performance
    return await this.posts.readMany({}, { sort: { _id: -1 } });
  }

  async approvePost(_id: ObjectId, u: ObjectId) {
    const post = await this.posts.readOne({ _id });
    if (!post) {
      throw new NotFoundError(`Post ${_id} does not exist!`);
    }
    post.approved.push(u);
    let approved = post.approved;
    let status = post.status;
    if (post.approved.length == post.approvers.length) {
      status = "Approved";
    }
    await this.posts.partialUpdateOne({ _id }, { approved, status });
    return { msg: "Post successfully approved!" };
  }

  async getByTheme(theme: string) {
    return await this.posts.readMany({ theme });
  }

  async getByStatus(status: string) {
    return await this.posts.readMany({ status });
  }

  async setTheme(_id: ObjectId, theme: string) {
    const post = await this.posts.readOne({ _id });
    if (!post) {
      throw new NotFoundError(`Post ${_id} does not exist!`);
    }
    await this.posts.partialUpdateOne({ _id }, { theme });
    return { msg: "Theme successfully set!" };
  }

  async getByAuthor(author: ObjectId) {
    return await this.posts.readMany({ approvers: author });
  }
  async getApprovers(_id: ObjectId) {
    const post = await this.posts.readOne({ _id });
    if (!post) {
      throw new NotFoundError(`Post ${_id} does not exist!`);
    }

    return post.approvers;
  }

  async getStatus(_id: ObjectId) {
    const post = await this.posts.readOne({ _id });
    if (!post) {
      throw new NotFoundError(`Post ${_id} does not exist!`);
    }
    return post.status;
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
      throw new PostAuthorNotMatchError(user, _id);
    }
  }

  async assertUserCanApprove(_id: ObjectId, user: ObjectId) {
    this.assertUserIsApprover(_id, user);
    const post = await this.posts.readOne({ _id });
    if (post?.approved.map(String).includes(String(user))) {
      throw new NotAllowedError(`User already approved post`);
    }
  }

  async assertThemeIsValid(theme: string) {
    if (!themes.includes(theme)) {
      throw new ThemeNotAllowed(theme);
    }
  }
  async assertIsApproved(_id: ObjectId) {
    const post = await this.posts.readOne({ _id });
    if (!post) {
      throw new NotFoundError(`Post ${_id} does not exist!`);
    }
    if (post.status != "Approved") {
      throw new NotAllowedError(`Post ${_id} is not approved!`);
    }
  }
}

export class PostAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not an author of post {1}!", author, _id);
  }
}

export class ThemeNotAllowed extends NotAllowedError {
  constructor(public readonly theme: string) {
    super("{0} is not in the allowed theme list!", theme);
  }
}
